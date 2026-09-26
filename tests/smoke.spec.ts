import { expect, test } from '@playwright/test'

/**
 * Guards the production-hardening work. Every assertion here holds with **no upstream at all** —
 * no GameOn API, no Keycloak — so it can be run anywhere, with no credentials, and fails only on a
 * real regression rather than on someone else's outage.
 */

test.describe('liveness', () => {
  test('/healthz answers without touching any dependency', async ({ request }) => {
    const response = await request.get('/healthz')

    expect(response.status()).toBe(200)
    expect(await response.json()).toMatchObject({ status: 'ok' })
    // A probe that cached would keep reporting a dead process as healthy.
    expect(response.headers()['cache-control']).toContain('no-store')
  })
})

test.describe('security headers', () => {
  test('documents carry a nonce-based CSP and the hardening headers', async ({ request }) => {
    const response = await request.get('/')
    const headers = response.headers()
    const csp = headers['content-security-policy']

    // The nonce is what allows Nuxt's inline bootstrap scripts without opening the door to any
    // injected script. Losing it silently breaks hydration, so assert it explicitly.
    expect(csp).toMatch(/script-src 'self' 'nonce-[A-Za-z0-9+/=]+'/)
    expect(csp).not.toContain("script-src 'self' 'unsafe-inline'")
    expect(csp).toContain("frame-ancestors 'none'")
    expect(csp).toContain("object-src 'none'")
    expect(csp).toContain("base-uri 'self'")
    expect(csp).toContain("form-action 'self'")

    expect(headers['x-content-type-options']).toBe('nosniff')
    expect(headers['x-frame-options']).toBe('DENY')
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin')
    expect(headers['cross-origin-opener-policy']).toBe('same-origin')
  })

  test('every inline script carries the nonce from the header', async ({ request }) => {
    const response = await request.get('/')
    const html = await response.text()
    const nonce = response.headers()['content-security-policy']?.match(/'nonce-([^']+)'/)?.[1]

    expect(nonce).toBeTruthy()

    // Only *executable* inline scripts matter. Nuxt also emits the SSR payload as
    // `<script type="application/json">`, which the browser never executes and CSP never blocks,
    // so requiring a nonce there would fail the test without any real exposure.
    const inlineScripts = [...html.matchAll(/<script(?![^>]*\ssrc=)([^>]*)>/g)]
      .map(m => m[1] ?? '')
      .filter(attrs => !/type="application\/(ld\+)?json"/.test(attrs))

    expect(inlineScripts.length).toBeGreaterThan(0)
    for (const attrs of inlineScripts) {
      expect(attrs).toContain(`nonce="${nonce}"`)
    }
  })

  test('HSTS is withheld over plain HTTP and sent behind a TLS proxy', async ({ request }) => {
    const plain = await request.get('/healthz')
    expect(plain.headers()['strict-transport-security']).toBeUndefined()

    const forwarded = await request.get('/healthz', { headers: { 'x-forwarded-proto': 'https' } })
    expect(forwarded.headers()['strict-transport-security']).toContain('max-age=')
  })
})

