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
      document.getElementById("como-historia").textContent = abas[i].dataset.historia;
      document.getElementById("como-rodape").textContent = abas[i].dataset.rodape;
      document.getElementById("como-etapa").textContent = "Etapa " + (i + 1) + " de " + abas.length;
      if (focar) abas[i].focus();
    }

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
    var select = document.getElementById("sel-bairro");
    var lista = document.getElementById("lista-perto");
    if (!select || !lista) return;
    var esc = ZELA.escapar;

    function render(anunciar) {
      var b = select.value;
      ZELA.store.set("bairro", b);
      var avisos = ZELA.avisos
        .filter(function (a) { return a.bairro === b; })
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
      if (anunciar) ZELA.anunciar("Mostrando avisos de " + ZELA.bairros[b] + ".");
    }

    select.value = ZELA.store.get("bairro", "angela");
    if (!ZELA.bairros[select.value]) select.value = "angela";
    select.addEventListener("change", function () { render(true); });
    render(false);
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
        '<a href="acompanhar.html?p=' + encodeURIComponent(r.id) + '" >Ver todas as etapas</a></p>';
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    iniciarAbas();
    iniciarBairro();
    iniciarConsulta();
  });
})();
