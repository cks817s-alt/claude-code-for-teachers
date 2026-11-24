(function () {
  'use strict';
  const LEVELS = window.LEVELS, CARDS = window.CARDS;
  const view = document.getElementById('view');
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

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

  // ── 화면: 처음 ──
  function home() {
    const a = allStats();
    const C = 2 * Math.PI * 52;
    let h = `<section class="hero">
      <div>
        <h1>선생님도 <em>말로</em> 만드는<br>수업 도구와 업무 자동화</h1>
        <p>클로드 코드(Claude Code)는 내 컴퓨터의 폴더 안에서 파일을 읽고, 만들고, 고치는 AI 도우미예요. 코딩을 몰라도 괜찮아요. 아래 카드를 차례로 따라 하며 <b>복사 → 붙여 넣기 → 확인</b>만 하면 됩니다.</p>
      </div>
      <div class="ring" aria-label="전체 진행률 ${a.pct}%">
        <svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="52" fill="none" stroke="var(--code-bg)" stroke-width="12"/>
        <circle cx="60" cy="60" r="52" fill="none" stroke="var(--teal)" stroke-width="12" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - a.pct / 100)}"/></svg>
        <div class="lbl"><div><b>${a.pct}%</b><small>${a.n} / ${a.t} 단계</small></div></div>
      </div>
    </section>
    <div class="howto">
      <div><b>① 카드를 고르세요</b>1단계부터 차례로 하면 가장 쉬워요. 필요한 카드만 골라 해도 됩니다.</div>
      <div><b>② 상자마다 [복사]</b><span class="chip t">PS&gt;</span> 터미널 명령 · <span class="chip s">/명령</span> 클로드 코드 명령 · <span class="chip p">요청</span> 클로드에게 보낼 말</div>
      <div><b>③ 결과를 눈으로 확인</b>AI가 만든 것은 꼭 열어 보고 확인한 뒤 <b>[다 했어요]</b>를 누르세요.</div>
    </div>`;
    LEVELS.forEach((l) => {
      h += `<section class="level"><div class="level-h"><span class="no">${esc(l.no)}</span><h2>${esc(l.title)}</h2></div><p>${esc(l.desc)}</p><div class="grid">`;
      CARDS.filter((c) => c.level === l.id).forEach((c) => {
        const s = stats(c);
        h += `<a class="kcard${s.total && s.n === s.total ? ' done' : ''}" href="#/card/${c.id}">
          <span class="ic" aria-hidden="true">${c.icon}</span>
          <span><h3>${esc(c.title)}</h3><p>${esc(c.desc)}</p>
          <div class="bar"><i style="width:${s.pct}%"></i></div><div class="cnt">${s.n} / ${s.total} 단계${c.steps.some((x) => x.opt) ? ' · 선택 단계 있음' : ''}</div></span></a>`;
      });
      h += `</div></section>`;
    });
    view.innerHTML = h;
  }

  // ── 화면: 카드 ──
  function stepHtml(s, i) {
    let b = '';
    if (s.how) b += `<ol class="how">${s.how.map((x) => `<li>${x}</li>`).join('')}</ol>`;
    if (s.cmd) b += `<div class="blk"><div class="lab">💻 터미널에 붙여 넣기 <small style="font-weight:600;color:var(--muted)">(한 줄씩 복사 → 붙여 넣기 → Enter)</small></div><div class="term">${s.cmd.map((c) => `<div class="row"><pre>${esc(c)}</pre>${cpBtn(c)}</div>`).join('')}</div></div>`;
    if (s.slash) b += `<div class="blk"><div class="lab" style="color:var(--violet)">⌨️ 클로드 코드 입력창에서</div><div class="slash">${s.slash.map(([c, d]) => `<div class="row"><code>${esc(c)}</code><span>${esc(d)}</span>${/^[\/!@]/.test(c) ? cpBtn(c) : ''}</div>`).join('')}</div></div>`;
    if (s.prompt) b += `<div class="blk prompt"><div class="lab"><span>💬 클로드에게 보낼 요청 <small style="font-weight:600">(○○ 는 내 것으로 바꾸기)</small></span>${cpBtn(s.prompt, '요청 복사')}</div><pre>${esc(s.prompt)}</pre></div>`;
    if (s.code) b += s.code.map(([l, t]) => `<div class="blk codebox"><div class="lab"><span>📋 ${esc(l)}</span>${cpBtn(t)}</div><pre>${esc(t)}</pre></div>`).join('');
    if (s.tip) b += `<div class="blk tip">💡 ${s.tip}</div>`;
    if (s.links) b += `<div class="blk links">${s.links.map((l) => `<a href="${esc(l.url)}" target="_blank" rel="noopener">🔗 ${esc(l.label)}</a>`).join('')}</div>`;
    const d = isDone(s.id);
    b += `<button type="button" class="donebtn" data-done="${s.id}">${d ? '✔ 했어요 (다시 누르면 취소)' : '다 했어요'}</button>`;
    return `<details class="step${d ? ' done' : ''}" id="s-${s.id}" ${!d && i === firstOpen ? 'open' : ''}>
      <summary><span class="num">${d ? '✔' : i + 1}</span><span class="st"><b>${esc(s.t)}${s.opt ? '<span class="opt">선택</span>' : ''}</b>${s.key ? `<span class="k">${esc(s.key)}</span>` : ''}</span><span class="chev" aria-hidden="true">▾</span></summary>
      <div class="body">${b}</div></details>`;
  }
  let firstOpen = 0;
  function card(id) {
    const idx = CARDS.findIndex((c) => c.id === id);
    if (idx < 0) return home();
    const c = CARDS[idx], l = levelOf(c.level), s = stats(c);
    firstOpen = c.steps.findIndex((x) => !isDone(x.id));
    COPY.length = 0;
    const prev = CARDS[idx - 1], next = CARDS[idx + 1];
    view.innerHTML = `<div class="crumb"><a href="#/">← 전체 카드</a></div>
      <section class="khead"><span class="ic" aria-hidden="true">${c.icon}</span><div>
        <div class="lv">${esc(l.no)} · ${esc(l.title)}</div><h1>${esc(c.title)}</h1><p>${esc(c.desc)}</p>
        <div class="prog"><div class="bar"><i style="width:${s.pct}%"></i></div>${s.n} / ${s.total} 단계</div>
      </div></section>
      ${c.intro ? `<div class="intro">${c.intro}</div>` : ''}
      <div class="tools"><button type="button" class="linkbtn" data-all="open">모두 펼치기</button><button type="button" class="linkbtn" data-all="close">모두 접기</button></div>
      ${c.steps.map(stepHtml).join('')}
      <div class="pager">${prev ? `<a href="#/card/${prev.id}"><small>← 이전 카드</small>${prev.icon} ${esc(prev.title)}</a>` : ''}${next ? `<a class="next" href="#/card/${next.id}"><small>다음 카드 →</small>${next.icon} ${esc(next.title)}</a>` : ''}</div>`;
  }

  // ── 보조 화면 ──
  function cheat() {
    COPY.length = 0;
    view.innerHTML = `<section class="page"><h1>⌨️ 명령어 한눈에 보기</h1><p>자주 쓰는 명령과 단축키만 모았어요. 인쇄해서 노트북 옆에 두어도 좋아요.</p>
      ${window.CHEATSHEET.map((g) => `<div class="sheet"><h2>${esc(g.group)}</h2>${g.rows.map(([c, d]) => `<div class="row"><code>${esc(c)}</code><span>${esc(d)}</span></div>`).join('')}</div>`).join('')}</section>`;
  }
  function faq() {
    view.innerHTML = `<section class="page faq"><h1>🆘 막혔을 때</h1><p>자주 막히는 곳과 해결 방법이에요. 여기 없으면 <b>오류 화면을 캡처해 클로드 코드에 Alt+V 로 붙여 넣고</b> "왜 이런지 쉽게 설명하고 고쳐 줘"라고 물어보세요.</p>
      ${window.FAQ.map(([q, a]) => `<details><summary>${esc(q)}</summary><div>${a}</div></details>`).join('')}</section>`;
  }
  function safety() {
    view.innerHTML = `<section class="page"><h1>🛡️ 안전하게 쓰는 여섯 가지 약속</h1><p>클로드 코드는 내 컴퓨터의 파일을 직접 다룹니다. 시작하기 전에 꼭 읽어 주세요.</p>
      <div class="safe">${window.SAFETY.map(([e, t, d]) => `<div><span class="e" aria-hidden="true">${e}</span><b>${esc(t)}</b><p>${esc(d)}</p></div>`).join('')}</div></section>`;
  }

  // ── 길 찾기 ──
  function route() {
    const h = location.hash.replace(/^#\/?/, '');
    const [p, id] = h.split('/');
    document.querySelectorAll('.topnav a').forEach((a) => a.classList.toggle('on', a.getAttribute('href') === '#/' + p));
    if (p === 'card') card(id);
    else if (p === 'cheat') cheat();
    else if (p === 'faq') faq();
    else if (p === 'safety') safety();
    else home();
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', route);

  view.addEventListener('click', async (e) => {
    const cp = e.target.closest('[data-cp]');
    if (cp) {
      e.preventDefault();
      const ok = await copyText(COPY[Number(cp.dataset.cp)]);
      const old = cp.textContent; cp.textContent = ok ? '복사됨 ✔' : '복사 실패'; cp.classList.add('ok');
      setTimeout(() => { cp.textContent = old; cp.classList.remove('ok'); }, 1400);
      toast(ok ? '복사했어요. 붙여 넣기(Ctrl+V)만 하면 돼요' : '복사하지 못했어요. 글을 직접 선택해 복사하세요');
      return;
    }
    const db = e.target.closest('[data-done]');
    if (db) {
      const id = db.dataset.done; toggle(id);
      const el = document.getElementById('s-' + id);
      const d = isDone(id);
      if (d) { toast('잘했어요! 다음 단계로 가요'); }
      const cardId = location.hash.split('/')[2];
      card(cardId);
      if (d) {
        const next = el && document.getElementById(el.id) && document.getElementById(el.id).nextElementSibling;
        const tgt = next && next.classList.contains('step') ? next : document.getElementById('s-' + id);
        if (tgt) { tgt.open = true; tgt.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
      } else {
        const tgt = document.getElementById('s-' + id); if (tgt) { tgt.open = true; tgt.scrollIntoView({ block: 'start' }); }
      }
      return;
    }
    const all = e.target.closest('[data-all]');
    if (all) document.querySelectorAll('.step').forEach((d) => { d.open = all.dataset.all === 'open'; });
  });

  route();
})();
