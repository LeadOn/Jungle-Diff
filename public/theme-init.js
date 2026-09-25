/*
 * Applies the stored theme before the first paint, to avoid a flash of the light theme for users on
 * the dark one. Light is the default: only an explicit "dark" choice sets the class.
 *
 * A static file rather than an inline script: the site's CSP forbids `script-src 'unsafe-inline'`,
 * and an external script served from our own origin satisfies `'self'` without weakening the policy.
 */
try {
  if (localStorage.getItem('theme') === 'dark') {
    document.documentElement.classList.add('dark')
  }
} catch (e) {
  /* storage unavailable: keep the default light theme */
}
