/* Zela — Meu bairro: filtros, mapa ligado à lista e apoio ("Eu também vi") que muda a prioridade. */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return ZELA.escapar(s); };
  var selecionado = null;

  function filtros() {
    return { bairro: $("f-bairro").value, cat: $("f-cat").value, status: $("f-status").value, ord: $("f-ord").value };
  }

  function avisosVisiveis() {
    var f = filtros();
    var apoiados = ZELA.store.get("apoiados", {});
    var lista = ZELA.avisos
      .filter(function (a) {
        if (a.bairro !== f.bairro) return false;
        if (f.cat !== "todos" && a.cat !== f.cat) return false;
        if (f.status === "abertos" && a.status === "Resolvido") return false;
        if (f.status === "Resolvido" && a.status !== "Resolvido") return false;
        return true;
      })
      .map(function (a) {
        var meu = !!apoiados[a.id];
        var total = a.apoios + (meu ? 1 : 0);
        return { a: a, meu: meu, total: total, prio: ZELA.prioridade(a, total) };
      });
    lista.sort(function (x, y) {
      if (f.ord === "apoios") return y.total - x.total;
      if (f.ord === "recentes") return x.a.dias - y.a.dias;
      return y.prio.pontos - x.prio.pontos;
    });
    return lista;
  }

  function render() {
    var lista = avisosVisiveis();
    var f = filtros();
    $("chip-bairro").textContent = ZELA.bairros[f.bairro];
    $("contagem").textContent = lista.length === 1 ? "1 aviso encontrado" : lista.length + " avisos encontrados";
    $("vazio").hidden = lista.length > 0;

    $("lista").innerHTML = lista.map(function (it, i) {
      var a = it.a, n = i + 1, sel = a.id === selecionado;
      var botaoApoio = a.status === "Resolvido" ? "" :
        '<button type="button" class="btn support ' + (it.meu ? "" : "btn--primary") + '" data-apoiar="' + a.id + '" aria-pressed="' + it.meu + '">' +
        (it.meu ? "Você apoiou" : "Eu também vi") + '<span class="sr-only">: ' + esc(a.titulo) + "</span></button>";
      return '<li class="report' + (sel ? " is-selected" : "") + '" id="aviso-' + a.id + '">' +
        '<button type="button" class="report-n" data-sel="' + a.id + '" aria-label="Aviso ' + n + ": marcar no mapa\">" + n + "</button>" +
        '<div class="report-body">' +
          "<h3>" + esc(a.titulo) + "</h3>" +
          "<p>" + esc(a.local) + " · há " + a.dias + (a.dias === 1 ? " dia" : " dias") + "</p>" +
          '<p class="report-tags"><span class="pill pill--dotted">' + esc(a.status) + '</span><span class="pill ' + it.prio.classe + '">Prioridade ' + it.prio.nivel.toLowerCase() + "</span></p>" +
        "</div>" +
        '<div class="report-side"><p class="report-count"><span class="display">' + it.total + '</span><span class="t-small">apoios</span></p>' + botaoApoio + "</div>" +
      "</li>";
    }).join("");

    var mapa = $("mapa");
    if (mapa.dataset.bairro !== f.bairro) { ZELA.mapaReal(mapa, ZELA.centros[f.bairro], 1); mapa.dataset.bairro = f.bairro; }
    mapa.querySelectorAll(".pin").forEach(function (p) { p.remove(); });
    lista.forEach(function (it, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "pin";
      b.style.left = it.a.x + "%";
      b.style.top = it.a.y + "%";
      b.textContent = i + 1;
      b.setAttribute("data-sel", it.a.id);
      b.setAttribute("aria-pressed", it.a.id === selecionado ? "true" : "false");
      b.setAttribute("aria-label", "Aviso " + (i + 1) + ": " + it.a.titulo + ". Mostrar na lista");
      mapa.appendChild(b);
    });
  }

  function selecionar(id, origemMapa) {
    selecionado = id;
    render();
    var item = $("aviso-" + id);
    if (!item) return;
    if (origemMapa) item.scrollIntoView({ block: "nearest" });
    item.querySelector(".report-n").focus({ preventScroll: true });
    var a = ZELA.avisos.filter(function (x) { return x.id === id; })[0];
    ZELA.anunciar("Selecionado: " + a.titulo + ", " + a.local + ".");
  }

  function apoiar(id) {
    var apoiados = ZELA.store.get("apoiados", {});
    var a = ZELA.avisos.filter(function (x) { return x.id === id; })[0];
    if (apoiados[id]) {
      delete apoiados[id];
      ZELA.anunciar("Apoio removido de " + a.titulo + ".");
    } else {
      apoiados[id] = true;
      ZELA.anunciar("Apoio registrado. Agora " + (a.apoios + 1) + " vizinhos apoiam " + a.titulo + ".");
    }
    ZELA.store.set("apoiados", apoiados);
    ZELA.conta.marcarApoio(id, !!apoiados[id]);
    selecionado = id;
    render();
    var b = document.querySelector('[data-apoiar="' + id + '"]');
    if (b) b.focus({ preventScroll: true });
  }

  document.addEventListener("DOMContentLoaded", function () {
    var bairro = ZELA.store.get("bairro", "angela");
    if (ZELA.bairros[bairro]) $("f-bairro").value = bairro;

    ["f-bairro", "f-cat", "f-status", "f-ord"].forEach(function (id) {
      $(id).addEventListener("change", function () {
        if (id === "f-bairro") { ZELA.store.set("bairro", $(id).value); selecionado = null; }
        render();
      });
    });

    $("mapa").addEventListener("click", function (e) {
      var b = e.target.closest("[data-sel]");
      if (b) selecionar(Number(b.getAttribute("data-sel")), true);
    });
    $("lista").addEventListener("click", function (e) {
      var ap = e.target.closest("[data-apoiar]");
      if (ap) return apoiar(Number(ap.getAttribute("data-apoiar")));
      var s = e.target.closest("[data-sel]");
      if (s) selecionar(Number(s.getAttribute("data-sel")), false);
    });

    render();
  });
})();
