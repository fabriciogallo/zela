/* Zela — dados simulados do protótipo.
   Em produção, estes dados viriam de uma API (ex.: GET /avisos?bairro=angela). */
window.ZELA = window.ZELA || {};

ZELA.categorias = [
  { id: "buraco",  nome: "Buraco na rua",    titulo: "Buraco Na Rua",    desc: "Asfalto afundado, cratera ou tampa de bueiro solta.", orgao: "Subprefeitura" },
  { id: "luz",     nome: "Poste apagado",    titulo: "Poste Apagado",    desc: "Lâmpada queimada, piscando ou acesa de dia.",       orgao: "Iluminação pública" },
  { id: "lixo",    nome: "Lixo ou entulho",  titulo: "Lixo E Entulho",   desc: "Descarte irregular ou coleta que não passou.",      orgao: "Serviço de limpeza" },
  { id: "calcada", nome: "Calçada quebrada", titulo: "Calçada Quebrada", desc: "Piso solto, degrau perigoso ou rampa bloqueada.",   orgao: "Subprefeitura" },
  { id: "arvore",  nome: "Árvore ou poda",   titulo: "Árvore E Poda",    desc: "Galho caído, risco de queda ou poda pedida.",       orgao: "Subprefeitura" },
  { id: "outro",   nome: "Outro problema",   titulo: "Outro Problema",   desc: "Sinalização, praça, ponto de ônibus e mais.",       orgao: "Central de atendimento" }
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
