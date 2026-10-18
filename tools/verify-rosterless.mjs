#!/usr/bin/env node
/** Native base-backed host check without a preset registry; no provider request. */
import { cp, mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

function arg(name) {
  const index = process.argv.indexOf(`--${name}`)
  if (index < 0 || index + 1 >= process.argv.length) throw new Error(`missing --${name}`)
  return process.argv[index + 1]
}
const runtime = resolve(arg('runtime'))
const mode = arg('mode')
if (!['standard', 'ptc'].includes(mode)) throw new Error('mode must be standard or ptc')
const home = process.env.DSH_HOME ?? await mkdtemp(join(tmpdir(), 'dsh-unrestricted-rosterless-'))
await mkdir(home, { recursive: true })
process.env.DSH_HOME = home
const pluginDir = resolve(fileURLToPath(new URL('..', import.meta.url)))
async function native(name) {
  const root = join(runtime, 'node_modules/@deepseek-ai', name)
  const manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))
  return import(pathToFileURL(join(root, manifest.exports?.['.']?.default ?? manifest.main)).href)
}
const appBoot = await native('dsh-app-boot')
const cmdline = await native('dsh-cmdline')
const { SessionId } = await native('dsh-session')
const { renderPrompt } = await native('dsh-system-prompt')
const { ANCHORS } = await import('../src/rules.js')
const { executionModeBlock } = await import('../src/prompt-modules.js')
const { ALL_MODULES, LEAN_MODULES, NO_MODULES } = await import('../src/module-config.js')
const version = JSON.parse(await readFile(join(runtime, 'node_modules/@deepseek-ai/dsh-base/package.json'), 'utf8')).version
const profileDir = join(home, 'profiles/spec')
await mkdir(profileDir, { recursive: true })
const pluginInstall = join(profileDir, 'node_modules/dsh-unrestricted')
await mkdir(join(profileDir, 'node_modules'), { recursive: true })
await cp(pluginDir, pluginInstall, { recursive: true, filter: source => !/node_modules|\.git/.test(source) })
appBoot.initProfile(profileDir, ['@deepseek-ai/dsh-base', 'dsh-unrestricted'])
const configPath = join(profileDir, 'cordis.yml')
await writeFile(configPath, '[]\n')
const bundlePatches = [
  ...appBoot.loadOverlayPatches('dsh-rosterless-verify', join(runtime, 'node_modules/@deepseek-ai/dsh-base/cordis.patch.yml')),
  ...appBoot.loadOverlayPatches('dsh-rosterless-verify', join(pluginDir, 'cordis.patch.yml')),
]
const overrides = [
  { id: 'storage-json', config: { root: join(home, 'storages') } },
  { id: 'session-persistence-jsonl', config: { root: join(home, 'sessions') } },
  { id: 'session-telemetry-otel', disabled: true },
  { id: 'hmr', disabled: true },
  { id: 'system-prompt', config: { personaPrefix: ANCHORS.personaStandard } },
  { id: 'tools', config: { mode: mode === 'ptc' ? 'ptc' : 'native' } },
]
const installAnchor = join(runtime, 'package.json')
const profile = { name: 'spec', dir: profileDir, layers: [], patchPath: join(profileDir, 'cordis.patch.yml'), patches: [], skippedBundles: [] }
const resolution = await appBoot.createRuntimeResolution({ installAnchor, home, profile })
const ctx = await appBoot.boot('dsh-rosterless-verify', configPath, [...bundlePatches, ...overrides], async bootCtx => {
  bootCtx.provide('profileContext', {
    name: 'spec', dir: profileDir, patchPath: profile.patchPath,
    installAnchor, home, cwd: home, startedBundles: ['@deepseek-ai/dsh-base', 'dsh-unrestricted'], overlays: overrides, telemetryDisabledEnv: '1',
  })
  await bootCtx.plugin(appBoot.PluginPackages, { resolution })
  cmdline.provideCmdline(bootCtx, { args: [], exit: () => {} })
})
const results = []
function check(label, passed) {
  results.push({ label, passed: Boolean(passed) })
  console.log(`${passed ? 'ok' : 'FAIL'} ${label}`)
}
let handle
try {
  check('real native host has no preset registry', ctx.get('agentPresets') === undefined)
  handle = await ctx.agents.create({ sessionId: SessionId(`verify-rosterless-${mode}`),
    meta: { cwd: home }, agentOptions: { provider: 'deepseek', model: 'deepseek-chat' } })
  async function assemble() {
    const assembly = await ctx.systemPrompt.assemble({ agent: handle.agent, scope: handle.agent })
    return { text: renderPrompt(assembly), tools: JSON.stringify(assembly.tools), contexts: JSON.stringify(assembly.contexts) }
  }
  const baseline = await assemble()
  check('native host composition matches requested tool mode', mode === 'ptc'
    ? baseline.text.includes(ANCHORS.ptcOnly) : !baseline.text.includes(ANCHORS.ptcOnly))
  for (const [label, modules] of [['all', ALL_MODULES], ['delivery', LEAN_MODULES], ['none', NO_MODULES]]) {
    await ctx.settings.update('unrestricted', { enabled: true, ...modules })
    const prompt = await assemble()
    const block = executionModeBlock(modules)
    check(`${mode}/${label} uses the selected plugin body exactly once`, block
      ? prompt.text.includes(block) && prompt.text.split(block).length === 2 : prompt.text === baseline.text)
    check(`${mode}/${label} keeps native tools and contexts`, prompt.tools === baseline.tools && prompt.contexts === baseline.contexts)
  }
  await ctx.settings.update('unrestricted', { enabled: false })
  check('disabling restores original native prompt bytes', (await assemble()).text === baseline.text)
} finally {
  await handle?.dispose()
  await ctx.fiber.dispose()
}
const report = { evidence: `native DSH ${version} base-backed host without agentPresets; installed plugin entry; no model request`,
  mode, isolatedHome: home, checks: results.length, failures: results.filter(row => !row.passed).length, results }
await writeFile(resolve(arg('report')), JSON.stringify(report, null, 2) + '\n')
if (report.failures) process.exitCode = 1
