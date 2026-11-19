/* Zela — página inicial: abas "Como funciona", avisos por bairro e consulta rápida de protocolo. */
(function () {
  "use strict";

  /* ---------- Abas com teclado (setas, Home, End) ---------- */
  function iniciarAbas() {
    var abas = Array.prototype.slice.call(document.querySelectorAll('[role="tab"]'));
    var painel = document.getElementById("painel-como");
    if (!abas.length || !painel) return;

    function ativar(i, focar) {
      abas.forEach(function (aba, j) {
        var on = i === j;
        aba.setAttribute("aria-selected", on ? "true" : "false");
        aba.tabIndex = on ? 0 : -1;
      });
      painel.setAttribute("aria-labelledby", abas[i].id);
      var d = abas[i].dataset, $ = function (id) { return document.getElementById(id); };
      $("como-etapa").textContent = "Etapa " + (i + 1) + " de " + abas.length;
      $("como-titulo-etapa").textContent = d.titulo;
      $("como-historia").textContent = d.historia;
      $("como-itens").innerHTML = d.itens.split("|").map(function (t) { return "<li>" + ZELA.escapar(t) + "</li>"; }).join("");
      $("como-cta").textContent = d.cta;
      $("como-cta").href = d.href;
      painel.querySelectorAll(".step-bar span").forEach(function (b, j) { b.classList.toggle("on", j <= i); });
      $("como-ant").disabled = i === 0;
      $("como-prox").disabled = i === abas.length - 1;
      atual = i;
      if (focar) abas[i].focus();
    }
    var atual = 0;
    document.getElementById("como-ant").addEventListener("click", function () {
      if (atual > 0) { ativar(atual - 1, false); ZELA.anunciar("Etapa " + (atual + 1) + ": " + abas[atual].dataset.titulo); }
    });
    document.getElementById("como-prox").addEventListener("click", function () {
      if (atual < abas.length - 1) { ativar(atual + 1, false); ZELA.anunciar("Etapa " + (atual + 1) + ": " + abas[atual].dataset.titulo); }
    });

    abas.forEach(function (aba, i) {
      aba.addEventListener("click", function () { ativar(i, false); });
      aba.addEventListener("keydown", function (e) {
        var n = abas.length, alvo = null;
        if (e.key === "ArrowDown" || e.key === "ArrowRight") alvo = (i + 1) % n;
        if (e.key === "ArrowUp" || e.key === "ArrowLeft") alvo = (i - 1 + n) % n;
        if (e.key === "Home") alvo = 0;
        if (e.key === "End") alvo = n - 1;
        if (alvo !== null) { e.preventDefault(); ativar(alvo, true); }
      });
    });
  }

  /* ---------- Avisos do bairro escolhido ---------- */
  function iniciarBairro() {
    var lista = document.getElementById("lista-perto");
    var vazio = document.getElementById("lista-perto-vazio");
    var link = document.getElementById("link-meu-bairro");
    var inicial = ZELA.bairroPreferido.atual();
    var esc = ZELA.escapar;

    function render(bairro, anunciar) {
      var avisos = ZELA.mural.doBairro(bairro)
        .sort(function (x, y) { return y.apoios - x.apoios; })
        .slice(0, 3);
      lista.innerHTML = avisos.map(function (a) {
        return '<li class="proof">' +
          '<div class="proof-top">' +
            '<span class="pill pill--cream">' + esc(a.status) + "</span>" +
            '<h3 class="t-lead" style="font-weight:700">' + esc(a.titulo) + "</h3>" +
            "<p>" + esc(a.local) + "</p>" +
          "</div>" +
          '<p class="proof-value"><span class="t-number">' + a.apoios + '</span><span class="t-lead">vizinhos também viram</span></p>' +
        "</li>";
      }).join("");
      lista.hidden = !avisos.length;
      vazio.hidden = Boolean(avisos.length);
      vazio.textContent = !avisos.length ? "O protótipo ainda não tem avisos para " + ZELA.bairroPreferido.rotulo(bairro) + "." : "";
      link.textContent = bairro.bairroId ? "Ver o mapa do bairro" : "Abrir Meu bairro";
      if (anunciar) ZELA.anunciar(avisos.length ? "Mostrando avisos de " + bairro.nome + "." : vazio.textContent);
    }

    ZELA.iniciarCampoBairro("sel-bairro", {
      inicial: inicial,
      escolher: function (bairro) {
        ZELA.bairroPreferido.salvar(bairro);
        render(bairro, true);
      }
    });
    render(inicial, false);
  }

  /* ---------- Consulta rápida de protocolo ---------- */
  function iniciarConsulta() {
    var form = document.getElementById("form-proto");
    if (!form) return;
    var input = document.getElementById("proto-rapido");
    var erro = document.getElementById("proto-erro");
    var ok = document.getElementById("proto-ok");

    input.addEventListener("input", function () {
      erro.textContent = "";
      input.removeAttribute("aria-invalid");
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      ok.innerHTML = "";
      var r = ZELA.buscarProtocolo(input.value);
      if (r.erro) {
        erro.textContent = "Atenção: " + r.erro;
        input.setAttribute("aria-invalid", "true");
        input.focus();
        return;
      }
      input.value = r.id;
      var etapa = ZELA.etapas[r.dados.atual].nome;
      ok.innerHTML = '<p class="row" style="gap:8px 16px;align-items:center">' +
        "<span>" + ZELA.escapar(r.dados.titulo) + "</span>" +
        '<span class="pill pill--cream">' + etapa + "</span>" +
        '<a href="pages/acompanhar.html?p=' + encodeURIComponent(r.id) + '" >Ver todas as etapas</a></p>';
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    iniciarAbas();
    iniciarBairro();
    iniciarConsulta();
  });
})();
