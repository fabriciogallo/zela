/* Zela — Meu bairro: filtros, mapa ligado à lista e apoio ("Eu também vi") que muda a prioridade. */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return ZELA.escapar(s); };
  var selecionado = null;
  var bairro;
  var tiposMobilidade = ["calcada", "buraco", "bueiro", "lixo"];

  function filtros() {
    return {
      bairro: bairro.bairroId, cat: $("f-cat").value, status: $("f-status").value,
      ord: $("f-ord").value, mobilidade: $("f-mobilidade").checked
    };
  }

  function avisosVisiveis() {
    var f = filtros();
    var apoiados = ZELA.store.get("apoiados", {});
    var lista = ZELA.mural.doBairro(bairro)
      .filter(function (a) {
        if (f.cat !== "todos" && a.cat !== f.cat) return false;
        if (f.mobilidade && tiposMobilidade.indexOf(a.cat) === -1) return false;
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

  function mostrarDestinoBairro() {
    $("rota-bairro-destino-texto").textContent = $("rota-bairro-destino").selectedOptions[0].textContent;
  }

  function atualizarRotaBairro(bairro) {
    var pontos = ZELA.locaisRota[bairro.bairroId];
    $("rota-bairro-nome").textContent = bairro.nome;
    $("rota-bairro-exemplo").hidden = !pontos;
    $("rota-bairro-livre").hidden = Boolean(pontos);
    if (!pontos) return;
    $("rota-bairro-valor").value = bairro.bairroId;
    $("rota-bairro-saida").textContent = "Saída sugerida: " + pontos[0].nome + ".";
    $("rota-bairro-destino").replaceChildren(...pontos.slice(1).map(function (ponto) {
      return new Option(ponto.nome, ponto.id);
    }));
    mostrarDestinoBairro();
  }

  function render() {
    var lista = avisosVisiveis();
    var f = filtros();
    var temAvisos = ZELA.mural.doBairro(bairro).length > 0;
    $("chip-bairro").textContent = ZELA.bairroPreferido.rotulo(bairro);
    $("chip-bairro-demo").hidden = !f.bairro;
    $("contagem").textContent = lista.length === 1 ? "1 aviso encontrado" : lista.length + " avisos encontrados";
    $("vazio").hidden = (!f.bairro && !temAvisos) || lista.length > 0;
    $("vazio-bairro").hidden = Boolean(f.bairro) || temAvisos;
    $("mapa-bairro").hidden = !f.bairro;

    $("lista").innerHTML = lista.map(function (it, i) {
      var a = it.a, n = i + 1, sel = a.id === selecionado;
      var botaoApoio = a.status === "Resolvido" ? "" :
        '<button type="button" class="btn support ' + (it.meu ? "" : "btn--primary") + '" data-apoiar="' + a.id + '" aria-pressed="' + it.meu + '">' +
        (it.meu ? "Você apoiou" : "Eu também vi") + '<span class="sr-only">: ' + esc(a.titulo) + "</span></button>";
      return '<li class="report' + (sel ? " is-selected" : "") + '" id="aviso-' + a.id + '">' +
        '<button type="button" class="report-n" data-sel="' + a.id + '" aria-label="Aviso ' + n + (a.doAparelho ? ": destacar na lista\">" : ": marcar no mapa\">") + n + "</button>" +
        '<div class="report-body">' +
          "<h3>" + esc(a.titulo) + "</h3>" +
          "<p>" + esc(a.local) + " · há " + a.dias + (a.dias === 1 ? " dia" : " dias") + "</p>" +
          '<p class="report-tags"><span class="pill pill--dotted">' + esc(a.status) + '</span><span class="pill ' + it.prio.classe + '">Prioridade ' + it.prio.nivel.toLowerCase() + "</span></p>" +
          (a.doAparelho ? '<p class="hint t-small">Criado neste aparelho · <a href="acompanhar.html?p=' + encodeURIComponent(a.protocolo) + '">Acompanhar ' + esc(a.protocolo) + '</a>. Sem ponto definido no mapa.</p>' : "") +
        "</div>" +
        '<div class="report-side"><p class="report-count"><span class="display">' + it.total + '</span><span class="t-small">apoios</span></p>' + botaoApoio + "</div>" +
      "</li>";
    }).join("");

    if (!f.bairro) return;
    var mapa = $("mapa");
    if (mapa.dataset.bairro !== f.bairro) { ZELA.mapaReal(mapa, ZELA.centros[f.bairro], 1); mapa.dataset.bairro = f.bairro; }
    mapa.querySelectorAll(".pin").forEach(function (p) { p.remove(); });
    lista.forEach(function (it, i) {
      if (!Number.isFinite(it.a.x) || !Number.isFinite(it.a.y)) return;
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
    var a = ZELA.mural.encontrar(id);
    ZELA.anunciar("Selecionado: " + a.titulo + ", " + a.local + ".");
  }

  function apoiar(id) {
    var apoiados = ZELA.store.get("apoiados", {});
    var a = ZELA.mural.encontrar(id);
    if (!a) return;
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
    var parametros = new URLSearchParams(location.search);
    bairro = ZELA.mural.regiao({ nome: parametros.get("bairro_nome"), cidade: parametros.get("cidade"), estado: parametros.get("estado") }) ||
      ZELA.bairroPreferido.exemplo(parametros.get("bairro")) || ZELA.bairroPreferido.atual();
    ZELA.iniciarCampoBairro("f-bairro", {
      inicial: bairro,
      escolher: function (lugar) {
        bairro = lugar;
        ZELA.bairroPreferido.salvar(lugar);
        if (["bairro", "bairro_nome", "cidade", "estado"].some(function (chave) { return parametros.has(chave); })) {
          var url = new URL(location.href);
          ["bairro", "bairro_nome", "cidade", "estado"].forEach(function (chave) { parametros.delete(chave); url.searchParams.delete(chave); });
          history.replaceState(history.state, "", url);
        }
        selecionado = null;
        atualizarRotaBairro(lugar);
        render();
        ZELA.anunciar("Bairro selecionado: " + ZELA.bairroPreferido.rotulo(lugar) + ".");
      }
    });
    $("f-mobilidade").checked = parametros.get("mobilidade") === "1";
    if ($("f-mobilidade").checked) $("f-status").value = "abertos";
    atualizarRotaBairro(bairro);
    $("rota-bairro-destino").addEventListener("change", mostrarDestinoBairro);

    ["f-cat", "f-status", "f-ord", "f-mobilidade"].forEach(function (id) {
      $(id).addEventListener("change", render);
    });

    $("mapa").addEventListener("click", function (e) {
      var b = e.target.closest("[data-sel]");
      if (b) selecionar(b.getAttribute("data-sel"), true);
    });
    $("lista").addEventListener("click", function (e) {
      var ap = e.target.closest("[data-apoiar]");
      if (ap) return apoiar(ap.getAttribute("data-apoiar"));
      var s = e.target.closest("[data-sel]");
      if (s) selecionar(s.getAttribute("data-sel"), false);
    });

    var alvo = ZELA.mural.encontrar(location.hash.replace(/^#aviso-/, ""));
    if (alvo && alvo.status === "Resolvido") $("f-status").value = "todos";
    render();
    if (alvo && $("aviso-" + alvo.id)) {
      selecionar(alvo.id, true);
    }
  });
})();
