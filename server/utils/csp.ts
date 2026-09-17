const RIOT_CDNS = ['https://ddragon.leagueoflegends.com', 'https://raw.communitydragon.org']

/**
 * Content Security Policy for HTML documents.
 *
 * Nuxt emits inline bootstrap scripts (`window.__NUXT__`, the hydration entry point) whose content
 * changes on every render, so neither `'self'` alone nor a fixed hash can allow them: a plain
 * `script-src 'self'` blocks them and hydration dies with "Cannot read properties of undefined".
 * A per-render nonce is therefore the only way to keep `script-src` strict — `'unsafe-inline'`
 * would allow any injected `<script>` as well, which is exactly what we are defending against.
 */
export const documentCsp = (nonce: string, gameOnApiUrl: string): string => {
  const imageOrigins = [gameOnApiUrl, ...RIOT_CDNS].filter(Boolean)

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    // Prevents the site from being framed by a third party (clickjacking).
    "frame-ancestors 'none'",
    "form-action 'self'",
    `script-src 'self' 'nonce-${nonce}'`,
    // `unsafe-inline` is required for styles: the templates make heavy use of the `style`
    // attribute (animation delays, icon stroke widths). The risk on `style-src` is not comparable
    // to `script-src`, which stays strict.
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    `img-src 'self' data: ${imageOrigins.join(' ')}`.trim(),
    // Data goes through the `/api/gameon` proxy, so only our own origin is needed. This is what
    // stops an injected script from posting stolen page data to an attacker-controlled host.
    `connect-src 'self' ${RIOT_CDNS.join(' ')}`,
    "manifest-src 'self'"
  ].join('; ')
}

/** Nothing executable is ever served from an API route, so everything can be denied. */
export const apiCsp = (): string => "default-src 'none'; frame-ancestors 'none'; base-uri 'none'"
