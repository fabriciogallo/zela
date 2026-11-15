/* Zela — fluxo "Relatar um problema" em 4 passos.
   Valida cada passo, detecta aviso repetido, usa a localização real (Nominatim/OpenStreetMap)
   e gera um protocolo que fica salvo neste navegador para ser consultado em "Acompanhar". */
(function () {
  "use strict";

  var AJUDA = [
    "Cada tipo de problema vai para um órgão diferente. Escolher o tipo certo faz o aviso chegar mais rápido a quem resolve.",
    "O endereço ajuda a equipe a achar o lugar. Se alguém já avisou o mesmo problema perto dali, mostramos o aviso para você apoiar.",
    "Uma frase basta. A foto ajuda, mas não é obrigatória. Se houver risco de acidente, o aviso ganha prioridade.",
    "Você pode mudar qualquer resposta antes de enviar. Depois do envio, você recebe um número de protocolo para acompanhar."
  ];
  var ROTULOS = ["Tipo", "Local", "Detalhes", "Enviar"];

  var passo = 1;
  var dupIgnorado = false;
  var fotoUrl = null;

  var $ = function (id) { return document.getElementById(id); };

  function valor(nome) {
    var el = document.querySelector('[name="' + nome + '"]:checked');
    return el ? el.value : "";
  }

  /* ---------- Navegação entre passos ---------- */
  function mostrarPasso(n, focar) {
    passo = n;
    document.querySelectorAll("[data-step]").forEach(function (s) {
      s.hidden = Number(s.getAttribute("data-step")) !== n;
    });
    var itens = $("progresso").children;
    for (var i = 0; i < itens.length; i++) {
      var num = i + 1;
      itens[i].className = num === n ? "is-current" : (num < n ? "is-done" : "");
      if (num === n) itens[i].setAttribute("aria-current", "step"); else itens[i].removeAttribute("aria-current");
      itens[i].lastElementChild.innerHTML = ROTULOS[i] + (num < n ? '<span class="sr-only"> (concluído)</span>' : "");
    }
    $("ajuda-texto").textContent = AJUDA[n - 1];
    $("btn-voltar").hidden = n === 1;
    $("btn-cancelar").hidden = n !== 1;
    $("btn-avancar").textContent = n === 4 ? "Enviar aviso" : "Continuar";
    if (n === 4) montarRevisao();
    if (focar) {
      var t = $("t-passo-" + n);
      t.focus();
      t.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }

  function erro(idCampo, idErro, msg) {
    $(idErro).textContent = msg;
    if (idCampo) {
      var c = $(idCampo);
      c.setAttribute("aria-invalid", "true");
      c.focus();
    }
    return false;
  }

  function limparErro(idCampo, idErro) {
    $(idErro).textContent = "";
    if (idCampo) $(idCampo).removeAttribute("aria-invalid");
  }

  function validar(n) {
    if (n === 1 && !valor("cat")) {
      erro(null, "err-cat", "Escolha o tipo de problema para continuar.");
      document.querySelector('[name="cat"]').focus();
      return false;
    }
    if (n === 2 && $("f-end").value.trim().length < 3) {
      return erro("f-end", "err-end", "Diga onde fica o problema. Pode ser só o nome da rua.");
    }
    if (n === 3 && $("f-desc").value.trim().length < 10) {
      return erro("f-desc", "err-desc", "Escreva pelo menos 10 letras para a equipe entender o problema.");
    }
    return true;
  }

  /* ---------- Aviso repetido ---------- */
  function checarRepetido() {
    var dup = $("dup");
    var aviso = ZELA.avisos[0]; /* poste apagado na Rua das Palmeiras */
    var mostra = !dupIgnorado && valor("cat") === aviso.cat && /palmeiras/i.test($("f-end").value);
    if (mostra && dup.hidden) {
      var apoiados = ZELA.store.get("apoiados", {});
      var total = aviso.apoios + (apoiados[aviso.id] ? 1 : 0);
      $("dup-texto").textContent = aviso.titulo + " · " + aviso.local + " · a 50 metros de você. " + total + " vizinhos apoiam esse aviso.";
      dup.hidden = false;
      ZELA.anunciar("Atenção: um vizinho já avisou um problema parecido aqui perto.");
    } else if (!mostra) {
      dup.hidden = true;
    }
  }

  /* ---------- CEP (API pública ViaCEP) ---------- */
  var ultimoCep = "";

  function mascararCep() {
    var campo = $("f-cep");
    var d = campo.value.replace(/\D/g, "").slice(0, 8);
    campo.value = d.length > 5 ? d.slice(0, 5) + "-" + d.slice(5) : d;
    limparErro("f-cep", "err-cep");
    if (d.length === 8 && d !== ultimoCep) buscarCep();
  }

  function buscarCep() {
    var campo = $("f-cep"), msg = $("cep-msg"), botao = $("btn-cep");
    var cep = campo.value.replace(/\D/g, "");
    msg.textContent = "";
    if (cep.length !== 8) {
      return erro("f-cep", "err-cep", "O CEP tem 8 números, assim: 04913-000. Confira e tente de novo.");
    }
    limparErro("f-cep", "err-cep");
    ultimoCep = cep;
    botao.disabled = true;
    msg.textContent = "Buscando o CEP…";
    fetch("https://viacep.com.br/ws/" + cep + "/json/")
      .then(function (r) { if (!r.ok) throw new Error("http"); return r.json(); })
      .then(function (d) {
        if (d.erro) {
          msg.textContent = "";
          erro("f-cep", "err-cep", "Não encontramos o CEP " + campo.value + ". Confira os números ou digite o endereço abaixo.");
          return;
        }
        var rua = d.logradouro || "";
        var lugar = [d.bairro, d.localidade && d.uf ? d.localidade + "/" + d.uf : d.localidade].filter(Boolean).join(" — ");
        var end = $("f-end");
        end.value = rua ? rua + ", " + (lugar ? " — " + lugar : "") : lugar;
        limparErro("f-end", "err-end");
        checarRepetido();
        if (rua) {
          msg.textContent = "Encontramos: " + rua + (lugar ? ", " + lugar : "") + ". Agora digite o número da casa ou do prédio mais perto.";
          end.focus();
          var pos = rua.length + 2;
          end.setSelectionRange(pos, pos);
        } else {
          msg.textContent = "Esse CEP é da cidade toda (" + lugar + "). Digite o nome da rua no campo abaixo.";
          end.focus();
          end.setSelectionRange(0, 0);
        }
      })
      .catch(function () {
        ultimoCep = "";
        msg.textContent = "Não conseguimos consultar o CEP agora (sem internet?). Digite o endereço abaixo, por favor.";
      })
      .then(function () { botao.disabled = false; });
    return true;
  }

  /* ---------- Localização (API real com alternativa) ---------- */
  function usarLocalizacao() {
    var msg = $("loc-msg");
    var botao = $("btn-loc");
    if (!("geolocation" in navigator)) {
      msg.textContent = "Seu navegador não informa a localização. Digite o endereço, por favor.";
      return;
    }
    botao.disabled = true;
    msg.textContent = "Procurando sua localização…";
    navigator.geolocation.getCurrentPosition(function (pos) {
      var url = "https://nominatim.openstreetmap.org/reverse?format=jsonv2&accept-language=pt-BR&zoom=18" +
        "&lat=" + pos.coords.latitude.toFixed(5) + "&lon=" + pos.coords.longitude.toFixed(5);
      fetch(url, { headers: { "Accept": "application/json" } })
        .then(function (r) { if (!r.ok) throw new Error("http"); return r.json(); })
        .then(function (d) {
          var a = d.address || {};
          var rua = a.road || a.pedestrian || a.footway || "";
          var partes = [rua + (a.house_number ? ", " + a.house_number : ""), a.suburb || a.neighbourhood || a.city_district || ""]
            .filter(function (p) { return p && p.trim(); });
          if (!partes.length) throw new Error("vazio");
          $("f-end").value = partes.join(" — ");
          limparErro("f-end", "err-end");
          msg.textContent = "Localização encontrada: " + $("f-end").value + ". Confira se está certo.";
          checarRepetido();
        })
        .catch(function () {
          msg.textContent = "Achamos você no mapa, mas não o nome da rua. Digite o endereço, por favor.";
        })
        .then(function () { botao.disabled = false; });
    }, function () {
      botao.disabled = false;
      msg.textContent = "Não foi possível usar sua localização. Digite o endereço, por favor.";
    }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
  }

  /* ---------- Foto ---------- */
  function iniciarFoto() {
    var input = $("f-foto");
    input.addEventListener("change", function () {
      var f = input.files && input.files[0];
      if (!f) return;
      if (!/^image\//.test(f.type)) {
        input.value = "";
        ZELA.anunciar("Esse arquivo não é uma foto. Escolha uma imagem.");
        return;
      }
      if (fotoUrl) URL.revokeObjectURL(fotoUrl);
      fotoUrl = URL.createObjectURL(f);
      $("foto-preview").src = fotoUrl;
      $("foto-preview").alt = "Prévia da foto enviada";
      $("foto-nome").textContent = f.name;
      $("foto-vazia").hidden = true;
      $("foto-cheia").hidden = false;
      $("btn-remover-foto").focus();
      ZELA.anunciar("Foto adicionada.");
    });
    $("btn-remover-foto").addEventListener("click", function () {
      input.value = "";
      if (fotoUrl) URL.revokeObjectURL(fotoUrl);
      fotoUrl = null;
      $("foto-cheia").hidden = true;
      $("foto-vazia").hidden = false;
      $("foto-btn-texto").focus();
      ZELA.anunciar("Foto removida.");
    });
  }

  /* ---------- Revisão ---------- */
  function montarRevisao() {
    var cat = ZELA.nomeCategoria(valor("cat"));
    var ref = $("f-ref").value.trim();
    var temFoto = !$("foto-cheia").hidden;
    var linhas = [
      ["Tipo", cat.nome, 1, "o tipo de problema"],
      ["Local", $("f-end").value.trim() + (ref ? " (" + ref + ")" : "") + ($("f-cep").value ? " · CEP " + $("f-cep").value : ""), 2, "o local"],
      ["Descrição", $("f-desc").value.trim(), 3, "a descrição"],
      ["Foto", temFoto ? "Sim, 1 foto" : "Sem foto", 3, "a foto"],
      ["Risco", valor("risco") === "alto" ? "Sim, há risco de acidente" : "Não, mas atrapalha", 3, "o risco"],
      ["Vai para", cat.orgao, 1, "o órgão responsável"]
    ];
    $("revisao").innerHTML = linhas.map(function (l) {
      return "<div><dt>" + l[0] + '</dt><dd class="val">' + ZELA.escapar(l[1]) + "</dd>" +
        '<dd><button type="button" class="btn btn--ghost btn--sm" data-ir="' + l[2] + '" aria-label="Alterar ' + l[3] + '">Alterar</button></dd></div>';
    }).join("");
  }

  /* ---------- Envio ---------- */
  function hoje() {
    return new Date().toLocaleDateString("pt-BR", { day: "numeric", month: "short", year: "numeric" }).replace(/\./g, "");
  }

  function concluir(apoio) {
    var id, texto;
    if (apoio) {
      var aviso = ZELA.avisos[0];
      var apoiados = ZELA.store.get("apoiados", {});
      apoiados[aviso.id] = true;
      ZELA.store.set("apoiados", apoiados);
      id = aviso.protocolo;
      $("ok-titulo").textContent = "Apoio Registrado. Agora São " + (aviso.apoios + 1) + " Vizinhos.";
      texto = "Você apoiou o aviso “" + aviso.titulo + "” na " + aviso.local + ". Ele subiu na fila de prioridade e você pode acompanhar pelo mesmo protocolo.";
    } else {
      id = "ZL-2026-" + String(Math.floor(10000 + Math.random() * 89999));
      var cat = valor("cat");
      var meus = ZELA.store.get("protocolos", {});
      meus[id] = {
        cat: cat,
        titulo: ZELA.nomeCategoria(cat).nome + ": " + $("f-desc").value.trim().slice(0, 60),
        local: $("f-end").value.trim(),
        atual: 0, dias: 0, apoios: 1,
        datas: [hoje(), "Previsão: em até 2 dias úteis", "—", "—"]
      };
      ZELA.store.set("protocolos", meus);
      texto = "Seu aviso chegou ao Zela e já está na fila do bairro. Guarde o número abaixo para acompanhar cada etapa.";
    }
    $("ok-texto").textContent = texto;
    $("ok-protocolo").textContent = id;
    $("link-acompanhar").href = "acompanhar.html?p=" + encodeURIComponent(id);
    $("area-form").hidden = true;
    $("area-sucesso").hidden = false;
    document.title = "Aviso enviado — Zela";
    window.scrollTo(0, 0);
    $("ok-titulo").focus();
  }

  function copiar() {
    var n = $("ok-protocolo").textContent;
    var feito = function () {
      $("btn-copiar").textContent = "Copiado";
      $("copia-msg").textContent = "Número " + n + " copiado. Cole onde quiser guardar.";
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(n).then(feito, function () {
        $("copia-msg").textContent = "Não deu para copiar. Anote o número: " + n + ".";
      });
    } else {
      $("copia-msg").textContent = "Anote o número: " + n + ".";
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    var form = $("form-relato");

    /* Tipo pré-escolhido pela página inicial (?tipo=luz) */
    var tipo = new URLSearchParams(location.search).get("tipo");
    var radio = tipo && document.querySelector('[name="cat"][value="' + tipo.replace(/[^a-z]/g, "") + '"]');
    if (radio) radio.checked = true;

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!validar(passo)) return;
      if (passo === 4) concluir(false); else mostrarPasso(passo + 1, true);
    });
    $("btn-voltar").addEventListener("click", function () { mostrarPasso(passo - 1, true); });

    document.querySelectorAll('[name="cat"]').forEach(function (r) {
      r.addEventListener("change", function () { limparErro(null, "err-cat"); dupIgnorado = false; });
    });
    $("f-end").addEventListener("input", function () { limparErro("f-end", "err-end"); checarRepetido(); });
    $("btn-loc").addEventListener("click", usarLocalizacao);
    $("f-cep").addEventListener("input", mascararCep);
    $("f-cep").addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); buscarCep(); } });
    $("btn-cep").addEventListener("click", buscarCep);
    $("btn-apoiar").addEventListener("click", function () { concluir(true); });
    $("btn-outro").addEventListener("click", function () {
      dupIgnorado = true;
      $("dup").hidden = true;
      ZELA.anunciar("Certo, vamos registrar um aviso novo.");
      $("f-ref").focus();
    });

    var desc = $("f-desc");
    desc.addEventListener("input", function () {
      $("f-desc-cont").textContent = desc.value.length + " de 300 caracteres";
      limparErro("f-desc", "err-desc");
    });

    $("revisao").addEventListener("click", function (e) {
      var b = e.target.closest("[data-ir]");
      if (b) mostrarPasso(Number(b.getAttribute("data-ir")), true);
    });

    iniciarFoto();
    $("btn-copiar").addEventListener("click", copiar);
    mostrarPasso(1, false);
  });
})();
