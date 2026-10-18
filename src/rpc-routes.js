/**
 * Exact API routes use Connection's carrier-neutral registry. The shared
 * carrier authenticates requests and only dispatches owner Peers to them.
 */
const API_NAMESPACE = 'dsh-unrestricted'

function response(rpcId, result) {
  return Response.json({ type: 'server-response', rpcId, result })
}

function badRequest(rpcId, message, issues = []) {
  return response(rpcId, { ok: false, error: { code: 'gateway/bad-request', message, details: { issues } } })
}

/** Adapt the public Connection JSON envelope to the existing business handler. */
export function apiRpcRoutes(handleRpc) {
  return ['status', 'recheck', 'preview'].map(endpoint => {
    const method = `${API_NAMESPACE}/${endpoint}`
    return {
      path: `/api/${method}`,
      methods: ['POST'],
      requestBody: 'buffered',
      async fetch(request) {
        if (request.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase() !== 'application/json') {
          return new Response('content type must be application/json', { status: 415 })
        }
        let body
        try { body = await request.json() }
        catch { return new Response('body is not JSON', { status: 400 }) }
        // Loading this optional integration only on a Connection request keeps
        // rosterless/headless plugin loading independent of this service.
        const { clientRequestSchema } = await import('@deepseek-ai/dsh-client-connection')
        const envelope = clientRequestSchema.safeParse(body)
        if (!envelope.success) {
          return badRequest(typeof body?.rpcId === 'string' ? body.rpcId : 'invalid-request', 'invalid client-request message', envelope.error.issues)
        }
        if (envelope.data.method !== method) {
          return badRequest(envelope.data.rpcId, `method ${JSON.stringify(envelope.data.method)} does not match endpoint ${JSON.stringify(method)}`)
        }
        return response(envelope.data.rpcId, await handleRpc(endpoint, envelope.data.payload))
      },
    }
  })
}
