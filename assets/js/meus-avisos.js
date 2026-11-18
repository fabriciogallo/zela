/* Zela — Meus avisos: o que a pessoa fez e apoiou, guardado na conta. */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var u = ZELA.conta.atual();

  if (!u) { $("sem-conta").hidden = false; return; }
  $("com-conta").hidden = false;

  var primeiro = (u.nome || "").split(" ")[0];
  $("t-ola").textContent = primeiro ? "Olá, " + primeiro : "Olá!";
  $("d-nome").textContent = u.nome || "Não informado";
  $("d-tel").textContent = ZELA.conta.formatarTel(u.tel);

  function mostrarBairro(bairro) {
    $("d-bairro").textContent = bairro ? ZELA.bairroPreferido.rotulo(bairro) : "Não informado";
    $("remover-bairro").hidden = !bairro;
  }

  var campoBairro = ZELA.iniciarCampoBairro("f-editar-bairro", {
    inicial: u.bairro,
    escolher: function (bairro) {
      ZELA.bairroPreferido.salvar(bairro);
      mostrarBairro(bairro);
      ZELA.anunciar("Bairro salvo no perfil: " + ZELA.bairroPreferido.rotulo(bairro) + ".");
    }
  });
  mostrarBairro(u.bairro);
  $("remover-bairro").addEventListener("click", function () {
    campoBairro.cancelarBusca();
    campoBairro.definir(null);
    ZELA.conta.salvarBairro(null);
    mostrarBairro(null);
    $("f-editar-bairro").focus();
    ZELA.anunciar("Bairro removido do perfil.");
  });

  var guardados = ZELA.store.get("aviso-login", 0);
  if (guardados) {
    $("msg-guardados").textContent = guardados === 1
      ? "1 aviso feito neste aparelho foi guardado na sua conta."
      : guardados + " avisos feitos neste aparelho foram guardados na sua conta.";
    ZELA.store.set("aviso-login", 0);
  }

  function item(o) {
    var etapa = ZELA.etapas[o.atual] ? ZELA.etapas[o.atual].nome : "Recebido";
    return '<li class="report">' +
      '<div class="report-body">' +
        "<h3>" + ZELA.escapar(o.titulo) + "</h3>" +
        "<p>" + ZELA.escapar(o.local) + "</p>" +
        '<p class="report-tags"><span class="pill pill--dotted">' + ZELA.escapar(etapa) + '</span><span class="pill pill--cream">' + ZELA.escapar(o.id) + "</span></p>" +
      "</div>" +
      '<a class="link-action" href="acompanhar.html?p=' + encodeURIComponent(o.id) + '"><span>Acompanhar</span><span class="sr-only"> o aviso ' + ZELA.escapar(o.id) + "</span></a>" +
    "</li>";
  }

  var feitos = ZELA.conta.avisos();
  $("lista-feitos").innerHTML = feitos.map(item).join("");
  $("vazio-feitos").hidden = feitos.length > 0;

  var apoios = Object.keys(u.apoios || {}).map(Number);
  var apoiados = ZELA.avisos.filter(function (a) { return apoios.indexOf(a.id) >= 0; }).map(function (a) {
    var p = a.protocolo && ZELA.protocolos[a.protocolo];
    return {
      id: a.protocolo || "Aviso nº " + a.id, titulo: a.titulo, local: a.local + " — " + (ZELA.bairros[a.bairro] || ""),
      atual: p ? p.atual : Math.max(0, ZELA.etapas.map(function (e) { return e.nome; }).indexOf(a.status))
    };
  });
  $("lista-apoiados").innerHTML = apoiados.map(function (o) {
    return /^ZL-/.test(o.id) ? item(o) : item(o).replace(/<a class="link-action"[\s\S]*?<\/a>/, '<a class="link-action" href="bairro.html"><span>Ver no mapa</span></a>');
  }).join("");
  $("vazio-apoiados").hidden = apoiados.length > 0;

  $("st-feitos").textContent = feitos.length;
  $("st-andamento").textContent = feitos.filter(function (o) { return o.atual < 3; }).length;
  $("st-resolvidos").textContent = feitos.filter(function (o) { return o.atual >= 3; }).length;
  $("st-apoios").textContent = apoiados.length;

  $("btn-sair").addEventListener("click", function () {
    ZELA.conta.sair();
    location.href = "../index.html";
  });
})();
