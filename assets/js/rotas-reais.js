/* Zela — consulta de trajetos reais (Valhalla + OpenStreetMap).
   Saída e destino podem ser pontos cadastrados, endereços ou a localização do aparelho. */
(function () {
  "use strict";

  const $ = function (id) { return document.getElementById(id); };
  const form = $("rota-real-form");
  const origem = $("rota-real-de");
  const destino = $("rota-real-para");
  const marcado = function (nome) {
    const campo = form.querySelector('input[name="' + nome + '"]:checked');
    return campo ? campo.value : "";
  };
  const perfil = {
    get value() { return marcado("perfil-real") || "cadeira"; },
    get nome() { return form.querySelector('input[name="perfil-real"]:checked').parentElement.textContent.trim(); }
  };
  function filtrosMarcados() {
    return Array.from(form.querySelectorAll('input[name="filtro-real"]:checked'), function (c) { return c.value; });
  }
  function ordemAtual() { return marcado("ordem-real") || "perfil"; }
  const buscar = $("rota-real-buscar");
  const mensagem = $("rota-real-carregando");
  const erro = $("rota-real-erro");
  const erroDestino = $("rota-real-erro-destino");
  const resultado = $("rota-real-resultado");
  const alternativa = $("rota-real-alternativa");
  const mapa = $("rota-real-mapa");
  const pararLeitura = iniciarLeitura();
  const perfis = {
    cadeira: {
      opcoes: { type: "wheelchair", use_hills: 0 },
      dica: "Usa o perfil de cadeira de rodas e dá preferência a caminhos com menos ladeiras."
    },
    andador: {
      opcoes: { type: "foot", use_hills: 0, step_penalty: 300, walking_speed: 2.4 },
      dica: "Evita escadas e ladeiras ao máximo, com tempo calculado em ritmo lento."
    },
    bengala: {
      opcoes: { type: "foot", use_hills: 0.2, step_penalty: 120, walking_speed: 3 },
      dica: "Dá preferência a menos escadas e ladeiras, com tempo em ritmo mais calmo."
    },
    carrinho: {
      opcoes: { type: "foot", use_hills: 0.3, step_penalty: 300, walking_speed: 3.4 },
      dica: "Evita escadas mapeadas para você não precisar carregar o carrinho."
    },
    malas: {
      opcoes: { type: "foot", use_hills: 0.4, step_penalty: 240, walking_speed: 3.6 },
      dica: "Evita escadas mapeadas para facilitar levar malas ou objetos grandes."
    },
    "baixa-visao": {
      opcoes: { type: "foot", use_hills: 0.5, step_penalty: 60, walking_speed: 3.4, use_lit: 1 },
      dica: "Dá preferência a ruas iluminadas e caminhos mais simples de seguir."
    },
    cegueira: {
      opcoes: { type: "blind", walking_speed: 3 },
      dica: "Inclui instruções sobre travessias e outros pontos de referência quando estão mapeados."
    }
  };
  const ORDENS = {
    perfil: "perfil de mobilidade",
    distancia: "menor distância",
    rampa: "mais rampas",
    plano: "mais plano",
    obstaculos: "menos obstáculos"
  };
  const FILTROS = { sombra: "mais sombra", bancos: "bancos para sentar", agua: "pontos de água" };

  /* A ordenação também ajusta o cálculo do trajeto. */
  function opcoesCalculo() {
    const opcoes = Object.assign({}, perfis[perfil.value].opcoes);
    const ordem = ordemAtual();
    if (ordem === "plano") opcoes.use_hills = 0;
    if ((ordem === "obstaculos" || ordem === "rampa") && opcoes.type !== "wheelchair") {
      opcoes.step_penalty = Math.max(opcoes.step_penalty || 0, 300);
    }
    return opcoes;
  }
  const DISTANCIA_MAXIMA_KM = 15;
  const km = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
  const cache = new Map();
  const { consultarCep, formatarCep } = ZELA.buscaLocais;
  let lugarEscolhido = null;
  let consulta = null;
  let preparando = null;
  let ultimaBusca = 0;
  let trajetos = [];

  /* Cada ponta guarda a sugestão escolhida e, quando disponível, sua posição. */
  const pontas = [origem, destino].map(function (campo) {
    const id = campo.id;
    return {
      campo: campo,
      erro: $(id + "-erro"),
      msg: $(id + "-msg"),
      seletor: null,
      escolha: null,
      local: null,
      pendente: null,
      editado: false
    };
  });
  function ponta(campo) { return campo === origem ? pontas[0] : pontas[1]; }

  function falha(texto) {
    const e = new Error(texto);
    e.amigavel = true;
    return e;
  }

  function iniciarLeitura() {
    const botao = $("rota-real-ouvir");
    if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
      botao.hidden = true;
      return function () {};
    }
    let atual = null;
    function parar(cancelar) {
      if (!atual) return;
      atual = null;
      botao.textContent = "Ouvir as instruções";
      if (cancelar) window.speechSynthesis.cancel();
    }
    botao.addEventListener("click", function () {
      if (atual) { parar(true); return; }
      const instrucoes = Array.from(document.querySelectorAll("#rota-real-passos .route-step-text"), function (el, i) {
        return "Passo " + (i + 1) + ". " + el.textContent.trim();
      });
      if (!instrucoes.length) return;
      const fala = new SpeechSynthesisUtterance(instrucoes.join(" "));
      fala.lang = "pt-BR";
      fala.rate = 0.9;
      fala.onend = function () { if (atual === fala) parar(false); };
      fala.onerror = function () {
        if (atual !== fala) return;
        parar(false);
        ZELA.anunciar("A leitura em voz alta está indisponível. Veja a lista de instruções.");
      };
      atual = fala;
      botao.textContent = "Parar a leitura";
      window.speechSynthesis.speak(fala);
    });
    return function () { parar(true); };
  }

  function idBairro() { return lugarEscolhido?.bairroId; }
  function pontosDoBairro() {
    const id = idBairro();
    return (ZELA.locaisRota[id] || []).map(function (lugar) {
      return Object.assign({ tipo: "ponto", bairroId: id, detalhe: "Ponto cadastrado · " + ZELA.bairros[id] }, lugar);
    });
  }

  function localSelecionado(campo) {
    const p = ponta(campo);
    return p.seletor?.semRascunho() ? p.local : null;
  }

  function sugestoesPonta() {
    const gps = { tipo: "gps", nome: "Minha localização atual", detalhe: "Usar a posição deste aparelho" };
    return (navigator.geolocation ? [gps] : []).concat(pontosDoBairro());
  }

  function definirPonta(p, lugar, editado) {
    p.escolha = lugar || null;
    p.local = lugar && Number.isFinite(lugar.lat) && Number.isFinite(lugar.lon) ? lugar : null;
    p.pendente = null;
    p.editado = Boolean(editado);
    p.seletor.definir(p.escolha);
  }

  /* ---------- Geocodificação ---------- */
  function distanciaKm(a, b) {
    const rad = Math.PI / 180;
    const dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
    return 12742 * Math.asin(Math.sqrt(h));
  }

  // O Nominatim pede no máximo uma consulta por segundo.
  let ultimaNominatim = 0;
  async function nominatim(caminho, parametros) {
    const horario = Math.max(Date.now(), ultimaNominatim + 1100);
    const espera = horario - Date.now();
    ultimaNominatim = horario;
    if (espera > 0) await new Promise(function (ok) { window.setTimeout(ok, espera); });
    const url = "https://nominatim.openstreetmap.org/" + caminho + "?" +
      new URLSearchParams(Object.assign({ format: "jsonv2", "accept-language": "pt-BR" }, parametros));
    const resposta = await fetch(url, { headers: { Accept: "application/json" } });
    if (!resposta.ok) throw new Error("Nominatim indisponível");
    return resposta.json();
  }

  async function geocodificar(parametros) {
    const lista = await nominatim("search", Object.assign({ limit: "1", countrycodes: "br" }, parametros));
    return lista[0] ? { lat: Number(lista[0].lat), lon: Number(lista[0].lon) } : null;
  }

  async function localizarCep(lugar) {
    const digitos = lugar.cep;
    const numero = lugar.numero || "";
    const end = await consultarCep(digitos);

    const cidade = end.localidade, uf = end.uf, rua = end.logradouro || "";
    const tentativas = [];
    if (rua && numero) tentativas.push({ nivel: "numero", busca: { street: numero + " " + rua, city: cidade, state: uf } });
    if (rua) tentativas.push({ nivel: "rua", busca: { street: rua, city: cidade, state: uf } });
    tentativas.push({ nivel: "cep", busca: { postalcode: formatarCep(digitos), city: cidade } });
    if (end.bairro) tentativas.push({ nivel: "bairro", busca: { q: end.bairro + ", " + cidade + ", " + uf } });

    let ponto = null, nivel = "";
    for (const tentativa of tentativas) {
      ponto = await geocodificar(tentativa.busca);
      if (ponto) { nivel = tentativa.nivel; break; }
    }
    const endereco = [rua ? rua + (numero ? ", " + numero : "") : "", end.bairro, cidade + "/" + uf].filter(Boolean).join(" · ");
    if (!ponto) throw falha("Achamos o endereço (" + endereco + "), mas não a posição dele no mapa. Escolha um ponto do bairro.");

    const precisao = {
      numero: "",
      rua: numero ? " Não achamos o número no mapa: usamos um ponto aproximado da rua." : " Posição aproximada da rua. Para buscar o número, acrescente-o após uma vírgula no campo do CEP.",
      cep: " Posição aproximada pelo CEP.",
      bairro: " Posição aproximada: centro do bairro."
    }[nivel];
    return {
      tipo: "cep",
      nome: rua ? rua + (numero && nivel === "numero" ? ", " + numero : "") : (end.bairro || cidade),
      descricao: "Endereço: " + endereco + "." + precisao,
      lat: ponto.lat,
      lon: ponto.lon
    };
  }

  function localizarGps() {
    return new Promise(function (ok, nao) {
      if (!("geolocation" in navigator)) {
        nao(falha("Seu navegador não informa a localização. Use o CEP ou um ponto do bairro."));
        return;
      }
      navigator.geolocation.getCurrentPosition(ok, function (e) {
        nao(falha(e.code === 1
          ? "Você não permitiu o acesso à localização. Use o CEP ou um ponto do bairro."
          : "Não conseguimos achar sua localização agora. Use o CEP ou um ponto do bairro."));
      }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 });
    }).then(async function (pos) {
      const local = {
        tipo: "gps",
        nome: "Sua localização",
        lat: pos.coords.latitude,
        lon: pos.coords.longitude,
        descricao: "Usando a sua localização atual (precisão de cerca de " + Math.round(pos.coords.accuracy) + " m)."
      };
      try {
        const lugar = await nominatim("reverse", { lat: local.lat.toFixed(5), lon: local.lon.toFixed(5), zoom: "18" });
        const a = lugar.address || {};
        const rua = a.road || a.pedestrian || a.footway;
        if (rua) {
          local.nome = "Perto de " + rua + (a.house_number ? ", " + a.house_number : "");
          local.descricao = "Você está perto de " + [rua + (a.house_number ? ", " + a.house_number : ""), a.suburb || a.neighbourhood].filter(Boolean).join(" · ") +
            " (precisão de cerca de " + Math.round(pos.coords.accuracy) + " m).";
        }
      } catch (e) { /* o nome da rua é opcional */ }
      return local;
    });
  }

  /* Localiza a ponta escolhida e mostra o resultado embaixo do campo. */
  async function resolverPonta(p) {
    const lugar = p.escolha;
    if (!lugar || !p.seletor.semRascunho()) return null;
    if (p.local && (lugar.tipo !== "gps" || Date.now() - p.local.quando < 120000)) return p.local;
    if (p.pendente) return p.pendente;
    p.erro.textContent = "";
    p.campo.removeAttribute("aria-invalid");
    p.msg.textContent = lugar.tipo === "gps" ? "Procurando sua localização…" : "Localizando o CEP no mapa…";
    const requisicao = lugar.tipo === "gps" ? localizarGps() : localizarCep(lugar);
    const pendente = requisicao.then(function (local) {
      if (p.pendente !== pendente || !p.seletor.semRascunho()) return null;
      local.quando = Date.now();
      p.local = local;
      atualizarPonta(p);
      if (resultado.hidden) mostrarMapa([]);
      return local;
    }).catch(function (e) {
      if (p.pendente !== pendente || !p.seletor.semRascunho()) return null;
      p.msg.textContent = "";
      p.erro.textContent = e.amigavel ? e.message : "Não foi possível localizar o endereço agora. Tente novamente ou escolha outra sugestão.";
      return null;
    }).finally(function () {
      if (p.pendente === pendente) p.pendente = null;
    });
    p.pendente = pendente;
    return pendente;
  }

  function atualizarPonta(p) {
    if (!p.escolha || !p.seletor.semRascunho()) { p.msg.textContent = ""; return; }
    const local = localSelecionado(p.campo);
    if (local?.descricao) p.msg.textContent = local.descricao;
    else if (local?.tipo === "rua") p.msg.textContent = [local.aproximado ? "Posição aproximada da rua." : "Endereço mapeado.", local.detalhe].filter(Boolean).join(" ");
    else if (!p.pendente && p.escolha.tipo === "cep" && !p.erro.textContent) p.msg.textContent = p.escolha.detalhe || "";
    else if (!p.pendente) p.msg.textContent = "";
  }

  /* ---------- Mapa ---------- */
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
    $("rota-real-mapa-de").textContent = saida ? saida.nome : "Informe o endereço de saída";
    $("rota-real-mapa-para").textContent = chegada ? chegada.nome : "Informe o endereço de destino";

    const marcadores = [{ local: saida, letra: "A" }, { local: chegada, letra: "B" }].filter(function (m) { return m.local; });
    const largura = mapa.viewBox.baseVal.width;
    const altura = mapa.viewBox.baseVal.height;
    const centro = saida || chegada || ZELA.centros[idBairro()] || lugarEscolhido?.centro;
    mapa.replaceChildren();
    mapa.parentElement.hidden = !centro;
    $("rota-real-mapa-vazio").hidden = Boolean(centro);
    if (!centro) return;
    const projetar = ZELA.mapaReal(mapa.parentElement, centro, altura / largura,
      marcadores.map(function (m) { return m.local; }).concat(pontos));
    function posicao(ponto) {
      const xy = projetar(ponto);
      return [xy.x * largura / 100, xy.y * altura / 100];
    }
    if (pontos.length) {
      const linha = pontos.map(function (ponto) { return posicao(ponto).join(","); }).join(" ");
      elementoMapa("polyline", { points: linha, class: "route-line-halo" }, mapa);
      elementoMapa("polyline", { points: linha, class: "route-line" }, mapa);
    }

    marcadores.forEach(function (marcador) {
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
      passos: trecho.maneuvers.map(function (manobra) {
        return {
          texto: manobra.instruction.replace(/^Caminhe\b/, "Siga"),
          tipo: manobra.type,
          distancia: manobra.length || 0,
          tempo: manobra.time || 0
        };
      })
    };
  }

  /* ---------- Instruções: ícone, medida e alertas de cada passo ---------- */
  // Tipos de manobra do Valhalla agrupados em ícones.
  const GIROS = {
    8: 0, 7: 0, 17: 0, 22: 0, 25: 0,
    9: 45, 23: 30, 18: 45, 20: 45, 37: 30,
    10: 90, 11: 135, 12: 180,
    16: -45, 24: -30, 19: -45, 21: -45, 38: -30,
    15: -90, 14: -135, 13: -180
  };
  const ICONES = {
    inicio: '<circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="9" fill="none" stroke-width="2"/>',
    fim: '<path d="M6 21V4h11l-2 4 2 4H8"/>',
    seta: '<path d="M12 20V6M6 11l6-6 6 6" fill="none" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>',
    retorno: '<path d="M8 20V10a4 4 0 0 1 8 0v4M12 11l4 4 4-4" fill="none" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>',
    escada: '<path d="M4 20h5v-5h5v-5h6V5" fill="none" stroke-width="2.6" stroke-linejoin="round"/>',
    elevador: '<rect x="5" y="3" width="14" height="18" rx="2" fill="none" stroke-width="2.2"/><path d="M9 10l3-3 3 3M9 14l3 3 3-3" fill="none" stroke-width="2.2"/>',
    rotatoria: '<circle cx="12" cy="12" r="6" fill="none" stroke-width="2.4"/><path d="M12 6V2M16 2l-4 0" fill="none" stroke-width="2.4" stroke-linecap="round"/>',
    predio: '<path d="M5 21V5l7-2 7 2v16M10 21v-5h4v5" fill="none" stroke-width="2.2" stroke-linejoin="round"/>'
  };

  function iconePasso(passo) {
    const t = passo.tipo;
    let nome = "seta", giro = 0;
    if (t >= 1 && t <= 3) nome = "inicio";
    else if (t >= 4 && t <= 6) nome = "fim";
    else if (t === 40 || t === 41) nome = "escada";
    else if (t === 39) nome = "elevador";
    else if (t === 26 || t === 27) nome = "rotatoria";
    else if (t === 42 || t === 43) nome = "predio";
    else if (t === 12 || t === 13) nome = "retorno";
    else giro = GIROS[t] || 0;
    const espelho = t === 13 ? ' transform="scale(-1 1) translate(-24 0)"' : "";
    const rotacao = giro ? ' transform="rotate(' + giro + ' 12 12)"' : espelho;
    return { nome: nome, svg: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><g' + rotacao + ">" + ICONES[nome] + "</g></svg>" };
  }

  function alertasPasso(passo) {
    const alertas = [];
    if (passo.tipo === 40) alertas.push({ texto: "Escada", forte: true });
    if (passo.tipo === 41) alertas.push({ texto: "Escada rolante", forte: true });
    if (passo.tipo === 39) alertas.push({ texto: "Elevador", forte: false });
    if (/atravess|cruz|faixa/i.test(passo.texto)) alertas.push({ texto: "Travessia", forte: false });
    if (/rampa/i.test(passo.texto)) alertas.push({ texto: "Rampa", forte: false });
    return alertas;
  }

  function medidaPasso(passo) {
    if (!passo.distancia) return "";
    return distanciaTexto(passo.distancia) + (passo.tempo >= 30 ? " · " + tempoTexto(passo.tempo) : "");
  }

  function criarPasso(passo, i, total) {
    const icone = iconePasso(passo);
    const item = document.createElement("li");
    const alertas = alertasPasso(passo);
    item.className = "route-step-item route-step-item--" + icone.nome + (alertas.some(function (a) { return a.forte; }) ? " is-alert" : "");

    const marca = document.createElement("span");
    marca.className = "route-step-icon";
    marca.innerHTML = icone.svg;

    const corpo = document.createElement("div");
    corpo.className = "route-step-body";
    const rotulo = document.createElement("p");
    rotulo.className = "route-step-label";
    rotulo.textContent = i === 0 ? "Saída" : i === total - 1 ? "Chegada" : "Passo " + (i + 1);
    const texto = document.createElement("p");
    texto.className = "route-step-text";
    texto.textContent = passo.texto;
    corpo.append(rotulo, texto);

    const medida = medidaPasso(passo);
    if (medida || alertas.length) {
      const meta = document.createElement("p");
      meta.className = "route-step-meta";
      if (medida) {
        const m = document.createElement("span");
        m.textContent = medida;
        meta.append(m);
      }
      alertas.forEach(function (a) {
        const tag = document.createElement("span");
        tag.className = "route-step-tag" + (a.forte ? " route-step-tag--alert" : "");
        tag.textContent = a.texto;
        meta.append(tag);
      });
      corpo.append(meta);
    }
    item.append(marca, corpo);
    return item;
  }

  function resumoPassos(passos) {
    const escadas = passos.filter(function (p) { return p.tipo === 40 || p.tipo === 41; }).length;
    const travessias = passos.filter(function (p) { return /atravess|cruz|faixa/i.test(p.texto); }).length;
    const partes = [passos.length + " instruções"];
    if (travessias) partes.push(travessias + (travessias > 1 ? " travessias" : " travessia"));
    partes.push(escadas ? escadas + (escadas > 1 ? " trechos com escada — atenção" : " trecho com escada — atenção") : "nenhuma escada mapeada");
    return partes.join(" · ") + ".";
  }

  function distanciaTexto(distancia) {
    return distancia < 1 ? Math.round(distancia * 1000) + " m" : km.format(distancia) + " km";
  }

  function tempoTexto(tempo) {
    const minutos = Math.max(1, Math.round(tempo / 60));
    return minutos < 60 ? minutos + " min" : Math.floor(minutos / 60) + " h " + String(minutos % 60).padStart(2, "0") + " min";
  }

  function chegadaTexto(tempo) {
    return new Date(Date.now() + tempo * 1000).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }

  /* ---------- O que há no caminho (OpenStreetMap + elevação) ---------- */
  function projetor(lat0) {
    const kx = 111320 * Math.cos(lat0 * Math.PI / 180), ky = 110540;
    return function (p) { return { x: p.lon * kx, y: p.lat * ky }; };
  }

  // Pontos a cada `passo` metros ao longo do trajeto, em metros planos.
  function amostrar(pontos, plano, passo) {
    const saida = [];
    let resto = 0;
    for (let i = 1; i < pontos.length; i++) {
      const a = plano(pontos[i - 1]), b = plano(pontos[i]);
      const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy);
      let d = resto;
      while (d <= len) {
        const t = len ? d / len : 0;
        saida.push({ x: a.x + dx * t, y: a.y + dy * t, lat: pontos[i - 1].lat + (pontos[i].lat - pontos[i - 1].lat) * t, lon: pontos[i - 1].lon + (pontos[i].lon - pontos[i - 1].lon) * t });
        d += passo;
      }
      resto = d - len;
    }
    saida.push(Object.assign(plano(pontos[pontos.length - 1]), pontos[pontos.length - 1]));
    return saida;
  }

  function perto(ponto, amostras, raio) {
    for (const a of amostras) if (Math.abs(a.x - ponto.x) <= raio && Math.hypot(a.x - ponto.x, a.y - ponto.y) <= raio) return true;
    return false;
  }

  async function buscarArredores(rotas) {
    let s = 90, w = 180, n = -90, e = -180;
    rotas.forEach(function (r) {
      r.pontos.forEach(function (p) { s = Math.min(s, p.lat); n = Math.max(n, p.lat); w = Math.min(w, p.lon); e = Math.max(e, p.lon); });
    });
    const m = 0.0006;
    if ((n - s) * (e - w) > 0.006) throw new Error("Área grande demais");
    const caixa = [s - m, w - m, n + m, e + m].map(function (v) { return v.toFixed(5); }).join(",");
    const consultaOsm = "[out:json][timeout:20];(" +
      'node["amenity"~"^(bench|drinking_water|water_point)$"](' + caixa + ");" +
      'node["bench"="yes"](' + caixa + ");" +
      'node["natural"="tree"](' + caixa + ");" +
      'way["natural"="tree_row"](' + caixa + ");" +
      'node["kerb"~"^(lowered|flush|raised)$"](' + caixa + ");" +
      'node["barrier"~"^(bollard|gate|turnstile|kissing_gate|stile|cycle_barrier|block|chain|kerb)$"](' + caixa + ");" +
      ");out geom;";
    const resposta = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: new URLSearchParams({ data: consultaOsm })
    });
    if (!resposta.ok) throw new Error("Overpass indisponível");
    const dados = await resposta.json();
    const grupos = { arvores: [], bancos: [], agua: [], rampas: [], obstaculos: [] };
    dados.elements.forEach(function (el) {
      const t = el.tags || {};
      if (el.type === "way") {
        (el.geometry || []).forEach(function (g) { grupos.arvores.push({ lat: g.lat, lon: g.lon }); });
        return;
      }
      const p = { lat: el.lat, lon: el.lon };
      if (t.natural === "tree") grupos.arvores.push(p);
      else if (t.amenity === "bench" || t.bench === "yes") grupos.bancos.push(p);
      else if (t.amenity === "drinking_water" || t.amenity === "water_point") grupos.agua.push(p);
      else if (t.kerb === "lowered" || t.kerb === "flush") grupos.rampas.push(p);
      else if (t.kerb === "raised" || t.barrier) grupos.obstaculos.push(p);
    });
    return grupos;
  }

  async function buscarElevacao(rotas, planos) {
    const total = planos.reduce(function (s, a) { return s + a.length; }, 0);
    const salto = Math.max(3, Math.ceil(total / 900));
    const fatias = planos.map(function (a) { return a.filter(function (_, i) { return i % salto === 0 || i === a.length - 1; }); });
    const shape = [].concat(...fatias).map(function (p) { return { lat: Number(p.lat.toFixed(6)), lon: Number(p.lon.toFixed(6)) }; });
    const espera = ultimaBusca + 1100 - Date.now();
    if (espera > 0) await new Promise(function (ok) { window.setTimeout(ok, espera); });
    ultimaBusca = Date.now();
    const resposta = await fetch("https://valhalla1.openstreetmap.de/height", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shape: shape })
    });
    if (!resposta.ok) throw new Error("Elevação indisponível");
    const alturas = (await resposta.json()).height || [];
    let inicio = 0;
    fatias.forEach(function (fatia, r) {
      let subida = 0, maxIncl = 0;
      for (let i = 1; i < fatia.length; i++) {
        const h0 = alturas[inicio + i - 1], h1 = alturas[inicio + i];
        if (h0 == null || h1 == null) continue;
        const dh = h1 - h0, dist = Math.hypot(fatia[i].x - fatia[i - 1].x, fatia[i].y - fatia[i - 1].y);
        if (dh > 0) subida += dh;
        if (dist >= 15) maxIncl = Math.max(maxIncl, Math.abs(dh) / dist * 100);
      }
      inicio += fatia.length;
      rotas[r].subida = Math.round(subida);
      rotas[r].inclinacao = Math.round(maxIncl);
    });
  }

  async function enriquecer(rotas) {
    const plano = projetor(rotas[0].pontos[0].lat);
    const planos = rotas.map(function (r) { return amostrar(r.pontos, plano, 10); });
    const [arredores, elevacao] = await Promise.allSettled([buscarArredores(rotas), buscarElevacao(rotas, planos)]);
    const falhas = [];
    if (elevacao.status === "rejected") falhas.push("a inclinação");
    if (arredores.status === "fulfilled") {
      const g = arredores.value;
      const proj = {};
      Object.keys(g).forEach(function (k) { proj[k] = g[k].map(plano); });
      rotas.forEach(function (r, i) {
        const amostras = planos[i];
        const conta = function (lista, raio) { return lista.filter(function (p) { return perto(p, amostras, raio); }).length; };
        r.bancos = conta(proj.bancos, 25);
        r.agua = conta(proj.agua, 40);
        r.rampas = conta(proj.rampas, 12);
        r.obstaculos = conta(proj.obstaculos, 8) + r.passos.filter(function (p) { return p.tipo === 40 || p.tipo === 41; }).length * 3;
        const sombreadas = amostras.filter(function (a) { return perto(a, proj.arvores, 12); }).length;
        r.sombra = amostras.length ? Math.round(sombreadas / amostras.length * 100) : 0;
      });
    } else {
      falhas.push("sombra, bancos, água, rampas e obstáculos");
    }
    return falhas;
  }

  /* Ordena: o critério escolhido pesa mais, e cada filtro marcado ajuda a desempatar. */
  function ordenar(rotas, ordem, filtros) {
    const criterios = {
      perfil: function (r) { return rotas.indexOf(r); },
      distancia: function (r) { return r.distancia; },
      rampa: function (r) { return r.rampas == null ? 0 : -r.rampas; },
      plano: function (r) { return r.subida == null ? 0 : r.subida + r.inclinacao * 4; },
      obstaculos: function (r) { return r.obstaculos == null ? 0 : r.obstaculos; },
      sombra: function (r) { return -(r.sombra || 0); },
      bancos: function (r) { return -(r.bancos || 0); },
      agua: function (r) { return -(r.agua || 0); }
    };
    function posicoes(criterio) {
      const lista = rotas.slice().sort(function (a, b) { return criterio(a) - criterio(b) || a.distancia - b.distancia; });
      return function (r) { return lista.indexOf(r); };
    }
    const principal = posicoes(criterios[ordem]);
    const extras = filtros.map(function (f) { return posicoes(criterios[f]); });
    const nota = new Map(rotas.map(function (r) {
      return [r, principal(r) * 3 + extras.reduce(function (s, pos) { return s + pos(r) * 0.75; }, 0)];
    }));
    return rotas.slice().sort(function (a, b) { return nota.get(a) - nota.get(b) || a.distancia - b.distancia; });
  }

  function mostrarDestaques(trajeto) {
    const filtros = filtrosMarcados(), ordem = ordemAtual();
    const itens = [];
    function add(icone, texto, destaque, alerta) { itens.push({ icone: icone, texto: texto, destaque: destaque, alerta: alerta }); }
    if (trajeto.subida != null) {
      add("⛰", trajeto.subida <= 5 ? "Quase plano" : "Sobe " + trajeto.subida + " m no total", ordem === "plano", trajeto.inclinacao > 8);
      if (trajeto.inclinacao) add("↗", "Inclinação máx. " + trajeto.inclinacao + "%", ordem === "plano", trajeto.inclinacao > 8);
    }
    if (trajeto.sombra != null) {
      add("🌳", trajeto.sombra ? "Sombra em ~" + trajeto.sombra + "% do caminho" : "Sem árvores mapeadas", filtros.includes("sombra"), false);
      add("🪑", trajeto.bancos ? trajeto.bancos + (trajeto.bancos > 1 ? " bancos" : " banco") : "Nenhum banco mapeado", filtros.includes("bancos"), false);
      add("💧", trajeto.agua ? trajeto.agua + (trajeto.agua > 1 ? " pontos de água" : " ponto de água") : "Sem água mapeada", filtros.includes("agua"), false);
      add("♿", trajeto.rampas + (trajeto.rampas === 1 ? " rampa mapeada" : " rampas mapeadas"), ordem === "rampa", false);
      add("⚠", trajeto.obstaculos ? trajeto.obstaculos + (trajeto.obstaculos > 1 ? " obstáculos" : " obstáculo") : "Sem obstáculos mapeados", ordem === "obstaculos", trajeto.obstaculos > 0);
    }
    $("rota-real-destaques").replaceChildren(...itens.map(function (item) {
      const li = document.createElement("li");
      if (item.destaque) li.classList.add("is-match");
      if (item.alerta) li.classList.add("is-warn");
      const icone = document.createElement("span");
      icone.className = "route-hl-icon";
      icone.setAttribute("aria-hidden", "true");
      icone.textContent = item.icone;
      li.append(icone, item.texto);
      return li;
    }));
  }

  function mostrarTrajeto(indice) {
    pararLeitura();
    const trajeto = trajetos[indice];
    $("rota-real-distancia").textContent = distanciaTexto(trajeto.distancia);
    $("rota-real-tempo").textContent = tempoTexto(trajeto.tempo);
    $("rota-real-chegada").textContent = "por volta das " + chegadaTexto(trajeto.tempo);
    mostrarDestaques(trajeto);
    $("rota-real-passos-resumo").textContent = resumoPassos(trajeto.passos);
    $("rota-real-passos").replaceChildren(...trajeto.passos.map(function (passo, i) {
      return criarPasso(passo, i, trajeto.passos.length);
    }));
    mostrarMapa(trajeto.pontos);
  }

  function mostrarResultado(todas, falhas) {
    const filtros = filtrosMarcados(), ordem = ordemAtual();
    const rotas = ordenar(todas, ordem, filtros);
    trajetos = rotas;
    $("rota-real-resultado-titulo").textContent =
      "De " + localSelecionado(origem).nome + " até " + localSelecionado(destino).nome;
    $("rota-real-resultado-perfil").textContent = [perfil.nome, ordem === "perfil" ? "sugerido para este perfil" : "ordenado por " + ORDENS[ordem]]
      .concat(filtros.map(function (f) { return FILTROS[f]; })).join(" · ");
    const nota = $("rota-real-destaques-nota");
    nota.hidden = false;
    nota.textContent = falhas && falhas.length
      ? "Não conseguimos consultar " + falhas.join(" e ") + " agora; a ordem usa os dados disponíveis."
      : "Contagens segundo o OpenStreetMap: o mapa pode não ter todos os bancos, árvores, bebedouros e rampas.";
    const avisos = $("rota-real-avisos");
    const bairroDosAvisos = ponta(origem).escolha?.bairroId;
    avisos.hidden = !bairroDosAvisos;
    if (bairroDosAvisos) {
      avisos.href = "bairro.html?" + new URLSearchParams({ bairro: bairroDosAvisos, mobilidade: "1" }) + "#lista-t";
    }
    alternativa.replaceChildren(...rotas.map(function (rota, i) {
      const nome = i === 0 ? "Recomendado" : "Opção " + (i + 1);
      return new Option(nome + " · " + distanciaTexto(rota.distancia) + " · " + tempoTexto(rota.tempo), String(i));
    }));
    $("rota-real-alternativas").hidden = rotas.length < 2;
    resultado.hidden = false;
    mostrarTrajeto(0);
    $("rota-real-resultado-titulo").focus();
    ZELA.anunciar("Trajeto pronto: " + distanciaTexto(rotas[0].distancia) + ", cerca de " + tempoTexto(rotas[0].tempo) + ".");
  }

  function estadoBusca(emBusca, texto) {
    buscar.setAttribute("aria-disabled", String(emBusca));
    mensagem.textContent = emBusca ? texto || "Buscando um trajeto…" : "";
  }

  function limparErroDestino() {
    if (!erroDestino.textContent) return;
    erroDestino.textContent = "";
    destino.removeAttribute("aria-invalid");
  }

  function redefinir() {
    preparando = null;
    if (consulta) consulta.abort();
    consulta = null;
    estadoBusca(false);
    erro.textContent = "";
    limparErroDestino();
    resultado.hidden = true;
    pararLeitura();
    pontas.forEach(atualizarPonta);
    $("rota-real-preferencia").textContent = perfis[perfil.value].dica;
    mostrarMapa([]);
  }

  function escolherLugar(lugar) {
    lugarEscolhido = lugar;
    const [a, b] = pontas, pontos = pontosDoBairro();
    if (lugar.tipo !== "bairro") definirPonta(a, lugar, true);
    else if (!a.editado && a.seletor.semRascunho()) definirPonta(a, pontos[0]);
    if (!b.editado && b.seletor.semRascunho()) {
      definirPonta(b, pontos.find(function (p) { return p.id !== a.escolha?.id; }));
    }
    redefinir();
    if (lugar.tipo === "cep") resolverPonta(a);
  }

  /* ---------- Eventos ---------- */
  $("rota-real-inverter").addEventListener("click", function () {
    const [a, b] = pontas;
    for (const p of pontas) {
      if (!p.seletor.semRascunho()) { p.seletor.confirmar(); return; }
    }
    [a.escolha, b.escolha] = [b.escolha, a.escolha];
    [a.local, b.local] = [b.local, a.local];
    pontas.forEach(function (p) {
      p.pendente = null;
      p.editado = true;
      p.seletor.definir(p.escolha);
    });
    redefinir();
    ZELA.anunciar("Saída e destino invertidos.");
  });

  form.addEventListener("change", function (event) {
    if (event.target.matches('input[type="checkbox"], input[type="radio"]')) redefinir();
  });
  alternativa.addEventListener("change", function () {
    const indice = Number(alternativa.value);
    mostrarTrajeto(indice);
    ZELA.anunciar(alternativa.selectedOptions[0].textContent + ". Instruções atualizadas.");
  });

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    if (consulta || preparando) return;
    if (!pontas.every(function (p) { return p.seletor.confirmar(); })) return;
    erro.textContent = "";
    limparErroDestino();
    // Localiza os endereços por CEP ou GPS que ainda não foram encontrados.
    const etapa = Symbol("endereços");
    preparando = etapa;
    estadoBusca(true, "Localizando os endereços…");
    const encontrados = [];
    for (const p of pontas) {
      const local = await resolverPonta(p);
      if (preparando !== etapa) return;
      if (!local) {
        preparando = null;
        estadoBusca(false);
        p.campo.focus();
        return;
      }
      encontrados.push(local);
    }
    preparando = null;
    estadoBusca(false);

    const [saida, chegada] = encontrados;
    const linhaReta = distanciaKm(saida, chegada);
    if (linhaReta < 0.03) {
      erroDestino.textContent = "A saída e o destino ficam no mesmo lugar. Escolha outro destino.";
      destino.setAttribute("aria-invalid", "true");
      destino.focus();
      return;
    }
    if (linhaReta > DISTANCIA_MAXIMA_KM) {
      erro.textContent = "Os dois pontos estão a " + km.format(linhaReta) + " km em linha reta. Para trajetos a pé, escolha pontos a até " +
        DISTANCIA_MAXIMA_KM + " km de distância.";
      return;
    }

    const chave = [saida.lat, saida.lon, chegada.lat, chegada.lon].map(function (n) { return n.toFixed(5); }).concat(perfil.value, ordemAtual()).join("|");
    if (cache.has(chave)) {
      const salvo = cache.get(chave);
      mostrarResultado(salvo.rotas, salvo.falhas);
      return;
    }
    if (Date.now() - ultimaBusca < 1100) {
      erro.textContent = "Aguarde um instante e tente buscar de novo.";
      return;
    }

    const parametros = {
      locations: [saida, chegada].map(function (local) {
        return { lat: local.lat, lon: local.lon };
      }),
      costing: "pedestrian",
      costing_options: { pedestrian: opcoesCalculo() },
      units: "kilometers",
      language: "pt-BR",
      alternates: 2
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
      window.clearTimeout(prazo);
      estadoBusca(true, "Analisando inclinação, sombra, bancos e rampas no caminho…");
      let falhas;
      try {
        falhas = await enriquecer(rotas);
      } catch (e) {
        falhas = ["inclinação, sombra, bancos, água, rampas e obstáculos"];
      }
      if (consulta !== controlador) return;
      cache.set(chave, { rotas: rotas, falhas: falhas });
      mostrarResultado(rotas, falhas);
    } catch (falhaBusca) {
      if (consulta !== controlador) return;
      erro.textContent = "Não foi possível buscar o trajeto agora. Tente novamente em instantes.";
    } finally {
      window.clearTimeout(prazo);
      if (consulta === controlador) {
        consulta = null;
        estadoBusca(false);
      }
    }
  });

  /* Início: aceita ?bairro=, ?origem=, ?destino= e ?cep_de= / ?cep_para= (com ?num_de= / ?num_para=). */
  const parametros = new URLSearchParams(location.search);
  const regiaoInicial = ZELA.bairroPreferido.exemplo(parametros.get("bairro")) || ZELA.bairroPreferido.atual();
  lugarEscolhido = regiaoInicial;
  const pontosIniciais = pontosDoBairro();
  pontas.forEach(function (p, i) {
    p.seletor = ZELA.iniciarCampoLocal({
      campo: p.campo.id, status: p.campo.id + "-status", erro: p.campo.id + "-erro",
      sugestoes: sugestoesPonta,
      aoEditar: function () {
        p.pendente = null;
        p.msg.textContent = "";
        limparErroDestino();
        if (consulta || preparando || !resultado.hidden) redefinir();
      },
      escolher: function (lugar) {
        definirPonta(p, lugar, true);
        redefinir();
        if (!p.local) resolverPonta(p);
      }
    });
    const pontaUrl = i === 0 ? "de" : "para";
    const digitos = (parametros.get("cep_" + pontaUrl) || "").replace(/\D/g, "");
    if (digitos.length === 8) {
      const numero = (parametros.get("num_" + pontaUrl) || "").replace(/\D/g, "").slice(0, 6);
      definirPonta(p, { tipo: "cep", cep: digitos, numero: numero, nome: "CEP " + formatarCep(digitos) }, true);
      return;
    }
    const id = parametros.get(i === 0 ? "origem" : "destino");
    const enviado = pontosIniciais.find(function (l) { return l.id === id; });
    const padrao = pontosIniciais.find(function (l) { return i === 0 || l.id !== pontas[0].escolha?.id; });
    definirPonta(p, enviado || padrao, Boolean(enviado));
  });
  redefinir();
  ZELA.iniciarBuscaRota({
    regiaoInicial: regiaoInicial,
    distanciaKm: distanciaKm,
    escolher: escolherLugar
  });
  pontas.forEach(function (p) {
    if (p.escolha?.tipo === "cep") resolverPonta(p);
  });
})();
