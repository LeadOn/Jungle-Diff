(() => {
  const JD = window.JD
  const $ = (sel, root = document) => root.querySelector(sel)
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)]
  const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches

  /* ---------- Domain helpers (same rules as app/utils/lol-tier.ts) ---------- */
  const TIERS = ['IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'EMERALD', 'DIAMOND', 'MASTER', 'GRANDMASTER', 'CHALLENGER']
  const DIVISIONS = { IV: 0, III: 1, II: 2, I: 3 }
  const TIER_TINTS_V7 = { IRON: '#C9BFB6', BRONZE: '#F1B48A', SILVER: '#CBD4E1', GOLD: '#E3B54F', PLATINUM: '#7EE8D6', EMERALD: '#5BE3A1', DIAMOND: '#9DB2FF', MASTER: '#DA9BFF' }
  const byId = Object.fromEntries(JD.players.map(p => [p.id, p]))
  const tierIndex = tier => TIERS.indexOf(tier)
  const score = r => (tierIndex(r[0]) >= 7 ? 2800 + r[2] : tierIndex(r[0]) * 400 + DIVISIONS[r[1]] * 100 + r[2])
  const tierName = tier => tier.charAt(0) + tier.slice(1).toLowerCase()
  const tierLabel = r => (r ? (tierIndex(r[0]) >= 7 ? tierName(r[0]) : `${tierName(r[0])} ${r[1]}`) : 'Non classé')
  const emblem = r => `img/${r ? r[0].toLowerCase() : 'unranked'}.png`
  const MINUS = '\u2212'
  const signed = n => (n > 0 ? `+${n}` : n < 0 ? `${MINUS}${Math.abs(n)}` : '0')
  const tone = n => (n > 0 ? 'up' : n < 0 ? 'down' : 'flat')
  const winRate = r => Math.round((r[3] * 100) / (r[3] + r[4]))
  const icon = id => `img/icon-${id}.png`
  const ic = (name, cls = '') => `<svg class="i ${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

  /** Ladder for a queue, as `buildLadder` does: ranked by absolute LP, gap to the player above. */
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

  /* =====================================================================
     v7 reproduction
     ===================================================================== */
  function renderV7 () {
    const w = JD.week
    const lad = ladder('solo', false)
    const podium = lad.ranked.slice(0, 3)
    const days = JD.days
    const maxLp = Math.max(...days.map(d => Math.abs(d.lp)))
    const maxMin = Math.max(...days.map(d => d.minutes))
    const wr = Math.round((w.wins * 100) / w.games)
    const prevWr = (w.prevWins * 100) / w.prevGames
    const C = 2 * Math.PI * 46
    const active = JD.active.map(([id]) => `<img src="${icon(byId[id].icon)}" alt="">`).join('')

    const lpBars = days.map(d => {
      const h = (Math.abs(d.lp) / maxLp) * 50
      const style = d.lp >= 0 ? `top:${50 - h}%;height:${h}%;background:var(--v7-win)` : `top:50%;height:${h}%;background:var(--v7-loss)`
      return `<div class="d${d.today ? ' today' : ''}"><div class="bar"><i style="${style}"></i></div><span>${d.initial}</span></div>`
    }).join('')
    const heat = days.map(d => `<div class="d${d.today ? ' today' : ''}"><i class="sq" style="opacity:${(0.18 + 0.82 * d.minutes / maxMin).toFixed(2)}"></i><span>${d.initial}</span></div>`).join('')

    const pcard = (e, i) => {
      const first = i === 0
      const gapText = first ? 'En tête du crew' : `${MINUS}${e.gap} LP de ${esc(e.above)}`
      const form = [...e.r[6]].map(c => `<i class="${c === '1' ? 'w' : ''}"></i>`).join('')
      return `<div class="v7-pcard p${i + 1}${first ? ' first' : ''}">
        <span class="art"><img src="img/splash-${e.p.main}.jpg" alt=""></span>
        <span class="medal">${i + 1}${first ? 'er' : 'e'}</span><span class="cname">${e.p.main}</span>
        <img class="emb" src="${emblem(e.r)}" alt="">
        <img class="av" src="${icon(e.p.icon)}" alt="">
        <span class="nm">${esc(e.p.name)}</span>
        <span class="rk">${tierLabel(e.r)} · ${e.r[2]} LP</span>
        <span class="chips"><span class="lp v7-${e.d7 > 0 ? 'up' : e.d7 < 0 ? 'down' : 'zero'}">${signed(e.d7)} LP</span><span>${winRate(e.r)} % WR</span></span>
        <span class="foot"><span>${gapText}</span><span class="v7-dots">${form}</span></span>
      </div>`
    }

    // Rank track: equal tier bands, greedy lanes so avatars do not sit on each other.
    const { bands, x } = scale(lad.ranked)
    const lanes = []
    const placed = [...lad.ranked].sort((a, b) => a.s - b.s).map(e => {
      const left = x(e.s)
      let lane = lanes.findIndex(last => left - last > 5)
      if (lane === -1) { lanes.push(left); lane = lanes.length - 1 } else lanes[lane] = left
      return { e, left, lane }
    })
    const laneTop = l => 52 + l * 30
    const trackHeight = 40 + lanes.length * 30
    const bandHtml = bands.map((t, i) => `<div class="v7-band" style="left:${(i / bands.length) * 100}%;width:${100 / bands.length}%"><i style="background:${TIER_TINTS_V7[t]}"></i><span><img src="img/${t.toLowerCase()}.png" alt="">${tierName(t)}</span></div>`).join('')
    const dotHtml = placed.map(({ e, left, lane }) => {
      const from = x(e.s - e.d7)
      const trail = e.d7 ? `<span class="v7-trail" style="top:${laneTop(lane)}px;left:${Math.min(from, left)}%;width:${Math.abs(left - from)}%;background:${e.d7 > 0 ? 'var(--v7-win-soft)' : 'var(--v7-loss-soft)'}"></span>` : ''
      return `${trail}<span class="v7-dot${e.pos === 1 ? ' first' : ''}" style="left:${left}%;top:${laneTop(lane)}px"><img src="${icon(e.p.icon)}" alt=""><b>${e.pos}</b></span>`
    }).join('')

    const row = e => {
      const r = e.r
      const ranked = !!r
      const wrv = ranked ? winRate(r) : null
      const form = ranked ? [...r[6]].map(c => `<i class="${c === '1' ? 'w' : ''}"></i>`).join('') : ''
      return `<div class="v7-row">
        <span class="pos${ranked ? '' : ' none'}" style="${ranked ? `background:${TIER_TINTS_V7[r[0]]}` : ''}">${ranked ? e.pos : '—'}</span>
        <span class="idn"><img src="${icon(e.p.icon)}" alt=""><span style="min-width:0"><b>${esc(e.p.name)}</b><span class="d">#${esc(e.p.tag)}</span><span class="m">${tierLabel(r)}${ranked ? ` · ${r[2]} LP` : ''}</span></span></span>
        <span class="tier${ranked ? '' : ' none'}"><img src="${emblem(r)}" alt=""><span><b>${tierLabel(r)}</b><span>${ranked ? `${r[2]} LP` : ''}</span></span></span>
        <span class="gap">${e.gap != null ? `<span>${MINUS}${e.gap} LP</span>` : ''}</span>
        <span class="frm v7-dots">${form}</span>
        <span class="wr" style="color:${wrv == null ? 'var(--v7-text-2)' : wrv >= 50 ? 'var(--v7-green)' : 'var(--v7-red)'}">${wrv == null ? '—' : `${wrv} %`}</span>
        <span class="dl" style="color:${!ranked || !e.d7 ? 'var(--v7-text-2)' : e.d7 > 0 ? 'var(--v7-green)' : 'var(--v7-red)'}">${ranked ? signed(e.d7) : '—'}</span>
      </div>`
    }

    const chips = [`<span class="v7-fchip txt on">Tout le crew <small>${w.games}</small></span>`]
      .concat(JD.active.map(([id, n]) => `<span class="v7-fchip"><img src="${icon(byId[id].icon)}" alt="">${esc(byId[id].name)} <small>${n}</small></span>`)).join('')

    const gameCard = g => {
      const p = byId[g.player]
      const items = g.items.map((it, i) => (it ? `<img class="${i === 6 ? 'tr' : ''}" src="img/item-${it}.png" alt="">` : `<i class="${i === 6 ? 'tr' : ''}"></i>`)).join('')
      const lp = g.lp === 'none' ? '<span class="nolp">Sans LP</span>' : `<span class="lpb v7-${g.lp > 0 ? 'up' : 'down'}">${signed(g.lp)} LP</span>`
      return `<div class="v7-game ${g.win ? 'w' : 'l'}"><span class="bar"></span>
        <span class="ch"><img src="img/champ-${g.champ}.png" alt=""><b>${g.level}</b></span>
        <span class="mid"><span class="t1"><span class="rs">${g.win ? 'Victoire' : 'Défaite'}</span><b>${esc(p.name)}</b></span>
          <span class="t2">${g.champ} · ${g.role} · ${g.queue} · ${g.duration}</span><span class="its">${items}</span></span>
        <span class="kda"><b>${g.k} / ${g.d} / ${g.a}</b><span>${g.ratio} KDA</span></span>
        <span class="clk">${g.time}</span>
        <span class="end"><span class="k2">${g.k} / ${g.d} / ${g.a}</span>${lp}</span>
      </div>`
    }
    const feed = JD.feedDays.map((day, i) => {
      const games = JD.games.filter(g => g.day === i)
      const wins = games.filter(g => g.win).length
      const lpSum = games.filter(g => typeof g.lp === 'number').reduce((s, g) => s + g.lp, 0)
      return `<div class="v7-dayh"><b>${day.label}</b><span class="dt">${day.date}</span><span class="rule"></span><span class="rec">${wins}V · ${games.length - wins}D</span><span class="lpc v7-${lpSum >= 0 ? 'up' : 'down'}">${signed(lpSum)} LP</span></div>
        <div class="v7-games">${games.map(gameCard).join('')}</div>`
    }).join('')

    const potw = JD.playerOfTheWeek
    const pp = byId[potw.player]
    const records = JD.records.map(r => `<div class="v7-rec"><img src="${icon(byId[r.player].icon)}" alt=""><span class="tx"><b>${r.title}</b><span>${esc(byId[r.player].name)} · ${r.date}</span></span><span class="val"><b style="color:${r.tone === 'win' ? 'var(--v7-green)' : 'var(--v7-red)'}">${r.value}</b><span>${r.unit}</span></span></div>`).join('')
    const champs = JD.champions.map(c => `<div class="v7-crow"><span class="ic"><img src="img/champ-${c.name}.png" alt=""><img class="p" src="${icon(byId[c.player].icon)}" alt=""></span>
      <span style="min-width:0"><span class="l1"><b>${c.name}</b><span>surtout ${esc(byId[c.player].name)}</span></span><span class="l2">${c.games} parties · ${c.kda} KDA</span><span class="bar"><i style="width:${c.winRate}%"></i></span></span>
      <span class="wr" style="color:${c.winRate >= 50 ? 'var(--v7-green)' : 'var(--v7-red)'}">${c.winRate} %</span></div>`).join('')

    return `<div class="v7">
      <div class="v7-wash" aria-hidden="true"></div>
      <header class="v7-header"><div class="v7-header-in">
        <span class="v7-logo"><img src="img/logo.png" alt=""><b>JungleDiff</b></span>
        <nav class="v7-nav"><span class="v7-pill on">Accueil</span><span class="v7-pill">Records</span></nav>
        <span class="ds-spacer"></span>
        <span class="v7-search">${ic('search')}<span>Chercher un joueur…</span><kbd>⌘K</kbd></span>
        <span class="v7-round">${ic('moon')}</span>
        <span class="v7-login">Se connecter</span>
      </div></header>
      <div class="v7-main">
        <div class="v7-chips"><span class="v7-chip">${ic('refresh')}Synchro ${JD.sync}</span><span class="v7-chip gold">7 derniers jours · ${JD.windowLabel}</span><span class="v7-chip">EUW · Patch ${JD.patch}</span></div>
        <div class="v7-bento">
          <div class="v7-hero">
            <div class="bg" style="background-image:url('img/splash-Rammus.jpg')"></div><div class="scrim"></div>
            <img class="mascot" src="img/logo.png" alt="">
            <div class="k">Sur 7 jours, le crew a joué</div>
            <div class="big"><b>${w.games}</b><span>parties classées</span></div>
            <span class="pos">${signed(w.games - w.prevGames)} vs les 7 jours précédents</span>
            <div class="act"><span style="display:flex">${active}</span><span>${w.activeCount} joueurs actifs sur ${w.crewSize}</span></div>
          </div>
          <div class="v7-tile">
            <div class="v7-tile-top"><b>Taux de victoire</b><span class="red">${signed(Math.round(wr - prevWr))} pts</span></div>
            <div style="display:flex;flex-wrap:wrap;align-items:center;gap:12px 16px;flex:1">
              <div class="v7-ring"><svg viewBox="0 0 104 104" aria-hidden="true"><circle cx="52" cy="52" r="46" fill="none" stroke-width="12" style="stroke:var(--v7-loss-track)"/><circle cx="52" cy="52" r="46" fill="none" stroke-width="12" style="stroke:var(--v7-win)" stroke-dasharray="${(C * w.wins / w.games).toFixed(1)} ${C.toFixed(1)}"/></svg><b>${wr}%</b></div>
              <div class="v7-legend"><span><i style="background:var(--v7-win)"></i>${w.wins} victoires</span><span><i style="background:var(--v7-loss-track)"></i>${w.losses} défaites</span></div>
            </div>
          </div>
          <div class="v7-tile">
            <div class="v7-tile-top"><b>LP gagnés ensemble</b><span>Solo + Flex</span></div>
            <div class="v7-num red"><b>${signed(w.netLp)}</b><span>LP</span></div>
            <div class="v7-days">${lpBars}</div>
          </div>
          <div class="v7-tile wide">
            <div class="v7-tile-top"><b>Temps de jeu</b><span>${w.avgMinutes} min / partie</span></div>
            <div class="v7-num"><b>${Math.round(w.playMinutes / 60)}</b><span>h</span></div>
            <div class="v7-days heat">${heat}</div>
          </div>
        </div>
        <div class="v7-cols">
          <div class="v7-left">
            <section>
              <div class="v7-lhead">
                <div><h2 class="v7-h2">Classement du crew</h2><p class="v7-sub">${lad.ranked.length} classés · ${lad.total} joueurs</p></div>
                <div class="v7-ctrl"><span class="v7-switch"><i></i>Smurfs</span><span class="v7-seg"><span class="on">Solo/Duo</span><span>Flex</span></span></div>
              </div>
              <div class="v7-podium">${podium.map(pcard).join('')}</div>
              <div class="v7-track">
                <div class="v7-track-head"><b>L'échelle des rangs</b><span>Le trait = progression sur 7 jours</span></div>
                <div class="v7-lanes" style="height:${trackHeight}px">${bandHtml}${dotHtml}</div>
              </div>
              <div class="v7-rows">${lad.ranked.slice(3).concat(lad.unranked).map(row).join('')}</div>
              <div class="v7-invite"><span>Vous jouez avec le crew ? Liez votre compte Riot pour apparaître au classement.</span>${ic('arrow-right')}</div>
            </section>
            <section>
              <h2 class="v7-h2">Dernières parties</h2>
              <p class="v7-sub">Tout le crew, toutes files confondues</p>
              <div class="v7-fchips">${chips}</div>
              ${feed}
              <div class="v7-more">Voir plus de parties</div>
            </section>
          </div>
          <aside class="v7-rail">
            <section class="v7-potw">
              <div class="bg" style="background-image:url('img/splash-${pp.main}.jpg')"></div><div class="scrim"></div>
              <div class="body">
                <span class="lab">Joueur de la semaine</span>
                <div class="idn"><img src="${icon(pp.icon)}" alt=""><span><b>${esc(pp.name)}</b><span><img src="${emblem(pp.solo)}" alt="">${tierLabel(pp.solo)} · ${pp.solo[2]} LP</span></span></div>
                <div class="fig7"><b>${signed(potw.lp)}</b><span>LP</span><small>en 7 jours</small></div>
                <p>${potw.games} parties à ${potw.winRate} % de victoires, dont ${potw.streak} succès d'affilée.</p>
                <span class="cta">Voir sa fiche →</span>
              </div>
            </section>
            <section><div class="v7-rhead"><h3 class="v7-h3">Records du mois</h3><a>Tout voir →</a></div>${records}</section>
            <section class="v7-champs"><h3 class="v7-h3">Champions du crew</h3><span>30 derniers jours</span>${champs}</section>
          </aside>
        </div>
      </div>
      <footer class="v7-footer"><div><span class="ver">JungleDiff · v${JD.version}</span><span class="sup">${ic('heart', 'i-14')}Soutenir le projet</span><span>Créé en France par <b>LeadOn</b></span></div></footer>
      <div class="v7-bottom"><nav><span class="on">Accueil</span><span>Records</span><span class="s">${ic('search')}</span></nav></div>
    </div>`
  }

  /* =====================================================================
     Canopée building blocks (shared by the components page and v8)
     ===================================================================== */
  const lpBadge = lp => (lp === 'none'
    ? '<span class="lp none" title="Partie normale ou remake : aucun LP en jeu">Sans LP</span>'
    : `<span class="lp ${lp > 0 ? 'up' : lp < 0 ? 'down' : 'zero'}">${signed(lp)} LP</span>`)
  const formHtml = f => `<span class="form" aria-label="Forme : ${[...f].map(c => (c === '1' ? 'V' : 'D')).join(' ')}">${[...f].map(c => `<i class="${c === '1' ? 'w' : ''}"></i>`).join('')}</span>`

  /* ---------- Ladder: podium, rank scale, rows ---------- */
  // The mock-up carries four splash arts only; the app reads any champion from Data Dragon.
  const SPLASHES = new Set(['Kindred', 'Lissandra', 'Rammus', 'Viego'])
  const mainName = c => c
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
    return `<a class="pod p${e.pos}${first ? ' first' : ''}${p.id === me ? ' me' : ''}" data-id="pod-${p.id}" href="#v8" style="${tierStyle(r)}" aria-label="${e.pos}${first ? 'er' : 'e'}, ${esc(p.name)}${p.id === me ? ' (vous)' : ''}, ${tierLabel(r)} ${r[2]} LP">
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
    return `<a class="lrow${p.id === me ? ' me' : ''}" data-id="row-${p.id}" href="#v8" style="${tierStyle(r)}" aria-label="${r ? `${e.pos}e, ` : ''}${esc(p.name)}${p.id === me ? ' (vous)' : ''}, ${tierLabel(r)}${r ? ` ${r[2]} LP` : ''}">
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

  function gameRow (g) {
    const p = byId[g.player]
    const items = g.items.map((it, i) => (it ? `<img class="${i === 6 ? 'trinket' : ''}" src="img/item-${it}.png" alt="">` : `<i class="${i === 6 ? 'trinket' : ''}"></i>`)).join('')
    return `<a class="game ${g.win ? 'w' : 'l'}" href="#v8" aria-label="${g.win ? 'Victoire' : 'Défaite'} de ${esc(p.name)} sur ${g.champ}">
      <span class="champ"><img src="img/champ-${g.champ}.png" alt=""><span class="lvl">${g.level}</span></span>
      <span class="game-main"><span class="game-title"><span class="game-res">${g.win ? 'Victoire' : 'Défaite'}</span><b>${esc(p.name)}</b></span><span class="game-meta">${g.champ} · ${g.role} · ${g.queue} · ${g.duration}</span><span class="game-items">${items}</span></span>
      <span class="game-kda"><span class="fig">${g.k} / ${g.d} / ${g.a}</span><span>${g.ratio} KDA</span></span>
      <span class="game-time">${g.time}</span>
      <span class="game-end"><span class="kda-inline">${g.k}/${g.d}/${g.a}</span>${lpBadge(g.lp)}</span>
    </a>`
  }

  function feedHtml (playerId) {
    const html = JD.feedDays.map((day, i) => {
      const games = JD.games.filter(g => g.day === i && (playerId == null || g.player === playerId))
      if (!games.length) return ''
      const wins = games.filter(g => g.win).length
      const known = games.filter(g => typeof g.lp === 'number')
      const lpSum = known.reduce((s, g) => s + g.lp, 0)
      return `<div class="day-head"><b>${day.label}</b><span class="t-mono faint">${day.date}</span><span class="rule"></span><span class="rec">${wins}V · ${games.length - wins}D</span>${known.length ? lpBadge(lpSum) : ''}</div>
        <div class="games-list">${games.map(gameRow).join('')}</div>`
    }).join('')
    if (html) return html
    const p = byId[playerId]
    return `<div class="panel empty" style="margin-top:16px"><p class="t-title">Aucune partie de ${esc(p.name)} dans cette capture</p><p>La maquette ne contient que les 6 dernières parties du crew. Dans l'application, ce filtre interroge <span class="t-mono">/lol/match/player/${p.id}</span>.</p></div>`
  }

  function scoreboard () {
    const w = JD.week
    const days = JD.days
    const maxLp = Math.max(...days.map(d => Math.abs(d.lp)))
    const maxMin = Math.max(...days.map(d => d.minutes))
    const wr = (w.wins * 100) / w.games
    const prevWr = (w.prevWins * 100) / w.prevGames
    const wrDelta = Math.round(wr - prevWr)
    const lpCols = days.map(d => {
      const h = (Math.abs(d.lp) / maxLp) * 50
      return `<span class="d${d.today ? ' today' : ''}" title="${d.label} : ${signed(d.lp)} LP"><span class="lp-col"><i class="${d.lp >= 0 ? 'up' : 'down'}" style="height:${h}%"></i></span><span>${d.initial}</span></span>`
    }).join('')
    const heat = days.map(d => `<span class="d${d.today ? ' today' : ''}" title="${d.label} : ${Math.round(d.minutes / 60)} h, ${d.games} parties"><i class="heat" style="opacity:${(0.14 + 0.86 * d.minutes / maxMin).toFixed(2)}"></i><span>${d.initial}</span></span>`).join('')
    const stack = JD.active.slice(0, 8).map(([id]) => `<img src="${icon(byId[id].icon)}" alt="" title="${esc(byId[id].name)}">`).join('')
    return `<section class="score panel" aria-label="Les 7 derniers jours"><div class="score-grid">
      <div class="score-cell lead">
        <div class="score-top"><span class="t-label">Parties classées</span><span class="delta muted" title="${w.prevGames} les 7 jours précédents">${signed(w.games - w.prevGames)} vs 7 j préc.</span></div>
        <div class="score-fig"><span class="fig">${w.games}</span></div>
        <div style="display:flex;align-items:center;gap:10px"><span class="stack">${stack}</span><span class="t-small muted">${w.activeCount} actifs sur ${w.crewSize}</span></div>
      </div>
      <div class="score-cell">
        <div class="score-top"><span class="t-label">Victoires</span><span class="delta ${tone(wrDelta)}">${signed(wrDelta)} pts</span></div>
        <div class="score-fig"><span class="fig">${Math.round(wr)}</span><span class="unit">%</span></div>
        <div style="display:grid;gap:6px"><span class="split" role="img" aria-label="${w.wins} victoires, ${w.losses} défaites"><i style="width:${wr}%"></i></span><span class="t-mono faint">${w.wins} V · ${w.losses} D</span></div>
      </div>
      <div class="score-cell">
        <div class="score-top"><span class="t-label">LP nets</span><span class="delta faint">Solo + Flex</span></div>
        <div class="score-fig ${tone(w.netLp)}"><span class="fig">${signed(w.netLp)}</span><span class="unit">LP</span></div>
        <div class="days">${lpCols}</div>
      </div>
      <div class="score-cell">
        <div class="score-top"><span class="t-label">Temps de jeu</span><span class="delta faint">${w.avgMinutes} min / partie</span></div>
        <div class="score-fig"><span class="fig">${Math.round(w.playMinutes / 60)}</span><span class="unit">h</span></div>
        <div class="days">${heat}</div>
      </div>
    </div></section>`
  }

  function featureCard () {
    const potw = JD.playerOfTheWeek
    const p = byId[potw.player]
    return `<section class="feature" aria-labelledby="potw-title">
      <div class="feature-art"><img src="img/splash-${p.main}.jpg" alt=""></div>
      <div class="feature-body">
        <span class="t-label" id="potw-title">Joueur de la semaine</span>
        <div class="feature-id"><img src="${icon(p.icon)}" alt=""><span><b>${esc(p.name)}</b><span class="rk"><img src="${emblem(p.solo)}" alt="">${tierLabel(p.solo)} · ${p.solo[2]} LP</span></span></div>
        <div class="feature-fig"><span class="fig">${signed(potw.lp)}</span><small>LP en 7 jours</small></div>
        <div class="feature-stats">
          <div><span class="fig">${potw.games}</span><span>parties</span></div>
          <div><span class="fig">${potw.winRate} %</span><span>victoires</span></div>
          <div><span class="fig">${potw.streak}</span><span>d'affilée</span></div>
        </div>
        <a class="btn btn-night btn-block" href="#v8">Voir sa fiche ${ic('arrow-right')}</a>
      </div>
    </section>`
  }

  const recordsPanel = () => `<section class="panel" aria-labelledby="rec-title">
      <div class="panel-head"><h3 class="t-title" id="rec-title">Records du mois</h3><a class="panel-link" href="#v8">Tout voir ${ic('arrow-right', 'i-14')}</a></div>
      ${JD.records.map(r => `<a class="list-row" href="#v8"><img src="${icon(byId[r.player].icon)}" alt=""><span class="list-main"><b>${r.title}</b><span>${esc(byId[r.player].name)} · ${r.date}</span></span><span class="list-val"><span class="fig">${r.value}</span><small>${r.unit}</small></span></a>`).join('')}
    </section>`

  const championsPanel = () => `<section class="panel" aria-labelledby="ch-title">
      <div class="panel-head"><h3 class="t-title" id="ch-title">Champions du crew</h3><span class="t-mono faint">30 jours</span></div>
      ${JD.champions.map(c => `<div class="list-row champ-row"><span class="champ"><img src="img/champ-${c.name}.png" alt=""><img class="by" src="${icon(byId[c.player].icon)}" alt="" title="Surtout ${esc(byId[c.player].name)}"></span>
        <span class="list-main"><b>${c.name}</b><span>surtout ${esc(byId[c.player].name)} · ${c.games} parties · ${c.kda} KDA</span><span class="split" role="img" aria-label="${c.winRate} % de victoires"><i style="width:${c.winRate}%"></i></span></span>
        <span class="wr ${c.winRate >= 50 ? 'up' : 'down'}">${c.winRate} %</span></div>`).join('')}
    </section>`

  /* =====================================================================
     v8 home
     ===================================================================== */
  const v8State = { queue: 'solo', smurfs: false, player: null }

  function renderV8 () {
    const w = JD.week
    const t = ladderHtml(v8State.queue, v8State.smurfs)
    const chips = [`<button type="button" class="chip no-img" aria-pressed="${v8State.player == null}" data-player="">Tout le crew <span class="n">${w.games}</span></button>`]
      .concat(JD.active.map(([id, n]) => `<button type="button" class="chip" aria-pressed="${v8State.player === id}" data-player="${id}"><img src="${icon(byId[id].icon)}" alt="">${esc(byId[id].name)} <span class="n">${n}</span></button>`)).join('')
    return `<div class="v8">
      <header class="v8-header"><div class="v8-header-in">
        <a class="v8-logo" href="#v8"><img src="img/logo.png" alt=""><b>JungleDiff</b></a>
        <nav class="v8-nav navtabs" aria-label="Navigation principale"><a class="navtab" aria-current="page" href="#v8">Accueil</a><a class="navtab" href="#v8">Records</a></nav>
        <span class="ds-spacer"></span>
        <button type="button" class="search v8-search-wide" data-open-palette>${ic('search')}<span>Chercher un joueur…</span><span class="kbd">⌘K</span></button>
        <button type="button" class="btn btn-quiet btn-icon" aria-label="Changer de thème" data-cycle-theme>${ic('moon')}</button>
        <button type="button" class="btn btn-primary btn-sm">Se connecter</button>
      </div></header>
      <main class="v8-main">
        <div class="v8-intro">
          <h1 class="t-d2">Les 7 derniers jours du crew</h1>
          <div class="v8-status t-mono">
            <button type="button" data-reload title="Relire les données du crew">${ic('refresh', 'i-14')}<span>Synchro ${JD.sync}</span></button>
            <span class="sep"></span><span>${JD.windowLabel}</span><span class="sep"></span><span>EUW · Patch ${JD.patch}</span>
          </div>
        </div>
        ${scoreboard()}
        <div class="v8-cols">
          <div class="v8-left">
            <section class="ladder" aria-labelledby="v8-ladder-title">
              <div class="v8-sec-head">
                <div><h2 class="t-d2" id="v8-ladder-title">Classement du crew</h2><p id="v8-ladder-sub">${t.lad.ranked.length} classés · ${t.lad.total} joueurs · ${v8State.queue === 'solo' ? 'Solo/Duo' : 'Flex'}</p></div>
                <div class="v8-controls">
                  <button type="button" class="switch" role="switch" aria-checked="${v8State.smurfs}" data-v8-smurfs><span class="switch-track"></span>Smurfs</button>
                  <div class="seg" role="group" aria-label="File classée"><button type="button" aria-pressed="${v8State.queue === 'solo'}" data-v8-queue="solo">Solo/Duo</button><button type="button" aria-pressed="${v8State.queue === 'flex'}" data-v8-queue="flex">Flex</button></div>
                </div>
              </div>
              <div id="v8-ladder" class="ladder-body">${t.html}</div>
              <a class="ladder-foot" href="#v8"><span>Vous jouez avec le crew ? Liez votre compte Riot pour apparaître au classement.</span>${ic('arrow-right')}</a>
            </section>
            <section class="games" aria-labelledby="v8-feed-title">
              <div class="v8-sec-head"><div><h2 class="t-d2" id="v8-feed-title">Dernières parties</h2><p>Tout le crew, toutes files confondues</p></div></div>
              <div class="v8-filters" role="group" aria-label="Filtrer par joueur">${chips}</div>
              <div id="v8-feed">${feedHtml(v8State.player)}</div>
              <button type="button" class="btn btn-secondary btn-lg btn-block" style="margin-top:16px" data-more>Voir plus de parties</button>
            </section>
          </div>
          <aside class="v8-rail" aria-label="À côté">
            ${featureCard()}
            ${recordsPanel()}
            ${championsPanel()}
          </aside>
        </div>
      </main>
      <footer class="v8-foot"><div class="v8-foot-in">
        <span class="t-mono">JungleDiff v${JD.version}</span>
        <span>Créé en France par <a href="#v8">LeadOn</a></span>
        <a class="btn btn-secondary btn-sm" href="#v8">${ic('heart', 'i-14')}Soutenir le projet</a>
      </div></footer>
      <div class="v8-bottombar"><nav aria-label="Navigation"><a aria-current="page" href="#v8">Accueil</a><a href="#v8">Records</a><button type="button" aria-label="Chercher un joueur" data-open-palette>${ic('search')}</button></nav></div>
    </div>`
  }

  /** Re-renders the ladder and slides everything to its new place. */
  function updateLadder (root) {
    const box = $('#v8-ladder', root)
    const before = snapshot(box)
    const t = ladderHtml(v8State.queue, v8State.smurfs)
    box.innerHTML = t.html
    $('#v8-ladder-sub', root).textContent = `${t.lad.ranked.length} classés · ${t.lad.total} joueurs · ${v8State.queue === 'solo' ? 'Solo/Duo' : 'Flex'}`
    glide(box, before)
  }

  function mountV8 () {
    const root = $('#v8-frame')
    root.innerHTML = renderV8()
    root.addEventListener('click', ev => {
      const q = ev.target.closest('[data-v8-queue]')
      const s = ev.target.closest('[data-v8-smurfs]')
      const chip = ev.target.closest('[data-player]')
      const reload = ev.target.closest('[data-reload]')
      const more = ev.target.closest('[data-more]')
      if (ev.target.closest('a[href="#v8"]')) ev.preventDefault()
      if (q && q.dataset.v8Queue !== v8State.queue) {
        v8State.queue = q.dataset.v8Queue
        $$('[data-v8-queue]', root).forEach(b => b.setAttribute('aria-pressed', String(b === q)))
        updateLadder(root)
      } else if (s) {
        v8State.smurfs = !v8State.smurfs
        s.setAttribute('aria-checked', String(v8State.smurfs))
        updateLadder(root)
      } else if (chip) {
        v8State.player = chip.dataset.player ? Number(chip.dataset.player) : null
        $$('[data-player]', root).forEach(c => c.setAttribute('aria-pressed', String(c === chip)))
        $('#v8-feed', root).innerHTML = feedHtml(v8State.player)
      } else if (reload) {
        reload.setAttribute('aria-busy', 'true')
        reload.lastElementChild.textContent = 'Chargement…'
        reload.querySelector('.i').style.animation = 'spin 0.9s linear infinite'
        setTimeout(() => {
          reload.removeAttribute('aria-busy')
          reload.querySelector('.i').style.animation = ''
          reload.lastElementChild.textContent = 'Synchro à l\'instant'
        }, 900)
      } else if (more) {
        more.disabled = true
        more.textContent = 'Les 6 parties de la capture sont affichées'
      }
    })
  }

  /* =====================================================================
     Documentation pages
     ===================================================================== */
  function mountComponents () {
    const ladderDemo = $('#demo-ladder')
    if (ladderDemo) ladderDemo.innerHTML = ladderHtml('solo', false, 1).html
    const sig = $('#signature-ladder')
    if (sig) sig.innerHTML = ladderHtml('solo', false).html
    const games = $('#demo-games')
    if (games) games.innerHTML = `<div class="day-head" style="margin-top:0"><b>Hier</b><span class="t-mono faint">mar. 20 oct.</span><span class="rule"></span><span class="rec">1V · 2D</span>${lpBadge(-18)}</div><div class="games-list">${[JD.games[4], JD.games[2], JD.games[1]].map(gameRow).join('')}</div>`
    const score = $('#demo-score')
    if (score) score.innerHTML = scoreboard()
    const rail = $('#demo-rail')
    if (rail) rail.innerHTML = `${featureCard()}<div style="display:grid;gap:16px">${recordsPanel()}${championsPanel()}</div>`

    // Palette: filters the crew list locally, like filterPlayersByName.
    const input = $('#palette-q')
    const list = $('#palette-list')
    if (input && list) {
      const draw = () => {
        const q = input.value.trim().toLowerCase()
        const hits = JD.players.filter(p => !p.smurfOf && (!q || p.name.toLowerCase().includes(q))).slice(0, 5)
        list.innerHTML = hits.length
          ? hits.map((p, i) => `<li role="option" aria-selected="${i === 0}"><img src="${icon(p.icon)}" alt=""><span style="min-width:0"><b style="font-weight:640">${esc(p.name)}</b> <span class="t-mono faint">#${esc(p.tag)}</span><br><span class="t-small muted">${tierLabel(p.solo)}${p.solo ? ` · ${p.solo[2]} LP` : ''}</span></span><img src="${emblem(p.solo)}" alt="" style="width:26px;height:26px;border-radius:0"></li>`).join('')
          : `<li><span></span><span class="muted">Personne du crew ne s'appelle « ${esc(input.value)} ».</span><span></span></li>`
      }
      input.addEventListener('input', draw)
      draw()
    }

    // Interactive specimens: segmented controls, switches, chips.
    document.addEventListener('click', ev => {
      const segBtn = ev.target.closest('.demo .seg button')
      if (segBtn) $$('button', segBtn.parentElement).forEach(b => b.setAttribute('aria-pressed', String(b === segBtn)))
      const sw = ev.target.closest('.demo .switch')
      if (sw) sw.setAttribute('aria-checked', String(sw.getAttribute('aria-checked') !== 'true'))
      const chip = ev.target.closest('.demo .chip')
      if (chip) $$('.chip', chip.parentElement).forEach(c => c.setAttribute('aria-pressed', String(c === chip)))
      const busy = ev.target.closest('[data-demo-busy]')
      if (busy && busy.getAttribute('aria-busy') !== 'true') {
        busy.setAttribute('aria-busy', 'true')
        const label = busy.lastChild.textContent
        busy.lastChild.textContent = ' Synchronisation…'
        setTimeout(() => { busy.removeAttribute('aria-busy'); busy.lastChild.textContent = label }, 1400)
      }
    })

    // Live strip clocks: game length plus time since the API read, ticking each second.
    const clocks = $$('[data-clock]')
    if (clocks.length) {
      const start = Date.now()
      const tick = () => clocks.forEach(el => {
        const s = Number(el.dataset.clock) + Math.floor((Date.now() - start) / 1000)
        el.textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
      })
      tick()
      setInterval(tick, 1000)
    }

    // Motion specimen
    const motionBtn = $('#motion-play')
    if (motionBtn) {
      motionBtn.addEventListener('click', () => {
        $$('.motion-dot').forEach(dot => {
          const track = dot.parentElement
          const dist = track.clientWidth - 38
          const easing = dot.dataset.ease === 'tower' && CSS.supports('transition-timing-function', 'linear(0, 1)')
            ? getComputedStyle(document.documentElement).getPropertyValue('--ease-tower').trim()
            : 'cubic-bezier(0.2, 0.8, 0.2, 1)'
          dot.animate([{ transform: 'translateX(0)' }, { transform: `translateX(${dist}px)` }], { duration: Number(dot.dataset.ms), easing, fill: 'forwards' })
        })
      })
    }
  }

  /* Swatches: both themes side by side, from the same values as canopee.css */
  const SWATCHES = {
    neutrals: [
      ['--paper', 'Fond de page', 'oklch(0.972 0.005 165)', 'oklch(0.165 0.012 165)'],
      ['--surface', 'Panneaux', 'oklch(0.995 0.002 165)', 'oklch(0.198 0.013 165)'],
      ['--sunken', 'Creux, survol, scènes', 'oklch(0.951 0.007 165)', 'oklch(0.145 0.011 165)'],
      ['--line', 'Filets', 'oklch(0.9 0.009 165)', 'oklch(0.3 0.014 165)'],
      ['--ink', 'Texte principal', 'oklch(0.235 0.028 160)', 'oklch(0.945 0.01 150)'],
      ['--ink-2', 'Texte secondaire', 'oklch(0.45 0.02 160)', 'oklch(0.77 0.016 155)'],
      ['--ink-3', 'Métadonnées (AA)', 'oklch(0.52 0.016 160)', 'oklch(0.66 0.016 155)'],
      ['--night', 'Bande sombre fixe', 'oklch(0.235 0.028 160)', 'oklch(0.245 0.022 160)'],
    ],
    brand: [
      ['--canopy', 'Liens, focus (Jour), interrupteur', 'oklch(0.46 0.085 162)', 'oklch(0.77 0.1 160)'],
      ['--gold', '1er, « Vous », focus (Nuit)', 'oklch(0.8 0.135 82)', 'oklch(0.82 0.13 83)'],
      ['--gold-ink', 'Or lisible en texte', 'oklch(0.5 0.1 72)', 'oklch(0.85 0.12 85)'],
    ],
    results: [
      ['--win', 'Victoire, LP gagnés (remplissage)', 'oklch(0.66 0.15 148)', 'oklch(0.72 0.16 148)'],
      ['--win-ink', 'Victoire (texte)', 'oklch(0.47 0.12 150)', 'oklch(0.8 0.15 148)'],
      ['--loss', 'Défaite, LP perdus, direct', 'oklch(0.63 0.17 27)', 'oklch(0.68 0.17 25)'],
      ['--loss-ink', 'Défaite (texte)', 'oklch(0.51 0.16 27)', 'oklch(0.78 0.13 25)'],
    ],
    tiers: [
      ['--t-iron', 'Iron'], ['--t-bronze', 'Bronze'], ['--t-silver', 'Silver'], ['--t-gold', 'Gold'], ['--t-platinum', 'Platinum'],
      ['--t-emerald', 'Emerald'], ['--t-diamond', 'Diamond'], ['--t-master', 'Master'], ['--t-grandmaster', 'Grandmaster'], ['--t-challenger', 'Challenger'],
    ],
    match: [
      ['--side-blue', 'Côté bleu'], ['--side-red', 'Côté rouge (≠ défaite)'], ['--dmg-physical', 'Dégâts physiques'], ['--dmg-magic', 'Dégâts magiques'], ['--dmg-true', 'Dégâts bruts'],
    ],
  }
  function mountSwatches () {
    $$('[data-swatches]').forEach(el => {
      const set = SWATCHES[el.dataset.swatches]
      el.innerHTML = set.map(([token, role, day, night]) => {
        const chip = day
          ? `<span class="sw-chip" title="Jour · Nuit"><i style="background:${day}"></i><i style="background:${night}"></i></span>`
          : `<span class="sw-chip" style="display:block;background:var(${token})"></span>`
        return `<div class="sw">${chip}<span class="sw-text"><b>${token}</b><span>${role}</span></span></div>`
      }).join('')
    })
  }

  /* ---------- Theme ---------- */
  const THEME_KEY = 'canopee-theme'
  function applyTheme (mode) {
    const root = document.documentElement
    if (mode === 'light' || mode === 'dark') root.setAttribute('data-theme', mode)
    else root.removeAttribute('data-theme')
    $$('[data-theme-set]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.themeSet === (mode || 'system'))))
    try { localStorage.setItem(THEME_KEY, mode || 'system') } catch { /* storage unavailable */ }
  }
  function currentTheme () {
    const attr = document.documentElement.getAttribute('data-theme')
    if (attr) return attr
    return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }

  /* ---------- Views (hash routing) ---------- */
  const VIEWS = ['direction', 'v7', 'fondations', 'composants', 'v8', 'tokens']
  function showView (name, scroll) {
    const view = VIEWS.includes(name) ? name : 'direction'
    $$('.ds-view').forEach(v => { v.hidden = v.id !== `view-${view}` })
    $$('.ds-tab').forEach(t => {
      if (t.dataset.view === view) t.setAttribute('aria-current', 'page')
      else t.removeAttribute('aria-current')
    })
    if (scroll) window.scrollTo({ top: 0 })
  }

  document.addEventListener('DOMContentLoaded', () => {
    let stored = 'system'
    try { stored = localStorage.getItem(THEME_KEY) || 'system' } catch { /* storage unavailable */ }
    applyTheme(stored)

    $('#v7-frame').innerHTML = renderV7()
    mountV8()
    mountSwatches()
    mountComponents()

    showView(location.hash.slice(1), false)
    window.addEventListener('hashchange', () => showView(location.hash.slice(1), true))
    $$('.ds-tab').forEach(t => t.addEventListener('click', ev => {
      ev.preventDefault()
      history.replaceState(null, '', `#${t.dataset.view}`)
      showView(t.dataset.view, true)
    }))
    $$('[data-go]').forEach(a => a.addEventListener('click', ev => {
      ev.preventDefault()
      history.replaceState(null, '', `#${a.dataset.go}`)
      showView(a.dataset.go, true)
    }))

    document.addEventListener('click', ev => {
      const set = ev.target.closest('[data-theme-set]')
      if (set) applyTheme(set.dataset.themeSet === 'system' ? null : set.dataset.themeSet)
      if (ev.target.closest('[data-cycle-theme]')) applyTheme(currentTheme() === 'dark' ? 'light' : 'dark')
      if (ev.target.closest('[data-open-palette]')) {
        history.replaceState(null, '', '#composants')
        showView('composants', false)
        $('#spec-search').scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' })
        setTimeout(() => $('#palette-q').focus({ preventScroll: true }), 300)
      }
      const width = ev.target.closest('[data-frame-width]')
      if (width) {
        const frame = $(`#${width.dataset.frame}`)
        frame.dataset.width = width.dataset.frameWidth
        $$(`[data-frame="${width.dataset.frame}"]`).forEach(b => b.setAttribute('aria-pressed', String(b === width)))
      }
      const copy = ev.target.closest('[data-copy]')
      if (copy) {
        const text = $(`#${copy.dataset.copy}`).textContent
        const done = ok => {
          copy.lastChild.textContent = ok ? ' Copié' : ' Sélectionné'
          setTimeout(() => { copy.lastChild.textContent = ' Copier' }, 1600)
        }
        const select = () => {
          const range = document.createRange()
          range.selectNodeContents($(`#${copy.dataset.copy}`))
          const sel = getSelection(); sel.removeAllRanges(); sel.addRange(range)
          done(false)
        }
        try { navigator.clipboard.writeText(text).then(() => done(true), select) } catch { select() }
      }
    })
  })
})()
