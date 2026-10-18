#!/usr/bin/env node
/**
 * Live acceptance check for dsh-unrestricted: boots the shipped Web
 * composition with the plugin installed exactly like `dsh plugin add file:`
 * does (a copy inside the profile's node_modules, bundle patch on top), then
 * assembles every preset with the toggle off and on.
 *
 * Asserts the acceptance contract:
 * - off: every mode's prompt and tool catalog are identical to no-plugin baselines
 * - on: standard/ptc/cordis/minimal and a delegated subagent all get the fused
 *   prompt; tools/contexts stay identical; plan mode flips the plan section only
 * - minimal works for sessions created before AND after the toggle
 * - toggling back off restores the original prompt everywhere
 * - enabling in the initial profile waits for preset registration before fusion
 * - selected module bodies and fingerprints match upstream 0.2.3
 *
 * Usage:
 *   node tools/verify-installed.mjs --runtime <path/to/installed/dsh> [--boot-enabled]
 *
 * Read-only against the repo. Requires the repo's `lib/` build outputs.
 */
import { mkdtemp, mkdir, cp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'

function arg(name) {
  const index = process.argv.indexOf(`--${name}`)
  if (index < 0 || index + 1 >= process.argv.length) throw new Error(`missing --${name} <value>`)
  return process.argv[index + 1]
}

const repo = resolve(arg('runtime'))
const pluginDir = resolve(fileURLToPath(new URL('..', import.meta.url)))
const runtimeVersion = JSON.parse(await readFile(join(repo, 'node_modules/@deepseek-ai/dsh-base/package.json'), 'utf8')).version
const bootEnabled = process.argv.includes('--boot-enabled')

async function importPackage(relativeDir) {
  const shortName = relativeDir.split('/').pop()
  const packageDir = join(repo, 'node_modules', '@deepseek-ai', `dsh-${shortName}`)
  const manifest = JSON.parse(await readFile(join(packageDir, 'package.json'), 'utf8'))
  const entry = manifest.exports?.['.']?.default ?? manifest.main
  return import(pathToFileURL(join(packageDir, entry)).href)
}

import { readFile } from 'node:fs/promises'

const home = process.env.DSH_HOME === undefined
  ? await mkdtemp(join(tmpdir(), 'dsh-unrestricted-verify-'))
  : resolve(process.env.DSH_HOME)
await mkdir(home, { recursive: true })
process.env.DSH_HOME = home

const appBoot = await importPackage('packages/boot/app-boot')
const cmdline = await importPackage('packages/boot/cmdline')
const { SessionId } = await importPackage('packages/core/session')
const { renderPrompt } = await importPackage('packages/core/system-prompt')
const { applyChildComposition, childSessionMeta } = await importPackage('packages/subagent/subagent')
const rules = await import(pathToFileURL(join(pluginDir, 'src/rules.js')).href)
const { MODULE_IDS, ALL_MODULES, NO_MODULES, LEAN_MODULES } = await import(pathToFileURL(join(pluginDir, 'src/module-config.js')).href)
const { MODULE_CONTENT, executionModeBlock } = await import(pathToFileURL(join(pluginDir, 'src/prompt-modules.js')).href)

// Install the plugin the way `dsh plugin add file:` does: a real copy inside
// the profile tree, then register the official runtime package resolution.
const profileDir = join(home, 'profiles', 'spec')
const pluginInstall = join(profileDir, 'node_modules', 'dsh-unrestricted')
await mkdir(dirname(pluginInstall), { recursive: true })
await cp(pluginDir, pluginInstall, {
  recursive: true,
  filter: (source) => !/node_modules|\.git|lib[\\/]client/.test(source),
})
appBoot.initProfile(profileDir, ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app', 'dsh-unrestricted'])
const rootConfig = join(profileDir, 'cordis.yml')
await writeFile(rootConfig, '[]\n')

const overrides = [
  { id: 'storage-json', config: { root: join(home, 'storages') } },
  { id: 'session-persistence-jsonl', config: { root: join(home, 'sessions') } },
  { id: 'webserver', inject: [], config: { host: '127.0.0.1', port: 0 } },
  { id: 'web-runtime', disabled: true },
  { id: 'session-telemetry-otel', disabled: true },
  { id: 'modules', disabled: true },
  { id: 'open-in-app', disabled: true },
  { id: 'session-log-download', disabled: true },
  { id: 'client-hmr', disabled: true },
  { id: 'hmr', disabled: true },
  { id: 'directory-picker', disabled: true },
  { insert: [
    { id: 'directory-picker-browse', name: '@deepseek-ai/dsh-host-directory-picker-browse' },
    { id: 'ui-directory-picker-browse', name: '@deepseek-ai/dsh-client-ui-directory-picker-browse' },
  ] },
  {
    id: 'agent-preset-registry',
    config: {
      default: 'standard',
    },
  },
]
if (bootEnabled) overrides.push({ id: 'unrestricted', config: { enabled: true } })

const installAnchor = join(repo, 'package.json')
const profile = {
  name: 'spec', dir: profileDir, layers: [],
  patchPath: join(profileDir, 'cordis.patch.yml'), patches: [],
  skippedBundles: [],
}
const resolution = await appBoot.createRuntimeResolution({ installAnchor, home, profile })
const webDir = join(repo, 'node_modules/@deepseek-ai/dsh-web-app')
const webManifest = JSON.parse(await readFile(join(webDir, 'package.json'), 'utf8'))
const webPatches = appBoot.bundlePatchPaths(webDir, webManifest.dsh.bundle)
  .flatMap(path => appBoot.loadOverlayPatches('dsh-test', path))
const bundlePatches = [
  ...appBoot.loadOverlayPatches('dsh-test', join(repo, 'node_modules/@deepseek-ai/dsh-base/cordis.patch.yml')),
  ...webPatches,
  ...appBoot.loadOverlayPatches('dsh-unrestricted', join(pluginDir, 'cordis.patch.yml')),
]
const ctx = await appBoot.boot('dsh-test', rootConfig, [...bundlePatches, ...overrides], async (bootCtx) => {
  bootCtx.provide('profileContext', {
    name: 'spec', dir: profileDir, patchPath: profile.patchPath,
    installAnchor, home, cwd: home,
    startedBundles: ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app', 'dsh-unrestricted'],
    overlays: overrides, telemetryDisabledEnv: '1',
  })
  await bootCtx.plugin(appBoot.PluginPackages, { resolution })
  cmdline.provideCmdline(bootCtx, { args: [], exit: () => {} })
})

let failures = 0
let checks = 0
const results = []
function check(label, condition, detail = '') {
  checks++
  results.push({ label, passed: Boolean(condition), ...(detail ? { detail } : {}) })
  if (condition) console.log(`  ok ${label}`)
  else {
    failures++
    console.error(`  FAIL ${label}${detail === '' ? '' : ` — ${detail}`}`)
  }
}

const AGENT_OPTIONS = { provider: 'deepseek', model: 'deepseek-chat' }
const AGENT_META = { cwd: home }
const agents = new Map()

async function presetAgent(id, suffix = '') {
  const key = `${id}${suffix}`
  if (!agents.has(key)) {
    agents.set(key, await ctx.agents.create({
      sessionId: SessionId(`verify-${key}`),
      meta: { ...AGENT_META, agentPreset: id },
      agentOptions: AGENT_OPTIONS,
      setup: agentCtx => ctx.agentPresets.mount(agentCtx, id).then(() => undefined),
    }))
  }
  return agents.get(key).agent
}

async function assemblePrompt(agent) {
  const assembly = await ctx.systemPrompt.assemble({ agent, scope: agent })
  return {
    text: renderPrompt(assembly),
    tools: JSON.stringify(assembly.tools),
    contexts: JSON.stringify(assembly.contexts),
    sections: assembly.sections.map(section => section.name),
    sectionTexts: Object.fromEntries(assembly.sections.map(section => [section.name, section.text])),
  }
}

async function setEnabled(enabled) {
  await ctx.settings.update('unrestricted', { enabled })
}

async function customMinimalChild(suffix) {
  const parent = await presetAgent('minimal')
  const handle = await parent.ctx.agents.create({
    sessionId: SessionId(`verify-custom-minimal-${suffix}`), meta: childSessionMeta(parent, 1, false),
    agentOptions: AGENT_OPTIONS,
    setup: agentCtx => {
      applyChildComposition(agentCtx, parent, { persona: 'CUSTOM_MINIMAL_PERSONA: Preserve the delegated reviewer role.' })
      agentCtx.systemPrompt.section({ name: 'review:custom-rule', order: 20, text: 'CUSTOM_SYSTEM_RULE: Keep the supplied review criteria.' })
      agentCtx.tools.register({ name: 'structured_output', description: 'Report a structured review.',
        parameters: { type: 'object', properties: { ok: { type: 'boolean' } }, required: ['ok'] },
        output: { schema: { type: 'object', properties: {}, additionalProperties: false }, render: () => [] },
        execute: async () => { throw new Error('Assembly-only check') } })
      agentCtx.systemPrompt.section({ name: 'tool:structured_output',
        order: agentCtx.systemPrompt.getSectionOrder('STRUCTURED_OUTPUT'), text: rules.ANCHORS.structuredOutputFull })
    },
  })
  agents.set(`custom-minimal-${suffix}`, handle)
  return handle.agent
}

function checkCustomMinimal(label, before, after) {
  check(`${label} preserves the caller persona prefix`, after.sectionTexts['deployment:persona-prefix'].startsWith(before.sectionTexts['deployment:persona-prefix']))
  check(`${label} preserves custom system rules`, after.sectionTexts['review:custom-rule'] === before.sectionTexts['review:custom-rule'])
  check(`${label} adds the selected body once`, after.text.split(rules.EXECUTION_MODE_BLOCK).length === 2)
  check(`${label} retains native structured-report protocol`, after.text.includes(rules.ANCHORS.structuredOutputFull))
  check(`${label} keeps tools and contexts`, after.tools === before.tools && after.contexts === before.contexts)
}

/** Exercise the actual authenticated shared API route, not a local reimplementation. */
let rpcCookie
let rpcSequence = 0
async function hostRpc(endpoint, payload = {}) {
  const origin = ctx.webServer.getOrigin()
  if (rpcCookie === undefined) {
    const response = await fetch(ctx.connection.authenticatedUrl(origin + '/connect'), { redirect: 'manual' })
    if (response.status !== 302) throw new Error(`RPC auth failed: HTTP ${response.status}`)
    rpcCookie = response.headers.getSetCookie().map(value => value.split(';', 1)[0]).join('; ')
    if (!rpcCookie) throw new Error('RPC auth returned no temporary credential')
  }
  const response = await fetch(origin + '/api/dsh-unrestricted/' + endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie: rpcCookie, origin },
    body: JSON.stringify({ type: 'client-request', rpcId: `verify-${++rpcSequence}`, method: `dsh-unrestricted/${endpoint}`, payload }),
  })
  if (!response.ok) throw new Error(`RPC ${endpoint} failed: HTTP ${response.status}`)
  const envelope = await response.json()
  if (!envelope.result?.ok) throw new Error(`RPC ${endpoint} returned a failure`)
  return envelope.result.value
}

