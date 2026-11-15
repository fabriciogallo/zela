/* Zela — comportamentos compartilhados por todas as páginas:
   tamanho do texto, menu no celular, retícula decorativa e utilidades. */
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

  /* ---------- Tamanho do texto (A− / A+), lembrado entre páginas ---------- */
  function iniciarTamanhoTexto() {
    var menos = document.querySelector("[data-texto-menos]");
    var mais = document.querySelector("[data-texto-mais]");
    if (!menos || !mais) return;
    var nivel = ZELA.store.get("texto", 0);

    function aplicar(anunciar) {
      root.setAttribute("data-texto", String(nivel));
      menos.disabled = nivel <= 0;
      mais.disabled = nivel >= 3;
      ZELA.store.set("texto", nivel);
      if (anunciar) ZELA.anunciar("Tamanho do texto: " + ["normal", "grande", "maior", "máximo"][nivel] + ".");
    }
    menos.addEventListener("click", function () { if (nivel > 0) { nivel--; aplicar(true); } });
    mais.addEventListener("click", function () { if (nivel < 3) { nivel++; aplicar(true); } });
    aplicar(false);
  }

  /* ---------- Menu no celular ---------- */
  function iniciarMenu() {
    var botao = document.querySelector(".menu-toggle");
    var barra = document.getElementById("nav-bar");
    if (!botao || !barra) return;
    botao.addEventListener("click", function () {
      var aberto = barra.classList.toggle("is-open");
      botao.setAttribute("aria-expanded", aberto ? "true" : "false");
      botao.textContent = aberto ? "Fechar" : "Menu";
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && barra.classList.contains("is-open")) {
        barra.classList.remove("is-open");
        botao.setAttribute("aria-expanded", "false");
        botao.textContent = "Menu";
        botao.focus();
      }
    });
  }

  /* ---------- Retícula de pontos (decorativa, gerada em SVG) ---------- */
  function caminhoPontos(w, h, passo, raio) {
    var partes = [];
    for (var y = passo / 2; y < h; y += passo) {
      for (var x = passo / 2; x < w; x += passo) {
        var r = raio(x, y);
        if (r > 0.6) {
          r = Math.round(r * 10) / 10;
          partes.push("M" + (x - r).toFixed(1) + " " + y.toFixed(1) +
            "a" + r + " " + r + " 0 1 0 " + 2 * r + " 0" +
            "a" + r + " " + r + " 0 1 0 " + -2 * r + " 0");
        }
      }
    }
    return partes.join("");
  }

  var RETICULAS = {
    hero: {
      w: 1328, h: 765, passo: 22, fundo: "#5e7231", cor: "#f26b21",
      raio: function (x, y) {
        var a = 0.5 + 0.5 * Math.sin(x / 150 + Math.sin(y / 200) * 2);
        var b = 0.5 + 0.5 * Math.cos(y / 110 - x / 310);
        return 0.8 + 9 * a * b;
      }
    },
    "hero-sm": {
      w: 400, h: 240, passo: 14, fundo: "#5e7231", cor: "#f26b21",
      raio: function (x, y) { return RETICULAS.hero.raio(x * 3.3, y * 3.2) * 0.62; }
    },
    cinza: {
      w: 1600, h: 700, passo: 26, fundo: null, cor: "rgba(0,0,0,0.07)",
      raio: function (x, y) {
        var dx = (x - 1100) / 700, dy = (y - 300) / 420;
        var env = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy));
        return 2 + 9 * env * (0.6 + 0.4 * Math.sin(x / 90 + y / 140));
      }
    }
  };

  function desenharReticulas() {
    var ns = "http://www.w3.org/2000/svg";
    document.querySelectorAll("svg[data-reticula]").forEach(function (svg) {
      var cfg = RETICULAS[svg.getAttribute("data-reticula")];
      if (!cfg) return;
      svg.setAttribute("viewBox", "0 0 " + cfg.w + " " + cfg.h);
      svg.setAttribute("preserveAspectRatio", "xMidYMid slice");
      if (cfg.fundo) {
        var rect = document.createElementNS(ns, "rect");
        rect.setAttribute("width", cfg.w); rect.setAttribute("height", cfg.h); rect.setAttribute("fill", cfg.fundo);
        svg.appendChild(rect);
      }
      var path = document.createElementNS(ns, "path");
      path.setAttribute("d", caminhoPontos(cfg.w, cfg.h, cfg.passo, cfg.raio));
      path.setAttribute("fill", cfg.cor);
      svg.appendChild(path);
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    iniciarTamanhoTexto();
    iniciarMenu();
    desenharReticulas();
  });
})();
