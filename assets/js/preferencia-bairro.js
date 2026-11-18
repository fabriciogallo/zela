/* Zela — escolha do bairro por digitação, CEP ou localização, no aparelho ou na conta. */
(function () {
  "use strict";

  function exemplo(id) {
    if (!Object.hasOwn(ZELA.bairros, id)) return null;
    return { tipo: "bairro", bairroId: id, nome: ZELA.bairros[id], cidade: "São Paulo", estado: "SP" };
  }

  function dados(lugar) {
    if (!lugar?.nome || !lugar.cidade) return null;
    return exemplo(lugar.bairroId) || {
      tipo: "bairro", nome: lugar.nome, cidade: lugar.cidade, estado: lugar.estado || ""
    };
  }

  function salvo() {
    const conta = ZELA.conta.atual();
    return conta ? dados(conta.bairro) :
      dados(ZELA.store.get("bairro-preferido", null)) || exemplo(ZELA.store.get("bairro", null));
  }

  function rotulo(lugar) {
    return [lugar.nome, lugar.cidade].filter(Boolean).join(" · ");
  }

  ZELA.bairroPreferido = {
    atual: function () { return salvo() || exemplo("angela"); },
    exemplo: exemplo,
    rotulo: rotulo,
    salvar: function (lugar) {
      const bairro = dados(lugar);
      if (ZELA.conta.atual()) ZELA.conta.salvarBairro(bairro);
      else ZELA.store.set("bairro-preferido", bairro);
    }
  };

  function obterPosicao() {
    return new Promise(function (resolve, reject) {
      navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000, maximumAge: 60000 });
    });
  }

  ZELA.iniciarCampoBairro = function (id, config) {
    const campo = document.getElementById(id);
    const gps = document.getElementById(id + "-gps");
    const recado = document.getElementById(id + "-gps-status");
    const perfil = document.getElementById(id + "-perfil");
    const temLocalizacao = window.isSecureContext && Boolean(navigator.geolocation);
    const exemplos = Object.keys(ZELA.bairros).map(function (chave) {
      return Object.assign({ detalhe: "São Paulo · Bairro com avisos de exemplo" }, exemplo(chave));
    });
    if (perfil && ZELA.conta.atual()) perfil.href = new URL("meus-avisos.html#perfil-bairro", perfil.href);

    let lugar = dados(config.inicial), operacao = null, negada = false;
    const seletor = ZELA.iniciarCampoLocal({
      campo: id, status: id + "-status", erro: id + "-erro", tipo: "bairro",
      sugestoes: function () { return exemplos; },
      escolher: function (opcao) {
        editar();
        escolher(opcao);
      },
      aoEditar: editar
    });

    function mensagem(texto, sugerirPerfil) {
      recado.textContent = texto;
      if (perfil) perfil.hidden = !sugerirPerfil;
    }

    function informarBloqueio() {
      mensagem("Localização bloqueada. Use a busca acima para escolher seu bairro.", true);
    }

    function cancelarBusca() {
      if (!operacao) return;
      operacao.abort();
      operacao = null;
      gps.removeAttribute("aria-disabled");
      if (negada) informarBloqueio();
      else mensagem("");
    }

    function editar() {
      cancelarBusca();
      if (temLocalizacao && !negada) mensagem("");
    }

    function definir(valor) {
      lugar = dados(valor);
      seletor.definir(lugar);
    }

    function escolher(opcao) {
      definir(opcao);
      config.escolher?.(lugar);
    }

    definir(lugar);

    if (!temLocalizacao) {
      gps.hidden = true;
      mensagem("A localização não está disponível aqui. Digite o bairro, uma rua ou o CEP.", true);
    } else {
      gps.addEventListener("click", async function () {
        if (operacao) return;
        const consulta = new AbortController();
        operacao = consulta;
        gps.setAttribute("aria-disabled", "true");
        mensagem("Procurando seu bairro…");
        let prazo;
        try {
          const posicao = await obterPosicao();
          if (operacao !== consulta) return;
          negada = false;
          prazo = window.setTimeout(function () { consulta.abort(); }, 8000);
          const bairro = await ZELA.buscaLocais.bairroPelaPosicao(posicao.coords, consulta.signal);
          if (operacao !== consulta) return;
          if (!bairro) {
            mensagem("Não encontramos um bairro perto desta localização. Digite o bairro, uma rua ou o CEP.", true);
            return;
          }
          escolher(bairro);
          mensagem("Bairro encontrado: " + rotulo(lugar) + ".");
        } catch (e) {
          if (operacao !== consulta) return;
          if (e.code === 1) { negada = true; informarBloqueio(); }
          else mensagem("Não conseguimos localizar o bairro agora. Digite o bairro, uma rua ou o CEP.", true);
        } finally {
          window.clearTimeout(prazo);
          if (operacao === consulta) {
            operacao = null;
            gps.removeAttribute("aria-disabled");
          }
        }
      });

      if (navigator.permissions?.query) {
        navigator.permissions.query({ name: "geolocation" }).then(function (permissao) {
          function atualizarPermissao() {
            const eraNegada = negada;
            negada = permissao.state === "denied";
            if (negada) informarBloqueio();
            else if (eraNegada && !operacao) mensagem("");
          }
          atualizarPermissao();
          permissao.addEventListener("change", atualizarPermissao);
        }).catch(function () { /* A busca manual e o botão ainda funcionam. */ });
      }
    }

    return {
      cancelarBusca: cancelarBusca,
      definir: definir,
      confirmarOpcional: function () { return !campo.value.trim() || seletor.confirmar(); },
      escolhido: function () { return seletor.semRascunho() ? lugar : null; }
    };
  };
})();