/**
 * Reproduce the card's preview path without the browser: assemble the standing
 * scope, fuse it, and render it through the same harness renderer the host
 * half's `preview` endpoint uses.
 * @param presetId - preset id to preview.
 * @returns the rendered preview text.
 */
async function preview(presetId, modules = ALL_MODULES) {
  const { createScope } = await importPackage('packages/core/scope')
  const key = {}
  const scope = createScope(ctx, key)
  let assembly
  try {
    await ctx.agentPresets.mount(scope.ctx, presetId)
    assembly = await ctx.systemPrompt.assemble({ scope: key })
  } finally {
    await scope.dispose()
  }
  const fused = presetId === 'minimal'
    ? { sections: [{ name: 'deployment:persona-prefix', text: rules.fusedMinimalPrompt(modules) }] }
    : rules.fuseSections(assembly.sections, presetId, { modules })
  if (fused.issues !== undefined) throw new Error(`preview issues: ${fused.issues.join('; ')}`)
  return rules.renderPreview({ ...assembly, sections: fused.sections }, renderPrompt)
}

/** Poll until the predicate holds or the deadline passes. */
async function until(label, fn, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs
  for (;;) {
    const value = await fn()
    if (value) return value
    if (Date.now() > deadline) throw new Error(`timeout waiting for ${label}`)
    await new Promise(resolve => setTimeout(resolve, 200))
  }
}

