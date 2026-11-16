/* Zela — dados simulados do protótipo.
   Em produção, estes dados viriam de uma API (ex.: GET /avisos?bairro=angela). */
window.ZELA = window.ZELA || {};

ZELA.categorias = [
  { id: "buraco",  nome: "Buraco na rua",    titulo: "Buraco na rua",    desc: "Asfalto afundado, cratera ou tampa de bueiro solta.", orgao: "Subprefeitura" },
  { id: "luz",     nome: "Poste apagado",    titulo: "Poste apagado",    desc: "Lâmpada queimada, piscando ou acesa de dia.",       orgao: "Iluminação pública" },
  { id: "lixo",    nome: "Entulho ou descarte irregular",  titulo: "Lixo e entulho",   desc: "Descarte irregular ou coleta que não passou.",      orgao: "Serviço de limpeza" },
  { id: "calcada", nome: "Calçada quebrada", titulo: "Calçada quebrada", desc: "Piso solto, degrau perigoso ou rampa bloqueada.",   orgao: "Subprefeitura" },
  { id: "arvore",  nome: "Árvore ou poda",   titulo: "Árvore e poda",    desc: "Galho caído, risco de queda ou poda pedida.",       orgao: "Subprefeitura" },
  { id: "bueiro",  nome: "Bueiro entupido ou alagamento", titulo: "Bueiro e alagamento", desc: "Boca de lobo entupida, água parada na rua.", orgao: "Subprefeitura" },
  { id: "mato",    nome: "Mato alto ou terreno sujo", titulo: "Mato alto", desc: "Praça, canteiro ou terreno sem limpeza.", orgao: "Subprefeitura" },
  { id: "sinal",   nome: "Placa ou semáforo com defeito", titulo: "Sinalização", desc: "Sinalização apagada, caída ou pichada.", orgao: "CET" },
  { id: "outro",   nome: "Outro problema",   titulo: "Outro problema",   desc: "Sinalização, praça, ponto de ônibus e mais.",       orgao: "Central de atendimento" }
];

/* Ícones (paths em viewBox 0 0 40 40), desenhados como blocos sólidos */
ZELA.icones = {
  buraco:  "M4 24c0-5 7-9 16-9s16 4 16 9-7 9-16 9S4 29 4 24zm7 0c0 2.5 4 4.5 9 4.5s9-2 9-4.5-4-4.5-9-4.5-9 2-9 4.5z",
  luz:     "M20 5a10 10 0 0 1 6 18v4H14v-4A10 10 0 0 1 20 5zM15 29h10v3H15zm2 4h6v3h-6z",
  lixo:    "M16 5h8v3h7v4H9V8h7zM11 14h18l-2 21H13z",
  calcada: "M5 9h14v9H5zm16 0h14v9H21zM5 21h9v10H5zm11 3h19v7H16z",
  arvore:  "M20 4a11 11 0 0 1 3 21.6V36h-6V25.6A11 11 0 0 1 20 4z",
  outro:   "M9 9h6v6H9zm8 0h6v6h-6zm8 0h6v6h-6zM9 17h6v6H9zm8 0h6v6h-6zm8 0h6v6h-6zM9 25h6v6H9zm8 0h6v6h-6zm8 0h6v6h-6z"
};

ZELA.bairros = {
  angela:     "Jardim Ângela",
  grajau:     "Grajaú",
  tiradentes: "Cidade Tiradentes"
};

/* Centro de cada bairro no mapa real (OpenStreetMap): perto do terminal de ônibus */
ZELA.centros = {
  angela:     { lat: -23.6905, lon: -46.7739 },
  grajau:     { lat: -23.7372, lon: -46.6973 },
  tiradentes: { lat: -23.5832, lon: -46.4079 }
};

