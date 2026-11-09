/* =========================================================
   Zela · comportamento do site
   1. Utilidades          2. Acessibilidade e menu
   3. Rotas               4. Início (busca e frase)
   5. Reportar problema   6. Meus chamados
   7. Alerta de chuva     8. Saúde
   Tudo que a pessoa salva fica só neste aparelho (localStorage).
   ========================================================= */
(() => {
  'use strict';

  /* ---------- 1. Utilidades ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const digits = (s) => (s || '').replace(/\D/g, '');
  const fmtNum = (v, d = 1) => v.toFixed(d).replace('.', ',');
  const isMobile = () => window.matchMedia('(max-width: 760px)').matches;
  const body = document.body;

  const store = {
    get(k, d) {
      try { const v = localStorage.getItem('zela:' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; }
    },
    set(k, v) {
      try { localStorage.setItem('zela:' + k, JSON.stringify(v)); } catch (e) { /* armazenamento indisponível */ }
    },
    del(k) {
      try { localStorage.removeItem('zela:' + k); } catch (e) { /* nada a fazer */ }
    }
  };

  let toastTimer;
  function toast(msg) {
    $('#toast-txt').textContent = msg;
    const t = $('#toast');
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
  }

  // Liga ou desliga o estado de erro de um campo (.field com data-field)
  function setFieldError(wrap, on) {
    if (!wrap) return;
    wrap.classList.toggle('err', on);
    const input = $('.inp', wrap);
    if (input) input.setAttribute('aria-invalid', String(on));
    const msg = $('.errmsg', wrap);
    if (msg) msg.hidden = !on;
  }

  /* ---------- 2. Acessibilidade e menu ---------- */
  const a11y = Object.assign({ size: 0, hc: false, rm: false }, store.get('a11y', {}));
  const pop = $('#painel-a11y');
  const a11yBtn = $('#a11y-btn');
  const menu = $('#menu-cel');
  const menuBtn = $('#menu-btn');
  const ouvir = $('#btn-ouvir');
  let speaking = false;

  function applyA11y() {
    body.classList.remove('s0', 's1', 's2');
    body.classList.add('s' + a11y.size);
    body.classList.toggle('hc', a11y.hc);
    body.classList.toggle('rm', a11y.rm);
    $$('.seg [data-size]').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.size) === a11y.size)));
    $('#sw-hc').setAttribute('aria-checked', String(a11y.hc));
    $('#sw-rm').setAttribute('aria-checked', String(a11y.rm));
    store.set('a11y', a11y);
  }

  function setPop(open) {
    pop.classList.toggle('open', open);
    a11yBtn.setAttribute('aria-expanded', String(open));
    if (open) {
      setMenu(false);
      $('.seg button[aria-pressed="true"]', pop).focus();
    }
  }

  function setMenu(open) {
    menu.classList.toggle('open', open);
    menu.setAttribute('aria-hidden', String(!open));
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    $$('a', menu).forEach((a) => { a.tabIndex = open ? 0 : -1; });
    body.style.overflow = open ? 'hidden' : '';
    if (open) setPop(false);
  }

  function setSpeaking(v) {
    speaking = v;
    ouvir.lastElementChild.textContent = v ? 'Parar a leitura' : 'Ouvir esta página';
  }

  a11yBtn.addEventListener('click', () => setPop(!pop.classList.contains('open')));
  $('#a11y-close').addEventListener('click', () => { setPop(false); a11yBtn.focus(); });
  $$('.seg [data-size]').forEach((b) => b.addEventListener('click', () => { a11y.size = Number(b.dataset.size); applyA11y(); }));
  $('#sw-hc').addEventListener('click', () => { a11y.hc = !a11y.hc; applyA11y(); });
  $('#sw-rm').addEventListener('click', () => { a11y.rm = !a11y.rm; applyA11y(); });
  menuBtn.addEventListener('click', () => setMenu(!menu.classList.contains('open')));

  ouvir.addEventListener('click', () => {
    const ss = window.speechSynthesis;
    if (!ss) { toast('Este navegador não consegue ler a página em voz alta.'); return; }
    if (speaking) { ss.cancel(); setSpeaking(false); return; }
    const page = $('.page:not([hidden])');
    const u = new SpeechSynthesisUtterance(page ? page.innerText : document.body.innerText);
    u.lang = 'pt-BR';
    u.rate = 0.95;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    ss.cancel();
    ss.speak(u);
    setSpeaking(true);
  });

  document.addEventListener('click', (e) => {
    if (pop.classList.contains('open') && !pop.contains(e.target) && !a11yBtn.contains(e.target)) setPop(false);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (menu.classList.contains('open')) { setMenu(false); menuBtn.focus(); }
    if (pop.classList.contains('open')) { setPop(false); a11yBtn.focus(); }
    closeSheet();
  });

  applyA11y();
  setMenu(false);

  /* ---------- 3. Rotas (#/inicio, #/reportar ...) ---------- */
  const ROUTES = ['inicio', 'reportar', 'chamados', 'alerta', 'saude', 'sobre', 'privacidade'];
  let firstRoute = true;

  function route() {
    const h = location.hash;
    if (h && !h.startsWith('#/')) return; // âncora comum, como #conteudo
    const [name, sub] = (h.slice(2) || 'inicio').split('/');
    const key = ROUTES.includes(name || 'inicio') ? (name || 'inicio') : '404';

    $$('.page').forEach((p) => { p.hidden = p.dataset.page !== key; });
    $$('[data-route]').forEach((a) => {
      if (a.dataset.route === key) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    const page = $(`.page[data-page="${key}"]`);
    document.title = 'Zela · ' + page.dataset.title;

    setMenu(false);
    setPop(false);
    closeSheet();
    if (speaking && window.speechSynthesis) { window.speechSynthesis.cancel(); setSpeaking(false); }

    if (key === 'chamados') renderChamados();

    if (sub && document.getElementById(sub)) {
      setTimeout(() => document.getElementById(sub).scrollIntoView(), 60);
    } else {
      window.scrollTo(0, 0);
    }
    if (!firstRoute) {
      const h1 = $('h1', page);
      if (h1) { h1.tabIndex = -1; h1.focus({ preventScroll: true }); }
    }
    firstRoute = false;
  }
  window.addEventListener('hashchange', route);

  /* ---------- 4. Início ---------- */
  // Frase em destaque: cada palavra vira um <span> que acende ao rolar (CSS)
  const tagline = $('[data-tagline]');
  if (tagline) {
    let i = 0;
    const nodes = [...tagline.childNodes];
    tagline.textContent = '';
    nodes.forEach((n) => {
      if (n.nodeType !== Node.TEXT_NODE) { tagline.append(n); return; }
      n.textContent.split(/(\s+)/).forEach((w) => {
        if (!w) return;
        if (/^\s+$/.test(w)) { tagline.append(' '); return; }
        const s = document.createElement('span');
        s.className = 'tw';
        s.style.setProperty('--i', i++);
        s.textContent = w;
        tagline.append(s);
      });
    });
  }

  // Busca em linguagem natural
  const INTENTS = [
    { k: 'buraco rua asfalto cratera esburacada', label: 'Avisar sobre buraco na rua', sub: 'Reportar problema', icon: 'i-road', href: '#/reportar' },
    { k: 'poste luz apagado escuro lampada iluminacao', label: 'Avisar sobre poste apagado', sub: 'Reportar problema', icon: 'i-bulb', href: '#/reportar' },
    { k: 'lixo entulho sujeira bueiro calcada arvore', label: 'Avisar sobre lixo, bueiro ou calçada', sub: 'Reportar problema', icon: 'i-trash', href: '#/reportar' },
    { k: 'chuva alagamento enchente agua corrego temporal tempestade', label: 'Ver alerta de chuva forte', sub: 'Alerta de chuva', icon: 'i-rain', href: '#/alerta' },
    { k: 'abrigo enchente desabrigado', label: 'Achar abrigo perto de mim', sub: 'Alerta de chuva', icon: 'i-pin', href: '#/alerta' },
    { k: 'remedio farmacia ubs posto losartana pressao medicamento', label: 'Saber qual UBS tem meu remédio', sub: 'Saúde', icon: 'i-pill', href: '#/saude' },
    { k: 'consulta lembrete medico agenda horario', label: 'Criar lembrete de consulta ou remédio', sub: 'Saúde', icon: 'i-bell', href: '#/saude' },
    { k: 'protocolo chamado pedido andamento zl reclamacao', label: 'Acompanhar meu chamado', sub: 'Meus chamados', icon: 'i-list', href: '#/chamados' }
  ];

  function matchIntents(q) {
    const words = norm(q).split(/[^a-z0-9]+/).filter((w) => w.length >= 3);
    if (!words.length) return { words, list: INTENTS.slice(0, 4) };
    const list = INTENTS.filter((it) => {
      const hay = norm(it.k + ' ' + it.label);
      return words.some((w) => hay.includes(w));
    });
    return { words, list };
  }

  const sugBox = $('#sugestoes');
  const buscaTopo = $('#busca-topo');

  function renderSugg() {
    const { words, list } = matchIntents(buscaTopo.value);
    sugBox.innerHTML = list.slice(0, 5).map((it) =>
      `<a href="${it.href}" role="option"><span class="bub"><span class="i i20 ${it.icon}" aria-hidden="true"></span></span><span>${esc(it.label)}<small>${esc(it.sub)}</small></span></a>`
    ).join('') + (words.length && !list.length
      ? '<p class="sugg-empty">Ainda não entendemos o que você escreveu. Tente “buraco”, “chuva”, “remédio” ou toque em um atalho.</p>'
      : '');
  }
  function showSugg(v) {
    sugBox.hidden = !v;
    buscaTopo.setAttribute('aria-expanded', String(v));
  }
  buscaTopo.addEventListener('focus', () => { renderSugg(); showSugg(true); });
  buscaTopo.addEventListener('input', () => { renderSugg(); showSugg(true); });
  buscaTopo.addEventListener('blur', () => setTimeout(() => showSugg(false), 180));

  $$('[data-search]').forEach((form) => form.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = $('input', form).value;
    const { words, list } = matchIntents(q);
    if (words.length && list.length) { location.hash = list[0].href; return; }
    if (!q.trim()) {
      toast('Escreva do que você precisa ou toque em um atalho.');
      $('#atalhos a').focus();
    } else {
      toast('Ainda não entendemos. Tente “buraco”, “chuva” ou “remédio”.');
    }
  }));

  /* ---------- 5. Reportar problema ---------- */
  const CATS = [
    ['buraco', 'Buraco na rua', 'Na rua ou na avenida', 'i-road'],
    ['poste', 'Poste apagado', 'Rua escura à noite', 'i-bulb'],
    ['lixo', 'Lixo acumulado', 'Entulho ou lixo na calçada', 'i-trash'],
    ['calcada', 'Calçada quebrada', 'Difícil de passar', 'i-wheel'],
    ['arvore', 'Árvore com risco', 'Galho ou árvore caindo', 'i-tree'],
    ['bueiro', 'Bueiro entupido', 'Água parada ou mau cheiro', 'i-drop']
  ];
  const CITIES = ['Mogi das Cruzes', 'Suzano', 'Itaquaquecetuba', 'Poá', 'Ferraz de Vasconcelos'];
  const BLANK = { step: 1, cat: null, city: 'Mogi das Cruzes', bairro: '', end: '', desc: '', hurt: null, tel: '' };

  const wzEl = $('#wz');
  let wz = Object.assign({}, BLANK, store.get('rascunho', {}));
  wz.step = Math.min(Math.max(wz.step || 1, 1), 4);
  let wzPhoto = null;
  let wzErr = {};
  let wzDir = 'f';
  let wzLocated = false;
  let wzSent = null;
  let draftAt = store.get('rascunhoHora', null);
  let draftTimer;

  const catOf = (id) => CATS.find((c) => c[0] === id);
  const similarOf = () => norm(wz.bairro).includes('lavinia') || norm(wz.end).includes('francisco ferreira');

  function saveDraft() {
    clearTimeout(draftTimer);
    draftTimer = setTimeout(() => {
      store.set('rascunho', wz);
      draftAt = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      store.set('rascunhoHora', draftAt);
      const el = $('#wz-draft');
      if (el) el.textContent = 'Rascunho salvo às ' + draftAt;
      renderSummary();
    }, 400);
  }

  function errMsg(id, on, text) {
    return `<p id="e-${id}" class="errmsg"${on ? '' : ' hidden'}><span class="bang" aria-hidden="true">!</span>${text}</p>`;
  }

  function stepHead() {
    const labels = ['O quê', 'Onde', 'Detalhes', 'Revisar'];
    return `
      <div class="wz-head">
        <div class="row between gap16 wr">
          <p class="small" style="font-weight: 700">Passo ${wz.step} de 4</p>
          <p class="draft"><span class="i i16 i-check" aria-hidden="true"></span><span id="wz-draft">${draftAt ? 'Rascunho salvo às ' + draftAt : 'Rascunho salvo neste aparelho'}</span></p>
        </div>
        <div class="prog" role="progressbar" aria-label="Progresso" aria-valuemin="0" aria-valuemax="4" aria-valuenow="${wz.step}"><span style="width: ${wz.step * 25}%"></span></div>
        <ol class="steps">
          ${labels.map((lb, i) => {
            const n = i + 1;
            const cls = n === wz.step ? 'cur' : n < wz.step ? 'ok' : '';
            return `<li class="${cls}"${n === wz.step ? ' aria-current="step"' : ''}><span class="sn">${n}</span><span class="sl">${lb}</span></li>`;
          }).join('')}
        </ol>
      </div>`;
  }

  function step1() {
    return `
      <div class="stack gap8">
        <h2 id="titulo-passo" class="t2" tabindex="-1">O que você encontrou?</h2>
        <p class="hint">Toque no que parece mais com o problema.</p>
      </div>
      <div class="cg" role="group" aria-label="Tipo de problema">
        ${CATS.map(([id, label, hint, icon]) => `
          <button class="choice" type="button" data-cat="${id}" aria-pressed="${wz.cat === id}">
            <span class="ibox"><span class="i ${icon}" aria-hidden="true"></span></span>
            <span>${label}<small style="display: block">${hint}</small></span>
            <span class="tick" aria-hidden="true"><span class="i i20 i-check"></span></span>
          </button>`).join('')}
      </div>
      ${errMsg('cat', wzErr.cat, 'Escolha uma opção para continuar.')}`;
  }

  function step2() {
    return `
      <div class="stack gap8">
        <h2 id="titulo-passo" class="t2" tabindex="-1">Onde fica?</h2>
        <p class="hint">Se não souber o nome da rua, use a sua localização.</p>
      </div>
      <button class="btn btn-s" type="button" data-act="locate" style="align-self: flex-start"><span class="i i20 i-gps" aria-hidden="true" style="color: var(--g)"></span><span>Usar minha localização</span></button>
      <div class="note n-ok" role="status" id="wz-located"${wzLocated ? '' : ' hidden'}><span class="i i-check" aria-hidden="true"></span><p>Localização encontrada. Confira se o endereço abaixo está certo.</p></div>
      <div class="field">
        <label class="lbl" for="f-cidade">Cidade</label>
        <div class="sel">
          <select id="f-cidade" class="inp" data-k="city">${CITIES.map((c) => `<option${c === wz.city ? ' selected' : ''}>${c}</option>`).join('')}</select>
          <span class="i i20 i-caret" aria-hidden="true"></span>
        </div>
      </div>
      <div class="field${wzErr.bairro ? ' err' : ''}" data-field="bairro">
        <label class="lbl" for="f-bairro">Bairro</label>
        <input id="f-bairro" class="inp" type="text" data-k="bairro" value="${esc(wz.bairro)}" aria-invalid="${!!wzErr.bairro}" aria-describedby="e-bairro" autocomplete="address-level3">
        ${errMsg('bairro', wzErr.bairro, 'Escreva o nome do bairro. Se não souber, toque em Usar minha localização.')}
      </div>
      <div class="field${wzErr.end ? ' err' : ''}" data-field="end">
        <label class="lbl" for="f-end">Endereço ou ponto de referência</label>
        <p class="hint" id="d-end">Ex.: Rua Dom Paulo Rolim, 214 ou em frente à padaria da praça</p>
        <input id="f-end" class="inp" type="text" data-k="end" value="${esc(wz.end)}" aria-invalid="${!!wzErr.end}" aria-describedby="d-end e-end" autocomplete="street-address">
        ${errMsg('end', wzErr.end, 'Escreva a rua e o número ou um ponto de referência perto do problema.')}
      </div>
      <div class="note n-in" id="wz-similar"${similarOf() ? '' : ' hidden'}>
        <span class="i i-info" aria-hidden="true"></span>
        <div class="stack gap8">
          <b>Já existe um chamado parecido aqui perto</b>
          <p>Buraco na rua · Av. Francisco Ferreira Lopes, 1180 · 37 pessoas já apoiaram. Apoiar ajuda a prefeitura a ver a urgência.</p>
          <button class="btn btn-s btn-sm" type="button" data-act="similar" style="align-self: flex-start">Ver e apoiar ZL-24817<span class="i i16 i-right" aria-hidden="true"></span></button>
        </div>
      </div>`;
  }

  function step3() {
    return `
      <h2 id="titulo-passo" class="t2" tabindex="-1">Conte um pouco mais</h2>
      <div class="field${wzErr.desc ? ' err' : ''}" data-field="desc">
        <label class="lbl" for="f-desc">O que você viu?</label>
        <p class="hint" id="d-desc">Tamanho, há quanto tempo está assim, se atrapalha alguém.</p>
        <textarea id="f-desc" class="inp" maxlength="500" data-k="desc" aria-describedby="d-desc e-desc c-desc" aria-invalid="${!!wzErr.desc}">${esc(wz.desc)}</textarea>
        <p id="c-desc" class="counter">${wz.desc.length} de 500 letras</p>
        ${errMsg('desc', wzErr.desc, 'Conte em poucas palavras o que você viu. Use pelo menos 10 letras.')}
      </div>
      <fieldset class="field" style="border: 0; padding: 0; margin: 0">
        <legend class="lbl" style="margin-bottom: 8px">Isso pode machucar alguém agora?</legend>
        <div class="yn" role="radiogroup">
          <button class="chip" type="button" role="radio" data-hurt="sim" aria-checked="${wz.hurt === 'sim'}"><span class="i i20 i-warn" aria-hidden="true"></span>Sim</button>
          <button class="chip" type="button" role="radio" data-hurt="nao" aria-checked="${wz.hurt === 'nao'}"><span class="i i20 i-check" aria-hidden="true"></span>Não</button>
        </div>
        <p class="hint" id="wz-hurt-hint"${wz.hurt === 'sim' ? '' : ' hidden'}>Seu chamado vai com o selo Prioridade. Se alguém já se machucou, ligue 192.</p>
      </fieldset>
      <div class="field">
        <span class="lbl">Foto <span class="opt">(opcional)</span></span>
        <div class="photo">
          ${wzPhoto
            ? `<img src="${wzPhoto}" alt="Prévia da foto que você escolheu">`
            : '<span class="ibox"><span class="i i-camera" aria-hidden="true"></span></span>'}
          <div class="stack gap4" style="flex: 1; min-width: 160px">
            <b class="small">${wzPhoto ? 'Foto escolhida' : 'Nenhuma foto escolhida'}</b>
            <span class="hint">Uma foto ajuda a equipe a levar o material certo.</span>
          </div>
          <label class="btn btn-s btn-sm"><span class="i i20 i-camera" aria-hidden="true"></span>${wzPhoto ? 'Trocar foto' : 'Escolher foto'}<input class="sr" type="file" accept="image/*" data-act="photo"></label>
        </div>
      </div>`;
  }

  function step4() {
    const c = catOf(wz.cat);
    return `
      <div class="stack gap8">
        <h2 id="titulo-passo" class="t2" tabindex="-1">Confira antes de enviar</h2>
        <p class="hint">Toque em Alterar para corrigir sem recomeçar.</p>
      </div>
      <dl class="rvw">
        <div class="rvw-row"><div class="stack gap4"><dt>O quê</dt><dd>${c ? c[1] : ''}</dd></div><button class="btn btn-gh btn-sm" type="button" data-go="1" aria-label="Alterar o tipo de problema"><span class="i i16 i-pencil" aria-hidden="true"></span>Alterar</button></div>
        <div class="rvw-row"><div class="stack gap4"><dt>Onde</dt><dd>${esc(wz.end)} · ${esc(wz.bairro)}, ${esc(wz.city)}</dd></div><button class="btn btn-gh btn-sm" type="button" data-go="2" aria-label="Alterar o endereço"><span class="i i16 i-pencil" aria-hidden="true"></span>Alterar</button></div>
        <div class="rvw-row"><div class="stack gap4"><dt>Detalhes</dt><dd>${esc(wz.desc)}</dd><dd class="small muted">Pode machucar alguém: ${wz.hurt === 'sim' ? 'sim' : wz.hurt === 'nao' ? 'não' : 'não respondido'}${wzPhoto ? ' · com foto' : ''}</dd></div><button class="btn btn-gh btn-sm" type="button" data-go="3" aria-label="Alterar os detalhes"><span class="i i16 i-pencil" aria-hidden="true"></span>Alterar</button></div>
      </dl>
      <div class="field${wzErr.tel ? ' err' : ''}" data-field="tel">
        <label class="lbl" for="f-tel">Celular <span class="opt">(opcional)</span></label>
        <p class="hint" id="d-tel">Para receber aviso por SMS quando o chamado mudar.</p>
        <input id="f-tel" class="inp" type="tel" inputmode="tel" autocomplete="tel" placeholder="(11) 98472-3159" data-k="tel" value="${esc(wz.tel)}" aria-describedby="d-tel e-tel" aria-invalid="${!!wzErr.tel}" style="max-width: 320px">
        ${errMsg('tel', wzErr.tel, 'Confira o número. Use o DDD e os 9 dígitos, como (11) 98472-3159.')}
      </div>`;
  }

  function step5() {
    return `
      <div class="stack gap24" style="align-items: center; text-align: center; padding: 48px 0 24px" role="status">
        <span class="bigcheck"><span class="i i48 i-check" aria-hidden="true"></span></span>
        <h2 id="titulo-passo" class="t2" tabindex="-1">Pronto, seu chamado foi enviado.</h2>
        <div class="stack gap8" style="align-items: center">
          <span class="small muted">Seu número de protocolo</span>
          <span class="proto num">${wzSent.id}</span>
        </div>
        <p class="note n-in" style="text-align: left; max-width: 480px"><span class="i i-clock" aria-hidden="true"></span><span><b>${wzSent.prazo}</b>A equipe analisa em até 3 dias úteis. Você pode acompanhar cada etapa${wzSent.tel ? ' e vai receber SMS a cada mudança' : ''}.</span></p>
        <div class="row wr gap12" style="justify-content: center">
          <button class="btn btn-p" type="button" data-act="track">Acompanhar meu chamado<span class="i i20 i-right" aria-hidden="true"></span></button>
          <button class="btn btn-s" type="button" data-act="copy"><span class="i i20 i-copy" aria-hidden="true"></span>Copiar número</button>
        </div>
        <button class="btn btn-gh" type="button" data-act="new">Reportar outro problema</button>
      </div>`;
  }

  function renderWz(focus) {
    const steps = [null, step1, step2, step3, step4, step5];
    const anim = wzDir === 'f' ? 'in-f' : 'in-b';
    wzEl.innerHTML = (wz.step < 5 ? stepHead() : '') +
      `<div class="wz-body"><div class="${anim} stack gap24">${steps[wz.step]()}</div></div>` +
      (wz.step < 5 ? `
        <div class="wz-foot">
          <button class="btn btn-gh" type="button" data-act="back"${wz.step === 1 ? ' disabled' : ''}><span class="i i20 i-left" aria-hidden="true"></span>Voltar</button>
          <button class="btn btn-p" type="button" data-act="next">${wz.step === 4 ? 'Enviar chamado' : 'Continuar'}<span class="i i20 i-right" aria-hidden="true"></span></button>
        </div>` : '');
    renderSummary();
    if (focus) {
      const firstErr = $('.field.err .inp', wzEl) || (wzErr.cat ? $('[data-cat]', wzEl) : null);
      (firstErr || $('#titulo-passo', wzEl)).focus();
    }
  }

  function renderSummary() {
    const c = catOf(wz.cat);
    const row = (k, v, ok) => `<li class="row gap12" style="align-items: flex-start"><span class="stk${ok ? ' ok' : ''}" aria-hidden="true"><span class="i i20 ${ok ? 'i-check' : 'i-clock'}"></span></span><span class="stack"><b class="small">${k}</b><span class="small muted">${ok ? esc(v) : 'Falta preencher'}</span></span></li>`;
    $('#wz-sum').innerHTML =
      row('O quê', c ? c[1] : '', !!c) +
      row('Onde', wz.end && wz.bairro ? wz.end + ', ' + wz.bairro : '', !!(wz.end && wz.bairro)) +
      row('Detalhes', wz.desc.length > 48 ? wz.desc.slice(0, 48) + '…' : wz.desc, wz.desc.trim().length >= 10);
  }

  function goStep(n) {
    wzDir = n > wz.step ? 'f' : 'b';
    wz.step = n;
    wzErr = {};
    renderWz(true);
    saveDraft();
    wzEl.scrollIntoView({ block: 'start' });
  }

  function validateStep() {
    const e = {};
    if (wz.step === 1 && !wz.cat) e.cat = true;
    if (wz.step === 2) {
      if (!wz.bairro.trim()) e.bairro = true;
      if (!wz.end.trim()) e.end = true;
    }
    if (wz.step === 3 && wz.desc.trim().length < 10) e.desc = true;
    if (wz.step === 4 && wz.tel.trim() && digits(wz.tel).length !== 11) e.tel = true;
    return e;
  }

  function sendReport() {
    const n = store.get('protocolo', 26318);
    const id = 'ZL-' + n;
    store.set('protocolo', n + 1);
    const c = catOf(wz.cat);
    const today = new Date();
    const due = new Date(today.getTime() + 12 * 86400000);
    const MONF = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    const MON = ['jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.'];
    const hora = today.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    wzSent = {
      id, tel: !!wz.tel.trim(),
      prazo: 'Prazo estimado: até ' + due.getDate() + ' de ' + MONF[due.getMonth()]
    };
    const ticket = {
      id, title: c[1], icon: c[3], addr: wz.end + ' · ' + wz.bairro + ', ' + wz.city, city: wz.city,
      date: today.getDate() + ' ' + MON[today.getMonth()] + ' ' + today.getFullYear(),
      sup: 0, st: 'rec', mine: true, pri: wz.hurt === 'sim',
      dates: [today.getDate() + ' ' + MON[today.getMonth()] + ', ' + hora, 'Previsto em até 3 dias úteis', '', ''],
      prazo: wzSent.prazo
    };
    const mine = store.get('meusChamados', []);
    mine.unshift(ticket);
    store.set('meusChamados', mine);
    store.del('rascunho');
    store.del('rascunhoHora');
    draftAt = null;
    wzDir = 'f';
    wz.step = 5;
    renderWz(true);
  }

  wzEl.addEventListener('click', (e) => {
    const t = e.target.closest('button');
    if (!t || t.disabled) return;
    if (t.dataset.cat) {
      wz.cat = t.dataset.cat;
      $$('[data-cat]', wzEl).forEach((b) => b.setAttribute('aria-pressed', String(b === t)));
      const m = $('#e-cat', wzEl); if (m) m.hidden = true;
      wzErr.cat = false;
      saveDraft();
      return;
    }
    if (t.dataset.hurt) {
      wz.hurt = t.dataset.hurt;
      $$('[data-hurt]', wzEl).forEach((b) => b.setAttribute('aria-checked', String(b === t)));
      $('#wz-hurt-hint', wzEl).hidden = wz.hurt !== 'sim';
      saveDraft();
      return;
    }
    if (t.dataset.go) { goStep(Number(t.dataset.go)); return; }
    const act = t.dataset.act;
    if (act === 'next') {
      const errs = validateStep();
      if (Object.keys(errs).length) { wzErr = errs; renderWz(true); return; }
      if (wz.step === 4) sendReport(); else goStep(wz.step + 1);
    } else if (act === 'back') {
      if (wz.step > 1) goStep(wz.step - 1);
    } else if (act === 'locate') {
      const label = t.lastElementChild;
      label.textContent = 'Procurando você…';
      t.disabled = true;
      const fill = () => {
        wz.city = 'Mogi das Cruzes';
        wz.bairro = 'Vila Lavínia';
        wz.end = 'Av. Francisco Ferreira Lopes, 1180';
        wzLocated = true;
        wzErr = {};
        renderWz(false);
        saveDraft();
        $('#f-end', wzEl).focus();
      };
      // Protótipo: pede a permissão de verdade, mas preenche um endereço de exemplo
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(fill, () => {
          label.textContent = 'Usar minha localização';
          t.disabled = false;
          toast('Não conseguimos ver sua localização. Escreva um ponto de referência.');
        }, { timeout: 8000 });
      } else {
        setTimeout(fill, 900);
      }
    } else if (act === 'similar') {
      pendingSel = 'ZL-24817';
      location.hash = '#/chamados';
    } else if (act === 'track') {
      pendingSel = wzSent.id;
      location.hash = '#/chamados';
    } else if (act === 'copy') {
      const done = () => toast('Número ' + wzSent.id + ' copiado');
      if (navigator.clipboard) navigator.clipboard.writeText(wzSent.id).then(done, done); else done();
    } else if (act === 'new') {
      wz = Object.assign({}, BLANK);
      wzPhoto = null;
      wzLocated = false;
      wzDir = 'b';
      renderWz(true);
    }
  });

  wzEl.addEventListener('input', (e) => {
    const k = e.target.dataset.k;
    if (!k) return;
    wz[k] = e.target.value;
    const wrap = e.target.closest('[data-field]');
    if (wrap && wrap.classList.contains('err')) { setFieldError(wrap, false); wzErr[k] = false; }
    if (k === 'desc') $('#c-desc', wzEl).textContent = wz.desc.length + ' de 500 letras';
    if (k === 'bairro' || k === 'end') $('#wz-similar', wzEl).hidden = !similarOf();
    saveDraft();
  });

  wzEl.addEventListener('change', (e) => {
    if (e.target.dataset.k === 'city') { wz.city = e.target.value; saveDraft(); }
    if (e.target.dataset.act === 'photo') {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      if (wzPhoto) URL.revokeObjectURL(wzPhoto);
      wzPhoto = URL.createObjectURL(f);
      renderWz(false);
    }
  });

  /* ---------- 6. Meus chamados ---------- */
  const BASE_TICKETS = [
    { id: 'ZL-26276', title: 'Buraco na rua', icon: 'i-road', addr: 'Rua Coronel Souza Franco, 412 · Centro, Mogi das Cruzes', city: 'Mogi das Cruzes', date: '6 nov. 2026', sup: 3, st: 'rec', mine: true, dates: ['6 nov., 9:42', 'Previsto até 11 nov.', '', ''], prazo: 'Prazo estimado: até 20 de novembro' },
    { id: 'ZL-24817', title: 'Buraco na rua', icon: 'i-road', addr: 'Av. Francisco Ferreira Lopes, 1180 · Vila Lavínia, Mogi das Cruzes', city: 'Mogi das Cruzes', date: '21 out. 2026', sup: 37, st: 'and', dates: ['21 out., 7:15', '24 out., 16:03', 'Desde 3 nov.', ''], prazo: 'Prazo estimado: até 14 de novembro' },
    { id: 'ZL-25388', title: 'Árvore com risco de queda', icon: 'i-tree', addr: 'Estrada do Corredor, 1543 · Jardim Revista, Suzano', city: 'Suzano', date: '29 out. 2026', sup: 9, st: 'and', pri: true, dates: ['29 out., 18:27', '30 out., 8:10', 'Desde 31 out.', ''], prazo: 'Prazo estimado: até 10 de novembro' },
    { id: 'ZL-25102', title: 'Poste apagado', icon: 'i-bulb', addr: 'Rua Benjamin Constant, 77 · Centro, Suzano', city: 'Suzano', date: '28 out. 2026', sup: 12, st: 'rec', dates: ['28 out., 21:54', 'Previsto até 7 nov.', '', ''], prazo: 'Prazo estimado: até 12 de novembro' },
    { id: 'ZL-24063', title: 'Calçada quebrada', icon: 'i-wheel', addr: 'Rua Doutor Ricardo Vilela, 925 · Centro, Ferraz de Vasconcelos', city: 'Ferraz de Vasconcelos', date: '15 out. 2026', sup: 6, st: 'rec', dates: ['15 out., 11:08', 'Previsto até 5 nov.', '', ''], prazo: 'Prazo estimado: até 18 de novembro' },
    { id: 'ZL-23950', title: 'Bueiro entupido', icon: 'i-drop', addr: 'Rua Capitão Manoel Caetano, 230 · Vila Monteiro, Poá', city: 'Poá', date: '13 out. 2026', sup: 21, st: 'res', dates: ['13 out., 6:51', '14 out., 10:30', '17 out., 8:00', '22 out., 15:12'], prazo: 'Resolvido em 22 de outubro' },
    { id: 'ZL-22714', title: 'Lixo acumulado', icon: 'i-trash', addr: 'Rua Tiradentes, 318 · Centro, Itaquaquecetuba', city: 'Itaquaquecetuba', date: '2 out. 2026', sup: 15, st: 'res', dates: ['2 out., 13:20', '3 out., 9:45', '6 out., 7:30', '8 out., 17:05'], prazo: 'Resolvido em 8 de outubro' }
  ];
  const STATUS = {
    rec: ['Recebido', 'badge b-rec', 'i-info'],
    and: ['Em andamento', 'badge b-and', 'i-clock'],
    res: ['Resolvido', 'badge b-res', 'i-check']
  };

  const chList = $('#ch-list');
  const chDetail = $('#ch-detail');
  const chScrim = $('#ch-scrim');
  let chFs = 'all';
  let chSel = 'ZL-26276';
  let pendingSel = null;
  let lastOpener = null;
  const support = store.get('apoios', {});
  const ratings = store.get('notas', {});

  const allTickets = () => store.get('meusChamados', []).concat(BASE_TICKETS);
  const supCount = (t) => t.sup + (support[t.id] ? 1 : 0);
  const plural = (n, a, b) => n + (n === 1 ? a : b);
  const badgeHtml = (t) => {
    const s = STATUS[t.st];
    return (t.mine ? '<span class="badge b-seu"><span class="i i-star" aria-hidden="true"></span>Seu chamado</span>' : '') +
      (t.pri ? '<span class="badge b-pri"><span class="i i-warn" aria-hidden="true"></span>Prioridade</span>' : '') +
      `<span class="${s[1]}"><span class="i ${s[2]}" aria-hidden="true"></span>${s[0]}</span>`;
  };

  function filteredTickets() {
    const q = norm($('#ch-busca').value);
    const city = $('#ch-cidade').value;
    return allTickets().filter((t) =>
      (chFs === 'all' || t.st === chFs) &&
      (city === 'Todas as cidades' || t.city === city) &&
      (!q || norm(t.id + ' ' + t.addr + ' ' + t.title).includes(q))
    );
  }

  function renderChamados() {
    if (pendingSel) { chSel = pendingSel; pendingSel = null; }
    renderList();
    renderDetail();
    if (isMobile() && location.hash.startsWith('#/chamados') && chSel && document.activeElement === document.body) {
      /* no celular a folha só abre quando a pessoa toca em um chamado */
    }
  }

  function renderList() {
    const list = filteredTickets();
    $('#ch-count').textContent = plural(list.length, ' chamado encontrado', ' chamados encontrados');
    if (!list.length) {
      chList.innerHTML = `
        <div class="card empty">
          <span class="ibig"><span class="i i32 i-search" aria-hidden="true"></span></span>
          <h2 class="t3">Nenhum chamado encontrado.</h2>
          <p class="small muted" style="max-width: 360px">Confira o número do protocolo ou tire os filtros. Se o problema ainda não foi avisado, você pode reportar agora.</p>
          <div class="row wr gap12" style="justify-content: center">
            <button class="btn btn-s" type="button" data-act="clear">Limpar filtros</button>
            <a class="btn btn-p" href="#/reportar">Reportar um problema</a>
          </div>
        </div>`;
      return;
    }
    chList.innerHTML = '<ul class="stack gap12">' + list.map((t) => `
      <li>
        <button class="tk${t.mine ? ' mine' : ''}" type="button" data-id="${t.id}" aria-current="${t.id === chSel}">
          <span class="ibox"><span class="i ${t.icon}" aria-hidden="true"></span></span>
          <span class="stack gap8" style="flex: 1; min-width: 0">
            <span class="row wr between gap8" style="align-items: flex-start">
              <b class="t3">${esc(t.title)}</b>
              <span class="row wr gap4">${badgeHtml(t)}</span>
            </span>
            <span class="small muted">${esc(t.addr)}</span>
            <span class="tk-meta"><span class="num">${t.id}</span><span>${t.date}</span><span>${plural(supCount(t), ' apoio', ' apoios')}</span></span>
          </span>
        </button>
      </li>`).join('') + '</ul>';
  }

  function renderDetail() {
    const t = allTickets().find((x) => x.id === chSel) || BASE_TICKETS[1];
    const stage = t.st === 'rec' ? 1 : t.st === 'and' ? 2 : 4;
    const steps = ['Recebido', 'Em análise', 'Em andamento', 'Resolvido'].map((lb, i) => {
      const done = i < stage || stage === 4;
      const now = i === stage && stage < 4;
      const cls = done ? 'done' : now ? 'now' : '';
      const icon = done ? 'i i16 i-check' : now ? 'i i16 i-clock' : '';
      return `<li class="${cls}"${now ? ' aria-current="step"' : ''}><span class="dot"><span class="${icon}" aria-hidden="true"></span></span><span><b>${lb}</b><span class="when">${t.dates[i] || 'Ainda não começou'}</span></span></li>`;
    }).join('');
    const rate = ratings[t.id] || 0;
    const supported = !!support[t.id];
    chDetail.innerHTML = `
      <button class="handle" type="button" aria-label="Arraste para baixo ou toque para fechar"><span></span></button>
      <div class="pad stack gap24">
        <div class="row between gap16" style="align-items: flex-start">
          <div class="row gap16">
            <span class="ibox"><span class="i ${t.icon}" aria-hidden="true"></span></span>
            <div class="stack">
              <h2 class="t2" id="ch-titulo" tabindex="-1">${esc(t.title)}</h2>
              <span class="small muted">${esc(t.addr)}</span>
            </div>
          </div>
          <button class="btn btn-s btn-sm btn-ic only-m" type="button" data-act="close" aria-label="Fechar detalhes"><span class="i i20 i-x" aria-hidden="true"></span></button>
        </div>
        <div class="row wr gap8">
          ${badgeHtml(t)}
          <button class="badge" type="button" data-act="copy" style="border: 0; background: var(--s2); color: var(--ink); cursor: pointer" aria-label="Copiar o protocolo ${t.id}"><span class="i i-copy" aria-hidden="true"></span><span class="num">${t.id}</span></button>
        </div>
        <div class="note n-in"><span class="i i-clock" aria-hidden="true"></span><span><b>${t.prazo}</b>${t.st === 'res' ? 'A equipe registrou a conclusão. Avalie o serviço abaixo.' : 'Você recebe aviso por SMS quando a situação mudar.'}</span></div>
        <div class="stack gap16">
          <h3 class="t3">Andamento</h3>
          <ol class="tl">${steps}</ol>
        </div>
        ${t.st !== 'res' ? `
          <div class="stack gap8">
            <button class="btn btn-s full" type="button" data-act="support" aria-pressed="${supported}"><span class="i i20 ${supported ? 'i-check' : 'i-heart'}" aria-hidden="true" style="color: var(--g)"></span>${supported ? 'Você apoiou' : 'Isso também me afeta'} (${supCount(t)})</button>
            <p class="xs muted" style="text-align: center">Cada apoio mostra à prefeitura que o problema afeta mais pessoas.</p>
          </div>` : `
          <div class="stack gap8">
            <h3 class="t3" id="rate-lbl">Como ficou o conserto?</h3>
            <div class="stars" role="group" aria-labelledby="rate-lbl">
              ${[1, 2, 3, 4, 5].map((n) => `<button class="star" type="button" data-star="${n}" aria-pressed="${n <= rate}" aria-label="${plural(n, ' estrela', ' estrelas')}"><span class="i i32 ${n <= rate ? 'i-starf' : 'i-star'}" aria-hidden="true"></span></button>`).join('')}
            </div>
            <p class="small muted" aria-live="polite">${rate ? 'Obrigado. Sua nota foi ' + rate + ' de 5.' : 'Toque nas estrelas para dar uma nota.'}</p>
          </div>`}
      </div>`;
    chDetail.dataset.id = t.id;
  }

  function openSheet() {
    if (!isMobile()) return;
    chDetail.classList.add('open');
    chScrim.classList.add('open');
    body.style.overflow = 'hidden';
    const h = $('#ch-titulo', chDetail);
    if (h) h.focus({ preventScroll: true });
  }

  function closeSheet() {
    if (!chDetail.classList.contains('open')) return;
    chDetail.classList.remove('open', 'drag');
    chDetail.style.removeProperty('--dy');
    chScrim.classList.remove('open');
    body.style.overflow = '';
    if (lastOpener && document.contains(lastOpener)) lastOpener.focus();
  }

  chList.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.act === 'clear') {
      chFs = 'all';
      $('#ch-busca').value = '';
      $('#ch-cidade').value = 'Todas as cidades';
      $$('#ch-chips .chip').forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.fs === 'all')));
      renderList();
      return;
    }
    if (b.dataset.id) {
      chSel = b.dataset.id;
      lastOpener = b;
      $$('.tk', chList).forEach((x) => x.setAttribute('aria-current', String(x === b)));
      renderDetail();
      if (isMobile()) openSheet();
      else $('#ch-titulo', chDetail).focus({ preventScroll: true });
    }
  });

  chDetail.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    const id = chDetail.dataset.id;
    if (b.classList.contains('handle') || b.dataset.act === 'close') { closeSheet(); return; }
    if (b.dataset.act === 'support') {
      support[id] = !support[id];
      store.set('apoios', support);
      renderDetail();
      renderList();
      $('[data-act="support"]', chDetail).focus();
      toast(support[id] ? 'Obrigado. Seu apoio foi registrado.' : 'Apoio retirado.');
    }
    if (b.dataset.act === 'copy') {
      const done = () => toast('Número ' + id + ' copiado');
      if (navigator.clipboard) navigator.clipboard.writeText(id).then(done, done); else done();
    }
    if (b.dataset.star) {
      ratings[id] = Number(b.dataset.star);
      store.set('notas', ratings);
      renderDetail();
      $(`[data-star="${ratings[id]}"]`, chDetail).focus();
    }
  });

  // Arrastar a folha para baixo no celular
  chDetail.addEventListener('pointerdown', (e) => {
    if (!e.target.closest('.handle') || !isMobile()) return;
    const y0 = e.clientY;
    let dy = 0;
    chDetail.classList.add('drag');
    const move = (ev) => {
      dy = Math.max(0, ev.clientY - y0);
      chDetail.style.setProperty('--dy', dy + 'px');
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      chDetail.classList.remove('drag');
      chDetail.style.removeProperty('--dy');
      if (dy > 120) closeSheet();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  });

  chScrim.addEventListener('click', closeSheet);
  $('#ch-busca').addEventListener('input', renderList);
  $('#ch-cidade').addEventListener('change', renderList);
  $$('#ch-chips .chip').forEach((c) => c.addEventListener('click', () => {
    chFs = c.dataset.fs;
    $$('#ch-chips .chip').forEach((x) => x.setAttribute('aria-pressed', String(x === c)));
    renderList();
  }));

  /* ---------- 7. Alerta de chuva ---------- */
  const FORECAST = {
    'Mogi das Cruzes': { lv: 'at', chance: 78, peak: '15h às 18h', b: [0.4, 0.2, 0.8, 2.1, 4.6, 9.3, 6.2, 0.9] },
    'Suzano': { lv: 'hi', chance: 92, peak: '15h às 18h', b: [0.6, 0.3, 1.2, 3.8, 7.4, 14.9, 10.6, 2.9] },
    'Itaquaquecetuba': { lv: 'at', chance: 64, peak: '15h às 18h', b: [0.2, 0, 0.5, 1.7, 3.9, 7.6, 5.1, 0.8] },
    'Poá': { lv: 'lo', chance: 41, peak: 'Por volta das 15h', b: [0, 0, 0.3, 0.9, 1.6, 2.2, 1.1, 0.2] },
    'Ferraz de Vasconcelos': { lv: 'lo', chance: 47, peak: 'Por volta das 15h', b: [0.1, 0, 0.4, 1.3, 2.4, 3.1, 1.4, 0.2] }
  };
  const LEVELS = {
    lo: { cls: 'risk lo', word: 'Risco baixo', icon: 'i-check', phrase: 'Pode chover pouco. Siga a rotina e confira a previsão de novo à noite.',
      list: ['Guarde documentos em um saco plástico', 'Limpe a calha e o ralo de casa', 'Salve o número da Defesa Civil: 199', 'Combine com um vizinho como avisar um ao outro', 'Ative o alerta no celular, aqui embaixo'] },
    at: { cls: 'risk at', word: 'Atenção', icon: 'i-warn', phrase: 'Chuva forte à tarde. Prepare a casa agora e evite passar perto do córrego entre 15h e 18h.',
      list: ['Coloque documentos e remédios em um saco plástico', 'Suba móveis e aparelhos do chão', 'Deixe o celular carregado', 'Evite passar perto do córrego', 'Combine um ponto de encontro com a família'] },
    hi: { cls: 'risk hi', word: 'Risco alto', icon: 'i-warn', phrase: 'Chuva muito forte. Se a água começar a subir, saia de casa e vá para um abrigo.',
      list: ['Saia de casa se a água começar a subir', 'Desligue a energia no disjuntor', 'Leve documentos, remédios e o celular', 'Vá para o abrigo mais perto', 'Ligue 199 se alguém precisar de ajuda'] }
  };
  const SHELTERS = [
    { name: 'Escola Estadual Jardim Aeroporto (exemplo)', addr: 'Rua das Hortênsias, 290', vagas: 118, dist: '1,2 km', acc: true, pet: true },
    { name: 'Ginásio Municipal Vila Industrial (exemplo)', addr: 'Av. Cívica, 1047', vagas: 64, dist: '2,7 km', acc: true, pet: false },
    { name: 'Salão Comunitário Braz Cubas (exemplo)', addr: 'Rua Ipiranga, 83', vagas: 37, dist: '3,1 km', acc: false, pet: true }
  ];
  const alCity = $('#al-cidade');
  const alRisk = $('#al-risk');
  const checklist = store.get('checklist', {});
  let alCanal = 'SMS';

  function renderRiskSkeleton() {
    alRisk.setAttribute('aria-busy', 'true');
    alRisk.innerHTML = `
      <div class="card" style="padding: 40px; display: flex; flex-direction: column; gap: 24px">
        <span class="sk" style="width: 280px; max-width: 80%; height: 20px"></span>
        <span class="sk" style="width: 320px; max-width: 90%; height: 60px; border-radius: 12px"></span>
        <span class="sk" style="width: 90%; max-width: 560px; height: 20px"></span>
        <div class="risk-stats"><span class="sk" style="height: 88px; border-radius: 16px"></span><span class="sk" style="height: 88px; border-radius: 16px"></span><span class="sk" style="height: 88px; border-radius: 16px"></span></div>
        <span class="sr">Carregando a previsão</span>
      </div>`;
  }

  function renderAlert() {
    const city = alCity.value;
    const f = FORECAST[city];
    const L = LEVELS[f.lv];
    const total = f.b.reduce((s, v) => s + v, 0);

    alRisk.setAttribute('aria-busy', 'false');
    alRisk.innerHTML = `
      <div class="${L.cls}">
        <p class="small" style="font-weight: 600">${city} · próximas 24 horas</p>
        <h2 class="risk-lvl"><span class="i i48 ${L.icon}" aria-hidden="true"></span>${L.word}</h2>
        <p class="t3" style="max-width: 680px; font-weight: 600">${L.phrase}</p>
        <div class="risk-stats">
          <div class="stat"><b class="num">${fmtNum(total)} mm</b><span>previstos</span></div>
          <div class="stat"><b class="num">${f.chance}%</b><span>de chance de chuva</span></div>
          <div class="stat"><b class="num">${f.peak}</b><span>horário mais forte</span></div>
        </div>
      </div>`;

    const plot = $('#al-plot');
    $$('.bcol', plot).forEach((n) => n.remove());
    plot.setAttribute('aria-label', 'Chuva prevista a cada 3 horas em ' + city + ': ' + f.b.map((v, i) => (i * 3) + 'h, ' + fmtNum(v) + ' mm').join('; '));
    plot.insertAdjacentHTML('beforeend', f.b.map((v) =>
      `<div class="bcol"><span class="bval num">${fmtNum(v)}</span><span class="bar${v > 5 ? ' hi' : ''}" style="height: ${Math.max(4, Math.round(v / 16 * 176))}px"></span></div>`
    ).join(''));

    renderChecks();

    $('#al-shelters').innerHTML = SHELTERS.map((s) => `
      <li class="card pad24 stack gap16">
        <div class="stack gap4">
          <h3 class="t3">${s.name}</h3>
          <p class="small muted">${s.addr} · ${city}</p>
        </div>
        <p><b class="t2 num">${s.vagas}</b> <span class="small muted">vagas livres</span></p>
        <ul class="tags">
          <li class="tg"><span class="i i-pin" aria-hidden="true"></span>${s.dist} de você</li>
          <li class="tg"><span class="i ${s.acc ? 'i-wheel' : 'i-x'}" aria-hidden="true"></span>${s.acc ? 'Acessível para cadeira de rodas' : 'Sem rampa de acesso'}</li>
          <li class="tg"><span class="i ${s.pet ? 'i-paw' : 'i-x'}" aria-hidden="true"></span>${s.pet ? 'Aceita animais' : 'Não aceita animais'}</li>
        </ul>
        <a class="btn btn-s" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.addr + ', ' + city)}" target="_blank" rel="noopener">Como chegar<span class="i i20 i-right" aria-hidden="true"></span><span class="sr"> (abre em nova aba)</span></a>
      </li>`).join('');
  }

  function renderChecks() {
    const lv = FORECAST[alCity.value].lv;
    const done = checklist[lv] || [true, false, false, false, false];
    const n = done.filter(Boolean).length;
    $('#al-done').textContent = n + ' de 5 feitos';
    $('#al-prog').style.width = n * 20 + '%';
    $('#al-checks').innerHTML = LEVELS[lv].list.map((label, i) =>
      `<li><button class="chk" type="button" role="checkbox" data-i="${i}" aria-checked="${!!done[i]}"><span class="cbox" aria-hidden="true"><span class="i i20 i-check"></span></span>${label}</button></li>`
    ).join('');
  }

  function loadAlert() {
    renderRiskSkeleton();
    setTimeout(renderAlert, 900);
  }

  alCity.addEventListener('change', () => { store.set('cidade', alCity.value); loadAlert(); });

  $('#al-checks').addEventListener('click', (e) => {
    const b = e.target.closest('[data-i]');
    if (!b) return;
    const lv = FORECAST[alCity.value].lv;
    const done = (checklist[lv] || [true, false, false, false, false]).slice();
    done[b.dataset.i] = !done[b.dataset.i];
    checklist[lv] = done;
    store.set('checklist', checklist);
    renderChecks();
    $(`[data-i="${b.dataset.i}"]`, $('#al-checks')).focus();
  });

  $$('#al-canais [data-canal]').forEach((b) => b.addEventListener('click', () => {
    alCanal = b.dataset.canal;
    $$('#al-canais [data-canal]').forEach((x) => x.setAttribute('aria-checked', String(x === b)));
  }));

  const alForm = $('#al-form');
  alForm.addEventListener('input', (e) => {
    const wrap = e.target.closest('[data-field]');
    if (wrap && wrap.classList.contains('err')) setFieldError(wrap, false);
    $('#al-ok').hidden = true;
  });
  alForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const nome = $('#al-nome').value.trim();
    const cel = $('#al-cel').value.trim();
    const bad = { nome: !nome, cel: digits(cel).length !== 11 };
    setFieldError($('[data-field="nome"]', alForm), bad.nome);
    setFieldError($('[data-field="cel"]', alForm), bad.cel);
    if (bad.nome || bad.cel) {
      (bad.nome ? $('#al-nome') : $('#al-cel')).focus();
      return;
    }
    const ok = $('#al-ok');
    ok.innerHTML = `<span class="i i-check" aria-hidden="true"></span><span><b>Pronto, ${esc(nome)}.</b>Você vai receber alertas de chuva de ${esc(alCity.value)} por ${esc(alCanal)} no número ${esc(cel)}.</span>`;
    ok.hidden = false;
  });

  /* ---------- 8. Saúde ---------- */
  const MEDS = [
    ['Losartana 50 mg', 'Pressão alta'], ['Losartana 25 mg', 'Pressão alta'], ['Hidroclorotiazida 25 mg', 'Pressão alta'],
    ['Metformina 850 mg', 'Diabetes'], ['Sinvastatina 20 mg', 'Colesterol'], ['Dipirona 500 mg', 'Dor e febre'],
    ['Omeprazol 20 mg', 'Estômago'], ['Insulina NPH', 'Diabetes']
  ];
  const UNITS = {
    'Mogi das Cruzes': ['Vila Natal', 'Jardim Universo', 'Braz Cubas', 'Centro'],
    'Suzano': ['Jardim Revista', 'Vila Amorim', 'Palmeiras', 'Centro'],
    'Itaquaquecetuba': ['Jardim Odete', 'Vila Virgínia', 'Jardim Caiuby', 'Centro'],
    'Poá': ['Calmon Viana', 'Jardim Medina', 'Vila Júlia', 'Centro'],
    'Ferraz de Vasconcelos': ['Vila Romanópolis', 'Jardim São João', 'Parque São Francisco', 'Centro']
  };
  const DIST = [1.4, 2.9, 0.8, 1.1];
  const HOURS = ['7h às 17h', '7h às 19h', '7h às 17h', '8h às 17h'];
  const STOCK_BASE = ['ok', 'ok', 'few', 'out'];
  const STOCK = {
    ok: ['Disponível', 'badge b-res', 'stk ok', 'i-check'],
    few: ['Poucas unidades', 'badge b-and', 'stk few', 'i-warn'],
    out: ['Em falta', 'badge b-pri', 'stk out', 'i-x']
  };
  const RANK = { ok: 0, few: 1, out: 2 };
  const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const MONTHS_FULL = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

  const saRem = $('#sa-rem');
  const saSugg = $('#sa-sugg');
  const saCity = $('#sa-cidade');
  let saMed = 'Losartana 50 mg';
  let saTipo = 'rem';
  let rems = store.get('lembretes', null) || [
    { id: 1, tipo: 'rem', desc: 'Losartana 50 mg · 1 comprimido', date: '2026-11-09', time: '07:00' },
    { id: 2, tipo: 'cons', desc: 'Clínico geral · UBS Vila Natal', date: '2026-11-18', time: '08:30' }
  ];

  function renderUbs() {
    const city = saCity.value;
    const k = Math.max(0, MEDS.findIndex((m) => m[0] === saMed));
    const list = UNITS[city].map((n, i) => ({ n, i, s: STOCK_BASE[(i + k * 3) % 4], d: DIST[i] }))
      .sort((x, y) => RANK[x.s] - RANK[y.s] || x.d - y.d);
    const withStock = list.filter((u) => u.s !== 'out');
    const best = list.find((u) => u.s === 'ok') || withStock[0];
    const sum = $('#sa-sum');
    sum.className = withStock.length ? 'note n-ok' : 'note n-er';
    sum.innerHTML = withStock.length
      ? `<span class="i i-check" aria-hidden="true"></span><span><b>${esc(saMed)}</b>${withStock.length} de 4 UBS em ${city} têm agora. A mais perto com estoque fica a ${fmtNum(best.d)} km.</span>`
      : `<span class="i i-x" aria-hidden="true"></span><span><b>${esc(saMed)}</b>Nenhuma UBS em ${city} tem agora. Pergunte na sua UBS quando chega.</span>`;
    $('#sa-list').innerHTML = list.map((u) => {
      const s = STOCK[u.s];
      return `
        <li class="ubs">
          <span class="${s[2]}"><span class="i ${s[3]}" aria-hidden="true"></span></span>
          <div class="stack gap4">
            <div class="row wr gap8"><b class="t3">UBS ${u.n} (exemplo)</b><span class="${s[1]}">${s[0]}</span></div>
            <span class="small muted">${fmtNum(u.d)} km · Aberta das ${HOURS[u.i]}</span>
          </div>
          <a class="btn btn-s btn-sm" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('UBS ' + u.n + ', ' + city)}" target="_blank" rel="noopener"><span class="i i20 i-pin" aria-hidden="true"></span>Como chegar<span class="sr"> (abre em nova aba)</span></a>
        </li>`;
    }).join('');
  }

  function medMatches() {
    const q = norm(saRem.value).trim();
    if (q.length < 2) return MEDS.slice(0, 4);
    return MEDS.filter((m) => norm(m[0]).includes(q) || norm(m[1]).includes(q)).slice(0, 5);
  }
  function renderMedSugg() {
    const list = medMatches();
    saSugg.innerHTML = list.map(([name, use]) =>
      `<button type="button" role="option" data-med="${esc(name)}"><span class="bub"><span class="i i20 i-pill" aria-hidden="true"></span></span><span>${esc(name)}<small>${esc(use)}</small></span></button>`
    ).join('') || '<p class="sugg-empty">Não achamos esse nome. Confira a receita ou escreva só o começo, como “meta”.</p>';
    saSugg.hidden = false;
    saRem.setAttribute('aria-expanded', 'true');
  }
  function hideMedSugg() {
    saSugg.hidden = true;
    saRem.setAttribute('aria-expanded', 'false');
  }
  function pickMed(name) {
    saMed = name;
    saRem.value = name;
    hideMedSugg();
    renderUbs();
  }

  saRem.addEventListener('focus', () => { saRem.select(); renderMedSugg(); });
  saRem.addEventListener('input', renderMedSugg);
  saRem.addEventListener('blur', () => setTimeout(hideMedSugg, 150));
  saRem.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const first = medMatches()[0];
      if (first) pickMed(first[0]);
    }
    if (e.key === 'ArrowDown') {
      const b = $('button', saSugg);
      if (b) { e.preventDefault(); b.focus(); }
    }
  });
  saSugg.addEventListener('mousedown', (e) => e.preventDefault());
  saSugg.addEventListener('click', (e) => {
    const b = e.target.closest('[data-med]');
    if (b) { pickMed(b.dataset.med); saRem.focus(); hideMedSugg(); }
  });
  saSugg.addEventListener('keydown', (e) => {
    const items = $$('button', saSugg);
    const i = items.indexOf(document.activeElement);
    if (e.key === 'ArrowDown' && i < items.length - 1) { e.preventDefault(); items[i + 1].focus(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); (i > 0 ? items[i - 1] : saRem).focus(); }
    if (e.key === 'Escape') { hideMedSugg(); saRem.focus(); }
  });
  saCity.addEventListener('change', renderUbs);

  // Lembretes
  function renderRems() {
    const box = $('#sa-rems');
    if (!rems.length) {
      box.innerHTML = `
        <div class="card empty">
          <span class="ibig"><span class="i i32 i-bell" aria-hidden="true"></span></span>
          <h3 class="t3">Você ainda não tem lembretes.</h3>
          <p class="small muted" style="max-width: 320px">Preencha o formulário ao lado para lembrar da próxima consulta ou do horário do remédio.</p>
          <label class="btn btn-s" for="sa-desc"><span class="i i20 i-plus" aria-hidden="true"></span>Criar o primeiro lembrete</label>
        </div>`;
      return;
    }
    box.innerHTML = '<ul class="stack gap12">' + rems.slice()
      .sort((x, y) => (x.date + x.time).localeCompare(y.date + y.time))
      .map((r) => {
        const [, mo, d] = r.date.split('-').map(Number);
        const cons = r.tipo === 'cons';
        return `
          <li class="rem">
            <span class="datechip" aria-hidden="true"><b>${d}</b><span>${MONTHS[mo - 1]}</span></span>
            <div class="stack gap4" style="flex: 1; min-width: 160px">
              <span class="row gap8 xs muted" style="font-weight: 700"><span class="i i16 ${cons ? 'i-cal' : 'i-pill'}" aria-hidden="true"></span>${cons ? 'Consulta' : 'Remédio'}</span>
              <b>${esc(r.desc)}</b>
              <span class="small muted">${d} de ${MONTHS_FULL[mo - 1]}, às ${r.time}</span>
            </div>
            <div class="row gap8">
              <button class="btn btn-s btn-sm" type="button" data-ics="${r.id}"><span class="i i20 i-cal" aria-hidden="true"></span>Agenda</button>
              <button class="btn btn-gh btn-sm" type="button" data-del="${r.id}" aria-label="Apagar lembrete ${esc(r.desc)}" style="color: var(--red)"><span class="i i20 i-trash" aria-hidden="true"></span>Apagar</button>
            </div>
          </li>`;
      }).join('') + '</ul>';
  }

  function downloadIcs(r) {
    const dt = r.date.replace(/-/g, '') + 'T' + r.time.replace(':', '') + '00';
    const text = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Zela//Lembretes//PT', 'BEGIN:VEVENT',
      'UID:zela-' + r.id + '@zela', 'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z',
      'DTSTART:' + dt, 'SUMMARY:' + r.desc,
      'BEGIN:VALARM', 'TRIGGER:-PT30M', 'ACTION:DISPLAY', 'DESCRIPTION:' + r.desc, 'END:VALARM',
      'END:VEVENT', 'END:VCALENDAR'
    ].join('\r\n');
    const url = URL.createObjectURL(new Blob([text], { type: 'text/calendar' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lembrete-zela.ics';
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    toast('Arquivo de agenda baixado. Abra para salvar no calendário.');
  }

  $('#sa-rems').addEventListener('click', (e) => {
    const ics = e.target.closest('[data-ics]');
    const del = e.target.closest('[data-del]');
    if (ics) downloadIcs(rems.find((r) => String(r.id) === ics.dataset.ics));
    if (del) {
      rems = rems.filter((r) => String(r.id) !== del.dataset.del);
      store.set('lembretes', rems);
      renderRems();
      toast('Lembrete apagado');
      $('#sa-desc').focus();
    }
  });

  $$('#sa-tipo [data-tipo]').forEach((b) => b.addEventListener('click', () => {
    saTipo = b.dataset.tipo;
    $$('#sa-tipo [data-tipo]').forEach((x) => x.setAttribute('aria-checked', String(x === b)));
    $('#sa-desc-hint').textContent = saTipo === 'cons' ? 'Ex.: Cardiologista na UBS Braz Cubas' : 'Ex.: Losartana 50 mg, 1 comprimido';
  }));

  const saForm = $('#sa-form');
  $('#sa-dia').min = new Date().toISOString().slice(0, 10);
  saForm.addEventListener('input', (e) => {
    const wrap = e.target.closest('[data-field]');
    if (wrap && wrap.classList.contains('err')) setFieldError(wrap, false);
  });
  saForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const desc = $('#sa-desc').value.trim();
    const dia = $('#sa-dia').value;
    const hora = $('#sa-hora').value;
    const bad = { desc: !desc, dia: !dia, hora: !hora };
    Object.keys(bad).forEach((k) => setFieldError($(`[data-field="${k}"]`, saForm), bad[k]));
    const first = Object.keys(bad).find((k) => bad[k]);
    if (first) { $('#sa-' + first).focus(); return; }
    rems.push({ id: Date.now(), tipo: saTipo, desc, date: dia, time: hora });
    store.set('lembretes', rems);
    saForm.reset();
    renderRems();
    toast('Lembrete salvo neste aparelho');
  });

  /* ---------- Início da página ---------- */
  alCity.value = store.get('cidade', 'Mogi das Cruzes');
  renderWz(false);
  loadAlert();
  renderUbs();
  renderRems();
  route();
})();
