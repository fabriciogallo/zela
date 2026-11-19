/* Zela — preferências de leitura: aplicadas antes do conteúdo e salvas só neste navegador. */
(function () {
  "use strict";
  window.ZELA = window.ZELA || {};
  const root = document.documentElement;
  const tamanhos = [100, 125, 150, 175, 200];
  const padrao = { contraste: false, links: false, movimento: false, espacamento: false, alvos: false, aparencia: "neutro" };
  const atributos = {
    contraste: "data-contraste", links: "data-links", espacamento: "data-espacamento", alvos: "data-alvos-grandes"
  };
  const movimentoDoAparelho = window.matchMedia("(prefers-reduced-motion: reduce)");

  function ler(chave, alternativa) {
    try { return JSON.parse(localStorage.getItem("zela:" + chave)) ?? alternativa; }
    catch (e) { return alternativa; }
  }
  function guardar(chave, valor) {
    try { localStorage.setItem("zela:" + chave, JSON.stringify(valor)); }
    catch (e) { /* Os ajustes continuam funcionando nesta página sem armazenamento. */ }
  }
  function validar(valor) {
    const preferencias = Object.assign({}, padrao);
    if (!valor || typeof valor !== "object") return preferencias;
    Object.keys(atributos).concat("movimento").forEach(function (chave) {
      preferencias[chave] = valor[chave] === true;
    });
    if (valor.aparencia === "acolhedor") preferencias.aparencia = "acolhedor";
    return preferencias;
  }

  let preferencias = validar(ler("leitura", padrao));
  const salvo = Number(ler("texto", 100));
  let tamanho = tamanhos.includes(salvo) ? salvo : [100, 125, 150, 200][salvo] || 100;
  let painel = null;

  function movimentoReduzido() { return preferencias.movimento || movimentoDoAparelho.matches; }

  function aplicar() {
    root.classList.add("js");
    root.setAttribute("data-texto", String(tamanho));
    root.toggleAttribute("data-texto-grande", tamanho >= 150);
    Object.keys(atributos).forEach(function (chave) { root.toggleAttribute(atributos[chave], preferencias[chave]); });
    root.toggleAttribute("data-movimento-reduzido", movimentoReduzido());
    root.setAttribute("data-aparencia", preferencias.aparencia);
    const abertura = document.querySelector(".landscape--topo > img");
    if (abertura) {
      const url = new URL(abertura.getAttribute("src"), document.baseURI);
      const hash = movimentoReduzido() ? "#sem-movimento" : "";
      if (url.hash !== hash) {
        url.hash = hash;
        abertura.src = url.href;
      }
    }
    if (painel) sincronizar();
  }

  function salvar(mensagem) {
    guardar("leitura", preferencias);
    guardar("texto", tamanho);
    aplicar();
    if (painel) painel.querySelector("#leitura-status").textContent = mensagem;
  }

  function sincronizar() {
    painel.querySelectorAll("[data-leitura]").forEach(function (controle) {
      controle.checked = controle.dataset.leitura === "movimento" ? movimentoReduzido() : preferencias[controle.dataset.leitura];
      if (controle.dataset.leitura === "movimento") controle.disabled = movimentoDoAparelho.matches;
    });
    painel.querySelectorAll('[name="leitura-aparencia"]').forEach(function (radio) {
      radio.checked = radio.value === preferencias.aparencia;
    });
    painel.querySelector("[data-texto-menos]").setAttribute("aria-disabled", String(tamanho === tamanhos[0]));
    painel.querySelector("[data-texto-mais]").setAttribute("aria-disabled", String(tamanho === tamanhos[tamanhos.length - 1]));
    painel.querySelector(".text-size-value").textContent = tamanho + "%";
    painel.querySelector("#leitura-movimento-sistema").hidden = !movimentoDoAparelho.matches;
  }

  // O navegador e o sistema continuam tendo prioridade para reduzir movimentos.
  aplicar();
  movimentoDoAparelho.addEventListener("change", aplicar);

  const opcoes = [
    ["contraste", "Alto contraste", "Texto e contornos mais fortes para ler melhor."],
    ["links", "Destacar links", "Sublinhar os links para encontrar onde tocar."],
    ["movimento", "Reduzir animações", "Parar o movimento da abertura e das transições."],
    ["espacamento", "Mais espaço entre linhas", "Separar as linhas para acompanhar o texto."],
    ["alvos", "Botões maiores", "Aumentar as áreas de toque de botões e campos."]
  ];

  document.addEventListener("DOMContentLoaded", function () {
    const grupo = document.querySelector(".text-size");
    if (!grupo) return;
    document.querySelector(".site-header").before(grupo);
    grupo.className = "leitura-atalho";
    grupo.removeAttribute("role");
    grupo.removeAttribute("aria-label");
    const abrir = document.createElement("button");
    abrir.type = "button";
    abrir.className = "btn btn--ghost btn--sm";
    abrir.setAttribute("aria-label", "Ajustes de leitura");
    abrir.setAttribute("aria-haspopup", "dialog");
    abrir.setAttribute("aria-controls", "ajustes-leitura");
    abrir.innerHTML = '<span class="leitura-aa" aria-hidden="true">Aa</span> Leitura';
    grupo.replaceChildren(abrir);
    function medirAtalho() {
      root.style.setProperty("--leitura-height", Math.ceil(grupo.getBoundingClientRect().height) + "px");
    }
    medirAtalho();
    if ("ResizeObserver" in window) new ResizeObserver(medirAtalho).observe(grupo);

    painel = document.createElement("dialog");
    painel.id = "ajustes-leitura";
    painel.className = "leitura-dialog";
    painel.setAttribute("aria-labelledby", "leitura-titulo");
    painel.setAttribute("closedby", "closerequest");
    painel.innerHTML = `
      <header class="leitura-cabecalho">
        <h2 id="leitura-titulo" class="t-tab">Ajustes de leitura</h2>
        <button type="button" class="btn btn--ghost btn--sm" data-leitura-fechar autofocus>Fechar <span aria-hidden="true">×</span></button>
      </header>
      <div class="leitura-conteudo" role="region" aria-label="Opções de leitura" tabindex="0">
        <div class="stack leitura-boas-vindas">
          <p>Escolha o que deixa o Zela mais fácil de ler e usar.</p>
          <button type="button" class="btn btn--primary" id="leitura-confortavel">Experimentar leitura confortável</button>
          <p class="hint t-small">Texto maior, mais espaço, links destacados e menos movimento, em um clique.</p>
        </div>
        <section class="leitura-opcao leitura-texto" aria-labelledby="leitura-texto-titulo">
          <h3 class="legend" id="leitura-texto-titulo">Tamanho do texto</h3>
          <p class="hint t-small">Aumente aos poucos, de 100% a 200%.</p>
          <div class="text-size" role="group" aria-label="Tamanho do texto">
            <button type="button" data-texto-menos aria-label="A−, diminuir o tamanho do texto">A−</button>
            <output class="text-size-value" aria-label="Tamanho atual do texto">100%</output>
            <button type="button" data-texto-mais aria-label="A+, aumentar o tamanho do texto">A+</button>
          </div>
        </section>
        ` + opcoes.map(function (opcao) {
          return `<label class="leitura-opcao leitura-alternador" for="leitura-` + opcao[0] + `">
            <span class="leitura-rotulo">
              <span class="legend" id="leitura-` + opcao[0] + `-titulo">` + opcao[1] + `</span>
              <span class="hint t-small" id="leitura-` + opcao[0] + `-dica">` + opcao[2] + `</span>
            </span>
            <span class="leitura-switch">
              <input type="checkbox" role="switch" id="leitura-` + opcao[0] + `" data-leitura="` + opcao[0] + `"
                aria-labelledby="leitura-` + opcao[0] + `-titulo" aria-describedby="leitura-` + opcao[0] + `-dica">
              <span class="leitura-trilho" aria-hidden="true"><span class="leitura-botao-switch"></span></span>
              <span class="leitura-estado" aria-hidden="true"><span class="leitura-desativado">Não</span><span class="leitura-ativado">Sim</span></span>
            </span>
          </label>`;
        }).join("") + `
        <p class="hint t-small" id="leitura-movimento-sistema" hidden>Seu aparelho já está configurado para reduzir animações. O Zela respeita essa escolha.</p>
        <fieldset class="leitura-opcao leitura-aparencia">
          <legend class="legend">Aparência</legend>
          <p class="hint t-small">Escolha o fundo da página. O alto contraste tem prioridade.</p>
          <div class="leitura-aparencias">
            <label><input type="radio" name="leitura-aparencia" value="neutro"> Neutro</label>
            <label><input type="radio" name="leitura-aparencia" value="acolhedor"> Acolhedor</label>
          </div>
        </fieldset>
        <p class="hint t-small">As escolhas ficam neste navegador. A tradução em Libras continua disponível no botão azul do VLibras.</p>
        <p class="hint t-small leitura-status" id="leitura-status" role="status"></p>
      </div>
      <footer class="leitura-rodape">
        <button type="button" class="btn btn--ghost" id="leitura-restaurar">Voltar ao padrão</button>
      </footer>`;
    document.body.appendChild(painel);
    aplicar();

    abrir.addEventListener("click", function () {
      painel.querySelector("#leitura-status").textContent = "";
      painel.showModal();
    });
    painel.querySelector("[data-leitura-fechar]").addEventListener("click", function () { painel.close(); });
    painel.querySelector("[data-texto-menos]").addEventListener("click", function () {
      const nivel = tamanhos.indexOf(tamanho);
      if (nivel > 0) { tamanho = tamanhos[nivel - 1]; salvar("Tamanho do texto: " + tamanho + "%."); }
    });
    painel.querySelector("[data-texto-mais]").addEventListener("click", function () {
      const nivel = tamanhos.indexOf(tamanho);
      if (nivel < tamanhos.length - 1) { tamanho = tamanhos[nivel + 1]; salvar("Tamanho do texto: " + tamanho + "%."); }
    });
    painel.addEventListener("change", function (event) {
      const campo = event.target;
      if (campo.dataset.leitura) {
        preferencias[campo.dataset.leitura] = campo.checked;
        const nome = document.getElementById(campo.id + "-titulo").textContent;
        salvar(nome + (campo.checked ? ": ativado." : ": desativado."));
      } else if (campo.name === "leitura-aparencia") {
        preferencias.aparencia = campo.value;
        salvar("Aparência " + (campo.value === "acolhedor" ? "acolhedora" : "neutra") + " selecionada.");
      }
    });
    painel.querySelector("#leitura-confortavel").addEventListener("click", function () {
      tamanho = Math.max(tamanho, 125);
      preferencias = Object.assign({}, preferencias, { links: true, movimento: true, espacamento: true, alvos: true, aparencia: "acolhedor" });
      salvar("Leitura confortável ativada. Você pode mudar cada ajuste abaixo.");
    });
    painel.querySelector("#leitura-restaurar").addEventListener("click", function () {
      tamanho = 100;
      preferencias = Object.assign({}, padrao);
      salvar("Ajustes de leitura restaurados. Seu bairro e seus avisos foram mantidos.");
    });
  });
})();