/* Avisos abertos por bairro (mapa e listas). x/y = posição no mapa em % */
ZELA.avisos = [
  { id: 1,  bairro: "angela", cat: "luz",     titulo: "Poste apagado há 9 dias",          local: "Rua das Palmeiras, 140", status: "Encaminhado", apoios: 23, dias: 9,  risco: true,  x: 22, y: 28, protocolo: "ZL-2026-04790" },
  { id: 2,  bairro: "angela", cat: "calcada", titulo: "Calçada quebrada em frente à UBS", local: "Avenida Central, 980",   status: "Recebido",    apoios: 8,  dias: 3,  risco: true,  x: 62, y: 24 },
  { id: 3,  bairro: "angela", cat: "lixo",    titulo: "Entulho na esquina da escola",     local: "Rua Ipê Roxo, 33",       status: "Em execução", apoios: 15, dias: 6,  risco: false, x: 44, y: 58, protocolo: "ZL-2026-05102" },
  { id: 4,  bairro: "angela", cat: "buraco",  titulo: "Buraco perto da creche",           local: "Rua Jatobá, 18",         status: "Encaminhado", apoios: 11, dias: 5,  risco: true,  x: 78, y: 46 },
  { id: 5,  bairro: "angela", cat: "arvore",  titulo: "Galho pendurado na fiação",        local: "Rua Sabiá, 90",          status: "Recebido",    apoios: 4,  dias: 2,  risco: true,  x: 28, y: 76 },
  { id: 6,  bairro: "angela", cat: "outro",   titulo: "Lixeira da praça quebrada",        local: "Praça da Paz",           status: "Resolvido",   apoios: 7,  dias: 14, risco: false, x: 64, y: 84 },
  { id: 7,  bairro: "grajau", cat: "buraco",  titulo: "Buraco no ponto de ônibus",        local: "Rua do Lago, 512",       status: "Em execução", apoios: 31, dias: 18, risco: true,  x: 30, y: 40, protocolo: "ZL-2026-04817" },
  { id: 8,  bairro: "grajau", cat: "arvore",  titulo: "Galho caído sobre a fiação",       local: "Rua Sabiá, 77",          status: "Encaminhado", apoios: 12, dias: 4,  risco: true,  x: 70, y: 30 },
  { id: 9,  bairro: "grajau", cat: "luz",     titulo: "Praça sem luz à noite",            local: "Praça das Flores",       status: "Resolvido",   apoios: 19, dias: 12, risco: false, x: 50, y: 70, protocolo: "ZL-2026-03991" },
  { id: 10, bairro: "tiradentes", cat: "calcada", titulo: "Rampa de acesso bloqueada",    local: "Rua Aurora, 210",        status: "Recebido",    apoios: 6,  dias: 2,  risco: true,  x: 35, y: 30 },
  { id: 11, bairro: "tiradentes", cat: "lixo",    titulo: "Coleta de lixo não passou",    local: "Rua Horizonte, 45",      status: "Encaminhado", apoios: 27, dias: 7,  risco: false, x: 65, y: 55 },
  { id: 12, bairro: "tiradentes", cat: "buraco",  titulo: "Cratera na subida da escola",  local: "Rua Monte Azul, 300",    status: "Em execução", apoios: 40, dias: 15, risco: true,  x: 40, y: 75 }
];

ZELA.etapas = [
  { nome: "Recebido",    desc: "O aviso entrou na fila do bairro." },
  { nome: "Encaminhado", desc: "Enviado ao órgão responsável." },
  { nome: "Em execução", desc: "A equipe foi agendada para ir ao local." },
  { nome: "Resolvido",   desc: "O serviço foi concluído." }
];

/* Protocolos consultáveis (Acompanhar). atual = índice da etapa atual */
ZELA.protocolos = {
  "ZL-2026-04817": { cat: "buraco", titulo: "Buraco no ponto de ônibus",    local: "Rua do Lago, 512 — Grajaú",          atual: 2, dias: 18, apoios: 31, datas: ["28 out 2026", "29 out 2026", "11 nov 2026", "Previsão: até 20 nov 2026"] },
  "ZL-2026-03991": { cat: "luz",    titulo: "Praça sem luz à noite",        local: "Praça das Flores — Grajaú",          atual: 3, dias: 12, apoios: 19, datas: ["26 out 2026", "27 out 2026", "4 nov 2026", "7 nov 2026"] },
  "ZL-2026-05102": { cat: "lixo",   titulo: "Entulho na esquina da escola", local: "Rua Ipê Roxo, 33 — Jardim Ângela",   atual: 0, dias: 1,  apoios: 15, datas: ["14 nov 2026", "Previsão: até 16 nov 2026", "—", "—"] },
  "ZL-2026-04790": { cat: "luz",    titulo: "Poste apagado há 9 dias",      local: "Rua das Palmeiras, 140 — Jardim Ângela", atual: 1, dias: 9, apoios: 23, datas: ["6 nov 2026", "8 nov 2026", "—", "—"] }
};

ZELA.formatoProtocolo = /^ZL-\d{4}-\d{5}$/;

/* Rota acessível — trechos de calçada do Jardim Ângela (simulados).
   Em produção viriam de um levantamento de calçadas (ex.: GeoSampa) + avisos do Zela.
   x/y = posição no mapa (viewBox 600 x 420). */