test.describe('GameOn proxy guards', () => {
  // These all short-circuit before the proxy contacts the upstream, so they hold with the API down.

  test('rejects paths outside the allowlist', async ({ request }) => {
    const response = await request.get('/api/gameon/fifa/tournament')
    expect(response.status()).toBe(403)
  })

  test('rejects path traversal instead of normalising it', async ({ request }) => {
    // The separators are percent-encoded so the whole thing stays a *single* path segment. Any
    // form with real `/` boundaries — including `%2e%2e`, which URL parsers decode before
    // normalising — is collapsed by the HTTP client and never reaches the guard under test.
    // `%2f` is the shape that matters anyway: it survives the client and h3 decodes it into the
    // route param, which is exactly how a crafted URL could otherwise escape the intended path.
    const response = await request.get('/api/gameon/lol%2f..%2f..%2fadmin')
    expect(response.status()).toBe(400)
  })

  test('refuses methods the front end never needs', async ({ request }) => {
    const response = await request.delete('/api/gameon/lol/Home')
    expect(response.status()).toBe(405)
  })

  test('lets a DELETE through on the smurf-unlink route and nowhere else', async ({ request }) => {
    // Same prefix, other shapes: still refused before the upstream is contacted.
    expect((await request.delete('/api/gameon/lol/summoner/12')).status()).toBe(405)
    expect((await request.delete('/api/gameon/lol/summoner/smurfs/12/rank')).status()).toBe(405)

    // Past the guard: whatever answers now is the upstream (401 from a live API, 502 with none).
    const unlink = await request.delete('/api/gameon/lol/summoner/smurfs/12')
    expect([403, 405]).not.toContain(unlink.status())
  })

  test('reports an unreachable upstream as 502, not 500', async ({ request }) => {
    // The config points the proxy at a dead port unless a real API URL is provided.
    test.skip(!!process.env.NUXT_PUBLIC_GAME_ON_API_URL, 'a real API is configured')

    const response = await request.get('/api/gameon/lol/Home')
    expect(response.status()).toBe(502)
  })
})

test.describe('authentication', () => {
  test('reports an anonymous session without calling Keycloak', async ({ request }) => {
    const response = await request.get('/api/auth/session')

    expect(response.status()).toBe(200)
    expect(await response.json()).toEqual({ authenticated: false, user: null, expiresAt: 0 })
    expect(response.headers()['cache-control']).toContain('no-store')
  })

  test('never returns a token to the browser', async ({ request }) => {
    const body = await (await request.get('/api/auth/session')).text()

    // The whole point of the server-side flow: tokens live in httpOnly cookies and the session
    // endpoint is the only thing the client talks to.
    expect(body).not.toContain('access_token')
    expect(body).not.toContain('refresh_token')
  })

  test('sign-out is not reachable over GET', async ({ request }) => {
    // A GET sign-out can be triggered from a third-party <img> tag.
    const response = await request.get('/api/auth/logout')
    expect(response.status()).toBe(404)
  })
})

test.describe('admin space', () => {
  // Holds with no Keycloak: the redirect to `/api/auth/login` is asserted, not followed.

  test('sends an anonymous visitor to sign in instead of rendering the page', async ({ request }) => {
    const response = await request.get('/admin/players', { maxRedirects: 0 })

    expect(response.status()).toBe(302)
    expect(response.headers().location).toBe('/api/auth/login?redirect=%2Fadmin%2Fplayers')
    expect(response.headers()['cache-control']).toContain('no-store')
  })

  test('guards every spelling of the path the router still matches', async ({ request }) => {
    // vue-router matches case-insensitively and after decoding: each of these renders the admin
    // page, so each must go through the same session check.
    for (const path of ['/admin', '/admin/', '/ADMIN', '/%61dmin/games']) {
      const response = await request.get(path, { maxRedirects: 0 })
      expect(response.status(), path).toBe(302)
      expect(response.headers().location, path).toContain('/api/auth/login?redirect=')
    }
  })
})

test.describe('error handling', () => {
  test('a non-numeric summoner id is a real 404, not a 200 with an error panel', async ({ page }) => {
    const response = await page.goto('/summoner/not-a-number')

    expect(response?.status()).toBe(404)
    await expect(page.getByRole('heading', { name: 'Page introuvable' })).toBeVisible()
  })

  test('an unknown route is a real 404', async ({ page }) => {
    const response = await page.goto('/route-qui-nexiste-pas')
    expect(response?.status()).toBe(404)
  })
})

test.describe('resilience', () => {
  test('the home page still renders when the API is unreachable', async ({ page }) => {
    test.skip(!!process.env.NUXT_PUBLIC_GAME_ON_API_URL, 'a real API is configured')

    const response = await page.goto('/')

    // Degrading to an error panel is fine; returning a 5xx because a dependency is down is not.
    expect(response?.status()).toBe(200)
    await expect(page.getByRole('link', { name: 'JungleDiff' }).first()).toBeVisible()
  })
})
