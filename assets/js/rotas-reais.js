/* Zela — consulta de trajetos entre pontos públicos mapeados no OpenStreetMap. */
(function () {
  "use strict";

  const $ = function (id) { return document.getElementById(id); };
  const form = $("rota-real-form");
  const bairro = $("rota-real-bairro");
  const origem = $("rota-real-de");
  const destino = $("rota-real-para");
  const perfil = $("rota-real-perfil");
  const buscar = $("rota-real-buscar");
  const mensagem = $("rota-real-carregando");
  const erro = $("rota-real-erro");
  const erroDestino = $("rota-real-erro-destino");
  const contingencia = $("rota-real-contingencia");
  const resultado = $("rota-real-resultado");
  const alternativa = $("rota-real-alternativa");
  const mapa = $("rota-real-mapa");
  const pararLeitura = ZELA.ligarLeituraRota($("rota-real-ouvir"), "#rota-real-passos > li");
  const perfis = {
    cadeira: {
      opcoes: { type: "wheelchair", use_hills: 0 },
      dica: "Usa o perfil de cadeira de rodas e dá preferência a caminhos com menos ladeiras."
    },
    andador: {
      opcoes: { type: "foot", use_hills: 0, step_penalty: 180, walking_speed: 2.4 },
      dica: "Dá preferência a menos ladeiras e escadas, com uma estimativa de tempo em ritmo mais lento."
    },
    carrinho: {
      opcoes: { type: "foot", use_hills: 0.3, step_penalty: 240, walking_speed: 3.2 },
      dica: "Dá preferência a caminhos que evitam escadas mapeadas."
    },
    visual: {
      opcoes: { type: "blind", walking_speed: 3.2 },
      dica: "Inclui instruções sobre travessias e outros pontos de referência quando estão mapeados."
    }
  };
  const km = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
  const cache = new Map();
  let consulta = null;
  let ultimaBusca = 0;
  let trajetos = [];

  function locais() {
    return ZELA.locaisRota[bairro.value];
  }

  function localSelecionado(campo) {
    return locais().find(function (local) { return local.id === campo.value; });
  }

  function preencherLocais(saida, chegada) {
    const pontos = locais();
    [origem, destino].forEach(function (campo) {
      campo.replaceChildren(...pontos.map(function (local) {
        return new Option(local.nome, local.id);
      }));
    });
    origem.value = pontos.find(function (local) { return local.id === saida; })?.id || pontos[0].id;
    destino.value = pontos.find(function (local) { return local.id === chegada; })?.id ||
      pontos.find(function (local) { return local.id !== origem.value; }).id;
  }

  function elementoMapa(nome, atributos, pai) {
    const elemento = document.createElementNS("http://www.w3.org/2000/svg", nome);
    Object.entries(atributos).forEach(function (par) {
      elemento.setAttribute(par[0], par[1]);
    });
    pai.appendChild(elemento);
    return elemento;
  }

  function mostrarMapa(pontos) {
    const saida = localSelecionado(origem);
    const chegada = localSelecionado(destino);
    $("rota-real-mapa-de").textContent = saida.nome;
    $("rota-real-mapa-para").textContent = chegada.nome;

    const largura = mapa.viewBox.baseVal.width;
    const altura = mapa.viewBox.baseVal.height;
    const projetar = ZELA.mapaReal(mapa.parentElement, saida, altura / largura, [saida, chegada].concat(pontos));
    function posicao(ponto) {
      const xy = projetar(ponto);
      return [xy.x * largura / 100, xy.y * altura / 100];
    }
    mapa.replaceChildren();

    if (pontos.length) {
      const linha = pontos.map(function (ponto) { return posicao(ponto).join(","); }).join(" ");
      elementoMapa("polyline", { points: linha, class: "route-line-halo" }, mapa);
      elementoMapa("polyline", { points: linha, class: "route-line" }, mapa);
    }

    [{ local: saida, letra: "A" }, { local: chegada, letra: "B" }].forEach(function (marcador) {
      const pos = posicao(marcador.local);
      const grupo = elementoMapa("g", { transform: "translate(" + pos.join(" ") + ")", class: "route-marker" }, mapa);
      elementoMapa("circle", { r: 22 }, grupo);
      elementoMapa("text", { y: 1, "text-anchor": "middle", "dominant-baseline": "middle" }, grupo).textContent = marcador.letra;
    });
  }

  // A API retorna uma linha codificada com deltas de latitude e longitude (polyline6).
  function decodificarForma(forma) {
    const pontos = [];
    let pos = 0, lat = 0, lon = 0;
    function lerDelta() {
      let valor = 0, deslocamento = 0, parte;
      do {
        if (pos >= forma.length || deslocamento > 30) throw new Error("Forma incompleta");
        parte = forma.charCodeAt(pos++) - 63;
        if (parte < 0 || parte > 63) throw new Error("Forma inválida");
        valor |= (parte & 31) << deslocamento;
        deslocamento += 5;
      } while (parte >= 32);
      return valor & 1 ? ~(valor >>> 1) : valor >>> 1;
    }
    while (pos < forma.length) {
      lat += lerDelta();
      lon += lerDelta();
      const ponto = { lat: lat / 1e6, lon: lon / 1e6 };
      if (Math.abs(ponto.lat) > 85 || Math.abs(ponto.lon) > 180) throw new Error("Coordenadas inválidas");
      pontos.push(ponto);
    }
    if (pontos.length < 2) throw new Error("Forma incompleta");
    return pontos;
  }

  function lerTrajeto(trip) {
    const trecho = trip.legs[0];
    return {
      distancia: trip.summary.length,
      tempo: trip.summary.time,
      pontos: decodificarForma(trecho.shape),
      passos: trecho.maneuvers.map(function (manobra) { return manobra.instruction.replace(/^Caminhe\b/, "Siga"); })
    };
  }

  function distanciaTexto(distancia) {
    return distancia < 1 ? Math.round(distancia * 1000) + " m" : km.format(distancia) + " km";
  }

  function tempoTexto(tempo) {
    return Math.max(1, Math.round(tempo / 60)) + " min";
  }

  function mostrarTrajeto(indice) {
    pararLeitura();
    const trajeto = trajetos[indice];
    $("rota-real-distancia").textContent = distanciaTexto(trajeto.distancia);
    $("rota-real-tempo").textContent = tempoTexto(trajeto.tempo);
    $("rota-real-passos").replaceChildren(...trajeto.passos.map(function (passo) {
      const item = document.createElement("li");
      item.textContent = passo;
      return item;
    }));
    mostrarMapa(trajeto.pontos);
  }

  function mostrarResultado(rotas) {
    trajetos = rotas;
    $("rota-real-resultado-titulo").textContent =
      "De " + localSelecionado(origem).nome + " até " + localSelecionado(destino).nome;
    $("rota-real-resultado-perfil").textContent = perfil.selectedOptions[0].textContent;
    $("rota-real-avisos").href = "bairro.html?" + new URLSearchParams({ bairro: bairro.value, mobilidade: "1" }) + "#lista-t";
    alternativa.replaceChildren(...rotas.map(function (rota, i) {
      const nome = i === 0 ? "Principal" : "Alternativa " + i;
      return new Option(nome + " · " + distanciaTexto(rota.distancia) + " · " + tempoTexto(rota.tempo), String(i));
    }));
    $("rota-real-alternativas").hidden = rotas.length < 2;
    resultado.hidden = false;
    mostrarTrajeto(0);
    $("rota-real-resultado-titulo").focus();
  }

  function estadoBusca(emBusca) {
    buscar.setAttribute("aria-disabled", String(emBusca));
    mensagem.textContent = emBusca ? "Buscando um trajeto…" : "";
  }

  function redefinir() {
    if (consulta) consulta.abort();
    consulta = null;
    estadoBusca(false);
    erro.textContent = "";
    erroDestino.textContent = "";
    contingencia.hidden = true;
    destino.removeAttribute("aria-invalid");
    resultado.hidden = true;
    pararLeitura();
    [origem, destino, perfil].forEach(function (campo) {
      $(campo.id + "-texto").textContent = campo.selectedOptions[0].textContent;
    });
    $("rota-real-preferencia").textContent = perfis[perfil.value].dica;
    mostrarMapa([]);
  }

  contingencia.querySelector("a").addEventListener("click", function (event) {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const simulacao = $("simulacao");
    simulacao.open = true;
    const titulo = simulacao.querySelector("summary");
    titulo.focus({ preventScroll: true });
    titulo.scrollIntoView({ block: "start" });
  });

  form.addEventListener("change", function (event) {
    if (event.target === bairro) preencherLocais();
    redefinir();
  });
  alternativa.addEventListener("change", function () {
    const indice = Number(alternativa.value);
    mostrarTrajeto(indice);
    ZELA.anunciar(alternativa.selectedOptions[0].textContent + ". Instruções atualizadas.");
  });

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    if (consulta) return;
    erro.textContent = "";
    erroDestino.textContent = "";
    contingencia.hidden = true;
    if (origem.value === destino.value) {
      erroDestino.textContent = "Escolha um destino diferente do ponto de saída.";
      destino.setAttribute("aria-invalid", "true");
      destino.focus();
      return;
    }

    const chave = [origem.value, destino.value, perfil.value].join("|");
    if (cache.has(chave)) {
      mostrarResultado(cache.get(chave));
      return;
    }
    if (Date.now() - ultimaBusca < 1100) {
      erro.textContent = "Aguarde um instante e tente buscar de novo.";
      return;
    }

    const parametros = {
      locations: [localSelecionado(origem), localSelecionado(destino)].map(function (local) {
        return { lat: local.lat, lon: local.lon };
      }),
      costing: "pedestrian",
      costing_options: { pedestrian: perfis[perfil.value].opcoes },
      units: "kilometers",
      language: "pt-BR",
      alternates: 1
    };
    const controlador = new AbortController();
    consulta = controlador;
    ultimaBusca = Date.now();
    estadoBusca(true);
    const prazo = window.setTimeout(function () { controlador.abort(); }, 15000);
    try {
      const url = "https://valhalla1.openstreetmap.de/route?json=" + encodeURIComponent(JSON.stringify(parametros));
      const resposta = await fetch(url, {
        signal: controlador.signal,
        headers: { "X-Client-Id": "fabriciogallo.github.io/zela" }
      });
      const dados = await resposta.json();
      if (consulta !== controlador) return;
      if (!resposta.ok && [170, 171, 442, 443].includes(dados.error_code)) {
        erro.textContent = "Nenhum trajeto encontrado para esse perfil entre os pontos escolhidos. Tente outro ponto.";
        return;
      }
      if (!resposta.ok) throw new Error("Consulta indisponível");
      const rotas = [lerTrajeto(dados.trip)].concat((dados.alternates || []).map(function (item) {
        return lerTrajeto(item.trip);
      }));
      cache.set(chave, rotas);
      mostrarResultado(rotas);
    } catch (falha) {
      if (consulta !== controlador) return;
      erro.textContent = "Não foi possível buscar o trajeto agora. Tente novamente em instantes.";
      contingencia.hidden = false;
    } finally {
      window.clearTimeout(prazo);
      if (consulta === controlador) {
        consulta = null;
        estadoBusca(false);
      }
    }
  });

  const parametros = new URLSearchParams(location.search);
  const bairroInicial = parametros.get("bairro") || ZELA.store.get("bairro", "angela");
  bairro.value = Object.hasOwn(ZELA.locaisRota, bairroInicial) ? bairroInicial : "angela";
  preencherLocais(parametros.get("origem"), parametros.get("destino"));
  redefinir();
})();