ZELA.rota = {
  lugares: {
    casa:     { nome: "Casa da Dona Cida", curto: "Casa",       ref: "Rua das Palmeiras, 140", x: 70,  y: 70,  destino: true },
    palm:     { nome: "esquina da Palmeiras com a Avenida Central", x: 240, y: 70 },
    ubs:      { nome: "UBS Jardim Ângela", curto: "UBS",       ref: "Avenida Central, 980",   x: 420, y: 70,  destino: true },
    jato:     { nome: "esquina da Avenida Central com a Rua Jatobá", x: 540, y: 70 },
    ipe:      { nome: "esquina da Rua Ipê Roxo com a Rua Sabiá",     x: 70,  y: 210 },
    praca:    { nome: "Praça da Paz", curto: "Praça",            ref: "tem bancos e banheiro",  x: 240, y: 210, destino: true },
    morro:    { nome: "alto da Rua do Morro", art: "o",    x: 420, y: 210 },
    creche:   { nome: "Creche Pequeno Sabiá", curto: "Creche",    ref: "Rua Jatobá, 18",         x: 540, y: 210, destino: true },
    escola:   { nome: "Escola Estadual Ipê", curto: "Escola",     ref: "Rua Ipê Roxo, 33",       x: 70,  y: 350, destino: true },
    mercado:  { nome: "Mercado do Bairro", art: "o", curto: "Mercado",       ref: "Rua Sabiá, 300",         x: 240, y: 350, destino: true },
    terminal: { nome: "Terminal de ônibus", art: "o", curto: "Terminal",      ref: "Avenida do Terminal",    x: 420, y: 350, destino: true }
  },
  /* incl = subida em %; piso = bom | irregular | ruim; rampa = rampas nas esquinas;
     luz = iluminado à noite; tatil = piso tátil; banco = lugar para sentar; aviso = id em ZELA.avisos */
  trechos: [
    { id: "t1",  de: "casa",  para: "palm",     rua: "Rua das Palmeiras", m: 160, incl: 2,  piso: "bom",       rampa: true,  luz: false, aviso: 1 },
    { id: "t2",  de: "palm",  para: "ubs",      rua: "Avenida Central (calçada da UBS)", m: 180, incl: 3, piso: "ruim", rampa: true, luz: true, aviso: 2 },
    { id: "t2b", de: "palm",  para: "ubs",      rua: "Avenida Central (calçada do outro lado)", m: 210, incl: 3, piso: "bom", rampa: true, luz: true, tatil: true,
      travessia: "Atravesse duas vezes na faixa com semáforo sonoro: na esquina e em frente à UBS.", curva: -26 },
    { id: "t3",  de: "ubs",   para: "jato",     rua: "Avenida Central", m: 120, incl: 2,  piso: "bom",       rampa: true,  luz: true },
    { id: "t4",  de: "casa",  para: "ipe",      rua: "Rua Ipê Roxo",     m: 140, incl: 6,  piso: "irregular", rampa: true,  luz: true },
    { id: "t5",  de: "ipe",   para: "escola",   rua: "Rua Ipê Roxo",     m: 140, incl: 3,  piso: "bom",       rampa: true,  luz: true, aviso: 3 },
    { id: "t6",  de: "palm",  para: "praca",    rua: "Rua da Praça",     m: 140, incl: 1,  piso: "bom",       rampa: true,  luz: true, tatil: true, banco: true },
    { id: "t7",  de: "ipe",   para: "praca",    rua: "Rua Sabiá",        m: 170, incl: 2,  piso: "irregular", rampa: false, luz: true },
    { id: "t8",  de: "praca", para: "mercado",  rua: "Rua Sabiá",        m: 140, incl: 2,  piso: "bom",       rampa: true,  luz: true, tatil: true, banco: true },
    { id: "t9",  de: "escola",para: "mercado",  rua: "Rua das Escolas",  m: 170, incl: 1,  piso: "bom",       rampa: true,  luz: true },
    { id: "t10", de: "mercado",para: "terminal",rua: "Avenida do Terminal", m: 180, incl: 1, piso: "bom",    rampa: true,  luz: true, tatil: true, banco: true },
    { id: "t11", de: "praca", para: "morro",    rua: "Rua do Morro",     m: 180, incl: 11, piso: "bom",       rampa: true,  luz: false },
    { id: "t12", de: "morro", para: "ubs",      rua: "Escadaria do Morro", m: 70, incl: 0, piso: "bom",       rampa: false, luz: false, escada: 36 },
    { id: "t13", de: "morro", para: "terminal", rua: "Rua do Morro",     m: 140, incl: 9,  piso: "irregular", rampa: true,  luz: true },
    { id: "t14", de: "terminal",para: "creche", rua: "Rua Jatobá",       m: 170, incl: 5,  piso: "bom",       rampa: true,  luz: true },
    { id: "t15", de: "creche",para: "jato",     rua: "Rua Jatobá",       m: 140, incl: 4,  piso: "irregular", rampa: true,  luz: true, aviso: 4 },
    { id: "t16", de: "morro", para: "creche",   rua: "Travessa Ipê",     m: 120, incl: 3,  piso: "ruim",      rampa: false, luz: false }
  ],
  perfis: {
    cadeira:  { nome: "Cadeira de rodas",            mPorMin: 50 },
    andador:  { nome: "Bengala, andador ou dificuldade para andar", mPorMin: 35 },
    carrinho: { nome: "Carrinho de bebê ou mala",    mPorMin: 60 },
    visual:   { nome: "Baixa visão ou cegueira",     mPorMin: 50 }
  }
};
