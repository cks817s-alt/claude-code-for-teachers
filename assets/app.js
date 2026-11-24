(function () {
  'use strict';
  const LEVELS = window.LEVELS, CARDS = window.CARDS;
  const view = document.getElementById('view');
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const strip = (s) => String(s ?? '').replace(/<[^>]+>/g, ' ');

  // 썸네일 색 [배경, 글자] — 카드 순서대로 돌아가며 씀
  const PALETTE = [
    ['#0d0c22', '#ffffff'], ['#fde7f0', '#0d0c22'], ['#ffe94d', '#0d0c22'], ['#2f5bff', '#ffffff'],
    ['#d7eedf', '#0d0c22'], ['#e6e1ff', '#0d0c22'], ['#f7d4bf', '#0d0c22'], ['#ea4c89', '#ffffff'],
    ['#cfe6ff', '#0d0c22'], ['#1f3b2d', '#ffffff'], ['#f3f3f4', '#0d0c22'], ['#2a1f5c', '#ffffff'],
  ];
  const colorOf = (c) => PALETTE[CARDS.indexOf(c) % PALETTE.length];

  // ── 저장(이 브라우저에만) ──
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* 저장 못 해도 화면은 동작 */ } },
  };
  let done = store.get('cct-done', {});
  const isDone = (id) => !!done[id];
  const toggle = (id) => { if (done[id]) delete done[id]; else done[id] = 1; store.set('cct-done', done); };

  // ── 글자 크기 ──
  let fz = store.get('cct-fz', 16);
  const applyFz = () => document.documentElement.style.setProperty('--fz', fz + 'px');
  applyFz();
  document.querySelectorAll('[data-fz]').forEach((b) => b.addEventListener('click', () => {
    fz = Math.min(22, Math.max(13, fz + Number(b.dataset.fz))); store.set('cct-fz', fz); applyFz();
  }));

  // ── 알림 ──
  const toastEl = document.getElementById('toast');
  let tt;
  const toast = (m) => { toastEl.textContent = m; toastEl.classList.add('on'); clearTimeout(tt); tt = setTimeout(() => toastEl.classList.remove('on'), 1800); };

  // ── 복사 ──
  const copyText = async (text) => {
    try { await navigator.clipboard.writeText(text); return true; } catch (e) {
      const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select(); let ok = false; try { ok = document.execCommand('copy'); } catch (e2) { ok = false; }
      ta.remove(); return ok;
    }
  };
  const COPY = [];
  const cpBtn = (text, label) => { COPY.push(text); return `<button type="button" class="cp" data-cp="${COPY.length - 1}">${label || '복사'}</button>`; };

  // ── 진행률 ──
  const stats = (card) => {
    const req = card.steps.filter((s) => !s.opt);
    const n = req.filter((s) => isDone(s.id)).length;
    return { n, total: req.length, pct: req.length ? Math.round((n / req.length) * 100) : 0 };
  };
  const allStats = () => {
    let n = 0, t = 0; CARDS.forEach((c) => { const s = stats(c); n += s.n; t += s.total; });
    return { n, t, pct: t ? Math.round((n / t) * 100) : 0 };
  };
  const levelOf = (id) => LEVELS.find((l) => l.id === id);
  const ring = (pct, r = 13, w = 4) => { const C = 2 * Math.PI * r; return `<svg viewBox="0 0 ${2 * r + w * 2} ${2 * r + w * 2}"><circle cx="${r + w}" cy="${r + w}" r="${r}" fill="none" stroke="#f3f3f4" stroke-width="${w}"/><circle cx="${r + w}" cy="${r + w}" r="${r}" fill="none" stroke="#ea4c89" stroke-width="${w}" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - pct / 100)}"/></svg>`; };

  // ── 검색 색인 ──
  const INDEX = CARDS.map((c) => ({
    c,
    text: [c.title, c.desc, strip(c.intro)].join(' ').toLowerCase(),
    steps: c.steps.map((s) => ({ s, text: [s.t, s.key, strip((s.how || []).join(' ')), s.prompt, (s.cmd || []).join(' '), (s.slash || []).map((x) => x.join(' ')).join(' '), strip(s.tip)].join(' ').toLowerCase() })),
  }));
  const POPULAR = ['설치', '명령어', 'GitHub Pages', 'QR', 'Apps Script', 'Gemini', '실시간', '채점', '보고서', '개인정보'];

  // ── 첫 화면 상태 ──
  const ui = { tab: store.get('cct-tab', 'all'), q: '', sort: 'order' };

  function shotHtml(c) {
    const [bg, fg] = colorOf(c), s = stats(c), l = levelOf(c.level);
    return `<a class="shot" href="#/card/${c.id}">
      <div class="thumb" style="background:${bg};color:${fg}">
        <span class="ic" aria-hidden="true">${c.icon}</span>
        ${s.total && s.n === s.total ? '<span class="badge">완료 ✓</span>' : ''}
        <span class="cmdline">${esc(c.cover)}</span>
        <span class="hov"><span>열어 보기 →</span></span>
      </div>
      <div class="meta"><span class="av" aria-hidden="true">${esc(l.no[0])}</span><span class="name">${esc(c.title)}</span>
        <span class="st${s.total && s.n === s.total ? ' full' : ''}" title="한 단계 / 전체 단계">${s.total && s.n === s.total ? '♥' : '♡'} ${s.n}/${s.total}</span></div>
      <p class="sub">${esc(c.desc)}</p></a>`;
  }

  function hl(text, q) {
    const t = esc(text); if (!q) return t;
    const i = text.toLowerCase().indexOf(q); if (i < 0) return t;
    return esc(text.slice(0, i)) + '<mark>' + esc(text.slice(i, i + q.length)) + '</mark>' + esc(text.slice(i + q.length));
  }

  function renderShots() {
    const box = document.getElementById('shots'); if (!box) return;
    const q = ui.q.trim().toLowerCase();
    let list = INDEX.filter((x) => ui.tab === 'all' || x.c.level === ui.tab);
    let hits = [];
    if (q) {
      list = list.filter((x) => x.text.includes(q) || x.steps.some((st) => st.text.includes(q)));
      list.forEach((x) => x.steps.forEach((st) => { if (st.text.includes(q)) hits.push({ c: x.c, s: st.s }); }));
    }
    let cards = list.map((x) => x.c);
    if (ui.sort === 'todo') {
      const rank = (c) => { const s = stats(c); return s.n === s.total ? 2 : s.n > 0 ? 0 : 1; };
      cards = cards.slice().sort((a, b) => rank(a) - rank(b));
    }
    let h = '';
    if (!cards.length) h = `<div class="empty">"${esc(ui.q)}"에 맞는 카드가 없어요. 다른 낱말로 찾아보세요.</div>`;
    else if (ui.tab === 'all' && !q && ui.sort === 'order') {
      LEVELS.forEach((l) => {
        h += `<div class="lvh"><span class="no">${esc(l.no)}</span><h2>${esc(l.title)}</h2><p>${esc(l.desc)}</p></div><div class="grid">${cards.filter((c) => c.level === l.id).map(shotHtml).join('')}</div>`;
      });
    } else {
      const l = ui.tab !== 'all' ? levelOf(ui.tab) : null;
      if (l && !q) h += `<div class="lvh"><span class="no">${esc(l.no)}</span><h2>${esc(l.title)}</h2><p>${esc(l.desc)}</p></div>`;
      if (q) h += `<div class="lvh"><h2>"${esc(ui.q)}" 카드 ${cards.length}개</h2></div>`;
      h += `<div class="grid">${cards.map(shotHtml).join('')}</div>`;
    }
    if (q && hits.length) {
      h += `<div class="hits"><h3>단계에서 찾은 것 ${hits.length}개</h3>${hits.slice(0, 20).map(({ c, s }) => `<a class="hit" href="#/card/${c.id}/${s.id}"><span class="e" aria-hidden="true">${c.icon}</span><span><b>${hl(s.t, q)}</b><small>${esc(c.title)}</small></span></a>`).join('')}</div>`;
    }
    box.innerHTML = h;
    document.querySelectorAll('.tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === ui.tab));
    document.querySelectorAll('.pop [data-q]').forEach((b) => b.classList.toggle('on', b.dataset.q.toLowerCase() === q));
  }

  // ── 화면: 처음 ──
  function home() {
    const a = allStats();
    const next = CARDS.find((c) => { const s = stats(c); return s.n < s.total; }) || CARDS[0];
    const started = a.n > 0;
    const notice = store.get('cct-notice', 1) ? `<div class="notice-wrap"><div class="notice">💡 [다 했어요] 기록은 이 브라우저에 저장돼요. 같은 컴퓨터·같은 브라우저로 오면 이어서 할 수 있어요.<button class="x" type="button" data-notice aria-label="알림 닫기">×</button></div></div>` : '';
    const lines = [
      ['d', 'PS C:\\Users\\선생님\\문서\\AI수업도구>'], ['', '<span class="p">claude</span>'],
      ['d', '✻ 무엇을 도와드릴까요?'], ['', '<span class="u">&gt; 교과 참고자료로 5문항 퀴즈 index.html 만들어 줘</span>'],
      ['g', '● 자료 3개를 읽었어요'], ['g', '● index.html 을 만들었어요 — 문제 5개 · 힌트 · 점수'], ['g', '● 브라우저로 열었어요. 확인해 보세요!'],
    ];
    view.innerHTML = `${notice}
    <section class="hero">
      <div>
        <div class="seg"><span class="on">코딩 몰라도 OK</span><span>복사 · 붙여 넣기 · 확인</span></div>
        <h1>선생님도 <em>말로</em> 만드는<br>수업 도구와 <em>업무 자동화</em></h1>
        <ul class="checks">
          <li>설치부터 기본 명령어까지 차근차근</li>
          <li>내 수업 자료로 학생용 웹 도구와 QR 만들기</li>
          <li>실시간 수업·채점·보고서까지 클로드 코드에게 맡기기</li>
        </ul>
        <div class="cta"><a class="pill dark" href="#/card/${next.id}">${started ? '이어서 하기 · ' + esc(next.title.length > 14 ? next.title.slice(0, 14) + '…' : next.title) : '✦ 1단계부터 시작하기'}</a><a class="pill ghost" href="#/cheat">명령어 한눈에</a></div>
      </div>
      <div class="visual" aria-hidden="true">
        <span class="floatchip tl">⌨️ Windows 터미널 + 클로드 코드</span>
        <div class="win"><div class="bar"><i></i><i></i><i></i><span>Windows PowerShell</span></div>
          <pre>${lines.map(([k, t], i) => `<span class="ln ${k}" style="animation-delay:${0.25 + i * 0.45}s">${t}</span>`).join('')}</pre></div>
        <span class="floatchip"><span class="ring">${ring(a.pct)}</span>내 진행 ${a.pct}% · ${a.n}/${a.t} 단계</span>
      </div>
    </section>
    <section class="explore">
      <div class="tabs" role="tablist">
        <button type="button" data-tab="all">🗂️ 전체 <span class="n">${CARDS.length}</span></button>
        ${LEVELS.map((l) => `<button type="button" data-tab="${l.id}">${['🌱', '🛠️', '🚀'][LEVELS.indexOf(l)] || '•'} ${esc(l.title)} <span class="n">${CARDS.filter((c) => c.level === l.id).length}</span></button>`).join('')}
      </div>
      <form class="search" role="search" onsubmit="return false">
        <input id="q" type="search" placeholder="무엇을 해 보고 싶으세요? (예: QR, 채점, 시트, 되돌리기)" aria-label="카드와 단계 찾기" value="${esc(ui.q)}">
        <button class="go" type="submit" aria-label="찾기"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg></button>
      </form>
      <div class="pop"><b>자주 찾는:</b>${POPULAR.map((p) => `<button type="button" data-q="${esc(p)}">${esc(p)}</button>`).join('')}<span class="sp"></span>
        <select id="sort" aria-label="정렬"><option value="order">과정 순서</option><option value="todo">하던 것 먼저</option></select></div>
    </section>
    <section class="shots" id="shots"></section>`;
    document.getElementById('sort').value = ui.sort;
    const qi = document.getElementById('q');
    qi.addEventListener('input', () => { ui.q = qi.value; renderShots(); });
    document.getElementById('sort').addEventListener('change', (e) => { ui.sort = e.target.value; renderShots(); });
    renderShots();
  }

  // ── 화면: 카드 ──
  let openId = null;
  function stepHtml(s, i) {
    let b = '';
    if (s.how) b += `<ol class="how">${s.how.map((x) => `<li>${x}</li>`).join('')}</ol>`;
    if (s.cmd) b += `<div class="blk"><div class="lab">💻 터미널에 붙여 넣기 <small>· 한 줄씩 복사 → 붙여 넣기 → Enter</small></div><div class="term">${s.cmd.map((c) => `<div class="row"><pre>${esc(c)}</pre>${cpBtn(c)}</div>`).join('')}</div></div>`;
    if (s.slash) b += `<div class="blk"><div class="lab">⌨️ 클로드 코드 입력창에서</div><div class="slash">${s.slash.map(([c, d]) => `<div class="row"><code>${esc(c)}</code><span>${esc(d)}</span>${/^[\/!@]/.test(c) ? cpBtn(c) : ''}</div>`).join('')}</div></div>`;
    if (s.prompt) b += `<div class="blk prompt"><div class="lab"><span>💬 클로드에게 보낼 요청 <small>· ○○ 는 내 것으로 바꾸기</small></span>${cpBtn(s.prompt, '요청 복사')}</div><pre>${esc(s.prompt)}</pre></div>`;
    if (s.code) b += s.code.map(([l, t]) => `<div class="blk codebox"><div class="lab"><span>📋 ${esc(l)}</span>${cpBtn(t)}</div><pre>${esc(t)}</pre></div>`).join('');
    if (s.tip) b += `<div class="blk tip">💡 ${s.tip}</div>`;
    if (s.links) b += `<div class="blk links">${s.links.map((l) => `<a href="${esc(l.url)}" target="_blank" rel="noopener">↗ ${esc(l.label)}</a>`).join('')}</div>`;
    const d = isDone(s.id);
    b += `<button type="button" class="donebtn" data-done="${s.id}">${d ? '✓ 했어요 · 다시 누르면 취소' : '다 했어요'}</button>`;
    return `<details class="step${d ? ' done' : ''}" id="s-${s.id}" ${s.id === openId ? 'open' : ''}>
      <summary><span class="num">${d ? '✓' : i + 1}</span><span class="stt"><b>${esc(s.t)}${s.opt ? '<span class="opt">선택</span>' : ''}</b>${s.key ? `<span class="k">${esc(s.key)}</span>` : ''}</span><span class="chev" aria-hidden="true">▼</span></summary>
      <div class="body">${b}</div></details>`;
  }
  function card(id, stepId) {
    const idx = CARDS.findIndex((c) => c.id === id);
    if (idx < 0) return home();
    const c = CARDS[idx], l = levelOf(c.level), s = stats(c), [bg, fg] = colorOf(c);
    if (stepId !== undefined) openId = stepId;
    if (!openId || !c.steps.some((x) => x.id === openId)) { const f = c.steps.find((x) => !isDone(x.id)); openId = f ? f.id : null; }
    COPY.length = 0;
    const prev = CARDS[idx - 1], next = CARDS[idx + 1];
    view.innerHTML = `<article class="detail">
      <div class="dhead"><span class="av" aria-hidden="true">${c.icon}</span>
        <div class="who"><h1>${esc(c.title)}</h1><div class="by"><b>${esc(l.no)} · ${esc(l.title)}</b> · 단계 ${c.steps.length}개</div></div>
        <div class="acts"><a class="pill ghost sm" href="#/">전체 카드</a>${next ? `<a class="pill dark sm" href="#/card/${next.id}">다음 카드 →</a>` : ''}</div></div>
      <div class="cover" style="background:${bg};color:${fg}"><span class="ic" aria-hidden="true">${c.icon}</span><span class="cmdline">${esc(c.cover)}</span><span class="prog">${s.n} / ${s.total} 단계 했어요</span></div>
      <p class="ddesc">${esc(c.desc)}</p>
      ${c.intro ? `<div class="intro">${c.intro}</div>` : ''}
      <div class="tools"><h2>따라 하기</h2><div><button type="button" class="linkbtn" data-all="open">모두 펼치기</button><button type="button" class="linkbtn" data-all="close">모두 접기</button></div></div>
      ${c.steps.map(stepHtml).join('')}
      <div class="pager">${prev ? `<a href="#/card/${prev.id}"><small>← 이전 카드</small>${prev.icon} ${esc(prev.title)}</a>` : ''}${next ? `<a class="next" href="#/card/${next.id}"><small>다음 카드 →</small>${next.icon} ${esc(next.title)}</a>` : ''}</div>
    </article>`;
  }

  // ── 보조 화면 ──
  function cheat() {
    view.innerHTML = `<section class="page"><h1>명령어 <em>한눈에</em></h1><p>자주 쓰는 명령과 단축키만 모았어요. 인쇄해서 노트북 옆에 두어도 좋아요.</p>
      ${window.CHEATSHEET.map((g) => `<div class="sheet"><h2>${esc(g.group)}</h2>${g.rows.map(([c, d]) => `<div class="row"><code>${esc(c)}</code><span>${esc(d)}</span></div>`).join('')}</div>`).join('')}</section>`;
  }
  function faq() {
    view.innerHTML = `<section class="page faq"><h1><em>막혔을</em> 때</h1><p>자주 막히는 곳과 해결 방법이에요. 여기 없으면 <b>오류 화면을 캡처해 클로드 코드에 Alt+V 로 붙여 넣고</b> "왜 이런지 쉽게 설명하고 고쳐 줘"라고 물어보세요.</p>
      ${window.FAQ.map(([q, a]) => `<details><summary>${esc(q)}</summary><div>${a}</div></details>`).join('')}</section>`;
  }
  function safety() {
    view.innerHTML = `<section class="page"><h1>안전하게 쓰는 <em>여섯 가지</em> 약속</h1><p>클로드 코드는 내 컴퓨터의 파일을 직접 다룹니다. 시작하기 전에 꼭 읽어 주세요.</p>
      <div class="safe">${window.SAFETY.map(([e, t, d], i) => { const [bg, fg] = PALETTE[(i * 5 + 1) % PALETTE.length]; return `<div style="background:${bg};color:${fg}"><span class="e" aria-hidden="true">${e}</span><b>${esc(t)}</b><p>${esc(d)}</p></div>`; }).join('')}</div></section>`;
  }

  // ── 길 찾기 ──
  function route() {
    const h = location.hash.replace(/^#\/?/, '');
    const [p, id, st] = h.split('/');
    document.querySelectorAll('.topnav a').forEach((a) => a.classList.toggle('on', a.getAttribute('href') === '#/' + (p === 'card' ? '' : p)));
    if (p === 'card') { card(id, st || null); }
    else if (p === 'cheat') cheat();
    else if (p === 'faq') faq();
    else if (p === 'safety') safety();
    else home();
    const tgt = p === 'card' && st && document.getElementById('s-' + st);
    if (tgt) tgt.scrollIntoView({ block: 'start' }); else window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', route);

  view.addEventListener('click', async (e) => {
    const cp = e.target.closest('[data-cp]');
    if (cp) {
      e.preventDefault();
      const ok = await copyText(COPY[Number(cp.dataset.cp)]);
      const old = cp.textContent; cp.textContent = ok ? '복사됨 ✓' : '복사 실패'; cp.classList.add('ok');
      setTimeout(() => { cp.textContent = old; cp.classList.remove('ok'); }, 1400);
      toast(ok ? '복사했어요. 붙여 넣기(Ctrl+V)만 하면 돼요' : '복사하지 못했어요. 글을 직접 선택해 복사하세요');
      return;
    }
    const db = e.target.closest('[data-done]');
    if (db) {
      const id = db.dataset.done; toggle(id);
      const cardId = location.hash.split('/')[2];
      const c = CARDS.find((x) => x.id === cardId);
      const i = c.steps.findIndex((x) => x.id === id);
      const nowDone = isDone(id);
      openId = nowDone ? ((c.steps.slice(i + 1).find((x) => !isDone(x.id)) || {}).id || null) : id;
      if (nowDone) toast(openId ? '잘했어요! 다음 단계로 가요' : '이 카드를 모두 마쳤어요 🎉');
      card(cardId);
      const tgt = document.getElementById('s-' + (openId || id));
      if (tgt) tgt.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    const all = e.target.closest('[data-all]');
    if (all) { document.querySelectorAll('.step').forEach((d) => { d.open = all.dataset.all === 'open'; }); return; }
    const tab = e.target.closest('[data-tab]');
    if (tab) { ui.tab = tab.dataset.tab; store.set('cct-tab', ui.tab); renderShots(); return; }
    const pq = e.target.closest('.pop [data-q]');
    if (pq) { const v = ui.q.toLowerCase() === pq.dataset.q.toLowerCase() ? '' : pq.dataset.q; ui.q = v; document.getElementById('q').value = v; renderShots(); return; }
    if (e.target.closest('[data-notice]')) { store.set('cct-notice', 0); const n = document.querySelector('.notice-wrap'); if (n) n.remove(); }
  });

  route();
})();
