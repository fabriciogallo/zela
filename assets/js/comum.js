/* Zela — comportamentos compartilhados por todas as páginas:
   tamanho do texto, menu no celular, VLibras, retícula decorativa e utilidades. */
(function () {
  "use strict";
  window.ZELA = window.ZELA || {};
  var root = document.documentElement;

  /* ---------- Armazenamento seguro (pode falhar em modo privado) ---------- */
  ZELA.store = {
    get: function (k, padrao) {
      try { var v = localStorage.getItem("zela:" + k); return v === null ? padrao : JSON.parse(v); }
      catch (e) { return padrao; }
    },
    set: function (k, v) {
      try { localStorage.setItem("zela:" + k, JSON.stringify(v)); } catch (e) { /* ignora */ }
    }
  };

  /* ---------- Conta do morador (protótipo: tudo fica neste aparelho) ----------
     Login sem senha: celular + código por SMS (simulado). Cada aviso criado
     guarda o celular de quem fez ("dono"), e cada conta guarda seus apoios. */
  ZELA.conta = {
    atual: function () {
      var tel = ZELA.store.get("sessao", null);
      var contas = ZELA.store.get("contas", {});
      return tel && contas[tel] ? Object.assign({ tel: tel }, contas[tel]) : null;
    },
    entrar: function (tel, nome, bairro) {
      var contas = ZELA.store.get("contas", {});
      var nova = !contas[tel];
      contas[tel] = contas[tel] || { nome: "", desde: new Date().toISOString(), apoios: {} };
      if (nome) contas[tel].nome = nome;
      if (bairro) contas[tel].bairro = bairro;
      ZELA.store.set("contas", contas);
      ZELA.store.set("sessao", tel);
      /* avisos feitos neste aparelho antes de entrar passam a ser desta conta */
      var protos = ZELA.store.get("protocolos", {}), guardados = 0;
      Object.keys(protos).forEach(function (id) { if (!protos[id].dono) { protos[id].dono = tel; guardados++; } });
      ZELA.store.set("protocolos", protos);
      return { nova: nova, guardados: guardados };
    },
    sair: function () { ZELA.store.set("sessao", null); },
    salvarBairro: function (bairro) {
      var u = ZELA.conta.atual(); if (!u) return;
      var contas = ZELA.store.get("contas", {});
      if (bairro) contas[u.tel].bairro = bairro;
      else delete contas[u.tel].bairro;
      ZELA.store.set("contas", contas);
    },
    avisos: function () {
      var u = ZELA.conta.atual(); if (!u) return [];
      var protos = ZELA.store.get("protocolos", {});
      return Object.keys(protos).filter(function (id) { return protos[id].dono === u.tel; })
        .map(function (id) { return Object.assign({ id: id }, protos[id]); }).reverse();
    },
    marcarApoio: function (avisoId, ligado) {
      var u = ZELA.conta.atual(); if (!u) return;
      var contas = ZELA.store.get("contas", {});
      var c = contas[u.tel]; c.apoios = c.apoios || {};
      if (ligado) c.apoios[avisoId] = true; else delete c.apoios[avisoId];
      ZELA.store.set("contas", contas);
    },
    formatarTel: function (tel) {
      var d = String(tel).replace(/\D/g, "");
      return d.length === 11 ? "(" + d.slice(0, 2) + ") " + d.slice(2, 7) + "-" + d.slice(7) : d;
    }
  };

  /* Link "Entrar" / "Meus avisos" no menu de todas as páginas */
  function iniciarLinkConta() {
    var link = document.querySelector("[data-nav-conta]");
    if (!link || !ZELA.conta.atual()) return;
    var destino = new URL("meus-avisos.html", link.href);
    link.href = destino.href;
    link.textContent = "Meus avisos";
    if (destino.pathname === location.pathname) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  }


  /* ---------- Mapa real: blocos do OpenStreetMap (projeção Web Mercator) ---------- */
  function coordenadasMapa(p) {
    var latitude = p.lat * Math.PI / 180;
    return {
      x: (p.lon + 180) / 360,
      y: (1 - Math.asinh(Math.tan(latitude)) / Math.PI) / 2
    };
  }

  ZELA.mapaReal = function (conteiner, centro, proporcao, pontos) {
    var z = 16, larg = 768, alt = larg * (proporcao || 1);
    var pos = coordenadasMapa(centro);
    if (pontos && pontos.length > 1) {
      var xMin = 1, xMax = 0, yMin = 1, yMax = 0;
      pontos.forEach(function (p) {
        var xy = coordenadasMapa(p);
        xMin = Math.min(xMin, xy.x); xMax = Math.max(xMax, xy.x);
        yMin = Math.min(yMin, xy.y); yMax = Math.max(yMax, xy.y);
      });
      var escala = Math.min((larg - 112) / (xMax - xMin), (alt - 112) / (yMax - yMin));
      z = Math.max(0, Math.min(17, Math.floor(Math.log2(escala / 256))));
      pos = { x: (xMin + xMax) / 2, y: (yMin + yMax) / 2 };
    }
    var n = Math.pow(2, z) * 256;
    var esq = pos.x * n - larg / 2, topo = pos.y * n - alt / 2;
    var camada = conteiner.querySelector(".map-tiles");
    if (!camada) { camada = document.createElement("div"); camada.className = "map-tiles"; camada.setAttribute("aria-hidden", "true"); conteiner.insertBefore(camada, conteiner.firstChild); }
    camada.innerHTML = "";
    for (var x = Math.floor(esq / 256); x <= Math.floor((esq + larg) / 256); x++) {
      for (var y = Math.floor(topo / 256); y <= Math.floor((topo + alt) / 256); y++) {
        var img = document.createElement("img");
        img.alt = ""; img.loading = "lazy";
        img.src = "https://tile.openstreetmap.org/" + z + "/" + x + "/" + y + ".png";
        img.style.left = ((x * 256 - esq) / larg * 100) + "%";
        img.style.top = ((y * 256 - topo) / alt * 100) + "%";
        img.style.width = (256 / larg * 100) + "%";
        img.style.height = (256 / alt * 100) + "%";
        camada.appendChild(img);
      }
    }
    return function (p) {
      var xy = coordenadasMapa(p);
      return { x: (xy.x * n - esq) / larg * 100, y: (xy.y * n - topo) / alt * 100 };
    };
  };

  /* ---------- Anúncios para leitores de tela ---------- */
  ZELA.anunciar = function (texto) {
    var el = document.getElementById("anuncio");
    if (!el) return;
    el.textContent = "";
    window.setTimeout(function () { el.textContent = texto; }, 50);
  };

  /* ---------- Protocolos: busca nos dados + avisos criados neste navegador ---------- */
  ZELA.buscarProtocolo = function (bruto) {
    var v = (bruto || "").trim().toUpperCase();
    if (!v) return { erro: "Digite o número do protocolo." };
    if (!ZELA.formatoProtocolo.test(v)) return { erro: "Esse número não está no formato certo. Ele fica assim: ZL-2026-04817." };
    var meus = ZELA.store.get("protocolos", {});
    var dados = meus[v] || ZELA.protocolos[v];
    if (!dados) return { erro: "Não encontramos o protocolo " + v + ". Confira os números no seu comprovante." };
    return { id: v, dados: dados };
  };

  ZELA.nomeCategoria = function (id) {
    for (var i = 0; i < ZELA.categorias.length; i++) if (ZELA.categorias[i].id === id) return ZELA.categorias[i];
    return ZELA.categorias[ZELA.categorias.length - 1];
  };

  /* Prioridade = apoios + risco + dias em aberto */
  ZELA.prioridade = function (a, apoios) {
    if (a.status === "Resolvido") return { nivel: "Baixa", classe: "prio-baixa", pontos: 0 };
    var pontos = apoios + (a.risco ? 15 : 0) + a.dias;
    if (pontos >= 35) return { nivel: "Alta", classe: "prio-alta", pontos: pontos };
    if (pontos >= 20) return { nivel: "Média", classe: "prio-media", pontos: pontos };
    return { nivel: "Baixa", classe: "prio-baixa", pontos: pontos };
  };

  ZELA.escapar = function (s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };

  /* ---------- Menu e navegação que volta ao subir a página ---------- */
  function iniciarMenu() {
    var botao = document.querySelector(".menu-toggle");
    var barra = document.getElementById("nav-bar");
    if (!botao || !barra) return;
    var cabecalho = barra.closest(".site-header");
    var atalho = document.querySelector(".report-action");
    // No Início, o atalho também espera a chamada da rota passar.
    var fimDaAbertura = document.getElementById("rota-destaque") || document.querySelector(".landscape--topo");

    function definirAberto(aberto) {
      barra.classList.toggle("is-open", aberto);
      botao.setAttribute("aria-expanded", String(aberto));
      botao.textContent = aberto ? "Fechar" : "Menu";
    }
    botao.addEventListener("click", function () {
      definirAberto(!barra.classList.contains("is-open"));
    });
    barra.addEventListener("keydown", function (e) {
      if (e.key !== "Escape" || !barra.classList.contains("is-open") || !botao.getClientRects().length) return;
      e.preventDefault();
      botao.focus();
      definirAberto(false);
    });
    barra.addEventListener("focusout", function (e) {
      if (e.relatedTarget && !barra.contains(e.relatedTarget)) definirAberto(false);
    });
    document.addEventListener("pointerdown", function (e) {
      if (barra.classList.contains("is-open") && !barra.contains(e.target)) definirAberto(false);
    });

    function ajustarMargens() {
      root.style.setProperty("--header-clearance", Math.ceil(cabecalho.offsetHeight + 8) + "px");
      if (atalho && !atalho.hidden) {
        root.style.setProperty("--report-clearance", Math.ceil(window.innerHeight - atalho.getBoundingClientRect().top + 12) + "px");
      } else root.style.removeProperty("--report-clearance");
      if (!botao.getClientRects().length) definirAberto(false);
    }
    function atualizarAtalho(posicao) {
      if (!atalho) return;
      var passouDoInicio = fimDaAbertura ? fimDaAbertura.getBoundingClientRect().bottom <= cabecalho.offsetHeight : posicao >= 160;
      var ocultar = !passouDoInicio && document.activeElement !== atalho;
      if (atalho.hidden === ocultar) return;
      atalho.hidden = ocultar;
      ajustarMargens();
    }
    function ajustarTela() {
      atualizarAtalho(Math.max(0, window.scrollY));
      ajustarMargens();
    }
    ajustarTela();
    window.addEventListener("resize", ajustarTela);
    window.addEventListener("pageshow", ajustarTela);
    if (atalho) atalho.addEventListener("focusout", function () { window.requestAnimationFrame(ajustarTela); });
    if ("ResizeObserver" in window) {
      var medidas = new ResizeObserver(ajustarTela);
      medidas.observe(cabecalho);
      if (atalho) medidas.observe(atalho);
    }

    function mostrarBarra(visivel) {
      barra.dataset.open = String(visivel);
    }

    barra.addEventListener("focusin", function () { mostrarBarra(true); });
    var ultimaPosicao = Math.max(0, window.scrollY);
    var inicioDirecao = ultimaPosicao, sentido = 0, quadro = 0;
    window.addEventListener("scroll", function () {
      if (quadro) return;
      quadro = window.requestAnimationFrame(function () {
        quadro = 0;
        var posicao = Math.max(0, window.scrollY);
        atualizarAtalho(posicao);
        var novoSentido = Math.sign(posicao - ultimaPosicao);
        if (!novoSentido) return;
        if (novoSentido !== sentido) {
          inicioDirecao = ultimaPosicao;
          sentido = novoSentido;
        }
        ultimaPosicao = posicao;
        if (posicao <= 16 || (sentido < 0 && inicioDirecao - posicao >= 12)) mostrarBarra(true);
        else if (sentido > 0 && posicao > cabecalho.offsetHeight && posicao - inicioDirecao >= 24 &&
          !barra.classList.contains("is-open") && !barra.querySelector(":focus-visible")) {
          mostrarBarra(false);
        }
      });
    }, { passive: true });
  }

  function iniciarLibras() {
    var script = document.createElement("script");
    script.src = "https://vlibras.gov.br/app/vlibras-plugin.js";
    script.async = true;
    script.addEventListener("load", function () {
      // O widget cria seu botão depois do carregamento do script.
      var observador = new MutationObserver(ajustarBotao);
      var prazo = window.setTimeout(function () { observador.disconnect(); }, 5000);
      function ajustarBotao() {
        var acesso = window.VLibrasWidget?.initBtn?.parentElement;
        if (!acesso || acesso.id !== "vlibras-access") return;
        acesso.style.top = "var(--libras-top, calc(50vh - 20px))";
        acesso.style.bottom = "var(--libras-bottom, auto)";
        acesso.style.transition = "width var(--libras-duration, .5s) ease";
        root.setAttribute("data-libras", "");
        function medirBotao() {
          var altura = acesso.getBoundingClientRect().height;
          if (altura > 0) root.style.setProperty("--libras-height", Math.ceil(altura) + "px");
        }
        medirBotao();
        if ("ResizeObserver" in window) new ResizeObserver(medirBotao).observe(acesso);
        window.clearTimeout(prazo);
        observador.disconnect();
      }
      observador.observe(document.body, { childList: true });
      ajustarBotao();
    }, { once: true });
    document.body.appendChild(script);
  }

  /* ---------- Paisagens em pixel art (decorativas, geradas em SVG) ----------
     Cada cena é uma grade pequena de "pixels" (retângulos de 1×1) ampliada
     com bordas nítidas. Cores iguais viram um único <path>, então fica leve. */
  function sorteio(semente) {
    return function () { semente = (semente * 1664525 + 1013904223) >>> 0; return semente / 4294967296; };
  }

  function Grade(w, h, semente) { this.w = w; this.h = h; this.px = new Array(w * h); this.r = sorteio(semente); }
  Grade.prototype.p = function (x, y, cor) {
    x = Math.round(x); y = Math.round(y);
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.px[y * this.w + x] = cor;
  };
  Grade.prototype.ret = function (x, y, w, h, cor) {
    for (var j = 0; j < h; j++) for (var i = 0; i < w; i++) this.p(x + i, y + j, cor);
  };
  /* mancha de folhagem: elipse com borda "comida" por pixels aleatórios */
  Grade.prototype.copa = function (cx, cy, rx, ry, cores, densidade) {
    for (var y = Math.floor(cy - ry); y <= cy + ry; y++) {
      for (var x = Math.floor(cx - rx); x <= cx + rx; x++) {
        var d = ((x - cx) * (x - cx)) / (rx * rx) + ((y - cy) * (y - cy)) / (ry * ry);
        if (d > 1) continue;
        if (d > 0.55 && this.r() > (densidade || 0.75)) continue;
        var luz = (y - cy) / ry - (x - cx) / rx * 0.3; /* luz vindo de cima */
        var i = luz < -0.35 ? 0 : luz < 0.35 ? 1 : 2;
        if (this.r() < 0.12) i = Math.min(cores.length - 1, i + 1);
        this.p(x, y, cores[Math.min(i, cores.length - 1)]);
      }
    }
  };
  Grade.prototype.svg = function (svg) {
    var ns = "http://www.w3.org/2000/svg", porCor = {};
    for (var y = 0; y < this.h; y++) {
      var x = 0;
      while (x < this.w) {
        var c = this.px[y * this.w + x];
        if (!c) { x++; continue; }
        var ini = x;
        while (x < this.w && this.px[y * this.w + x] === c) x++;
        (porCor[c] = porCor[c] || []).push("M" + ini + " " + y + "h" + (x - ini) + "v1h-" + (x - ini) + "z");
      }
    }
    svg.setAttribute("viewBox", "0 0 " + this.w + " " + this.h);
    svg.setAttribute("shape-rendering", "crispEdges");
    Object.keys(porCor).forEach(function (c) {
      var p = document.createElementNS(ns, "path");
      p.setAttribute("d", porCor[c].join(""));
      p.setAttribute("fill", c);
      svg.appendChild(p);
    });
  };

  function ceu(g, faixas, ate) {
    var n = faixas.length;
    for (var y = 0; y < ate; y++) {
      var t = y / ate * n, i = Math.floor(t);
      /* degrau com pontilhado entre faixas, como em jogos antigos */
      for (var x = 0; x < g.w; x++) {
        var cor = faixas[Math.min(n - 1, i)];
        if (t - i > 0.75 && (x + y) % 2 === 0 && i + 1 < n) cor = faixas[i + 1];
        g.p(x, y, cor);
      }
    }
  }

  function nuvem(g, x, y, larg) {
    g.ret(x, y + 2, larg, 3, "#f4f8fb");
    g.ret(x + 2, y + 1, larg - 5, 1, "#f4f8fb");
    g.ret(x + 4, y, Math.max(2, larg - 10), 1, "#ffffff");
    g.ret(x + 1, y + 5, larg - 2, 1, "#d6e6f2");
  }

  function predios(g, base, cores, janela) {
    var x = 0;
    while (x < g.w) {
      var w = 6 + Math.floor(g.r() * 9), h = 5 + Math.floor(g.r() * 12), cor = cores[Math.floor(g.r() * cores.length)];
      g.ret(x, base - h, w, h, cor);
      if (g.r() < 0.5) g.ret(x + 1, base - h - 1, w - 2, 1, cor); /* telhado */
      for (var j = base - h + 2; j < base - 1; j += 3) for (var i = x + 1; i < x + w - 1; i += 2) if (g.r() < 0.45) g.p(i, j, janela);
      x += w + (g.r() < 0.3 ? 1 : 0);
    }
  }

  function pessoa(g, x, y, roupa) {
    g.p(x, y, "#3b2a22"); g.p(x, y + 1, roupa); g.p(x, y + 2, roupa); g.p(x, y + 3, "#2e3640");
  }

  function poste(g, x, y, h, luz) {
    g.ret(x, y - h, 1, h, "#2f3a3a");
    g.ret(x - 1, y - h - 1, 3, 1, luz);
  }

  var CENAS = {
    /* Abertura: parque do bairro numa tarde de outono, céu azul e copas douradas */
    abertura: function () {
      var g = new Grade(192, 112, 7);
      ceu(g, ["#2b6fb3", "#3a82c6", "#4d96d6", "#6aaee3", "#90c6ec", "#b9dcf2"], 66);
      nuvem(g, 12, 14, 22); nuvem(g, 140, 10, 26); nuvem(g, 160, 28, 16); nuvem(g, 30, 34, 14);
      predios(g, 66, ["#7f9fb9", "#8eadc4", "#9db9cd", "#87a6be"], "#d5e4ef");
      g.ret(0, 62, g.w, 6, "#7aa874");
      for (var i = 0; i < 9; i++) g.copa(10 + i * 22 + g.r() * 8, 62, 9 + g.r() * 5, 5 + g.r() * 2, ["#6a9f5a", "#4f8a4a", "#3d7442"], 0.7);
      g.ret(0, 68, g.w, 44, "#79b858");
      for (var y = 68; y < 112; y++) for (var x = 0; x < g.w; x++) if (g.r() < 0.06) g.p(x, y, "#6aa94c");
      /* caminho iluminado em direção ao centro */
      for (var yy = 68; yy < 112; yy++) {
        var t = (yy - 68) / 44, meio = 112 + Math.sin(t * 2.2) * 10, larg = 2 + t * 26;
        g.ret(meio - larg / 2, yy, larg, 1, yy % 7 === 0 ? "#e9d9a9" : "#f1e4b8");
      }
      /* lago */
      for (var ly = 76; ly < 88; ly++) {
        var lw = 30 - Math.abs(ly - 82) * 2.4;
        g.ret(150 - lw / 2, ly, lw, 1, ly % 3 === 0 ? "#7fc1e6" : "#5aa9d8");
      }
      g.ret(140, 79, 4, 1, "#ffffff"); g.ret(152, 84, 3, 1, "#ffffff");
      /* árvores do parque */
      [[60, 74, 10], [86, 78, 8], [168, 70, 9], [40, 90, 12]].forEach(function (a) {
        g.ret(a[0], a[1], 2, a[2], "#5a3e2b");
        g.copa(a[0] + 1, a[1] - 3, a[2] * 0.9, a[2] * 0.7, ["#f2c14e", "#e8892e", "#c4522b"], 0.8);
      });
      poste(g, 100, 92, 12, "#fff3b0"); poste(g, 128, 84, 9, "#fff3b0");
      pessoa(g, 108, 88, "#e8742a"); pessoa(g, 111, 89, "#2f78c4"); pessoa(g, 120, 80, "#f2c14e");
      pessoa(g, 70, 96, "#c4522b"); g.ret(73, 98, 2, 1, "#c8a27a"); /* cachorrinho */
      pessoa(g, 160, 92, "#3f8a6a");
      /* galhos de outono emoldurando o céu: massas nos cantos de cima */
      for (var b = 0; b < 34; b++) { g.p(b * 1.2, b * 0.9, "#4a3426"); g.p(b * 1.2 + 1, b * 0.9, "#4a3426"); g.p(g.w - 1 - b * 1.2, b * 0.8, "#4a3426"); g.p(g.w - 2 - b * 1.2, b * 0.8, "#4a3426"); }
      var outono = [["#f6c24a", "#e8892e", "#c4522b"], ["#ffd36a", "#f2a23a", "#d0642c"], ["#f2b33d", "#d9682a", "#a83e26"]];
      for (var k = 0; k < 46; k++) {
        var u = g.r(), v = g.r() * (1 - u * 0.85);
        g.copa(u * 58, v * 40, 5 + g.r() * 6, 3 + g.r() * 4, outono[k % 3], 0.72);
        u = g.r(); v = g.r() * (1 - u * 0.85);
        g.copa(g.w - u * 62, v * 44, 5 + g.r() * 6, 3 + g.r() * 4, outono[(k + 1) % 3], 0.72);
      }
      /* folhagem escura no canto de baixo à direita */
      g.copa(186, 108, 18, 10, ["#3d7442", "#2f5e3a", "#244a2e"], 0.8);
      return g;
    },
    /* Horizonte: avenida iluminada entre copas escuras, ao entardecer */
    horizonte: function () {
      var g = new Grade(192, 64, 21);
      ceu(g, ["#2d5a5e", "#4c7f7c", "#86ad9c", "#cfd9b0", "#f4e7b4", "#fff4cf"], 34);
      for (var x = 0; x < g.w; x++) {
        var dist = Math.abs(x - 96) / 96;
        for (var y = 0; y < 34; y++) if (dist > 0.55 && g.r() < (dist - 0.55) * 1.6) g.p(x, y, y < 12 ? "#2d5a5e" : "#4c7f7c");
      }
      predios(g, 36, ["#7f9c94", "#8faa9f", "#6f8d86"], "#f6e7b4");
      g.ret(0, 36, g.w, 28, "#3f7a52");
      for (var yy = 36; yy < 64; yy++) {
        var t = (yy - 36) / 28, larg = 2 + t * 70;
        g.ret(96 - larg / 2, yy, larg, 1, "#e9dfb6");
        g.ret(96 - larg / 2 - 2, yy, 2, 1, "#c9c39a"); g.ret(96 + larg / 2, yy, 2, 1, "#c9c39a");
      }
      for (var i = 0; i < 7; i++) {
        var px = 96 - 8 - i * 7 - i * i, qx = 96 + 8 + i * 7 + i * i, by = 40 + i * 4;
        poste(g, px, by, 4 + i * 2, "#fff3b0"); poste(g, qx, by, 4 + i * 2, "#fff3b0");
      }
      for (var k = 0; k < 18; k++) {
        g.copa(6 + k * 2.5 + g.r() * 5, 10 + k * 2.6, 12 + g.r() * 6, 8 + g.r() * 3, ["#2f6b55", "#245446", "#183c34"], 0.75);
        g.copa(g.w - 6 - k * 2.5 - g.r() * 5, 10 + k * 2.6, 12 + g.r() * 6, 8 + g.r() * 3, ["#2f6b55", "#245446", "#183c34"], 0.75);
      }
      pessoa(g, 90, 50, "#e8742a"); pessoa(g, 101, 54, "#2f78c4"); pessoa(g, 95, 44, "#f2c14e");
      return g;
    },
    /* Espécime: uma flor de ipê-amarelo em pixel (crescimento do bairro) */
    flor: function () {
      var g = new Grade(40, 60, 3);
      var amarelo = ["#ffe58a", "#f6c24a", "#d99a26"];
      [[20, 14, 9, 7], [12, 18, 7, 6], [28, 18, 7, 6], [16, 9, 6, 5], [25, 9, 6, 5], [20, 21, 7, 5]].forEach(function (f) {
        g.copa(f[0], f[1], f[2], f[3], amarelo, 0.85);
      });
      g.ret(18, 13, 4, 4, "#8a5a1e"); g.ret(19, 14, 2, 2, "#b47a2a");
      for (var y = 24; y < 58; y++) g.ret(19 + Math.round(Math.sin(y / 6)), y, 2, 1, y % 5 ? "#4f8a4a" : "#3d7442");
      g.copa(13, 38, 6, 3, ["#7cc06a", "#4f8a4a", "#3d7442"], 0.9);
      g.copa(27, 46, 6, 3, ["#7cc06a", "#4f8a4a", "#3d7442"], 0.9);
      g.ret(14, 58, 13, 2, "#a07a52");
      return g;
    }
  };

  function desenharCenas() {
    document.querySelectorAll("svg[data-cena]").forEach(function (svg) {
      var fazer = CENAS[svg.getAttribute("data-cena")];
      if (!fazer || svg.childNodes.length) return;
      fazer().svg(svg);
      if (!svg.hasAttribute("preserveAspectRatio")) svg.setAttribute("preserveAspectRatio", "xMidYMid slice");
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    iniciarLinkConta();
    iniciarMenu();
    desenharCenas();
    iniciarLibras();
  });
})();
