/* Zela — campo de busca compartilhado, CEP e sugestões do OpenStreetMap. */
(function () {
  "use strict";

  const PHOTON = "https://photon.komoot.io/";
  const RAIO_BAIRROS_KM = 5;
  const cacheLocais = new Map();
  const cacheCeps = new Map();
  function normalizar(texto) {
    return (texto || "").trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  }

  function partes(valores) {
    const usadas = new Set();
    return valores.filter(function (valor) {
      const chave = normalizar(valor);
      if (!chave || usadas.has(chave)) return false;
      usadas.add(chave);
      return true;
    }).join(" · ");
  }

  function semRepeticoes(itens, chave) {
    const vistos = new Set();
    return itens.filter(function (item) {
      if (!item) return false;
      const id = chave(item);
      if (vistos.has(id)) return false;
      vistos.add(id);
      return true;
    });
  }

  function bairroCadastrado(cidade, nomes) {
    if (normalizar(cidade) !== "sao paulo") return undefined;
    return Object.keys(ZELA.bairros).find(function (id) {
      return nomes.some(function (nome) { return normalizar(nome) === normalizar(ZELA.bairros[id]); });
    });
  }

  function formatarCep(digitos) {
    return digitos.slice(0, 5) + "-" + digitos.slice(5);
  }

  async function consultarCep(digitos, signal) {
    if (cacheCeps.has(digitos)) return cacheCeps.get(digitos);
    const resposta = await fetch("https://viacep.com.br/ws/" + digitos + "/json/", { signal: signal });
    if (!resposta.ok) throw new Error("ViaCEP indisponível");
    const endereco = await resposta.json();
    if (endereco.erro) {
      const erro = new Error("Não encontramos o CEP " + formatarCep(digitos) + ". Confira os números.");
      erro.amigavel = true;
      throw erro;
    }
    if (cacheCeps.size >= 32) cacheCeps.delete(cacheCeps.keys().next().value);
    cacheCeps.set(digitos, endereco);
    return endereco;
  }

  async function consultarPhoton(caminho, parametros, signal) {
    const resposta = await fetch(PHOTON + caminho + "?" + new URLSearchParams(parametros), { signal: signal });
    if (!resposta.ok) throw new Error("Busca Photon indisponível");
    const dados = await resposta.json();
    return dados.features;
  }

  function eBairroNoMapa(p) {
    return p.type === "district" || ["suburb", "neighbourhood", "quarter"].includes(p.osm_value);
  }

  function sugestaoBairro(nome, cidade, estado, referencia) {
    if (!nome || !cidade || normalizar(nome) === normalizar(cidade)) return null;
    const bairroId = bairroCadastrado(cidade, [nome]);
    return {
      tipo: "bairro", bairroId: bairroId, nome: bairroId ? ZELA.bairros[bairroId] : nome,
      cidade: cidade, estado: estado, detalhe: partes([cidade, estado, referencia])
    };
  }

  function bairroDoMapa(feature, aceitarRua) {
    const p = feature.properties || {};
    if (p.countrycode !== "BR") return null;
    if (eBairroNoMapa(p)) return sugestaoBairro(p.name, p.city || p.county, p.state);
    if (aceitarRua && p.type === "street") {
      const bairro = sugestaoBairro(p.district || p.locality, p.city || p.county, p.state);
      if (!bairro) return null;
      bairro.rotuloBusca = p.name;
      bairro.detalhe = partes([bairro.nome, bairro.cidade, p.state, p.postcode]);
      return bairro;
    }
    return null;
  }

  async function bairroPelaPosicao(coords, signal) {
    // Envia ao buscador uma área aproximada, sem guardar a posição do aparelho.
    const dados = await consultarPhoton("reverse", [
      ["lat", coords.latitude.toFixed(3)], ["lon", coords.longitude.toFixed(3)],
      ["radius", 2], ["limit", 8], ["layer", "street"], ["layer", "district"], ["layer", "locality"]
    ], signal);
    const rua = dados.map(function (item) { return bairroDoMapa(item, true); }).find(function (lugar) { return lugar?.rotuloBusca; });
    return rua || dados.map(function (item) { return bairroDoMapa(item, false); }).find(Boolean) || null;
  }

  ZELA.buscaLocais = { consultarCep: consultarCep, formatarCep: formatarCep, bairroPelaPosicao: bairroPelaPosicao };

  function lugarDoMapa(feature, tipo) {
    const p = feature.properties || {};
    const coordenadas = feature.geometry?.coordinates || [];
    const [lon, lat] = coordenadas;
    const temNumero = tipo === "rua" && p.type === "house" && p.street && p.housenumber;
    const nome = temNumero ? p.street + ", " + p.housenumber : p.name;
    if (!nome || p.countrycode !== "BR" || !Number.isFinite(lat) || !Number.isFinite(lon) ||
        Math.abs(lat) > 85 || Math.abs(lon) > 180) return null;
    const cidade = p.city || p.county;
    const detalhe = partes((tipo === "rua" ? [p.locality, p.district] : [p.district === p.name ? "" : p.district])
      .concat([cidade, p.state, tipo === "rua" ? p.postcode : ""]));
    return {
      tipo: tipo,
      nome: nome,
      aproximado: tipo === "rua" && !temNumero,
      detalhe: detalhe,
      cidade: cidade,
      bairroId: bairroCadastrado(cidade, tipo === "rua" ? [p.district, p.locality] : [p.name, p.district]),
      centro: { lat: lat, lon: lon },
      lat: lat,
      lon: lon
    };
  }

  function conteudoOpcao(elemento, lugar) {
    const nome = document.createElement("strong");
    nome.textContent = lugar.rotuloBusca || lugar.nome;
    elemento.append(nome);
    if (!lugar.detalhe) return;
    const detalhe = document.createElement("span");
    detalhe.className = "place-detail";
    detalhe.textContent = lugar.detalhe;
    elemento.append(detalhe);
  }

  ZELA.iniciarCampoLocal = function (config) {
    const campo = document.getElementById(config.campo);
    const lista = document.getElementById(campo.getAttribute("aria-controls"));
    const status = document.getElementById(config.status);
    const erro = document.getElementById(config.erro);
    const soBairro = config.tipo === "bairro";
    let opcoes = [], ativo = -1, termoEscolhido = "", timer = 0, consulta = null;

    function destacar(indice) {
      if (ativo >= 0) lista.children[ativo]?.setAttribute("aria-selected", "false");
      ativo = indice;
      const opcao = lista.children[indice];
      if (!opcao) {
        campo.removeAttribute("aria-activedescendant");
        return;
      }
      opcao.setAttribute("aria-selected", "true");
      campo.setAttribute("aria-activedescendant", opcao.id);
      opcao.scrollIntoView({ block: "nearest" });
    }

    function mostrarOpcoes(lugares) {
      destacar(-1);
      opcoes = lugares;
      lista.replaceChildren(...lugares.map(function (lugar, i) {
        const li = document.createElement("li");
        li.id = lista.id + "-opcao-" + i;
        li.dataset.indice = String(i);
        li.setAttribute("role", "option");
        li.setAttribute("aria-selected", "false");
        conteudoOpcao(li, lugar);
        return li;
      }));
      lista.hidden = !lugares.length;
      campo.setAttribute("aria-expanded", String(lugares.length > 0));
    }

    function interromperBusca() {
      window.clearTimeout(timer);
      timer = 0;
      if (consulta) consulta.abort();
      consulta = null;
    }

    function fechar() {
      interromperBusca();
      mostrarOpcoes([]);
      status.textContent = "";
    }

    function definir(lugar) {
      fechar();
      erro.textContent = "";
      campo.removeAttribute("aria-invalid");
      termoEscolhido = !lugar ? "" : lugar.tipo === "cep"
        ? formatarCep(lugar.cep) + (lugar.numero ? ", " + lugar.numero : "") : lugar.rotuloBusca || lugar.nome;
      campo.value = termoEscolhido;
    }

    async function pesquisar(texto, postal, locais) {
      const controlador = new AbortController();
      consulta = controlador;
      status.textContent = postal ? "Consultando o CEP…" : "Buscando endereços…";
      const prazo = window.setTimeout(function () { controlador.abort(); }, 8000);
      try {
        let encontrados;
        if (postal) {
          const digitos = postal[1].replace(/\D/g, ""), numero = postal[2] || "";
          const e = await consultarCep(digitos, controlador.signal);
          const nome = e.logradouro?.trim() || e.bairro?.trim();
          const bairro = soBairro && sugestaoBairro(e.bairro?.trim(), e.localidade, e.uf,
            partes([e.logradouro, formatarCep(digitos)]));
          if (bairro) {
            bairro.rotuloBusca = partes([e.logradouro, formatarCep(digitos)]);
            bairro.detalhe = partes([bairro.nome, bairro.cidade, e.uf]);
          }
          encontrados = soBairro ? (bairro ? [bairro] : []) : nome ? [{
            tipo: "cep", cep: digitos, numero: numero, nome: nome + (numero ? ", " + numero : ""),
            detalhe: partes([e.bairro, [e.localidade, e.uf].filter(Boolean).join("/"), formatarCep(digitos)]),
            bairroId: bairroCadastrado(e.localidade, [e.bairro])
          }] : [];
        } else {
          const chave = (soBairro ? "bairro:" : "rua:") + normalizar(texto);
          encontrados = cacheLocais.get(chave);
          if (!encontrados) {
            // O Photon suporta busca durante a digitação; o Nominatim público não.
            const filtros = new URLSearchParams({ q: texto, layer: "street", countrycode: "BR", lat: "-23.5505", lon: "-46.6333", limit: "10" });
            if (soBairro) {
              filtros.append("layer", "district");
              filtros.append("layer", "locality");
            } else if (/[ ,]\d{1,6}$/.test(texto)) filtros.append("layer", "house");
            const dados = await consultarPhoton("api/", filtros, controlador.signal);
            encontrados = dados.map(function (f) { return soBairro ? bairroDoMapa(f, true) : lugarDoMapa(f, "rua"); });
            if (cacheLocais.size >= 32) cacheLocais.delete(cacheLocais.keys().next().value);
            cacheLocais.set(chave, encontrados);
          }
        }
        if (consulta !== controlador) return;
        const sugestoes = semRepeticoes(locais.concat(encontrados), function (lugar) {
          return normalizar(soBairro
            ? (lugar.bairroId || [lugar.nome, lugar.cidade, lugar.estado].join("|")) + "|" + (lugar.rotuloBusca || "")
            : lugar.nome + "|" + lugar.detalhe);
        }).slice(0, 8);
        mostrarOpcoes(sugestoes);
        status.textContent = sugestoes.length
          ? (sugestoes.length === 1 ? "1 sugestão disponível." : sugestoes.length + " sugestões disponíveis.")
          : (postal ? "Esse CEP não identifica " + (soBairro ? "um bairro" : "uma rua ou um bairro") + ". Tente outro CEP." :
            (soBairro ? "Nenhum bairro encontrado com esse termo." : "Nenhuma rua encontrada.") + " Tente incluir a cidade ou digitar um CEP.");
      } catch (e) {
        if (consulta !== controlador) return;
        status.textContent = "";
        erro.textContent = e.amigavel ? e.message : "A busca está indisponível agora. Tente novamente.";
        if (e.amigavel) campo.setAttribute("aria-invalid", "true");
      } finally {
        window.clearTimeout(prazo);
        if (consulta === controlador) consulta = null;
      }
    }

    function atualizar(agora) {
      interromperBusca();
      erro.textContent = "";
      campo.removeAttribute("aria-invalid");
      status.textContent = "";
      const texto = campo.value.trim().replace(/\s+/g, " ");
      const cadastrados = config.sugestoes();
      if (!texto || texto === termoEscolhido) {
        mostrarOpcoes(cadastrados);
        return;
      }
      const postal = texto.match(soBairro ? /^(\d{5}-?\d{3})$/ : /^(\d{5}-?\d{3})(?:\s*,\s*(\d{1,6}))?$/);
      const filtro = normalizar(texto);
      const locais = cadastrados.filter(function (l) { return normalizar(l.nome).includes(filtro); });
      mostrarOpcoes(locais);
      if (!postal && /^[\d.,\s-]+$/.test(texto)) {
        if (agora || texto.replace(/\D/g, "").length > 8) status.textContent =
          "Digite os 8 números do CEP." + (soBairro ? "" : " Se quiser incluir o número, separe com vírgula.");
        return;
      }
      if (!postal && (texto.replace(/^(rua|avenida|av\.?|travessa)\s*/i, "").length < 3 ||
        locais.some(function (l) { return normalizar(l.nome) === filtro; }))) return;
      if (agora) {
        pesquisar(texto, postal, locais);
      } else {
        timer = window.setTimeout(function () {
          timer = 0;
          pesquisar(texto, postal, locais);
        }, 500);
      }
    }

    function editar() {
      config.aoEditar?.();
      atualizar(false);
    }
    campo.addEventListener("input", function (event) { if (!event.isComposing) editar(); });
    campo.addEventListener("compositionend", editar);
    campo.addEventListener("focus", function () {
      if (campo.value === termoEscolhido && termoEscolhido) campo.select();
      if (!erro.textContent && campo.getAttribute("aria-invalid") !== "true") atualizar(false);
    });
    campo.addEventListener("click", function () { if (lista.hidden && !timer && !consulta) atualizar(false); });
    campo.addEventListener("blur", fechar);
    lista.addEventListener("mousedown", function (event) { event.preventDefault(); });
    lista.addEventListener("click", function (event) {
      const opcao = event.target.closest("[data-indice]");
      if (opcao) config.escolher(opcoes[Number(opcao.dataset.indice)]);
    });
    campo.addEventListener("keydown", function (event) {
      if (event.isComposing) return;
      if (event.key === "Escape" && (!lista.hidden || timer || consulta)) {
        event.preventDefault();
        fechar();
      } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        if (lista.hidden && !timer && !consulta) atualizar(false);
        if (!opcoes.length) return;
        event.preventDefault();
        if (event.key === "ArrowDown") destacar(Math.min(ativo + 1, opcoes.length - 1));
        else destacar(ativo < 0 ? opcoes.length - 1 : Math.max(ativo - 1, 0));
      } else if (event.key === "Enter") {
        event.preventDefault();
        if (ativo >= 0) config.escolher(opcoes[ativo]);
        else if (opcoes.length === 1 && !timer && !consulta) config.escolher(opcoes[0]);
        else if (opcoes.length > 1) destacar(0);
        else if (!consulta) atualizar(true);
      } else if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
        destacar(-1);
      }
    });

    function semRascunho() { return campo.value.trim() === termoEscolhido; }
    return {
      definir: definir,
      semRascunho: semRascunho,
      confirmar: function () {
        if (termoEscolhido && semRascunho()) return true;
        campo.focus();
        campo.setAttribute("aria-invalid", "true");
        erro.textContent = campo.value.trim()
          ? "Escolha uma sugestão da lista."
          : (soBairro ? "Digite um bairro, uma rua ou um CEP." : "Digite uma rua, um CEP ou escolha um local da lista.");
        return false;
      }
    };
  };

  ZELA.iniciarBuscaRota = function (config) {
    const $ = function (id) { return document.getElementById("rota-local-" + id); };
    const perto = $("perto-lista"), pertoStatus = $("perto-status"), gps = $("usar-gps"), escolhido = $("escolhido");
    const cadastrados = Object.entries(ZELA.bairros).map(function (par) {
      return { tipo: "bairro", nome: par[1], bairroId: par[0], cidade: "São Paulo",
        detalhe: "São Paulo · Pontos cadastrados", centro: ZELA.centros[par[0]] };
    });
    const seletor = ZELA.iniciarCampoLocal({
      campo: "rota-local-busca", status: "rota-local-busca-status", erro: "rota-local-erro",
      sugestoes: function () { return cadastrados; },
      escolher: escolher
    });
    let consultaPerto = null, gpsConsultado = false;

    const inicial = config.regiaoInicial;
    seletor.definir(inicial);
    escolhido.textContent = inicial.bairroId ? "Pontos cadastrados de " + inicial.nome + "." :
      "Bairro de referência: " + partes([inicial.nome, inicial.cidade]) + ". Informe a saída e o destino para buscar um trajeto.";
    function escolher(lugar) {
      seletor.definir(lugar);
      config.escolher(lugar);
      escolhido.textContent = "Local escolhido: " + partes([lugar.nome, lugar.detalhe]) + "." +
        (lugar.tipo === "bairro" ? "" : " O endereço foi preenchido na saída.");
    }

    /* Bairros próximos só são consultados depois da permissão do navegador. */
    function montarBairros(lugares) {
      perto.replaceChildren(...lugares.map(function (lugar) {
        const item = document.createElement("li");
        const botao = document.createElement("button");
        botao.type = "button";
        conteudoOpcao(botao, lugar);
        botao.addEventListener("click", function () { escolher(lugar); });
        item.append(botao);
        return item;
      }));
      perto.hidden = !lugares.length;
    }

    function localizacao() {
      return new Promise(function (resolve, reject) {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000, maximumAge: 300000 });
      });
    }

    async function buscarPerto() {
      if (consultaPerto || !navigator.geolocation) return;
      const controlador = new AbortController();
      consultaPerto = controlador;
      gps.setAttribute("aria-disabled", "true");
      pertoStatus.textContent = "Procurando bairros perto de você…";
      try {
        const pos = await localizacao();
        if (consultaPerto !== controlador) return;
        // Basta uma posição arredondada para buscar bairros da região.
        const centro = { lat: Number(pos.coords.latitude.toFixed(3)), lon: Number(pos.coords.longitude.toFixed(3)) };
        const parametros = [
          ["lat", centro.lat], ["lon", centro.lon], ["radius", RAIO_BAIRROS_KM],
          ["limit", 15], ["layer", "district"], ["layer", "locality"],
          ["osm_tag", "place:suburb"], ["osm_tag", "place:neighbourhood"],
          ["osm_tag", "place:quarter"]
        ];
        const prazo = window.setTimeout(function () { controlador.abort(); }, 8000);
        let bairrosDoMapa = [], servicoFalhou = false;
        try {
          const dados = await consultarPhoton("reverse", parametros, controlador.signal);
          bairrosDoMapa = dados.map(function (f) { return lugarDoMapa(f, "bairro"); }).filter(Boolean);
        } catch (e) {
          servicoFalhou = true;
        } finally {
          window.clearTimeout(prazo);
        }
        if (consultaPerto !== controlador) return;
        const porDistancia = cadastrados.concat(bairrosDoMapa).map(function (lugar) {
          return { lugar: lugar, distancia: config.distanciaKm(centro, lugar.centro) };
        }).filter(function (item) { return item.distancia <= RAIO_BAIRROS_KM; })
          .sort(function (a, b) { return a.distancia - b.distancia; })
          .map(function (item) { return item.lugar; });
        const bairros = semRepeticoes(porDistancia, function (lugar) {
          return normalizar(lugar.nome + "|" + (lugar.cidade || ""));
        }).slice(0, 5);
        montarBairros(bairros);
        gpsConsultado = true;
        gps.textContent = "Atualizar bairros";
        pertoStatus.textContent = bairros.length ? (servicoFalhou ? "Pontos cadastrados próximos a você." : "Escolha um bairro perto de você.") :
          (servicoFalhou ? "Não foi possível consultar os bairros próximos. Tente de novo ou digite um endereço." :
            "Nenhum bairro mapeado por perto. Você pode digitar uma rua ou CEP.");
      } catch (e) {
        if (consultaPerto !== controlador) return;
        montarBairros([]);
        pertoStatus.textContent = e.code === 1
          ? "O acesso à localização está desativado. Você ainda pode digitar uma rua ou CEP."
          : "Não conseguimos obter sua localização. Tente de novo ou digite uma rua ou CEP.";
      } finally {
        if (consultaPerto === controlador) {
          consultaPerto = null;
          gps.removeAttribute("aria-disabled");
        }
      }
    }

    if (navigator.geolocation) {
      gps.addEventListener("click", buscarPerto);
      if (navigator.permissions?.query) {
        navigator.permissions.query({ name: "geolocation" }).then(function (permissao) {
          function atualizarPermissao() {
            if (permissao.state === "granted") {
              if (!gpsConsultado) buscarPerto();
            } else {
              if (consultaPerto) consultaPerto.abort();
              consultaPerto = null;
              gpsConsultado = false;
              gps.textContent = "Usar minha localização";
              gps.removeAttribute("aria-disabled");
              montarBairros([]);
              pertoStatus.textContent = permissao.state === "denied"
                ? "O acesso à localização está desativado. Você ainda pode digitar uma rua ou CEP." : "";
            }
          }
          if (permissao.state !== "prompt") atualizarPermissao();
          permissao.addEventListener("change", atualizarPermissao);
        }).catch(function () { /* o botão ainda funciona sem a API de permissões */ });
      }
    } else {
      gps.hidden = true;
      pertoStatus.textContent = "Seu navegador não permite localizar bairros próximos. Digite uma rua ou CEP.";
    }

  };
})();
