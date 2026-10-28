#!/usr/bin/env node
/*
 * WCAG AA contrast audit for every visible text node of one or more pages, in light and dark,
 * at several viewport widths. Built for the Canopée migration; it needs no change to the app.
 *
 * Usage (from the repository root, with the dev server or the built app running):
 *   node docs/canopee/tools/contrast-audit.mjs http://localhost:3000/ http://localhost:3000/stats
 *   node docs/canopee/tools/contrast-audit.mjs --theme attr http://127.0.0.1:8000/home/index.html
 *
 * Options:
 *   --theme class|attr   How the page switches theme: the app toggles `.dark` on <html> (class,
 *                        the default); the reference mock-ups set `data-theme` (attr).
 *   --widths 1440,375    Viewport widths to test.
 *   --wait 1500          Milliseconds to wait after load, for client-only data (live strip, "Vous").
 *
 * How the background is found: walking up from the text, every solid background is composited and
 * every gradient contributes the colour it has where the text sits. When the walk reaches an
 * element marked `data-photo` (or one of the mock-ups' photo classes), the image is unknown: the
 * text is tested against both a white and a black picture, through every scrim layer between it
 * and the photo, including the photo element's own ::before / ::after gradients. Text that sits on
 * a photo with no scrim or pill at all is reported as "unprotected", because nothing guarantees it.
 *
 * Exit code 1 when any text is below AA, so it can gate a phase.
 */
import { chromium } from '@playwright/test'

