/* Zela — acompanhar protocolo: busca, linha do tempo, avisos por SMS e confirmação da solução. */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var atual = null;

  function mostrar(id, dados, focar) {
    atual = id;
    var cat = ZELA.nomeCategoria(dados.cat);
    $("res-chip").textContent = cat.nome + " · " + id;
    $("res-titulo").textContent = dados.titulo;
    $("res-local").textContent = dados.local + " · Responsável: " + cat.orgao;
    $("res-dias").textContent = dados.dias;
    $("res-apoios").textContent = dados.apoios;

    var resolvido = dados.atual === ZELA.etapas.length - 1;
    $("res-etapas").innerHTML = ZELA.etapas.map(function (e, i) {
      var feito = i < dados.atual || (resolvido && i === dados.atual);
      var agora = i === dados.atual && !resolvido;
      var classe = feito ? "is-done" : (agora ? "is-current" : "");
      var situacao = feito ? "Concluída" : (agora ? "Etapa atual" : "Pendente");
      return '<li class="' + classe + '"' + (agora ? ' aria-current="step"' : "") + ">" +
        '<span class="t-mark" aria-hidden="true">' + (feito ? "✓" : i + 1) + "</span>" +
        '<span class="stack" style="gap:2px">' +
          '<span class="t-title">' + e.nome + "</span>" +
          '<span class="pill pill--cream timeline-status"' + (agora ? ' aria-hidden="true"' : "") + ">" + situacao + "</span>" +
          "<span>" + e.desc + "</span>" +
          '<span class="hint t-small">' + ZELA.escapar(dados.datas[i] || "—") + "</span>" +
        "</span></li>";
    }).join("");

    var sms = ZELA.store.get("sms", {});
    atualizarSms(!!sms[id], false);
    $("avaliacao").hidden = !resolvido;
    $("aval-msg").textContent = "";
    $("resultado").hidden = false;
    history.replaceState(null, "", "?p=" + encodeURIComponent(id));
    if (focar) $("res-titulo").focus();
  }

  function buscar(bruto, focar) {
    var input = $("f-proto");
    var r = ZELA.buscarProtocolo(bruto);
    if (r.erro) {
      $("f-proto-erro").textContent = r.erro;
      input.setAttribute("aria-invalid", "true");
      $("resultado").hidden = true;
      input.focus();
      return;
    }
    input.value = r.id;
    $("f-proto-erro").textContent = "";
    input.removeAttribute("aria-invalid");
    mostrar(r.id, r.dados, focar);
  }

  function atualizarSms(ligado, anunciar) {
    $("btn-sms").setAttribute("aria-pressed", ligado ? "true" : "false");
    $("sms-rotulo").textContent = ligado ? "Avisos por SMS ligados" : "Receber avisos por SMS";
    if (anunciar) {
      $("sms-msg").textContent = ligado
        ? "Pronto. Você vai receber um SMS quando o aviso mudar de etapa."
        : "Avisos por SMS desligados.";
    } else {
      $("sms-msg").textContent = "";
    }
  }

  function listarMeus() {
    var meus = Object.keys(ZELA.store.get("protocolos", {}));
    $("meus-protocolos").innerHTML = meus.slice(-3).map(function (id) {
      return '<button type="button" class="btn btn--ghost btn--sm" data-exemplo="' + id + '">' + id + " (seu)</button>";
    }).join("");
  }

  document.addEventListener("DOMContentLoaded", function () {
    listarMeus();

    $("form-busca").addEventListener("submit", function (e) {
      e.preventDefault();
      buscar($("f-proto").value, true);
    });
    $("f-proto").addEventListener("input", function () {
      $("f-proto-erro").textContent = "";
      $("f-proto").removeAttribute("aria-invalid");
    });
    $("form-busca").addEventListener("click", function (e) {
      var b = e.target.closest("[data-exemplo]");
      if (b) buscar(b.getAttribute("data-exemplo"), true);
    });

    $("btn-sms").addEventListener("click", function () {
      var sms = ZELA.store.get("sms", {});
      sms[atual] = !sms[atual];
      ZELA.store.set("sms", sms);
      atualizarSms(sms[atual], true);
    });

    $("avaliacao").addEventListener("click", function (e) {
      var b = e.target.closest("[data-aval]");
      if (!b) return;
      $("aval-msg").textContent = b.getAttribute("data-aval") === "sim"
        ? "Obrigado! Sua confirmação fecha o aviso e conta na nota do serviço do bairro."
        : "Entendido. Reabrimos o aviso com prioridade alta e avisamos o órgão responsável.";
    });

    var p = new URLSearchParams(location.search).get("p");
    buscar(p || "ZL-2026-04817", false);
  });
})();
