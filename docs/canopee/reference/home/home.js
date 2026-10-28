/* Home page mock-up, Canopée. Renders every section from window.JD (crew capture of 21 Oct 2026). */
;(() => {
  const JD = window.JD
  const $ = (sel, root = document) => root.querySelector(sel)
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)]
  const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches

  const ME = 1
  const TIERS = ['IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'EMERALD', 'DIAMOND', 'MASTER', 'GRANDMASTER', 'CHALLENGER']
  const DIVISIONS = { IV: 0, III: 1, II: 2, I: 3 }
  const byId = Object.fromEntries(JD.players.map(p => [p.id, p]))
  const tierIndex = tier => TIERS.indexOf(tier)
  const score = r => (tierIndex(r[0]) >= 7 ? 2800 + r[2] : tierIndex(r[0]) * 400 + DIVISIONS[r[1]] * 100 + r[2])
  const tierName = tier => tier.charAt(0) + tier.slice(1).toLowerCase()
  const tierLabel = r => (r ? (tierIndex(r[0]) >= 7 ? tierName(r[0]) : `${tierName(r[0])} ${r[1]}`) : 'Non classé')
  const emblem = r => `img/${r ? r[0].toLowerCase() : 'unranked'}.png`
  const MINUS = '−'
  const signed = n => (n > 0 ? `+${n}` : n < 0 ? `${MINUS}${Math.abs(n)}` : '0')
  const tone = n => (n > 0 ? 'up' : n < 0 ? 'down' : 'flat')
  const winRate = r => Math.round((r[3] * 100) / (r[3] + r[4]))
  const icon = id => `img/icon-${id}.png`
  const ic = (name, cls = '') => `<svg class="i ${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
  const dec = (n, d = 1) => n.toFixed(d).replace('.', ',')
  const champName = c => ({ Velkoz: "Vel'Koz", MonkeyKing: 'Wukong', MissFortune: 'Miss Fortune' }[c] || c)

  const state = { queue: 'solo', smurfs: false, player: null }

  /* ---------- Opening ---------- */
  function renderOpening () {
    const w = JD.week
    const potw = JD.playerOfTheWeek
    const hero = byId[potw.player]
    const wr = Math.round((w.wins * 100) / w.games)
    const lost = w.netLp < 0
    $('#captured').textContent = JD.capturedAt
    $('#sync-btn span').textContent = `Synchro ${JD.sync}`
    $('#window-label').textContent = `${JD.windowLabel} · 7 jours`
    $('#patch-label').textContent = `EUW · Patch ${JD.patch}`
    $('#version').textContent = `JungleDiff v${JD.version}`
    $('#headline').innerHTML = w.netLp === 0
      ? 'Le crew finit la semaine à l\'équilibre.'
      : `Le crew a ${lost ? 'lâché' : 'pris'} <span class="fig ${tone(w.netLp)}">${Math.abs(w.netLp)}&nbsp;LP</span> cette semaine.`
    $('#standfirst').innerHTML = `${w.games} parties classées à ${wr} % de victoires, par ${w.activeCount} joueurs sur ${w.crewSize}. <b>${esc(hero.name)}</b> ${lost ? 'sauve l\'honneur' : 'mène la remontée'} avec ${signed(potw.lp)} LP.`
  }

  /* ---------- Week ledger ---------- */
  function renderLedger () {
    const w = JD.week
    const days = JD.days.map(d => {
      const [wd, num] = d.label.split(' ')
      return { ...d, wd, num }
    })
    const maxLp = Math.max(...days.map(d => Math.abs(d.lp ?? 0)), 1)
    const maxMin = Math.max(...days.map(d => d.minutes))
    const wr = (w.wins * 100) / w.games
    const prevWr = (w.prevWins * 100) / w.prevGames
    const wrDelta = Math.round(wr - prevWr)
    const gamesDelta = w.games - w.prevGames
    const hours = dec(w.playMinutes / 60)
    const lpTone = n => (n > 0 ? 'up' : n < 0 ? 'down' : 'zero')
    const lpBar = d => (d.lp == null ? '' : `<i class="${lpTone(d.lp)}" style="${d.lp ? `height:${(Math.abs(d.lp) / maxLp) * 50}%` : ''}"></i>`)
    const cell = (d, inner, cls = '') => `<div class="lw-day ${cls}${d.today ? ' today' : ''}" data-day="${d.num}" title="${d.label} : ${d.games} parties, ${d.wins} V ${d.losses} D, ${d.lp == null ? 'LP inconnus' : `${signed(d.lp)} LP`}">${inner}</div>`
    const stack = JD.active.slice(0, 8).map(([id]) => `<img src="${icon(byId[id].icon)}" alt="" title="${esc(byId[id].name)}">`).join('')

    const wide = `<div class="lw" role="table" aria-label="Activité classée du crew, jour par jour">
      <div class="lw-row lw-dates" role="row"><span class="t-label" role="columnheader">Jour</span>${days.map(d => cell(d, `<span>${d.today ? 'auj.' : d.wd}</span><b>${d.num}</b>`)).join('')}<div class="tot" role="columnheader"><span class="t-label faint">7 jours</span></div></div>
      <div class="lw-row" role="row"><span class="t-label" role="rowheader">Parties</span>${days.map(d => cell(d, `<span class="fig fig-s">${d.games}</span>`)).join('')}
        <div class="tot"><span><span class="fig">${w.games}</span></span><span class="delta muted" title="${w.prevGames} les 7 jours précédents">${signed(gamesDelta)} vs 7 j préc.</span></div></div>
      <div class="lw-row" role="row"><span class="t-label" role="rowheader">Bilan</span>${days.map(d => cell(d, `<span class="lw-bilan"><span class="split" aria-hidden="true"><i style="width:${(d.wins * 100) / d.games}%"></i></span><span>${d.wins}–${d.losses}</span></span>`)).join('')}
        <div class="tot"><span><span class="fig">${Math.round(wr)}</span><span class="unit">%</span></span><span class="delta"><span class="faint">${w.wins} V · ${w.losses} D · </span><span class="${tone(wrDelta)}">${signed(wrDelta)} pts</span></span></div></div>
      <div class="lw-row" role="row"><span class="t-label" role="rowheader">LP nets</span>${days.map(d => cell(d, `<span class="lw-lp"><span class="lp-bar" aria-hidden="true">${lpBar(d)}</span><span class="v ${tone(d.lp ?? 0)}">${d.lp == null ? '—' : signed(d.lp)}</span></span>`)).join('')}
        <div class="tot"><span class="${tone(w.netLp)}"><span class="fig">${signed(w.netLp)}</span><span class="unit">LP</span></span><span class="delta faint">Solo/Duo + Flex</span></div></div>
      <div class="lw-row" role="row"><span class="t-label" role="rowheader">Temps</span>${days.map(d => cell(d, `<span class="bar" aria-hidden="true"><i style="width:${(d.minutes * 100) / maxMin}%"></i></span><span>${dec(d.minutes / 60)} h</span>`, 'lw-time')).join('')}
        <div class="tot"><span><span class="fig">${hours}</span><span class="unit">h</span></span><span class="delta faint">${w.avgMinutes} min par partie</span></div></div>
    </div>`

    const narrow = `<div class="ln">
      <div class="ln-tot">
        <div><span class="t-label faint">Parties</span><span class="fig">${w.games}</span><span class="delta muted">${signed(gamesDelta)} vs 7 j préc.</span></div>
        <div><span class="t-label faint">Victoires</span><span><span class="fig">${Math.round(wr)}</span><span class="unit"> %</span></span><span class="delta ${tone(wrDelta)}">${signed(wrDelta)} pts</span></div>
        <div><span class="t-label faint">LP nets</span><span class="fig ${tone(w.netLp)}">${signed(w.netLp)}</span><span class="delta faint">Solo/Duo + Flex</span></div>
        <div><span class="t-label faint">Temps de jeu</span><span><span class="fig">${hours}</span><span class="unit"> h</span></span><span class="delta faint">${w.avgMinutes} min par partie</span></div>
      </div>
      <div class="ln-days">${days.map(d => `<div class="ln-day${d.today ? ' today' : ''}">
        <span class="d"><b>${d.wd} ${d.num}</b><span>${d.wins} V · ${d.losses} D</span></span>
        <span class="n">${d.games}</span>
        <span class="ln-lp" aria-hidden="true">${d.lp ? `<i class="${d.lp > 0 ? 'up' : 'down'}" style="width:${(Math.abs(d.lp) / maxLp) * 50}%"></i>` : ''}</span>
        <span class="v ${tone(d.lp ?? 0)}">${d.lp == null ? '—' : `${signed(d.lp)} LP`}</span>
      </div>`).join('')}</div>
    </div>`

    $('#ledger').innerHTML = `<div class="ledger-head">
        <h2 class="t-title">La semaine jour par jour</h2>
        <span class="who-played"><span class="stack">${stack}</span><span class="t-small">${w.activeCount} joueurs actifs sur ${w.crewSize}</span></span>
      </div>${wide}${narrow}`

    const lw = $('.lw')
    lw.addEventListener('pointerover', ev => {
      const c = ev.target.closest('[data-day]')
      $$('.hl', lw).forEach(el => el.classList.remove('hl'))
      if (!c) { delete lw.dataset.hover; return }
      lw.dataset.hover = ''
      $$(`[data-day="${c.dataset.day}"]`, lw).forEach(el => el.classList.add('hl'))
    })
    lw.addEventListener('pointerleave', () => { delete lw.dataset.hover })
  }

  /* ---------- Live strip (example) ---------- */
  const LIVE = [
    { player: 40, champ: 'Samira', queue: 'Flex', seconds: 754 },
    { player: 42, champ: 'Velkoz', queue: 'Solo/Duo', seconds: 1302 },
  ]
  const clock = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  function renderLive () {
    $('#live').innerHTML = `<span class="live-label"><span class="live-dot"></span>En partie</span>${LIVE.map((g, i) => `<span class="live-item"><img src="img/champ-${g.champ}.png" alt=""><span><b>${esc(byId[g.player].name)}</b><br><span>${champName(g.champ)} · ${g.queue}</span></span><span class="live-clock" data-live="${i}">${clock(g.seconds)}</span></span>`).join('')}`
    setInterval(() => {
      LIVE.forEach((g, i) => {
        g.seconds += 1
        const el = $(`[data-live="${i}"]`)
        if (el) el.textContent = clock(g.seconds)
      })
    }, 1000)
  }

  /* ---------- Ladder data ---------- */
  function ladder (queue, includeSmurfs) {
    const list = JD.players.filter(p => includeSmurfs || !p.smurfOf)
    const ranked = list.filter(p => p[queue]).map(p => ({ p, r: p[queue], s: score(p[queue]), d7: p[queue][5] ?? 0 }))
      .sort((a, b) => b.s - a.s)
    ranked.forEach((e, i) => {
      e.pos = i + 1
      e.gap = i ? ranked[i - 1].s - e.s : null
      e.above = i ? ranked[i - 1].p.name : null
    })
    // Position a week ago, derived from today's LP minus the 7-day change.
    ;[...ranked].sort((a, b) => (b.s - b.d7) - (a.s - a.d7)).forEach((e, i) => { e.prevPos = i + 1 })
    const unranked = list.filter(p => !p[queue]).map(p => ({ p, r: null }))
    return { ranked, unranked, total: list.length }
  }

  /** Maps an absolute LP score onto [0, 100] across equal-width tier bands. */
  function scale (ranked) {
    const tiers = ranked.map(e => Math.min(tierIndex(e.r[0]), 7))
    const lo = Math.min(...tiers)
    const hi = Math.max(...tiers)
    const bands = TIERS.slice(lo, hi + 1)
    const x = s => {
      const t = Math.min(s >= 2800 ? 7 : Math.floor(s / 400), 7)
      const frac = t >= 7 ? Math.min((s - 2800) / 1000, 0.94) : (s - t * 400) / 400
      return Math.max(0, Math.min(100, ((t - lo + frac) / bands.length) * 100))
    }
    return { bands, x }
  }

  const formHtml = f => `<span class="form" aria-label="Forme : ${[...f].map(c => (c === '1' ? 'V' : 'D')).join(' ')}">${[...f].map(c => `<i class="${c === '1' ? 'w' : ''}"></i>`).join('')}</span>`

  /* ---------- Ladder: podium, rank scale, rows ---------- */
  // The mock-up carries four splash arts only; the app reads any champion from Data Dragon.
  const SPLASHES = new Set(['Kindred', 'Lissandra', 'Rammus', 'Viego'])
  const mainName = c => champName(c)
  const tierStyle = r => (r ? `--tier: var(--t-${r[0].toLowerCase()})` : '')
  const meChip = (p, me) => (p.id === me ? '<span class="status me">Vous</span>' : '')
  const smurfChip = p => (p.smurfOf ? `<span class="status smurf" title="Compte secondaire de ${esc(byId[p.smurfOf].name)}">Smurf</span>` : '')
  const lpTone = n => (n > 0 ? 'up' : n < 0 ? 'down' : 'zero')

  function podiumCard (e, me) {
    const p = e.p
    const r = e.r
    const first = e.pos === 1
    const splash = SPLASHES.has(p.main)
    const art = splash ? `<img src="img/splash-${p.main}.jpg" alt="">` : (p.main ? `<img src="img/champ-${p.main}.png" alt="">` : '')
    const gap = first ? 'En tête du crew' : `${MINUS}${e.gap} LP de ${esc(e.above)}`
    return `<a class="pod p${e.pos}${first ? ' first' : ''}${p.id === me ? ' me' : ''}" data-id="pod-${p.id}" href="#top" data-mock="La fiche de ${esc(p.name)} n'est pas dans cette maquette." style="${tierStyle(r)}" aria-label="${e.pos}${first ? 'er' : 'e'}, ${esc(p.name)}${p.id === me ? ' (vous)' : ''}, ${tierLabel(r)} ${r[2]} LP">
      <span class="pod-art${splash ? '' : ' icon'}">${art}<span class="pod-medal">${e.pos}${first ? 'er' : 'e'}</span><span class="pod-champ">${p.main ? mainName(p.main) : ''}</span></span>
      <img class="pod-emb" src="${emblem(r)}" alt="">
      <span class="avatar pod-av"><img src="${icon(p.icon)}" alt=""></span>
      <span class="pod-body">
        <span class="pod-name"><b>${esc(p.name)}</b>${meChip(p, me)}${smurfChip(p)}</span>
        <span class="pod-rank">${tierLabel(r)} · ${r[2]} LP</span>
        <span class="pod-chips"><span class="lp ${lpTone(e.d7)}" title="Variation sur 7 jours">${signed(e.d7)} LP</span><span class="pod-wr">${winRate(r)} % V</span></span>
        <span class="pod-foot"><span>${gap}</span>${formHtml(r[6])}</span>
      </span>
    </a>`
  }

  /** Rank scale: equal tier bands, avatars in greedy lanes so they do not sit on each other. */
  function scaleHtml (lad, me) {
    const { bands, x } = scale(lad.ranked)
    // An avatar is 30 px wide: the lane gap in % follows the width the scale will have.
    const width = innerWidth >= 1100 ? 640 : Math.max(innerWidth - 90, 240)
    const gapPct = (36 / width) * 100
    const lanes = []
    const placed = [...lad.ranked].sort((a, b) => a.s - b.s).map(e => {
      const left = x(e.s)
      let lane = lanes.findIndex(last => left - last > gapPct)
      if (lane === -1) { lanes.push(left); lane = lanes.length - 1 } else lanes[lane] = left
      return { e, left, lane }
    })
    const laneTop = l => 42 + l * 34
    const height = 52 + lanes.length * 34
    const bandHtml = bands.map((t, i) => `<span class="scale-band" style="left:${(i / bands.length) * 100}%;width:${100 / bands.length}%;--tier:var(--t-${t.toLowerCase()})"><span class="scale-name"><img src="img/${t.toLowerCase()}.png" alt=""><b>${tierName(t)}</b></span></span>`).join('')
    const dotHtml = placed.map(({ e, left, lane }) => {
      const from = x(e.s - e.d7)
      const trail = e.d7 ? `<span class="scale-trail ${e.d7 > 0 ? 'up' : 'down'}" style="top:${laneTop(lane) + 12}px;left:${Math.min(from, left)}%;width:${Math.abs(left - from)}%"></span>` : ''
      return `${trail}<span class="scale-dot${e.pos === 1 ? ' first' : ''}${e.p.id === me ? ' me' : ''}" data-id="dot-${e.p.id}" style="left:${left}%;top:${laneTop(lane)}px;${tierStyle(e.r)}" title="${esc(e.p.name)} · ${tierLabel(e.r)} ${e.r[2]} LP"><img src="${icon(e.p.icon)}" alt=""><b>${e.pos}</b></span>`
    }).join('')
    const summary = bands.slice().reverse().map(t => {
      const names = lad.ranked.filter(e => e.r[0] === t || (t === 'MASTER' && tierIndex(e.r[0]) >= 7)).map(e => e.p.name)
      return names.length ? `${tierName(t)} : ${names.join(', ')}` : ''
    }).filter(Boolean).join('. ')
    return `<section class="panel rscale-card" aria-label="L'échelle des rangs">
      <div class="panel-head"><h3 class="t-title">L'échelle des rangs</h3><span class="t-small muted">Le trait montre la progression sur 7 jours</span></div>
      <div class="rscale" style="height:${height}px" role="img" aria-label="${esc(summary)}">${bandHtml}${dotHtml}</div>
    </section>`
  }

  function ladderRow (e, me) {
    const p = e.p
    const r = e.r
    const main = p.smurfOf ? byId[p.smurfOf] : null
    const wrv = r ? winRate(r) : null
    return `<a class="lrow${p.id === me ? ' me' : ''}" data-id="row-${p.id}" href="#top" data-mock="La fiche de ${esc(p.name)} n'est pas dans cette maquette." style="${tierStyle(r)}" aria-label="${r ? `${e.pos}e, ` : ''}${esc(p.name)}${p.id === me ? ' (vous)' : ''}, ${tierLabel(r)}${r ? ` ${r[2]} LP` : ''}">
      <span class="lpos${r ? '' : ' none'}">${r ? e.pos : '—'}</span>
      <span class="lid"><span class="avatar"><img src="${icon(p.icon)}" alt=""></span>
        <span class="lname"><span class="lname-top"><b>${esc(p.name)}</b>${meChip(p, me)}${smurfChip(p)}</span>
          <span class="lsub lsub-tag">#${esc(p.tag)}${main ? ` · de ${esc(main.name)}` : ''}</span>
          <span class="lsub lsub-rank">${tierLabel(r)}${r ? ` · ${r[2]} LP` : ''}</span></span></span>
      <span class="ltier${r ? '' : ' none'}"><img src="${emblem(r)}" alt=""><span><b>${tierLabel(r)}</b><span>${r ? `${r[2]} LP` : ''}</span></span></span>
      <span class="lgap">${e.gap != null ? `<span class="gap-chip" title="${e.gap} LP pour dépasser ${esc(e.above)}">${MINUS}${e.gap} LP</span>` : ''}</span>
      <span class="lform">${r ? formHtml(r[6]) : ''}</span>
      <span class="lwr${wrv == null ? '' : wrv >= 50 ? ' win' : ' loss'}">${wrv == null ? '—' : `${wrv} %`}</span>
      <span class="ld7 fig ${r ? tone(e.d7) : ''}">${r ? signed(e.d7) : '—'}</span>
    </a>`
  }

  function ladderHtml (queue, smurfs, me) {
    const lad = ladder(queue, smurfs)
    const rest = lad.ranked.slice(3).map(e => ladderRow(e, me)).join('')
    const unranked = lad.unranked.length ? `<div class="lgroup t-label">Non classés · ${lad.unranked.length}</div>${lad.unranked.map(e => ladderRow(e, me)).join('')}` : ''
    const html = `<div class="podium">${lad.ranked.slice(0, 3).map(e => podiumCard(e, me)).join('')}</div>${scaleHtml(lad, me)}${rest || unranked ? `<section class="panel lrows" aria-label="Suite du classement">${rest}${unranked}</section>` : ''}`
    return { html, lad }
  }

  const snapshot = box => new Map($$('[data-id]', box).map(el => { const b = el.getBoundingClientRect(); return [el.dataset.id, { x: b.left, y: b.top }] }))

  /** Slides every card, avatar and row from where it was to its new place (FLIP). */
  function glide (box, before) {
    if (reduceMotion() || !box.animate) return
    const easing = CSS.supports('transition-timing-function', 'linear(0, 1)') ? getComputedStyle(document.documentElement).getPropertyValue('--ease-tower').trim() : 'cubic-bezier(0.2, 0.8, 0.2, 1)'
    $$('[data-id]', box).forEach((el, i) => {
      const was = before.get(el.dataset.id)
      if (!was) {
        el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 240, delay: 120, fill: 'backwards' })
        return
      }
      const b = el.getBoundingClientRect()
      const dx = was.x - b.left
      const dy = was.y - b.top
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return
      el.classList.add('moving')
      el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: 620, easing, delay: Math.min(i * 12, 180), fill: 'backwards' })
        .finished.then(() => el.classList.remove('moving'), () => {})
    })
  }

  function renderLadder (animate) {
    const box = $('#ladder-body')
    const before = animate ? snapshot(box) : null
    const t = ladderHtml(state.queue, state.smurfs, ME)
    box.innerHTML = t.html
    const me = t.lad.ranked.find(e => e.p.id === ME)
    const queueLabel = state.queue === 'solo' ? 'Solo/Duo' : 'Flex'
    const mine = me
      ? ` · <b>Vous êtes ${me.pos}e</b>${me.gap != null ? `, à ${me.gap} LP de ${esc(me.above)}` : ''}`
      : ''
    $('#tower-sub').innerHTML = `${queueLabel} · ${t.lad.ranked.length} classés sur ${t.lad.total} comptes${mine}`
    if (animate) glide(box, before)
  }

  /* ---------- Feed ---------- */
  const lpBadge = lp => (lp === 'none'
    ? '<span class="lp none" title="Partie normale ou remake : aucun LP en jeu">Sans LP</span>'
    : `<span class="lp ${lp > 0 ? 'up' : lp < 0 ? 'down' : 'zero'}">${signed(lp)} LP</span>`)

  function gameRow (g) {
    const p = byId[g.player]
    const items = g.items.map((it, i) => (it ? `<img class="${i === 6 ? 'trinket' : ''}" src="img/item-${it}.png" alt="">` : `<i class="${i === 6 ? 'trinket' : ''}"></i>`)).join('')
    return `<a class="game ${g.win ? 'w' : 'l'}" href="#top" data-mock="La page de partie n'est pas dans cette maquette." aria-label="${g.win ? 'Victoire' : 'Défaite'} de ${esc(p.name)} sur ${champName(g.champ)}">
      <span class="champ"><img src="img/champ-${g.champ}.png" alt=""><span class="lvl">${g.level}</span></span>
      <span class="game-main"><span class="game-title"><span class="game-res">${g.win ? 'Victoire' : 'Défaite'}</span><b>${esc(p.name)}</b>${p.id === ME ? '<span class="status me">Vous</span>' : ''}</span><span class="game-meta">${champName(g.champ)} · ${g.role} · ${g.queue} · ${g.duration}</span><span class="game-items">${items}</span></span>
      <span class="game-kda"><span class="fig">${g.k} / ${g.d} / ${g.a}</span><span>${g.ratio} KDA</span></span>
      <span class="game-time">${g.time}</span>
      <span class="game-end"><span class="kda-inline">${g.k}/${g.d}/${g.a}</span>${lpBadge(g.lp)}</span>
    </a>`
  }

  function renderFilters () {
    const chips = [`<button type="button" class="chip no-img" aria-pressed="${state.player == null}" data-player="">Tout le crew</button>`]
      .concat(JD.active
        .filter(([id]) => state.smurfs || !byId[id].smurfOf)
        .map(([id, n]) => `<button type="button" class="chip" aria-pressed="${state.player === id}" data-player="${id}" title="${n} parties classées sur 7 jours"><img src="${icon(byId[id].icon)}" alt="">${esc(byId[id].name)} <span class="n">${n}</span></button>`))
    $('#filters').innerHTML = chips.join('')
  }

  function renderFeed () {
    const html = JD.feedDays.map((day, i) => {
      const games = JD.games.filter(g => g.day === i && (state.player == null || g.player === state.player))
      if (!games.length) return ''
      const wins = games.filter(g => g.win).length
      const known = games.filter(g => typeof g.lp === 'number')
      const lpSum = known.reduce((s, g) => s + g.lp, 0)
      return `<div class="day-head"><b>${day.label}</b><span class="t-mono faint">${day.date}</span><span class="rule"></span><span class="rec">${wins} V · ${games.length - wins} D</span>${known.length ? lpBadge(lpSum) : ''}</div>
        <div class="games-list">${games.map(gameRow).join('')}</div>`
    }).join('')
    if (html) {
      $('#feed').innerHTML = html
      return
    }
    const p = byId[state.player]
    $('#feed').innerHTML = `<div class="panel empty" style="margin-top:16px"><p class="t-title">Pas de partie de ${esc(p.name)} parmi les six dernières du crew</p><p>Dans l'application, ce filtre charge ses propres parties depuis <span class="t-mono">/lol/match/player/${p.id}</span>. La maquette n'a capturé que la première page du fil.</p></div>`
  }

  /* ---------- Rail ---------- */
  function renderRail () {
    const potw = JD.playerOfTheWeek
    const p = byId[potw.player]
    const feature = `<section class="feature" aria-labelledby="potw-title">
      <div class="feature-art"><img src="img/splash-${p.main}.jpg" alt=""></div>
      <div class="feature-body">
        <span class="t-label" id="potw-title">Joueur de la semaine</span>
        <div class="feature-id"><img src="${icon(p.icon)}" alt=""><span><b>${esc(p.name)}</b><span class="rk"><img src="${emblem(p.solo)}" alt="">${tierLabel(p.solo)} · ${p.solo[2]} LP</span></span></div>
        <div class="feature-fig"><span class="fig">${signed(potw.lp)}</span><small>LP en 7 jours</small></div>
        <div class="feature-stats">
          <div><span class="fig">${potw.games}</span><span>parties</span></div>
          <div><span class="fig">${potw.winRate} %</span><span>victoires</span></div>
          <div><span class="fig">${potw.streak}</span><span>victoires d'affilée</span></div>
        </div>
        <a class="btn btn-night btn-block" href="#top" data-mock="La fiche de ${esc(p.name)} n'est pas dans cette maquette.">Voir sa fiche ${ic('arrow-right')}</a>
      </div>
    </section>`
    const records = `<section class="panel" aria-labelledby="rec-title">
      <div class="panel-head"><h3 class="t-title" id="rec-title">Records du mois</h3><a class="panel-link" href="#top" data-mock="La page Records n'est pas dans cette maquette.">Tout voir ${ic('arrow-right', 'i-14')}</a></div>
      ${JD.records.map(r => `<a class="list-row" href="#top" data-mock="La page de partie n'est pas dans cette maquette."><img src="${icon(byId[r.player].icon)}" alt=""><span class="list-main"><b>${r.title}</b><span>${esc(byId[r.player].name)} · ${r.date}</span></span><span class="list-val"><span class="fig">${r.value}</span><small>${r.unit}</small></span></a>`).join('')}
    </section>`
    const champions = `<section class="panel" aria-labelledby="ch-title">
      <div class="panel-head"><h3 class="t-title" id="ch-title">Champions du crew</h3><span class="t-mono faint">30 jours</span></div>
      ${JD.champions.map(c => `<div class="list-row champ-row"><span class="champ"><img src="img/champ-${c.name}.png" alt=""><img class="by" src="${icon(byId[c.player].icon)}" alt="" title="Surtout ${esc(byId[c.player].name)}"></span>
        <span class="list-main"><b>${champName(c.name)}</b><span>surtout ${esc(byId[c.player].name)} · ${c.games} parties · ${c.kda} KDA</span><span class="split" role="img" aria-label="${c.winRate} % de victoires"><i style="width:${c.winRate}%"></i></span></span>
        <span class="wr ${c.winRate >= 50 ? 'up' : 'down'}">${c.winRate} %</span></div>`).join('')}
    </section>`
    $('#rail').innerHTML = feature + records + champions
  }

  /* ---------- Toast for links the mock-up does not cover ---------- */
  let toastTimer
  function toast (text) {
    $('#toast-text').textContent = text
    $('#toast').hidden = false
    clearTimeout(toastTimer)
    toastTimer = setTimeout(() => { $('#toast').hidden = true }, 2600)
  }

  /* ---------- Search palette ---------- */
  let paletteIndex = 0
  let paletteResults = []
  const norm = s => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
  function renderPalette () {
    const q = norm($('#palette-q').value.trim())
    paletteResults = JD.players.filter(p => !q || norm(`${p.name}#${p.tag}`).includes(q)).slice(0, 8)
    paletteIndex = Math.min(paletteIndex, Math.max(paletteResults.length - 1, 0))
    $('#palette-list').innerHTML = paletteResults.length
      ? paletteResults.map((p, i) => `<li role="option" id="pal-${p.id}" aria-selected="${i === paletteIndex}" data-pal="${i}"><img src="${icon(p.icon)}" alt=""><span class="who"><span class="who-name"><b>${esc(p.name)}</b>${p.id === ME ? '<span class="status me">Vous</span>' : ''}${p.smurfOf ? '<span class="status smurf">Smurf</span>' : ''}</span><span class="who-sub">#${esc(p.tag)}</span></span><span class="rank${p.solo ? '' : ' unranked'}"><img src="${emblem(p.solo)}" alt=""><b>${tierLabel(p.solo)}</b></span></li>`).join('')
      : '<li class="palette-empty" role="presentation">Personne dans le crew ne porte ce nom.</li>'
    const sel = paletteResults[paletteIndex]
    $('#palette-q').setAttribute('aria-activedescendant', sel ? `pal-${sel.id}` : '')
  }
  function openPalette () {
    $('#palette-overlay').hidden = false
    $('#palette-q').value = ''
    paletteIndex = 0
    renderPalette()
    $('#palette-q').focus()
  }
  const closePalette = () => { $('#palette-overlay').hidden = true }
  function pick (i) {
    const p = paletteResults[i]
    if (!p) return
    closePalette()
    toast(`La fiche de ${p.name} n'est pas dans cette maquette.`)
  }

  /* ---------- Theme ---------- */
  const THEME_KEY = 'jd-v8-theme'
  const effectiveTheme = () => document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  function syncThemeButton () {
    const dark = effectiveTheme() === 'dark'
    const btn = $('#theme-btn')
    btn.setAttribute('aria-label', dark ? 'Passer en thème clair' : 'Passer en thème sombre')
    btn.querySelector('use').setAttribute('href', dark ? '#i-sun' : '#i-moon')
  }
  function initTheme () {
    try {
      const saved = localStorage.getItem(THEME_KEY)
      if (saved === 'dark' || saved === 'light') document.documentElement.dataset.theme = saved
    } catch { /* storage unavailable: keep the system theme */ }
    syncThemeButton()
    $('#theme-btn').addEventListener('click', () => {
      const next = effectiveTheme() === 'dark' ? 'light' : 'dark'
      document.documentElement.dataset.theme = next
      try { localStorage.setItem(THEME_KEY, next) } catch { /* storage unavailable */ }
      syncThemeButton()
    })
  }

  /* ---------- Wiring ---------- */
  function wire () {
    document.addEventListener('click', ev => {
      const t = ev.target
      const mock = t.closest('[data-mock]')
      if (mock) {
        ev.preventDefault()
        toast(mock.dataset.mock)
        return
      }
      const q = t.closest('[data-queue]')
      if (q && q.dataset.queue !== state.queue) {
        state.queue = q.dataset.queue
        $$('[data-queue]').forEach(b => b.setAttribute('aria-pressed', String(b === q)))
        renderLadder(true)
        return
      }
      const chip = t.closest('[data-player]')
      if (chip) {
        state.player = chip.dataset.player ? Number(chip.dataset.player) : null
        $$('[data-player]').forEach(c => c.setAttribute('aria-pressed', String(c === chip)))
        renderFeed()
        return
      }
      if (t.closest('[data-open-palette]')) { openPalette(); return }
      if (t.closest('[data-open-notes]')) { $('#notes-overlay').hidden = false; $('[data-close-notes]').focus(); return }
      if (t.closest('[data-close-notes]') || t.id === 'notes-overlay') { $('#notes-overlay').hidden = true; return }
      if (t.id === 'palette-overlay') { closePalette(); return }
      const li = t.closest('[data-pal]')
      if (li) pick(Number(li.dataset.pal))
    })

    $('#smurf-switch').addEventListener('click', ev => {
      state.smurfs = !state.smurfs
      ev.currentTarget.setAttribute('aria-checked', String(state.smurfs))
      // A smurf picked in the player chips is dropped when smurfs leave the page.
      if (!state.smurfs && state.player && byId[state.player].smurfOf) state.player = null
      renderLadder(true)
      renderFilters()
      renderFeed()
    })

    $('#sync-btn').addEventListener('click', ev => {
      const b = ev.currentTarget
      if (b.getAttribute('aria-busy') === 'true') return
      b.setAttribute('aria-busy', 'true')
      b.lastElementChild.textContent = 'Chargement…'
      setTimeout(() => {
        b.removeAttribute('aria-busy')
        b.lastElementChild.textContent = 'Synchro à l\'instant'
      }, 900)
    })

    $('#more').addEventListener('click', ev => {
      ev.currentTarget.disabled = true
      ev.currentTarget.textContent = 'La maquette ne contient que la première page du fil'
    })

    $('#palette-q').addEventListener('input', () => { paletteIndex = 0; renderPalette() })
    document.addEventListener('keydown', ev => {
      const open = !$('#palette-overlay').hidden
      const typing = /^(INPUT|TEXTAREA)$/.test(document.activeElement?.tagName || '')
      if ((ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === 'k') { ev.preventDefault(); open ? closePalette() : openPalette(); return }
      if (ev.key === '/' && !open && !typing) { ev.preventDefault(); openPalette(); return }
      if (ev.key === 'Escape') { closePalette(); $('#notes-overlay').hidden = true; return }
      if (!open) return
      if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
        ev.preventDefault()
        const n = paletteResults.length
        if (!n) return
        paletteIndex = (paletteIndex + (ev.key === 'ArrowDown' ? 1 : n - 1)) % n
        renderPalette()
      } else if (ev.key === 'Enter') {
        ev.preventDefault()
        pick(paletteIndex)
      }
    })
  }

  renderOpening()
  renderLedger()
  renderLive()
  renderLadder(false)
  renderFilters()
  renderFeed()
  renderRail()
  initTheme()
  wire()
})()
