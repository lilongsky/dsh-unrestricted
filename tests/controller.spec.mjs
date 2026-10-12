import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createUnrestrictedController } from '../src/client/controller.ts'
import { DEFAULT_MODULES } from '../src/module-config.js'

function controllerFixture() {
  let value = { enabled: true, ...DEFAULT_MODULES }
  let resolvePreview
  const subscribers = new Set()
  const writes = []
  const form = {
    getSnapshot: () => ({ status: 'ready', writable: true, value }),
    subscribe: listener => { subscribers.add(listener); return () => subscribers.delete(listener) },
    set: async (field, next) => {
      writes.push({ field, next })
      value = { ...value, [field]: next }
      for (const listener of subscribers) listener()
    },
  }
  const connection = { rpc: { call: async (_channel, endpoint) => {
    if (endpoint === 'status') return { ok: true, value: { enabled: value.enabled, contract: JSON.stringify(value), modes: {}, modules: [], usage: {} } }
    if (endpoint === 'preview') return new Promise(resolve => { resolvePreview = resolve })
    throw new Error(`unexpected endpoint: ${endpoint}`)
  } } }
  const ctx = {
    get: name => { assert.equal(name, 'connection'); return connection },
    configForms: { get: name => { assert.equal(name, 'unrestricted'); return form } },
    remote: { $on: () => () => {} },
    effect: fn => fn(),
  }
  return {
    face: createUnrestrictedController(ctx).face(), writes,
    finishPreview: () => resolvePreview({ ok: true, value: { available: true, text: 'stale preview' } }),
  }
}

test('a module switch persists its own native setting and mirrors the resulting configuration', async () => {
  const { face, writes } = controllerFixture()
  await face.refresh()
  await face.setModule('fiction', false)
  assert.deepEqual(writes, [{ field: 'fiction', next: false }])
  const view = face.hooks.view.getSnapshot()
  assert.equal(view.modules.fiction, false)
  assert.equal(view.modules.resources, true)
  assert.equal(view.enabled, true)
})

test('a preview started before a module change cannot restore stale text after the change', async () => {
  const { face, finishPreview } = controllerFixture()
  await face.refresh()
  const pending = face.loadPreview('standard')
  assert.equal(face.hooks.view.getSnapshot().previews.standard.status, 'loading')
  await face.setModule('resources', false)
  await face.refresh()
  finishPreview()
  await pending
  assert.equal(face.hooks.view.getSnapshot().previews.standard, undefined)
})