const args = process.argv.slice(2)
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`)
  if (i === -1) return fallback
  const value = args[i + 1]
  args.splice(i, 2)
  return value
}
const themeMode = opt('theme', 'class')
const widths = opt('widths', '1440,375').split(',').map(Number)
const wait = Number(opt('wait', '1500'))
const urls = args
if (!urls.length) {
  console.error('Give at least one URL.')
  process.exit(2)
}

/* Runs inside the page. */
function audit () {
  const cv = document.createElement('canvas')
  cv.width = cv.height = 1
  const ctx = cv.getContext('2d', { willReadFrequently: true })
  const px = c => { ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = '#000'; ctx.fillStyle = c; ctx.fillRect(0, 0, 1, 1); const d = ctx.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255] }
  const over = (t, b) => [0, 1, 2].map(i => t[i] * t[3] + b[i] * (1 - t[3])).concat(1)
  const lum = c => { const f = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]) }
  const ratio = (a, b) => { const x = lum(a); const y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05) }
  const PHOTO = '[data-photo], .pod-art, .feature-art'
  const overlaps = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom

  // Splits a computed linear-gradient into its angle and colour stops (positions in %).
  function parseGradient (img) {
    const m = img.match(/^linear-gradient\((.*)\)$/)
    if (!m) return null
    const parts = []; let depth = 0; let cur = ''
    for (const ch of m[1]) {
      if (ch === '(') depth++
      if (ch === ')') depth--
      if (ch === ',' && depth === 0) { parts.push(cur.trim()); cur = '' } else cur += ch
    }
    parts.push(cur.trim())
    let angle = 180
    if (/^-?[\d.]+deg$/.test(parts[0])) angle = parseFloat(parts.shift())
    else if (parts[0].startsWith('to ')) {
      angle = { 'to top': 0, 'to right': 90, 'to bottom': 180, 'to left': 270 }[parts.shift()] ?? 180
    }
    const stops = parts.map((p, i, all) => {
      const pos = p.match(/\s(-?[\d.]+)%$/)
      const color = pos ? p.slice(0, pos.index) : p
      return { c: px(color), at: pos ? parseFloat(pos[1]) : (i / Math.max(all.length - 1, 1)) * 100 }
    })
    return { angle, stops }
  }
  // The gradient's colour at each end of the text box, along the gradient axis.
  function gradientAt (g, box, text) {
    const horizontal = Math.abs(Math.sin((g.angle * Math.PI) / 180)) > 0.7
    const len = horizontal ? box.width : box.height
    const from = horizontal ? text.left - box.left : text.top - box.top
    const to = from + (horizontal ? text.width : text.height)
    const flip = horizontal ? g.angle > 180 : g.angle < 90 || g.angle > 270
    const sample = d => {
      let t = Math.min(Math.max((d / Math.max(len, 1)) * 100, 0), 100)
      if (flip) t = 100 - t
      const s = g.stops
      if (t <= s[0].at) return s[0].c
      for (let i = 1; i < s.length; i++) {
        if (t <= s[i].at) {
          const k = (t - s[i - 1].at) / Math.max(s[i].at - s[i - 1].at, 0.001)
          return s[i - 1].c.map((v, j) => v + (s[i].c[j] - v) * k)
        }
      }
      return s[s.length - 1].c
    }
    return [sample(from), sample(to)]
  }
  function backgrounds (el) {
    const text = el.getBoundingClientRect()
    const layers = []
    let onPhoto = false
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      const cs = getComputedStyle(n)
      // The text is inside a photo, or a photo laid out under it by positioning (a negative
      // margin, an absolute block): either way the picture is what lies beneath.
      const photo = n.matches(PHOTO) ? n : [...n.querySelectorAll(PHOTO)].find(p => !p.contains(el) && overlaps(p.getBoundingClientRect(), text))
      if (photo) {
        // The scrims drawn over the picture; the photo element's own background lies under the image.
        onPhoto = true
        const box = photo.getBoundingClientRect()
        for (const pseudo of ['::after', '::before']) {
          const g = parseGradient(getComputedStyle(photo, pseudo).backgroundImage)
          if (g) layers.push(gradientAt(g, box, text))
        }
        break
      }
      const box = n.getBoundingClientRect()
      // Layers are collected top-down: an element's gradient sits above its own background colour.
      const g = parseGradient(cs.backgroundImage)
      const solid = px(cs.backgroundColor)
      if (g) layers.push(gradientAt(g, box, text))
      if (solid[3] > 0) layers.push([solid])
      if (layers.length && layers[layers.length - 1].every(c => c[3] >= 0.999)) break
    }
    let bases = onPhoto ? [[255, 255, 255, 1], [0, 0, 0, 1]] : [[255, 255, 255, 1]]
    for (let i = layers.length - 1; i >= 0; i--) bases = layers[i].flatMap(c => bases.map(b => over(c, b)))
    const protectedText = !onPhoto || layers.length > 0
    return { bases, onPhoto, protectedText }
  }

  const fails = []
  let count = 0
  for (const el of document.querySelectorAll('body *')) {
    if (!el.offsetParent && getComputedStyle(el).position !== 'fixed') continue
    if (![...el.childNodes].some(c => c.nodeType === 3 && c.textContent.trim())) continue
    if (el.closest('[aria-hidden="true"], .sr-only, [hidden]')) continue
    const cs = getComputedStyle(el)
    if (cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) continue
    const r = el.getBoundingClientRect()
    if (!r.width || !r.height) continue
    count++
    const { bases, onPhoto, protectedText } = backgrounds(el)
    const label = `${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.') : ''} « ${el.textContent.trim().replace(/\s+/g, ' ').slice(0, 40)} »`
    if (onPhoto && !protectedText) { fails.push(`unprotected on photo  ${label}`); continue }
    const fg = px(cs.color)
    const size = parseFloat(cs.fontSize)
    const weight = parseInt(cs.fontWeight, 10)
    const need = size >= 24 || (size >= 18.66 && weight >= 700) ? 3 : 4.5
    const worst = Math.min(...bases.map(b => ratio(over(fg, b), b)))
    if (worst < need) fails.push(`${worst.toFixed(2)} < ${need}${onPhoto ? ' (on photo)' : ''}  ${label}`)
  }
  return { count, fails: [...new Set(fails)] }
}

const browser = await chromium.launch()
let failed = 0
for (const url of urls) {
  for (const width of widths) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } })
    await page.goto(url, { waitUntil: 'networkidle' })
    await page.waitForTimeout(wait)
    // Transitions would be caught half-way through the theme switch.
    await page.addStyleTag({ content: '*,*::before,*::after{transition:none!important;animation:none!important}' })
    for (const theme of ['light', 'dark']) {
      await page.evaluate(({ theme, themeMode }) => {
        const root = document.documentElement
        if (themeMode === 'attr') root.dataset.theme = theme
        else root.classList.toggle('dark', theme === 'dark')
      }, { theme, themeMode })
      await page.waitForTimeout(100)
      const { count, fails } = await page.evaluate(audit)
      failed += fails.length
      console.log(`${fails.length ? 'FAIL' : 'ok  '}  ${url}  ${width}px  ${theme}: ${count} texts, ${fails.length} below AA`)
      for (const f of fails.slice(0, 25)) console.log(`        ${f}`)
      if (fails.length > 25) console.log(`        … and ${fails.length - 25} more`)
    }
    await page.close()
  }
}
await browser.close()
process.exit(failed ? 1 : 0)
