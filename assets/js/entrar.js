/* Zela — Entrar com o celular (código por SMS simulado). */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var codigo = "", tel = "", espera = null;
  var campoBairro = ZELA.iniciarCampoBairro("f-perfil-bairro", {});
  var bairroEscolhido = null;

  function soNumeros(v) { return v.replace(/\D/g, ""); }

  function mascarar(v) {
    var d = soNumeros(v).slice(0, 11);
    if (d.length > 7) return "(" + d.slice(0, 2) + ") " + d.slice(2, 7) + "-" + d.slice(7);
    if (d.length > 2) return "(" + d.slice(0, 2) + ") " + d.slice(2);
    if (d.length) return "(" + d;
    return "";
  }

  function erro(campo, alvo, msg) {
    $(alvo).textContent = msg;
    $(campo).setAttribute("aria-invalid", "true");
    $(campo).focus();
  }
  function limpar(campo, alvo) { $(alvo).textContent = ""; $(campo).removeAttribute("aria-invalid"); }

  function destino() {
    var v = new URLSearchParams(location.search).get("volta") || "meus-avisos.html";
    return /^[a-z-]+\.html(\?[\w=&%-]*)?$/.test(v) ? v : "meus-avisos.html"; /* só páginas do próprio site */
  }

  function enviarCodigo() {
    codigo = String(Math.floor(1000 + Math.random() * 9000));
    $("sms-texto").textContent = "Zela: seu código de acesso é " + codigo + ". Não compartilhe com ninguém.";
    $("btn-reenviar").disabled = true;
    var s = 30;
    clearInterval(espera);
    $("reenvio-msg").textContent = "Você pode pedir outro código em " + s + " segundos.";
    espera = setInterval(function () {
      s--;
      if (s <= 0) { clearInterval(espera); $("btn-reenviar").disabled = false; $("reenvio-msg").textContent = "Não chegou? Peça outro código."; return; }
      if (s % 10 === 0) $("reenvio-msg").textContent = "Você pode pedir outro código em " + s + " segundos.";
    }, 1000);
  }

  function irPara(passo) {
    $("form-tel").hidden = passo !== 1;
    $("form-codigo").hidden = passo !== 2;
    $(passo === 1 ? "t-entrar" : "t-codigo").focus();
  }

  $("f-tel").addEventListener("input", function () { this.value = mascarar(this.value); limpar("f-tel", "err-tel"); });
  $("f-codigo").addEventListener("input", function () { this.value = soNumeros(this.value).slice(0, 4); limpar("f-codigo", "err-codigo"); });

  $("form-tel").addEventListener("submit", function (e) {
    e.preventDefault();
    var d = soNumeros($("f-tel").value);
    if (d.length !== 11 || d[2] !== "9") {
      return erro("f-tel", "err-tel", "Confira o número: são 2 números do DDD e 9 do celular, começando com 9. Ex.: (11) 91234-5678.");
    }
    if (!campoBairro.confirmarOpcional()) return;
    bairroEscolhido = campoBairro.escolhido();
    campoBairro.cancelarBusca();
    tel = d;
    $("codigo-para").textContent = "Mandamos um código de 4 números para " + ZELA.conta.formatarTel(tel) + ".";
    enviarCodigo();
    irPara(2);
    ZELA.anunciar("Código enviado por SMS para " + ZELA.conta.formatarTel(tel) + ".");
  });

  $("form-codigo").addEventListener("submit", function (e) {
    e.preventDefault();
    var v = $("f-codigo").value;
    if (v.length !== 4) return erro("f-codigo", "err-codigo", "O código tem 4 números. Ele está na mensagem que enviamos.");
    if (v !== codigo) return erro("f-codigo", "err-codigo", "Código errado. Confira a mensagem ou peça outro código.");
    var r = ZELA.conta.entrar(tel, $("f-nome").value.trim(), bairroEscolhido);
    if (r.erro) return erro("f-codigo", "err-codigo", r.erro);
    ZELA.store.set("aviso-login", r.guardados);
    location.href = destino();
  });

  $("btn-trocar").addEventListener("click", function () { clearInterval(espera); $("f-codigo").value = ""; irPara(1); });
  $("btn-reenviar").addEventListener("click", function () { enviarCodigo(); ZELA.anunciar("Novo código enviado."); $("f-codigo").focus(); });

  /* já está dentro? */
  var u = ZELA.conta.atual();
  if (u) {
    $("codigo-para").textContent = "";
    var p = document.createElement("p");
    p.className = "panel";
    p.innerHTML = "Você já entrou como <strong>" + ZELA.escapar(u.nome || ZELA.conta.formatarTel(u.tel)) + "</strong>. <a href=\"meus-avisos.html\">Ver meus avisos</a>";
    $("form-tel").parentNode.insertBefore(p, $("form-tel"));
  }
})();
