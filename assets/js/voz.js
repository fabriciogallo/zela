/* Uma leitura por vez, com texto sempre disponível e vozes escolhidas pela pessoa. */
(function () {
  "use strict";
  const config = window.ZELA_VOZ_CONFIG || {};
  const nativo = "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
  const online = typeof config.endpoint === "string" && /^https:\/\//.test(config.endpoint);
  const vozesOnline = online && Array.isArray(config.vozes) ? config.vozes : [];
  const audio = new Audio();
  const cache = new Map();
  let preferida = ZELA.store.get("voz-preferida", "auto");
  let velocidade = Number(ZELA.store.get("voz-velocidade", 1));
  if (![0.8, 1, 1.15].includes(velocidade)) velocidade = 1;
  let geracao = 0, origem = "", estado = "parada", pedido = null;
  let onFim = null, tocandoOnline = false, vozAtual = null;

  function avisar(novo, mensagem) {
    estado = novo;
    window.dispatchEvent(new CustomEvent("zela:voz", { detail: { estado: novo, origem: origem, mensagem: mensagem || "" } }));
  }
  function vozesDoAparelho() {
    return nativo ? window.speechSynthesis.getVoices().filter(function (v) { return /^pt(?:-|_)/i.test(v.lang); }) : [];
  }
  function idVoz(v) { return "aparelho:" + (v.voiceURI || v.name); }
  function melhorVoz() {
    const lista = vozesDoAparelho();
    const escolhida = lista.find(function (v) { return idVoz(v) === preferida; });
    if (escolhida) return escolhida;
    function nota(v) {
      return (/^pt[-_]BR$/i.test(v.lang) ? 20 : 0) + (/natural|neural|premium|enhanced/i.test(v.name) ? 10 : 0) + (v.default ? 1 : 0);
    }
    return lista.sort(function (a, b) { return nota(b) - nota(a); })[0] || null;
  }
  function vozOnline() {
    if (preferida === "auto" && online) return vozesOnline[0];
    return vozesOnline.find(function (v) { return preferida === "online:" + v.id; });
  }
  function parar() {
    geracao++;
    if (pedido) pedido.abort();
    pedido = null; onFim = null;
    if (nativo) window.speechSynthesis.cancel();
    audio.pause();
    audio.removeAttribute("src"); audio.load();
    tocandoOnline = false; vozAtual = null;
    avisar("parada", "Leitura parada.");
  }
  function textoFalado(texto) {
    return String(texto).replace(/\bUBS\b/g, "unidade básica de saúde").replace(/\bCEP\b/g, "código postal")
      .replace(/\b(\d+(?:[.,]\d+)?)\s*km\b/gi, "$1 quilômetros").replace(/\b(\d+)\s*m\b/g, "$1 metros")
      .replace(/\b(\d+)\s*min\b/gi, "$1 minutos").replace(/·/g, ", ")
      .replace(/\.{2,}/g, ".").replace(/\s+/g, " ").trim();
  }
  function partes(texto) {
    const itens = [];
    let restante = texto;
    while (restante.length > 450) {
      let fim = restante.lastIndexOf(". ", 450);
      if (fim < 180) fim = restante.lastIndexOf(" ", 450);
      if (fim < 1) fim = 450;
      else fim++;
      itens.push(restante.slice(0, fim).trim()); restante = restante.slice(fim).trim();
    }
    if (restante) itens.push(restante);
    return itens;
  }
  function terminou(token) {
    if (token !== geracao) return;
    const aoTerminar = onFim; onFim = null;
    avisar("concluida", "Leitura concluída.");
    if (aoTerminar) aoTerminar();
  }
  function falarNoAparelho(texto, token, aviso) {
    if (!nativo) { avisar("indisponivel", "A voz não está disponível neste navegador. As instruções continuam no texto."); return; }
    if (window.speechSynthesis.paused) window.speechSynthesis.resume();
    tocandoOnline = false;
    const lista = partes(texto);
    vozAtual = melhorVoz();
    function seguinte(i) {
      if (token !== geracao) return;
      if (i >= lista.length) { terminou(token); return; }
      const fala = new SpeechSynthesisUtterance(lista[i]);
      fala.lang = vozAtual?.lang || "pt-BR";
      if (vozAtual) fala.voice = vozAtual;
      fala.rate = velocidade; fala.pitch = 1;
      fala.onend = function () { seguinte(i + 1); };
      fala.onerror = function (e) {
        if (token !== geracao || ["canceled", "interrupted"].includes(e.error)) return;
        avisar("indisponivel", "Não conseguimos reproduzir a voz. Escolha outra voz nos ajustes de Leitura ou acompanhe pelo texto.");
      };
      if (i === 0) avisar("falando", aviso || "Leitura em andamento.");
      window.speechSynthesis.speak(fala);
    }
    seguinte(0);
  }
  async function falarOnline(texto, voz, token) {
    const trechos = partes(texto);
    tocandoOnline = true;
    let i = 0;
    async function seguinte() {
      if (token !== geracao) return;
      if (i >= trechos.length) { terminou(token); return; }
      const trecho = trechos[i++], chave = voz.id + "|" + velocidade + "|" + trecho;
      avisar("carregando", "Preparando a voz online…");
      try {
        let url = cache.get(chave);
        if (!url) {
          const controlador = new AbortController(); pedido = controlador;
          const prazo = window.setTimeout(function () { controlador.abort(); }, 12000);
          let resposta;
          try {
            resposta = await fetch(config.endpoint, {
              method: "POST", headers: { "Content-Type": "application/json" }, signal: controlador.signal,
              body: JSON.stringify({ texto: trecho, voz: voz.id, velocidade: velocidade })
            });
            if (!resposta.ok || !/^audio\//i.test(resposta.headers.get("Content-Type") || "")) throw new Error("Voz indisponível");
            const blob = await resposta.blob();
            if (blob.size > 4 * 1024 * 1024 || !blob.size) throw new Error("Áudio inválido");
            if (token !== geracao) return;
            url = URL.createObjectURL(blob); cache.set(chave, url);
            if (cache.size > 12) { const antiga = cache.keys().next().value; URL.revokeObjectURL(cache.get(antiga)); cache.delete(antiga); }
          } finally { window.clearTimeout(prazo); if (pedido === controlador) pedido = null; }
        }
        if (token !== geracao) return;
        audio.src = url; audio.playbackRate = 1;
        audio.onended = seguinte;
        audio.onerror = function () {
          if (token === geracao) falarNoAparelho(texto, token, "A voz online falhou. Usando a voz deste aparelho.");
        };
        try { await audio.play(); if (token === geracao) avisar("falando", "Leitura em andamento com voz online."); }
        catch (e) {
          if (token !== geracao) return;
          if (e.name === "NotAllowedError") avisar("pausada", "Toque em Retomar para ouvir a voz online.");
          else throw e;
        }
      } catch (e) {
        if (token === geracao) falarNoAparelho(texto, token, "A voz online não respondeu. Usando a voz deste aparelho.");
      }
    }
    await seguinte();
  }
  function falar(texto, opcoes) {
    opcoes = opcoes || {};
    parar(); origem = opcoes.origem || "pagina"; onFim = opcoes.aoTerminar || null;
    const limpo = textoFalado(texto).slice(0, 12000);
    if (!limpo) return;
    const token = geracao, voz = vozOnline();
    if (voz) falarOnline(limpo, voz, token);
    else falarNoAparelho(limpo, token);
  }
  function pausar() {
    if (estado !== "falando") return;
    if (tocandoOnline) audio.pause(); else if (nativo) window.speechSynthesis.pause();
    avisar("pausada", "Leitura pausada.");
  }
  function retomar() {
    if (estado !== "pausada") return;
    if (tocandoOnline) {
      const token = geracao;
      audio.play().then(function () {
        if (token === geracao) avisar("falando", "Leitura retomada.");
      }, function () {
        if (token === geracao) avisar("indisponivel", "Não conseguimos retomar o áudio. Ouça novamente ou acompanhe pelo texto.");
      });
    } else if (nativo) { window.speechSynthesis.resume(); avisar("falando", "Leitura retomada."); }
  }
  function controles(container, opcoes) {
    if (!container) return;
    const grupo = document.createElement("div"); grupo.className = "voz-controles";
    grupo.setAttribute("role", "group"); grupo.setAttribute("aria-label", opcoes.rotulo);
    const ouvir = document.createElement("button"), pausa = document.createElement("button"), fim = document.createElement("button");
    [ouvir, pausa, fim].forEach(function (b) { b.type = "button"; b.className = "btn btn--ghost btn--sm"; });
    ouvir.textContent = opcoes.rotulo; pausa.textContent = "Pausar"; fim.textContent = "Parar";
    pausa.hidden = true; fim.hidden = true;
    const status = document.createElement("p"); status.className = "hint t-small voz-status"; status.setAttribute("role", "status");
    grupo.append(ouvir, pausa, fim, status); container.append(grupo);
    ouvir.addEventListener("click", function () {
      if (ouvir.getAttribute("aria-disabled") === "true") return;
      falar(opcoes.texto(), { origem: opcoes.origem });
    });
    pausa.addEventListener("click", function () { if (estado === "pausada") retomar(); else pausar(); });
    fim.addEventListener("click", function () { parar(); ouvir.focus({ preventScroll: true }); });
    window.addEventListener("zela:voz", function (e) {
      const meu = e.detail.origem === opcoes.origem;
      const ativo = meu && ["carregando", "falando", "pausada"].includes(e.detail.estado);
      if (!ativo && [pausa, fim].includes(document.activeElement)) ouvir.focus({ preventScroll: true });
      pausa.hidden = !ativo || e.detail.estado === "carregando"; fim.hidden = !ativo;
      ouvir.setAttribute("aria-disabled", String(meu && e.detail.estado === "carregando"));
      pausa.textContent = e.detail.estado === "pausada" ? "Retomar" : "Pausar";
      if (meu) status.textContent = e.detail.mensagem;
      else status.textContent = "";
    });
    if (!nativo && !online) {
      ouvir.hidden = true;
      status.textContent = "A leitura em voz alta não está disponível neste navegador. Você pode acompanhar pelo texto.";
    }
  }
  ZELA.voz = { falar: falar, parar: parar, pausar: pausar, retomar: retomar, controles: controles };

  function montarAjustes() {
    const referencia = document.querySelector(".leitura-aparencia");
    if (!referencia) return;
    const secao = document.createElement("fieldset"); secao.className = "leitura-opcao leitura-voz stack";
    secao.innerHTML = '<legend class="legend">Voz da leitura</legend>' +
      '<div class="field"><label for="leitura-voz">Escolher a voz</label><select class="input" id="leitura-voz" aria-describedby="leitura-voz-nota"></select></div>' +
      '<p class="hint t-small" id="leitura-voz-nota"></p>' +
      '<div class="field"><label for="leitura-ritmo">Velocidade da leitura</label><select class="input" id="leitura-ritmo"><option value="0.8">Mais devagar</option><option value="1">Normal</option><option value="1.15">Um pouco mais rápido</option></select></div>' +
      '<div id="leitura-voz-teste"></div>';
    referencia.before(secao);
    const seletor = secao.querySelector("#leitura-voz"), ritmo = secao.querySelector("#leitura-ritmo");
    function atualizarVozes() {
      seletor.replaceChildren(new Option(online ? "Automática · voz online" : "Automática · português", "auto"));
      vozesOnline.forEach(function (v) { seletor.add(new Option(v.nome, "online:" + v.id)); });
      vozesDoAparelho().forEach(function (v) { seletor.add(new Option(v.name + " · " + v.lang, idVoz(v))); });
      seletor.value = Array.from(seletor.options).some(function (o) { return o.value === preferida; }) ? preferida : "auto";
      secao.querySelector("#leitura-voz-nota").textContent = online
        ? "A voz online precisa de internet e envia o texto ao serviço de voz. Você também pode escolher uma voz do aparelho."
        : "As vozes disponíveis dependem deste aparelho. A escolha automática prioriza vozes brasileiras e naturais quando disponíveis.";
      seletor.disabled = !nativo && !online;
    }
    atualizarVozes();
    if (nativo) window.speechSynthesis.addEventListener("voiceschanged", atualizarVozes);
    ritmo.value = String(velocidade);
    seletor.addEventListener("change", function () { parar(); preferida = seletor.value; ZELA.store.set("voz-preferida", preferida); });
    ritmo.addEventListener("change", function () { parar(); velocidade = Number(ritmo.value); ZELA.store.set("voz-velocidade", velocidade); });
    controles(secao.querySelector("#leitura-voz-teste"), { rotulo: "Testar esta voz", origem: "teste-voz", texto: function () { return "Olá. Esta é a voz da leitura do Zela. Você pode acompanhar as instruções no seu ritmo."; } });
    document.querySelector("#leitura-restaurar")?.addEventListener("click", function () {
      parar(); preferida = "auto"; velocidade = 1;
      ZELA.store.set("voz-preferida", preferida); ZELA.store.set("voz-velocidade", velocidade);
      ritmo.value = "1"; atualizarVozes();
    });
    document.querySelector(".leitura-dialog").addEventListener("close", function () { if (origem === "teste-voz") parar(); });
    document.querySelector(".leitura-atalho button").addEventListener("click", parar);
  }
  document.addEventListener("DOMContentLoaded", function () {
    montarAjustes();
    const apresentacao = document.querySelector("main .page-title");
    if (apresentacao) controles(apresentacao, {
      rotulo: "Ouvir a apresentação", origem: "apresentacao",
      texto: function () { return Array.from(apresentacao.querySelectorAll("h1, .t-lead")).map(function (p) { return p.textContent; }).join(". "); }
    });
    const chamada = document.querySelector(".rota-destaque-conteudo");
    if (chamada) controles(chamada, {
      rotulo: "Ouvir sobre a rota acessível", origem: "chamada-rota",
      texto: function () { return chamada.querySelector("h2").textContent + ". " + chamada.querySelector(".t-lead").textContent; }
    });
    const etapas = document.getElementById("res-etapas");
    if (etapas) {
      const leitor = document.createElement("div"); etapas.before(leitor);
      controles(leitor, {
        rotulo: "Ouvir este aviso", origem: "aviso",
        texto: function () {
          const atual = etapas.querySelector('[aria-current="step"]') || etapas.lastElementChild;
          return [document.getElementById("res-chip").textContent, document.getElementById("res-titulo").textContent,
            document.getElementById("res-local").textContent, atual ? "Situação do aviso: " + atual.innerText : ""].join(". ");
        }
      });
    }
  });
  window.addEventListener("pagehide", function () { parar(); cache.forEach(function (url) { URL.revokeObjectURL(url); }); cache.clear(); });
})();
