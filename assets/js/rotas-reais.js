/* Zela — consulta de trajetos reais (Valhalla + OpenStreetMap).
   O bairro pode ser buscado pelo CEP. Saída e destino podem ser pontos
   públicos, endereços pelo CEP ou a localização atual do aparelho. */
(function () {
  "use strict";

  const $ = function (id) { return document.getElementById(id); };
  const form = $("rota-real-form");
  const bairro = $("rota-real-bairro");
  const camposRota = $("rota-real-campos");
  const cepBairro = {
    caixa: $("rota-real-bairro-cep"),
    campo: $("rota-real-bairro-cep-valor"),
    botao: $("rota-real-bairro-localizar"),
    erro: $("rota-real-bairro-cep-erro"),
    mensagem: $("rota-real-bairro-msg")
  };
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
  function ordemAtual() { return marcado("ordem-real") || "distancia"; }
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
  const CEP = "__cep";
  const GPS = "__gps";
  const DISTANCIA_MAXIMA_KM = 15;
  const km = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
  const cache = new Map();
  const ceps = new Map();
  let bairroLocalizado = null;
  let consultaBairro = null;
  let consulta = null;
  let ocupado = false;
  let versaoCampos = 0;
  let ultimaBusca = 0;
  let trajetos = [];

  /* Cada ponta do trajeto (saída e destino) guarda o endereço já localizado. */
  const pontas = [origem, destino].map(function (campo) {
    const id = campo.id;
    return {
      campo: campo,
      caixa: $(id + "-cep"),
      cep: $(id + "-cep-valor"),
      numero: $(id + "-numero"),
      botao: $(id + "-localizar"),
      erro: $(id + "-erro"),
      msg: $(id + "-msg"),
      local: null,
      pendente: null,
      chavePendente: ""
    };
  });
  function ponta(campo) { return campo === origem ? pontas[0] : pontas[1]; }
  function especial(valor) { return valor === CEP || valor === GPS; }

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

  function idBairro() { return bairro.value === CEP ? bairroLocalizado?.id : bairro.value; }
  function aguardandoBairro() { return bairro.value === CEP && !bairroLocalizado; }
  function locais() { return ZELA.locaisRota[idBairro()] || []; }

  function localSelecionado(campo) {
    if (aguardandoBairro()) return null;
    if (especial(campo.value)) {
      const p = ponta(campo);
      return p.local && p.local.tipo === campo.value && (campo.value === GPS || p.local.chave === chaveCep(p)) ? p.local : null;
    }
    return locais().find(function (local) { return local.id === campo.value; }) || null;
  }

  function preencherLocais(saida, chegada) {
    const pontos = locais();
    [origem, destino].forEach(function (campo) {
      const outros = document.createElement("optgroup");
      outros.label = "Outro lugar";
      outros.append(new Option("Endereço pelo CEP…", CEP), new Option("Minha localização atual", GPS));
      campo.replaceChildren(...pontos.map(function (local) {
        return new Option(local.nome, local.id);
      }), outros);
    });
    const valido = function (v) { return especial(v) || pontos.some(function (local) { return local.id === v; }); };
    origem.value = valido(saida) ? saida : (pontos[0]?.id || CEP);
    destino.value = valido(chegada) && (especial(chegada) || chegada !== origem.value) ? chegada :
      (pontos.find(function (local) { return local.id !== origem.value; })?.id || CEP);
  }

  /* ---------- Geocodificação ---------- */
  function distanciaKm(a, b) {
    const rad = Math.PI / 180;
    const dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
    return 12742 * Math.asin(Math.sqrt(h));
  }

  function formatarCep(digitos) {
    return digitos.length > 5 ? digitos.slice(0, 5) + "-" + digitos.slice(5) : digitos;
  }

  async function consultarCep(digitos, signal) {
    if (digitos.length !== 8) throw falha("Digite os 8 números do CEP, como em 04913-000.");
    if (ceps.has(digitos)) return ceps.get(digitos);
    const resposta = await fetch("https://viacep.com.br/ws/" + digitos + "/json/", { signal: signal });
    if (!resposta.ok) throw new Error("ViaCEP indisponível");
    const endereco = await resposta.json();
    if (endereco.erro) throw falha("Não encontramos o CEP " + formatarCep(digitos) + ". Confira os números.");
    ceps.set(digitos, endereco);
    return endereco;
  }

  function normalizarNome(nome) {
    return nome.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  }

  function limparBuscaBairro() {
    if (consultaBairro) consultaBairro.abort();
    consultaBairro = null;
    bairroLocalizado = null;
    cepBairro.botao.removeAttribute("aria-disabled");
    cepBairro.campo.removeAttribute("aria-invalid");
    cepBairro.erro.textContent = "";
    cepBairro.mensagem.textContent = "";
  }

  async function buscarBairro() {
    if (consultaBairro || !aguardandoBairro()) return;
    const digitos = cepBairro.campo.value.replace(/\D/g, "");
    cepBairro.erro.textContent = "";
    cepBairro.campo.removeAttribute("aria-invalid");
    if (digitos.length !== 8) {
      cepBairro.erro.textContent = "Digite os 8 números do CEP, como em 04913-000.";
      cepBairro.campo.setAttribute("aria-invalid", "true");
      cepBairro.campo.focus();
      return;
    }

    const controlador = new AbortController();
    consultaBairro = controlador;
    cepBairro.botao.setAttribute("aria-disabled", "true");
    cepBairro.mensagem.textContent = "Buscando o bairro…";
    const prazo = window.setTimeout(function () { controlador.abort(); }, 10000);
    try {
      const endereco = await consultarCep(digitos, controlador.signal);
      if (consultaBairro !== controlador) return;
      const nome = endereco.bairro?.trim();
      if (!nome) throw falha("Esse CEP não informa um bairro. Tente o CEP de uma rua do bairro.");

      const saoPaulo = endereco.uf === "SP" && normalizarNome(endereco.localidade || "") === "sao paulo";
      const id = saoPaulo && Object.keys(ZELA.bairros).find(function (chave) {
        return normalizarNome(ZELA.bairros[chave]) === normalizarNome(nome);
      });
      bairroLocalizado = { id: id || null };
      preencherLocais();
      const lugar = nome + ", " + endereco.localidade + "/" + endereco.uf;
      if (id) {
        ZELA.store.set("bairro", id);
        cepBairro.mensagem.textContent = "Bairro encontrado: " + lugar + ". Escolha a saída e o destino.";
      } else {
        const saida = pontas[0];
        saida.cep.value = formatarCep(digitos);
        saida.numero.value = "";
        saida.erro.textContent = "";
        saida.cep.removeAttribute("aria-invalid");
        cepBairro.mensagem.textContent = "Bairro encontrado: " + lugar +
          ". Sugerimos esse CEP na saída. Informe o destino para continuar.";
      }
      redefinir();
    } catch (e) {
      if (consultaBairro !== controlador) return;
      cepBairro.mensagem.textContent = "";
      cepBairro.erro.textContent = e.amigavel ? e.message : "Não conseguimos buscar o bairro agora. Tente novamente em instantes.";
      if (e.amigavel) cepBairro.campo.setAttribute("aria-invalid", "true");
    } finally {
      window.clearTimeout(prazo);
      if (consultaBairro === controlador) {
        consultaBairro = null;
        cepBairro.botao.removeAttribute("aria-disabled");
      }
    }
  }

  function chaveCep(p) {
    return p.cep.value.replace(/\D/g, "") + "|" + p.numero.value.replace(/\D/g, "");
  }

  // O Nominatim pede no máximo uma consulta por segundo.
  let ultimaNominatim = 0;
  async function nominatim(caminho, parametros) {
    const espera = ultimaNominatim + 1100 - Date.now();
    if (espera > 0) await new Promise(function (ok) { window.setTimeout(ok, espera); });
    ultimaNominatim = Date.now();
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

  async function localizarCep(p) {
    const digitos = p.cep.value.replace(/\D/g, "");
    const numero = p.numero.value.replace(/\D/g, "");
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
      rua: numero ? " Não achamos o número no mapa: usamos o meio da rua." : " Posição aproximada: meio da rua. Informe o número para mais precisão.",
      cep: " Posição aproximada pelo CEP.",
      bairro: " Posição aproximada: centro do bairro."
    }[nivel];
    return {
      tipo: CEP,
      chave: digitos + "|" + numero,
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
        tipo: GPS,
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
    const tipo = p.campo.value;
    if (!especial(tipo)) return localSelecionado(p.campo);
    const pronto = localSelecionado(p.campo);
    if (pronto && (tipo === CEP || Date.now() - pronto.quando < 120000)) return pronto;

    const chave = tipo === CEP ? chaveCep(p) : GPS;
    if (!p.pendente || p.chavePendente !== chave) {
      p.chavePendente = chave;
      p.pendente = tipo === CEP ? localizarCep(p) : localizarGps();
    }
    const pendente = p.pendente;
    p.erro.textContent = "";
    p.cep.removeAttribute("aria-invalid");
    p.botao.setAttribute("aria-disabled", "true");
    p.msg.textContent = tipo === GPS ? "Procurando sua localização…" : "Buscando o endereço…";
    try {
      const local = await pendente;
      local.quando = Date.now();
      if (p.campo.value !== tipo || (tipo === CEP && chaveCep(p) !== local.chave)) return null;
      p.local = local;
      p.msg.textContent = local.descricao;
      if (resultado.hidden) mostrarMapa([]);
      return local;
    } catch (e) {
      if (p.campo.value !== tipo) return null;
      p.msg.textContent = "";
      p.erro.textContent = e.amigavel ? e.message : "Não conseguimos localizar agora (sem internet?). Tente de novo ou escolha um ponto do bairro.";
      if (tipo === CEP) p.cep.setAttribute("aria-invalid", "true");
      return null;
    } finally {
      if (p.pendente === pendente) { p.pendente = null; p.chavePendente = ""; }
      p.botao.removeAttribute("aria-disabled");
    }
  }

  function atualizarPonta(p) {
    const tipo = p.campo.value;
    p.caixa.hidden = tipo !== CEP;
    const local = localSelecionado(p.campo);
    if (!especial(tipo)) {
      p.erro.textContent = "";
      p.msg.textContent = "";
    } else if (local) {
      p.msg.textContent = local.descricao;
    } else if (!p.pendente) {
      p.msg.textContent = tipo === CEP ? "Digite o CEP para localizar o endereço." : "";
    }
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
    const centro = saida || chegada || ZELA.centros[idBairro()];
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
    $("rota-real-resultado-perfil").textContent = [perfil.nome, "ordenado por " + ORDENS[ordem]]
      .concat(filtros.map(function (f) { return FILTROS[f]; })).join(" · ");
    const nota = $("rota-real-destaques-nota");
    nota.hidden = false;
    nota.textContent = falhas && falhas.length
      ? "Não conseguimos consultar " + falhas.join(" e ") + " agora; a ordem usa os dados disponíveis."
      : "Contagens segundo o OpenStreetMap: o mapa pode não ter todos os bancos, árvores, bebedouros e rampas.";
    const avisos = $("rota-real-avisos");
    const bairroDosAvisos = idBairro();
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

  function redefinir() {
    versaoCampos++;
    if (consulta) consulta.abort();
    consulta = null;
    estadoBusca(false);
    erro.textContent = "";
    erroDestino.textContent = "";
    cepBairro.caixa.hidden = bairro.value !== CEP;
    camposRota.hidden = aguardandoBairro();
    destino.removeAttribute("aria-invalid");
    resultado.hidden = true;
    pararLeitura();
    [origem, destino].forEach(function (campo) {
      $(campo.id + "-texto").textContent = campo.selectedOptions[0].textContent;
    });
    pontas.forEach(atualizarPonta);
    $("rota-real-preferencia").textContent = perfis[perfil.value].dica;
    mostrarMapa([]);
  }

  /* ---------- Eventos ---------- */
  cepBairro.botao.addEventListener("click", buscarBairro);
  cepBairro.campo.addEventListener("input", function () {
    cepBairro.campo.value = formatarCep(cepBairro.campo.value.replace(/\D/g, "").slice(0, 8));
    const estavaLocalizado = Boolean(bairroLocalizado);
    limparBuscaBairro();
    if (estavaLocalizado) redefinir();
  });
  cepBairro.campo.addEventListener("keydown", function (event) {
    if (event.key !== "Enter" || event.isComposing) return;
    event.preventDefault();
    buscarBairro();
  });

  pontas.forEach(function (p) {
    p.cep.addEventListener("input", function () {
      const digitos = p.cep.value.replace(/\D/g, "").slice(0, 8);
      p.cep.value = formatarCep(digitos);
      p.erro.textContent = "";
      p.cep.removeAttribute("aria-invalid");
      if (digitos.length === 8) resolverPonta(p);
    });
    p.numero.addEventListener("input", function () {
      p.numero.value = p.numero.value.replace(/\D/g, "");
    });
    p.numero.addEventListener("change", function () {
      if (p.cep.value.replace(/\D/g, "").length === 8) resolverPonta(p);
    });
    p.botao.addEventListener("click", function () {
      if (p.botao.getAttribute("aria-disabled") !== "true") resolverPonta(p);
    });
    p.campo.addEventListener("change", function () {
      if (p.campo.value === GPS) resolverPonta(p);
    });
  });

  $("rota-real-inverter").addEventListener("click", function () {
    const [a, b] = pontas;
    const valor = origem.value;
    origem.value = destino.value;
    destino.value = valor;
    [a.local, b.local] = [b.local, a.local];
    [a.cep.value, b.cep.value] = [b.cep.value, a.cep.value];
    [a.numero.value, b.numero.value] = [b.numero.value, a.numero.value];
    [a.erro.textContent, b.erro.textContent] = ["", ""];
    redefinir();
    ZELA.anunciar("Invertido. Saindo de " + origem.selectedOptions[0].textContent + ", indo para " + destino.selectedOptions[0].textContent + ".");
  });

  form.addEventListener("change", function (event) {
    if (event.target === cepBairro.campo) return;
    if (event.target === bairro) {
      limparBuscaBairro();
      if (bairro.value !== CEP) {
        preencherLocais(origem.value, destino.value);
        ZELA.store.set("bairro", bairro.value);
      }
    }
    redefinir();
  });
  alternativa.addEventListener("change", function () {
    const indice = Number(alternativa.value);
    mostrarTrajeto(indice);
    ZELA.anunciar(alternativa.selectedOptions[0].textContent + ". Instruções atualizadas.");
  });

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    if (consulta || ocupado) return;
    if (aguardandoBairro()) {
      buscarBairro();
      return;
    }
    erro.textContent = "";
    erroDestino.textContent = "";
    destino.removeAttribute("aria-invalid");
    if (origem.value === destino.value && !especial(origem.value)) {
      erroDestino.textContent = "Escolha um destino diferente do ponto de saída.";
      destino.setAttribute("aria-invalid", "true");
      destino.focus();
      return;
    }

    // Localiza os endereços por CEP ou GPS que ainda não foram encontrados.
    ocupado = true;
    const versao = versaoCampos;
    estadoBusca(true, "Localizando os endereços…");
    const encontrados = [];
    for (const p of pontas) {
      const local = await resolverPonta(p);
      if (versao !== versaoCampos) {
        ocupado = false;
        return;
      }
      if (!local) {
        ocupado = false;
        estadoBusca(false);
        (p.campo.value === CEP ? p.cep : p.campo).focus();
        return;
      }
      encontrados.push(local);
    }
    ocupado = false;
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
  const bairroInicial = parametros.get("bairro") || ZELA.store.get("bairro", "angela");
  bairro.value = Object.hasOwn(ZELA.locaisRota, bairroInicial) ? bairroInicial : "angela";
  const cepInicial = { de: parametros.get("cep_de"), para: parametros.get("cep_para") };
  preencherLocais(cepInicial.de ? CEP : parametros.get("origem"), cepInicial.para ? CEP : parametros.get("destino"));
  [["de", pontas[0]], ["para", pontas[1]]].forEach(function (par) {
    const digitos = (cepInicial[par[0]] || "").replace(/\D/g, "").slice(0, 8);
    if (!digitos) return;
    par[1].campo.value = CEP;
    par[1].cep.value = formatarCep(digitos);
    par[1].numero.value = (parametros.get("num_" + par[0]) || "").replace(/\D/g, "").slice(0, 6);
  });
  redefinir();
  pontas.forEach(function (p) {
    if (p.campo.value === CEP && p.cep.value.replace(/\D/g, "").length === 8) resolverPonta(p);
  });
})();
