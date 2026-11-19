/* Preferência de mobilidade deste aparelho, compartilhada entre as páginas. */
(function () {
  "use strict";
  const perfis = {
    cadeira: "Cadeira de rodas", andador: "Andador", bengala: "Bengala",
    carrinho: "Carrinho de bebê", malas: "Malas ou objetos grandes",
    "baixa-visao": "Baixa visão", cegueira: "Cegueira"
  };
  function atual() {
    const salvo = ZELA.store.get("perfil-mobilidade", null);
    return Object.hasOwn(perfis, salvo) ? salvo : null;
  }
  ZELA.mobilidade = {
    perfis: perfis,
    atual: atual,
    salvar: function (id) {
      if (!Object.hasOwn(perfis, id)) return;
      ZELA.store.set("perfil-mobilidade", id);
      window.dispatchEvent(new CustomEvent("zela:mobilidade", { detail: { perfil: id } }));
    }
  };
  function sincronizar() {
    document.querySelectorAll("[data-perfil-mobilidade]").forEach(function (campo) {
      campo.value = atual() || "";
    });
    document.querySelectorAll("[data-perfil-mobilidade-nota]").forEach(function (nota) {
      nota.textContent = atual()
        ? "Seu perfil fica lembrado neste aparelho. Você pode mudá-lo a qualquer momento."
        : "Escolha o que ajuda você a se deslocar. Vamos lembrar a escolha neste aparelho.";
    });
  }
  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll("[data-perfil-mobilidade]").forEach(function (campo) {
      campo.replaceChildren(new Option("Escolha seu perfil", ""), ...Object.entries(perfis).map(function (p) {
        return new Option(p[1], p[0]);
      }));
      campo.addEventListener("change", function () {
        if (campo.value) ZELA.mobilidade.salvar(campo.value);
        else { ZELA.store.set("perfil-mobilidade", null); sincronizar(); }
      });
    });
    sincronizar();
  });
  window.addEventListener("zela:mobilidade", sincronizar);
})();
