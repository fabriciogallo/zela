/* Une os exemplos aos relatos deste aparelho, sem alterar os registros guardados. */
(function () {
  "use strict";
  function normalizar(texto) {
    return typeof texto === "string" ? texto.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").toLowerCase() : "";
  }
  function regiao(valor) {
    if (!valor || typeof valor.nome !== "string" || typeof valor.cidade !== "string" || !valor.nome.trim() || !valor.cidade.trim()) return null;
    const nome = valor.nome.trim().slice(0, 160), cidade = valor.cidade.trim().slice(0, 160);
    const id = normalizar(cidade) === "sao paulo" ? Object.keys(ZELA.bairros).find(function (chave) {
      return normalizar(ZELA.bairros[chave]) === normalizar(nome);
    }) : undefined;
    return { tipo: "bairro", nome: nome, cidade: cidade, estado: typeof valor.estado === "string" ? valor.estado.trim().slice(0, 60) : "", bairroId: id };
  }
  function regiaoDoEndereco(endereco) {
    if (typeof endereco !== "string") return null;
    const partes = endereco.split(/\s+[—–]\s+/).map(function (s) { return s.trim(); }).filter(Boolean);
    if (partes.length < 3) return null;
    const final = partes[partes.length - 1].match(/^(.*?)(?:\/([a-z]{2}))?$/i);
    return regiao({ nome: partes[partes.length - 2], cidade: final[1], estado: final[2] || "" });
  }
  function todos() {
    const protocolos = ZELA.store.get("protocolos", {});
    const locais = Object.keys(protocolos || {}).filter(function (id) {
      const p = protocolos[id];
      return ZELA.formatoProtocolo.test(id) && p && typeof p.titulo === "string" && typeof p.local === "string";
    }).map(function (id) {
      const p = protocolos[id], criado = Date.parse(p.criadoEm);
      const dias = Number.isFinite(criado) ? Math.max(0, Math.floor((Date.now() - criado) / 86400000)) : Math.max(0, Number(p.dias) || 0);
      return {
        id: "local-" + id, protocolo: id, doAparelho: true,
        regiao: regiao(p.bairro) || regiaoDoEndereco(p.local),
        cat: p.cat, titulo: p.titulo, local: p.local, status: ZELA.etapas[p.atual]?.nome || "Recebido",
        apoios: Number.isFinite(p.apoios) ? Math.max(0, p.apoios) : 1, dias: dias, risco: p.risco === true
      };
    });
    const idsLocais = new Set(locais.map(function (a) { return a.protocolo; }));
    const decisoes = ZELA.store.get("avaliacoes", {});
    return ZELA.avisos.filter(function (a) { return !idsLocais.has(a.protocolo); }).map(function (a) {
      const p = (ZELA.protocolos || {})[a.protocolo];
      return Object.assign({}, a, { id: String(a.id), status: ZELA.etapas[p?.atual]?.nome || a.status, dias: p?.dias ?? a.dias });
    }).concat(locais).map(function (a) {
      const decisao = decisoes[a.protocolo];
      if (!decisao || !["confirmado", "reaberto"].includes(decisao.situacao)) return a;
      return Object.assign({}, a, { status: decisao.situacao === "confirmado" ? "Resolvido" : "Recebido", avaliacao: decisao.situacao, reaberto: decisao.situacao === "reaberto" });
    });
  }

  function apoiados() {
    const conta = ZELA.conta?.atual();
    return conta ? conta.apoios || {} : ZELA.store.get("apoiados", {});
  }
  function totalApoios(aviso) {
    const contas = ZELA.store.get("contas", {});
    const votos = Object.values(contas).filter(function (c) { return c?.apoios?.[aviso.id]; }).length;
    // Apoios antigos do aparelho podem ser espelhos de uma conta: conte-os uma vez.
    const anonimo = !votos && ZELA.store.get("apoiados", {})[aviso.id] ? 1 : 0;
    return aviso.apoios + votos + anonimo;
  }
  function protocolo(id) {
    const base = ZELA.store.get("protocolos", {})[id] || (ZELA.protocolos || {})[id];
    if (!base) return null;
    const aviso = todos().find(function (a) { return a.protocolo === id; });
    if (!aviso) return Object.assign({}, base);
    const atual = ZELA.etapas.findIndex(function (e) { return e.nome === aviso.status; });
    const datas = (base.datas || []).slice();
    const decisao = ZELA.store.get("avaliacoes", {})[id];
    if (decisao) {
      if (aviso.reaberto) { datas.splice(0, datas.length, "Reaberto pelo morador", "Aguardando novo encaminhamento", "—", "—"); }
      else datas[3] = "Confirmado pelo morador";
    }
    return Object.assign({}, base, { atual: Math.max(0, atual), dias: aviso.dias, apoios: totalApoios(aviso), datas: datas, avaliacao: aviso.avaliacao });
  }
  function endereco(valor) {
    const partes = normalizar(valor).split(/\s+[—–]\s+/)[0].split(",");
    const fim = partes[0].match(/^(.*\s\S+)\s+(\d+[a-z]?)$/);
    return { rua: (fim ? fim[1] : partes[0]).trim(), numero: partes[1]?.trim().match(/^\d+[a-z]?\b/)?.[0] || fim?.[2] || "" };
  }
  ZELA.mural = {
    regiao: regiao,
    regiaoDoEndereco: regiaoDoEndereco,
    todos: todos,
    protocolo: protocolo,
    apoiados: apoiados,
    totalApoios: totalApoios,
    apoiar: function (id, ligado) {
      const aviso = todos().find(function (a) { return a.id === String(id); });
      if (!aviso || aviso.status === "Resolvido") return false;
      if (ZELA.conta?.atual()) return ZELA.conta.marcarApoio(aviso.id, ligado);
      const votos = Object.assign({}, apoiados());
      if (ligado) votos[aviso.id] = true; else delete votos[aviso.id];
      return ZELA.store.set("apoiados", votos);
    },
    avaliar: function (id, resolvido) {
      const aviso = todos().find(function (a) { return a.protocolo === id; });
      if (!aviso || aviso.status !== "Resolvido" || aviso.avaliacao === "confirmado" || typeof resolvido !== "boolean") return false;
      const decisoes = Object.assign({}, ZELA.store.get("avaliacoes", {}));
      decisoes[id] = { situacao: resolvido ? "confirmado" : "reaberto", quando: new Date().toISOString() };
      return ZELA.store.set("avaliacoes", decisoes);
    },
    possivelRepetido: function (cat, local, lugar) {
      const alvo = endereco(local);
      if (alvo.rua.length < 4) return null;
      return this.doBairro(lugar).find(function (a) {
        const outro = endereco(a.local);
        return a.protocolo && a.cat === cat && a.status !== "Resolvido" && outro.rua === alvo.rua &&
          (!alvo.numero || !outro.numero || alvo.numero === outro.numero);
      }) || null;
    },
    encontrar: function (id) { return todos().find(function (a) { return a.id === String(id); }); },
    linkBairro: function (protocolo) {
      const aviso = todos().find(function (a) { return a.protocolo === protocolo; });
      if (!aviso) return null;
      const area = aviso.regiao || regiao({ nome: ZELA.bairros[aviso.bairro], cidade: "São Paulo", estado: "SP" });
      if (!area) return null;
      return "bairro.html?" + new URLSearchParams({ bairro_nome: area.nome, cidade: area.cidade, estado: area.estado }) + "#aviso-" + aviso.id;
    },
    doBairro: function (lugar) {
      const alvo = regiao(lugar);
      if (!alvo) return [];
      return todos().filter(function (a) {
        if (!a.doAparelho) return alvo.bairroId && a.bairro === alvo.bairroId;
        return a.regiao && normalizar(a.regiao.nome) === normalizar(alvo.nome) && normalizar(a.regiao.cidade) === normalizar(alvo.cidade);
      });
    }
  };
})();
