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
    return ZELA.avisos.filter(function (a) { return !idsLocais.has(a.protocolo); }).map(function (a) {
      return Object.assign({}, a, { id: String(a.id) });
    }).concat(locais);
  }
  ZELA.mural = {
    regiao: regiao,
    regiaoDoEndereco: regiaoDoEndereco,
    todos: todos,
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
