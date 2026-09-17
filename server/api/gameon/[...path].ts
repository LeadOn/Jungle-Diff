import { Buffer } from 'node:buffer'
import { createError, defineEventHandler, getRequestHeader, readRawBody, setResponseHeader, setResponseStatus } from 'h3'
import { resolveAccessToken } from '../../utils/access-token'

const ALLOWED_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH'])

/**
 * GameOn API prefixes the front end is allowed to reach. The proxy runs with the user's token, so
 * without this list an XSS could use it to reach any controller on the API (FIFA, tournaments,
 * administration) without ever seeing the token itself.
 */
const ALLOWED_PREFIXES = ['lol/', 'player/']

const UPSTREAM_TIMEOUT_MS = 8000

/**
 * Prefixes whose upstream work is a model generation rather than a database read. The coach writes
 * its report while the connection is held open — roughly 15 s — so the default timeout would abort
 * every generation and leave the user with a failure the API did not actually return.
 *
 * Keep this list as short as the allowlist above: a slow endpoint is not a reason to be here.
 */
const SLOW_UPSTREAM_PREFIXES = ['lol/coach/']
const SLOW_UPSTREAM_TIMEOUT_MS = 60000

/**
 * Authenticating proxy to the GameOn API.
 *
 * The browser calls `/api/gameon/...` and never handles a token; Nitro reads the httpOnly session
 * cookies and sets `Authorization` on the outgoing call. Direct consequence: a script injected into
 * the page can no longer exfiltrate any reusable credential.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const baseUrl = (config.gameOnApiUrl || config.public.gameOnApiUrl).replace(/\/$/, '')
  if (!baseUrl) {
    throw createError({ statusCode: 500, statusMessage: 'GameOn API URL is not configured' })
  }

  const method = event.method.toUpperCase()
  if (!ALLOWED_METHODS.has(method)) {
    throw createError({ statusCode: 405, statusMessage: 'Method Not Allowed' })
  }

  const segments = event.context.params?.path
  const rawPath = Array.isArray(segments) ? segments.join('/') : (segments ?? '')

  // `..` and `//` are rejected rather than normalized: a path that walks upwards has no legitimate
  // reason to exist here, and refusing it outright beats guessing at the intent.
  if (!rawPath || rawPath.includes('..') || rawPath.includes('//')) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid upstream path' })
  }

  const path = rawPath.split('/').map(encodeURIComponent).join('/')
  if (!ALLOWED_PREFIXES.some(prefix => `${path}/`.toLowerCase().startsWith(prefix))) {
    throw createError({ statusCode: 403, statusMessage: 'Upstream path not allowed' })
  }

  const url = new URL(`${baseUrl}/${path}`)
  const incomingUrl = getRequestURL(event)
  incomingUrl.searchParams.forEach((value, key) => url.searchParams.append(key, value))

  // Headers are built explicitly: nothing from the incoming request is forwarded by default, and
  // in particular not the session `Cookie`, which has no business reaching the GameOn API.
  const headers: Record<string, string> = { accept: 'application/json' }
  const accessToken = await resolveAccessToken(event)
  if (accessToken) headers.authorization = `Bearer ${accessToken}`

  const contentType = getRequestHeader(event, 'content-type')
  if (contentType) headers['content-type'] = contentType

  const body = method === 'GET' ? undefined : await readRawBody(event, false)

  const isSlowUpstream = SLOW_UPSTREAM_PREFIXES.some(prefix => `${path}/`.toLowerCase().startsWith(prefix))

  const response = await $fetch.raw<ArrayBuffer>(url.toString(), {
    method: method as 'GET' | 'POST' | 'PUT' | 'PATCH',
    headers,
    body,
    responseType: 'arrayBuffer',
    timeout: isSlowUpstream ? SLOW_UPSTREAM_TIMEOUT_MS : UPSTREAM_TIMEOUT_MS,
    // One retry, and only on reads: replaying a POST or PATCH would duplicate a side effect.
    retry: method === 'GET' ? 1 : 0,
    retryDelay: 300,
    retryStatusCodes: [408, 425, 429, 500, 502, 503, 504],
    // Relay the upstream status as-is instead of turning every 404 into a 500.
    ignoreResponseError: true
  }).catch((error: unknown) => {
    // Timeout, DNS, connection refused: the API is unreachable, which is not the client's fault.
    console.error(`[gameon-proxy] ${method} ${path} unreachable:`, error)
    throw createError({ statusCode: 502, statusMessage: 'GameOn API unreachable' })
  })

  setResponseStatus(event, response.status)
  const upstreamContentType = response.headers.get('content-type')
  if (upstreamContentType) setResponseHeader(event, 'content-type', upstreamContentType)
  setResponseHeader(event, 'cache-control', 'no-store')

  return response._data ? Buffer.from(response._data) : null
})