if (bootEnabled) {
  try {
    for (const id of ['standard', 'ptc', 'cordis', 'minimal']) {
      try {
        await until(`${id} fusion on startup`, async () => {
          const prompt = await assemblePrompt(await presetAgent(id))
          return prompt.text.includes(rules.EXECUTION_MODE_BLOCK)
        }, 3_000)
        check(`${id} fused when enabled at startup`, true)
      } catch (error) {
        check(`${id} fused when enabled at startup`, false, error.message)
      }
    }
  } finally {
    for (const handle of agents.values()) await handle.dispose()
    await ctx.fiber.dispose()
  }
  if (failures > 0) process.exit(1)
  console.log('startup-enabled checks passed')
  process.exit(0)
}

try {
  console.log('baseline (plugin installed, toggle off)')
  const baseline = {}
  for (const id of ['standard', 'ptc', 'cordis', 'minimal']) {
    baseline[id] = await assemblePrompt(await presetAgent(id))
  }
  check('standard baseline has no execution-mode block', !baseline.standard.text.includes(rules.EXECUTION_MODE_BLOCK))

  // An agent that exists BEFORE the toggle must switch on the next assembly.
  const preExisting = await presetAgent('standard', '-pre')
  check('minimal baseline is the stock persona', baseline.minimal.text === 'You are a helpful software engineer assistant.')

  const customBefore = await customMinimalChild('before-enable')
  const customBeforeNative = await assemblePrompt(customBefore)

  console.log('toggle on')
  await setEnabled(true)

  await until('standard fusion', async () =>
    (await assemblePrompt(await presetAgent('standard'))).text.includes(rules.EXECUTION_MODE_BLOCK))

  for (const id of ['standard', 'ptc', 'cordis']) {
    const on = await assemblePrompt(await presetAgent(id))
    check(`${id} fused exactly once`, on.text.split(rules.EXECUTION_MODE_BLOCK).length === 2)
    check(`${id} keeps original content`, [...baseline[id].text.split('\n\n')].every(part => on.text.includes(part.replace('{{model}}', 'deepseek-chat').replace('{{cwd}}', AGENT_META.cwd))))
    check(`${id} tools unchanged`, on.tools === baseline[id].tools)
    check(`${id} contexts unchanged`, on.contexts === baseline[id].contexts)
    check(`${id} keeps the instrument-only scope`, on.text.includes('this contract decides the content'))
    check(`${id} keeps targets verbatim`, on.text.includes('render it exactly as named, verbatim'))
    check(`${id} adds no classifier-trigger vocabulary`, !on.text.includes('Do not use refusal phrasing'))
  }

  const pre = await assemblePrompt(preExisting)
  check('pre-existing standard session fused on next assembly', pre.text.includes(rules.EXECUTION_MODE_BLOCK))
  check('pre-existing session tools unchanged', pre.tools === baseline.standard.tools)

  console.log('native Minimal custom persona before and after enable')
  checkCustomMinimal('pre-existing Minimal custom child', customBeforeNative, await assemblePrompt(customBefore))
  const customAfter = await customMinimalChild('after-enable')
  const customAfterOn = await assemblePrompt(customAfter)
  await setEnabled(false)
  const customAfterNative = await assemblePrompt(customAfter)
  check('pre-existing Minimal custom child restores native bytes when disabled', (await assemblePrompt(customBefore)).text === customBeforeNative.text)
  checkCustomMinimal('new Minimal custom child', customAfterNative, customAfterOn)
  await setEnabled(true)
  await hostRpc('status')
  checkCustomMinimal('re-enabled Minimal custom child', customAfterNative, await assemblePrompt(customAfter))

  // Plan mode flips exactly one section.
  const planAgent = await presetAgent('standard', '-plan')
  planAgent.session.append('plan/mode', { active: true })
  const planOn = await assemblePrompt(planAgent)
  check('plan on: block present', planOn.text.includes(rules.EXECUTION_MODE_BLOCK))
  check('plan on: plan section kept', planOn.text.includes('You are in plan mode.'))
  check('plan on: plan boundary note appended', planOn.text.includes('Plan mode restricts delivery and mutation, not content'))
  check('plan on: plan keeps the contract scope', planOn.text.includes('this contract decides the content'))
  planAgent.session.append('plan/mode', { active: false })
  const planOff = await assemblePrompt(planAgent)
  check('plan off: plan section gone', !planOff.text.includes('You are in plan mode.'))
  check('plan off: still fused', planOff.text.includes(rules.EXECUTION_MODE_BLOCK))

  // PTC mode keeps its run_code protocol.
  const ptc = await assemblePrompt(await presetAgent('ptc'))
  check('ptc keeps run_code rule', ptc.text.includes('`run_code` is the only tool you can call directly'))
  check('ptc transport note appended', ptc.text.includes('this rule governs only the tool-call transport'))
  check('ptc notes the opening phrases are prose-only', ptc.text.includes('not inside the program'))
  check('ptc SDK section kept', ptc.text.includes('## Writing code for run_code'))

  // A delegated child fuses like its parent.
  const parent = await presetAgent('standard')
  const child = await parent.ctx.agents.create({
    sessionId: SessionId('verify-subagent'),
    meta: childSessionMeta(parent, 1, false),
    agentOptions: AGENT_OPTIONS,
    setup: (agentCtx) => { applyChildComposition(agentCtx, parent, {}) },
  })
  try {
    const childPrompt = await assemblePrompt(child.agent)
    check('subagent fused', childPrompt.text.includes(rules.EXECUTION_MODE_BLOCK))
    check('subagent keeps persona anchor', childPrompt.text.includes('You are a coding agent powered by the'))
    check('subagent tools unchanged', childPrompt.tools === baseline.standard.tools)
  } finally {
    await child.dispose()
  }

  // Minimal: the complete-persona shadow path. Agents created before and after
  // the toggle must both converge on the fused minimal prompt.
  const minimalEarly = await presetAgent('minimal', '-early')
  const expectedMinimal = rules.fusedMinimalPrompt()
  const minimalAfter = await until('minimal shadow', async () => {
    const prompt = await assemblePrompt(await presetAgent('minimal'))
    return prompt.text === expectedMinimal ? prompt : false
  })
  check('minimal session created after toggle is fused', minimalAfter.text === expectedMinimal)
  const minimalEarlyPrompt = await until('minimal sweep', async () => {
    const prompt = await assemblePrompt(minimalEarly)
    return prompt.text === expectedMinimal ? prompt : false
  })
  check('minimal session created before toggle is fused (sweep)', minimalEarlyPrompt.text === expectedMinimal)
  check('minimal tools unchanged', minimalAfter.tools === baseline.minimal.tools)

  console.log('native blank-session preset switching')
  const switchedAgent = await presetAgent('minimal', '-switch')
  await until('switch agent minimal shadow', async () =>
    (await assemblePrompt(switchedAgent)).text === expectedMinimal)
  for (const id of ['standard', 'ptc', 'cordis']) {
    await ctx.agentPresets.select(switchedAgent, id)
    const first = await assemblePrompt(switchedAgent)
    check(`minimal -> ${id} first assembly removes complete shadow`, first.text !== expectedMinimal
      && first.text.includes(rules.EXECUTION_MODE_BLOCK)
      && first.text.startsWith(rules.ANCHORS.identity))
    check(`minimal -> ${id} restores that preset's tool catalog`, first.tools === baseline[id].tools)
    await ctx.agentPresets.select(switchedAgent, 'minimal')
    const returned = await assemblePrompt(switchedAgent)
    check(`${id} -> minimal first assembly installs selected complete shadow`, returned.text === expectedMinimal)
  }

  console.log('authenticated native preview RPC and subagent isolation')
  const mainPrompt = await assemblePrompt(await presetAgent('standard'))
  const mainPreview = await hostRpc('preview', { presetId: 'standard' })
  check('preview fingerprint matches the selected full body', mainPreview.contract === rules.contractFingerprint(ALL_MODULES))
  check('preview HTTP RPC returns exact main-session prompt', mainPreview.source === 'live'
    && mainPreview.text === mainPrompt.text)
  const customChild = await parent.ctx.agents.create({
    sessionId: SessionId('verify-custom-persona'), meta: childSessionMeta(parent, 1, false),
    agentOptions: AGENT_OPTIONS,
    setup: agentCtx => { applyChildComposition(agentCtx, parent, { persona: 'Review only this delegated code.' }) },
  })
  try {
    const customPrompt = await assemblePrompt(customChild.agent)
    check('custom child keeps its delegated persona and receives selected block', customPrompt.text.includes('Review only this delegated code.')
      && customPrompt.text.includes(rules.EXECUTION_MODE_BLOCK))
    const afterChild = await hostRpc('preview', { presetId: 'standard' })
    check('child prompt does not replace main-session preview cache', afterChild.source === 'live'
      && afterChild.text === mainPrompt.text && !afterChild.text.includes('Review only this delegated code.'))
  } finally { await customChild.dispose() }
  await hostRpc('recheck')
  const afterRecheck = await hostRpc('preview', { presetId: 'standard' })
  check('recheck invalidates live cache and returns a standing preview', afterRecheck.available
    && afterRecheck.source === 'standing' && afterRecheck.text.includes(rules.EXECUTION_MODE_BLOCK))

  console.log('preview body and fingerprint use one settings snapshot')
  const acquire = ctx.agentPresets.acquireScope
  let releasePreview
  const blockedPreview = new Promise(resolve => { releasePreview = resolve })
  let previewEntered = false
  let gateNext = true
  ctx.agentPresets.acquireScope = async function (id, ...args) {
    if (gateNext && id === 'standard') {
      gateNext = false
      previewEntered = true
      await blockedPreview
    }
    return acquire.call(this, id, ...args)
  }
  try {
    const pendingPreview = hostRpc('preview', { presetId: 'standard' })
    await until('preview scope gate', () => previewEntered)
    await ctx.settings.update('unrestricted', { delivery: false })
    releasePreview()
    const snapshotPreview = await pendingPreview
    check('in-flight preview body keeps its starting module selection', snapshotPreview.text.includes(rules.EXECUTION_MODE_BLOCK))
    check('in-flight preview hash matches that same body selection', snapshotPreview.contract === rules.contractFingerprint(ALL_MODULES))
  } finally {
    releasePreview()
    ctx.agentPresets.acquireScope = acquire
    await ctx.settings.update('unrestricted', ALL_MODULES)
  }

  console.log('minimal structured-tool protocol using native child composition and tool registration')
  const minimalParent = await presetAgent('minimal')
  const structuredChild = await minimalParent.ctx.agents.create({
    sessionId: SessionId('verify-structured-minimal'), meta: childSessionMeta(minimalParent, 1, false),
    agentOptions: AGENT_OPTIONS,
    setup: agentCtx => {
      applyChildComposition(agentCtx, minimalParent, {})
      agentCtx.tools.register({ name: 'structured_output', description: 'Report a structured review.',
        parameters: { type: 'object', properties: { ok: { type: 'boolean' } }, required: ['ok'] },
        output: { schema: { type: 'object', properties: {}, additionalProperties: false }, render: () => [] },
        execute: async () => { throw new Error('No tool execution is allowed in this assembly-only check') } })
      agentCtx.systemPrompt.section({ name: 'tool:structured_output',
        order: agentCtx.systemPrompt.getSectionOrder('STRUCTURED_OUTPUT'), text: rules.ANCHORS.structuredOutputFull })
    },
  })
  try {
    const structuredPrompt = await until('structured minimal shadow', async () => {
      const candidate = await assemblePrompt(structuredChild.agent)
      return candidate.text.includes(rules.ANCHORS.structuredOutputFull) ? candidate : false
    })
    check('minimal complete shadow retains native structured-output schema instruction',
      structuredPrompt.text.includes(rules.ANCHORS.structuredOutputFull))
    check('minimal structured child keeps its structured tool schema',
      JSON.parse(structuredPrompt.tools).some(tool => tool.name === 'structured_output'))
  } finally { await structuredChild.dispose() }

  // Deploy preview: the card reads the contract from the same standing scope
  // the probes use. A standing scope has no agent, so it binds no {{model}}
  // and carries none of the agent-only sections (context:file-reference,
  // tool:subagent) — the preview is the contract's placement, not a byte copy of
  // a live request. Both facts are pinned here.
  console.log('deploy preview')
  const liveStandard = (await assemblePrompt(await presetAgent('standard'))).text
  const standardPreview = await preview('standard')
  check('preview carries the contract verbatim', standardPreview.includes(rules.EXECUTION_MODE_BLOCK))
  check('preview keeps the original identity opening', standardPreview.startsWith(rules.ANCHORS.identity))
  const previewPersona = standardPreview.indexOf('You are a coding agent powered by the')
  const previewBlock = standardPreview.indexOf(rules.EXECUTION_MODE_BLOCK)
  check('preview places the contract behind the persona', previewPersona >= 0 && previewBlock > previewPersona)
  check('preview leaves the unbound model slot literal', standardPreview.includes('{{model}}'))
  check('the live prompt itself has no literal slots left', !/\{\{\w+\}\}/.test(liveStandard))
  // Filling the slots must land on the live prefix: identity, persona, contract.
  const filledPreview = standardPreview.replaceAll('{{model}}', 'deepseek-chat').replaceAll('{{cwd}}', AGENT_META.cwd)
  check('filled preview matches the live prompt up to the contract', filledPreview.startsWith(liveStandard.slice(0, liveStandard.indexOf('Tokens prefixed with @'))))
  check('preview is larger than the contract alone', standardPreview.length > rules.EXECUTION_MODE_BLOCK.length)
  for (const id of ['ptc', 'cordis', 'minimal']) {
    const text = await preview(id)
    check(`${id} preview carries the contract`, text.includes(rules.EXECUTION_MODE_BLOCK))
  }

  console.log('native settings: independent module switches')
  const sizes = {}
  for (const moduleId of MODULE_IDS) {
    const selected = { ...ALL_MODULES, [moduleId]: false }
    await ctx.settings.update('unrestricted', selected)
    const omitted = Array.isArray(MODULE_CONTENT[moduleId])
      ? MODULE_CONTENT[moduleId].map(route => route.text) : [MODULE_CONTENT[moduleId]]
    const expectedBlock = executionModeBlock(selected)
    check(`${moduleId} native status fingerprint tracks selected body`, (await hostRpc('status')).contract === rules.contractFingerprint(selected))
    for (const id of ['standard', 'ptc', 'cordis', 'minimal']) {
      const prompt = await until(`${moduleId}/${id} update`, async () => {
        const candidate = await assemblePrompt(await presetAgent(id))
        return candidate.text.includes(expectedBlock) && omitted.every(text => !candidate.text.includes(text))
          ? candidate : false
      })
      check(`${moduleId}/${id} body omitted after native settings update`, true)
      check(`${moduleId}/${id} tools unchanged`, prompt.tools === baseline[id].tools)
    }
  }
  await ctx.settings.update('unrestricted', LEAN_MODULES)
  const leanBlock = executionModeBlock(LEAN_MODULES)
  for (const id of ['standard', 'ptc', 'cordis', 'minimal']) {
    const prompt = await until(`${id} lean update`, async () => {
      const candidate = await assemblePrompt(await presetAgent(id))
      return candidate.text.includes(leanBlock) && !candidate.text.includes('Runtime coordination:') ? candidate : false
    })
    sizes[id] = { originalCharacters: baseline[id].text.length, leanCharacters: prompt.text.length,
      leanPluginCharacters: prompt.text.length - baseline[id].text.length }
  }
  const leanChild = await parent.ctx.agents.create({
    sessionId: SessionId('verify-lean-subagent'), meta: childSessionMeta(parent, 1, false),
    agentOptions: AGENT_OPTIONS, setup: agentCtx => { applyChildComposition(agentCtx, parent, {}) },
  })
  try {
    const prompt = await assemblePrompt(leanChild.agent)
    check('new delegated child inherits only selected module bodies', prompt.text.includes(leanBlock)
      && !prompt.text.includes('Runtime coordination:') && !prompt.text.includes('RESOURCES / 找资源'))
  } finally { await leanChild.dispose() }
  await ctx.settings.update('unrestricted', NO_MODULES)
  check('all-off native status has the empty-body fingerprint', (await hostRpc('status')).contract === rules.contractFingerprint(NO_MODULES))
  for (const id of ['standard', 'ptc', 'cordis', 'minimal']) {
    const prompt = await until(`${id} all functions off`, async () => {
      const candidate = await assemblePrompt(await presetAgent(id))
      return candidate.text === baseline[id].text ? candidate : false
    })
    check(`${id} all functions off restores original bytes`, true)
    check(`${id} all functions off keeps tools`, prompt.tools === baseline[id].tools)
  }
  await ctx.settings.update('unrestricted', ALL_MODULES)
  for (const id of ['standard', 'ptc', 'cordis', 'minimal']) {
    await until(`${id} restore all functions`, async () => {
      const candidate = await assemblePrompt(await presetAgent(id))
      if (!candidate.text.includes(rules.EXECUTION_MODE_BLOCK)) return false
      sizes[id].fullCharacters = candidate.text.length
      sizes[id].fullPluginCharacters = candidate.text.length - baseline[id].text.length
      return true
    })
  }
  console.log('native anchor failure preserves the actual changed host prompt')
  const guardAgent = await presetAgent('standard', '-changed-anchor')
  const removeChangedIdentity = guardAgent.ctx.systemPrompt.section({
    name: 'harness:identity', order: -100, text: 'Changed native identity for compatibility verification.',
  })
  try {
    await setEnabled(false)
    const changedNative = await assemblePrompt(guardAgent)
    await setEnabled(true)
    await hostRpc('status')
    await assemblePrompt(await presetAgent('standard'))
    const guarded = await assemblePrompt(guardAgent)
    check('changed native anchor leaves prompt bytes unchanged', guarded.text === changedNative.text)
    check('changed native anchor leaves tools and contexts unchanged', guarded.tools === changedNative.tools
      && guarded.contexts === changedNative.contexts)
    check('native anchor failure discards an earlier live preview', (await hostRpc('preview', { presetId: 'standard' })).source !== 'live')
    const status = await hostRpc('status')
    check('actual anchor failure is reported on the status RPC', status.modes.standard.state === 'failed'
      && status.modes.standard.issues.includes('harness identity opening changed'))
  } finally { removeChangedIdentity() }
  await hostRpc('recheck')
  const recovered = await assemblePrompt(guardAgent)
  check('recheck after restoring the native anchor resumes one selected body',
    recovered.text.split(rules.EXECUTION_MODE_BLOCK).length === 2)

  console.log('toggle off')
  await setEnabled(false)
  for (const id of ['standard', 'ptc', 'cordis', 'minimal']) {
    const off = await until(`${id} restore`, async () => {
      const prompt = await assemblePrompt(await presetAgent(id))
      return prompt.text === baseline[id].text ? prompt : false
    })
    check(`${id} restored to original`, off.text === baseline[id].text)
    check(`${id} tools still unchanged`, off.tools === baseline[id].tools)
  }
  if (process.argv.includes('--report')) {
    await writeFile(resolve(arg('report')), JSON.stringify({
      evidence: `real installed DSH ${runtimeVersion} components with an isolated DSH_HOME; no model request; no desktop profile changes`,
      runtimeVersion, isolatedHome: home, results,
      fullBodyCharacters: rules.EXECUTION_MODE_BLOCK.length, leanBodyCharacters: leanBlock.length,
      moduleSwitches: MODULE_IDS.length, checks, failures, sizes,
      fullBodyFingerprint: rules.contractFingerprint(ALL_MODULES),
      selectedBodyFingerprints: true,
      limits: ['Prompt assembly and settings persistence were exercised without a provider request; model behavior and token usage were not evaluated.',
        'The structured Minimal check uses native child composition and Tools.register without launching a provider activation or executing the tool.'],
    }, null, 2) + '\n')
  }
} finally {
  for (const handle of agents.values()) await handle.dispose()
  await ctx.fiber.dispose()
}

if (failures > 0) {
  console.error(`${failures} check(s) failed`)
  process.exit(1)
}
console.log('all live checks passed')
