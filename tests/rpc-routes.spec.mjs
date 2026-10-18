import assert from 'node:assert/strict'
import { test } from 'node:test'
import { apiRpcRoutes } from '../src/rpc-routes.js'

for (const endpoint of ['status', 'recheck', 'preview']) {
  test(`the shared ${endpoint} route preserves the Connection envelope and business payload`, async () => {
    const calls = []
    const value = { contract: '69d74c40bede59b2' }
    const route = apiRpcRoutes(async (...args) => { calls.push(args); return { ok: true, value } })
      .find(route => route.path.endsWith('/' + endpoint))
    assert.equal(route.path, '/api/dsh-unrestricted/' + endpoint)
    assert.deepEqual(route.methods, ['POST'])
    assert.equal(route.requestBody, 'buffered')
    const request = new Request('http://127.0.0.1' + route.path, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'client-request', rpcId: 'test-id', method: 'dsh-unrestricted/' + endpoint, payload: { presetId: 'standard' } }),
    })
    assert.deepEqual(await (await route.fetch(request)).json(), { type: 'server-response', rpcId: 'test-id', result: { ok: true, value } })
    assert.deepEqual(calls, [[endpoint, { presetId: 'standard' }]])
  })
}

test('a mismatched API method cannot invoke another business endpoint', async () => {
  let calls = 0
  const route = apiRpcRoutes(async () => { calls++; return { ok: true, value: {} } })[0]
  const result = await (await route.fetch(new Request('http://127.0.0.1' + route.path, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ type: 'client-request', rpcId: 'wrong-method', method: 'dsh-unrestricted/recheck', payload: {} }),
  }))).json()
  assert.equal(calls, 0)
  assert.equal(result.rpcId, 'wrong-method')
  assert.equal(result.result.error.code, 'gateway/bad-request')
})

test('an invalid Connection envelope is rejected before business dispatch', async () => {
  let calls = 0
  const route = apiRpcRoutes(async () => { calls++; return { ok: true, value: {} } })[0]
  const result = await (await route.fetch(new Request('http://127.0.0.1' + route.path, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ type: 'client-request', rpcId: 42, method: 'dsh-unrestricted/status', payload: {} }),
  }))).json()
  assert.equal(calls, 0)
  assert.equal(result.rpcId, 'invalid-request')
  assert.equal(result.result.error.code, 'gateway/bad-request')
})
