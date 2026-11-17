# Zela — Zeladoria Colaborativa

> Sua rua avisa. A prefeitura responde.

**Deploy:** https://fabriciogallo.github.io/zela/ &nbsp;·&nbsp; **Repositório:** https://github.com/fabriciogallo/zela

---

## Integrantes

| Nome | RM |
| --- | --- |
| Edu Eder Batagelo Rodrigues Carvalho | RM573260 |
| Fabricio Costa Gallo | RM570263 |
| Kauã Aurelio Silva | RM568854 |
| Matheus Santos Matta | RM570854 |
| Patrick de Souza Bigi dos Santos | RM572748 |

---

## Contexto — FIAP Global Solution · CitizenTech

Projeto desenvolvido para a **Global Solution** da FIAP, dentro do eixo **CitizenTech**: soluções tecnológicas que ampliam o acesso dos cidadãos aos serviços públicos com foco em usabilidade, acessibilidade e participação.

---

## O problema

Buracos, postes apagados, lixo e calçadas quebradas aparecem toda semana nos bairros periféricos. Os canais oficiais existem, mas o morador não sabe para qual órgão reclamar, os avisos se repetem sem resposta e ninguém consegue acompanhar o andamento. O resultado é descrença: o problema fica, e a pessoa para de avisar.

**Cidadão beneficiado:** moradores de bairros periféricos de grandes cidades — em especial pessoas idosas, com pouca familiaridade digital e internet instável.

> **Persona:** Dona Cida, 64 anos, Jardim Ângela (SP). Viu um buraco crescer por três meses na frente da creche, não sabia para quem ligar e desistiu na primeira tentativa.

---

## A solução

O **Zela** é uma plataforma web de zeladoria colaborativa que conecta o morador ao órgão público correto em três passos:

1. **Relate** o problema em 4 telas curtas — tipo, local, detalhes e revisão.
2. **Acompanhe** cada etapa pelo número do protocolo (Recebido → Encaminhado → Em execução → Resolvido).
3. **Confirme** se o problema foi resolvido de verdade ou peça para reabrir.

Quando um vizinho já avisou o mesmo problema, o Zela oferece **apoiar** o aviso em vez de criar um duplicado. Mais apoios = mais urgência para o órgão responsável.

### Jornada do usuário

| Etapa | O que a pessoa sente | Como o Zela responde |
| --- | --- | --- |
| Percebe o problema | Não sabe a quem reclamar | Início explica em uma frase e lista os tipos de problema |
| Vai relatar | Medo de errar o formulário | 4 passos, um assunto por tela, ajuda ao lado, erros claros |
| Descobre que não está só | — | Detecta aviso parecido e oferece "Apoiar" em vez de duplicar |
| Quer acompanhar | Protocolo some num papel | Número para copiar, linha do tempo e aviso por SMS |
| Confirma o resultado | "Resolveu mesmo?" | Morador confirma ou reabre o aviso |

---

## Páginas (mínimo de 4 exigido)

| Página | Arquivo | Descrição |
| --- | --- | --- |
| Início | `index.html` | Entender o serviço, escolher o tipo de problema, ver avisos do bairro, consultar protocolo rapidamente |
| Relatar | `pages/relatar.html` | Fazer um aviso em 4 passos guiados e receber o número do protocolo |
| Acompanhar | `pages/acompanhar.html` | Ver as etapas do aviso, ativar avisos por SMS, confirmar a solução |
| Meu bairro | `pages/bairro.html` | Filtrar avisos no mapa, ver os mais urgentes e apoiar vizinhos |
| Rota acessível | `pages/rota.html` | Planejar trajetos por perfil de mobilidade com dados reais (Valhalla + OpenStreetMap) e simulação de barreiras |
| Entrar | `pages/entrar.html` | Login com celular e código por SMS (simulado), sem senha |
| Meus avisos | `pages/meus-avisos.html` | Lista dos avisos feitos e apoiados, com a etapa de cada um |
| Sobre | `pages/sobre.html` | Como o Zela funciona, integrantes e conexão com os ODS |
| Documentação | `pages/projeto.html` | Persona, jornada, interações JS, ODS e acessibilidade (fora do menu) |

---

## Interações em JavaScript

| Tela | Interação | Problema de experiência resolvido |
| --- | --- | --- |
| Todas | Botões A− / A+ e VLibras | Texto ampliável até 200% e tradução automática para Libras |
| Todas | Menu recolhível (fecha com Esc) | Libera a tela pequena para o conteúdo |
| Início | Abas "Como funciona" com setas do teclado | Explica o serviço em partes, sem muro de texto |
| Início | Avisos por bairro + consulta rápida de protocolo | Mostra que vizinhos já usam; avisa na hora se o número está errado |
| Relatar | 4 passos com progresso, validação e foco no título | Divide a tarefa, evita erro no fim e orienta leitores de tela |
| Relatar | Busca por CEP via API ViaCEP | Preenche rua, bairro e cidade automaticamente |
| Relatar | "Usar minha localização" (OpenStreetMap/Nominatim) | Poupa digitação do endereço |
| Relatar | Detecção de aviso repetido → "Apoiar esse aviso" | Evita filas duplicadas; mostra que outros vizinhos se importam |
| Relatar | Foto com prévia, revisão com "Alterar", copiar protocolo | Dá segurança antes de enviar e impede que o número se perca |
| Acompanhar | Linha do tempo + avisos por SMS + "Ficou resolvido mesmo?" | Mostra o que acontece após o envio e devolve a palavra ao morador |
| Meu bairro | Filtros, mapa ligado à lista e "Eu também vi" | Prioriza o mais urgente e facilita encontrar avisos perto de casa |
| Entrar / Meus avisos | Login sem senha (celular + código SMS simulado) | Avisos e apoios ficam salvos por pessoa; ninguém precisa guardar protocolo |
| Rota acessível | Simulação por perfil (Dijkstra), leitura em voz, link de compartilhamento | Mostra como escadas, inclinação e avisos mudam o caminho por perfil de mobilidade |
| Rota acessível | Consulta real ao Valhalla / OpenStreetMap | Distância, tempo estimado e instruções em português para destinos reais |

### Como testar

- **Protocolo:** `ZL-2026-04817` (em execução), `ZL-2026-03991` (resolvido), `ZL-2026-05102`.
- **CEP:** em Relatar → passo 2, digite **01310-100** (Avenida Paulista) ou **99999-999** (erro).
- **Aviso repetido:** em Relatar, escolha **Poste apagado** e escreva **Rua das Palmeiras**.
- **Login:** em Entrar, use qualquer celular no formato (11) 9XXXX-XXXX; o código aparece como SMS simulado.
- **Rota acessível:** selecione Cidade Tiradentes, Terminal e Casa de Cultura, perfil Cadeira de rodas.

---

## Acessibilidade

- HTML semântico (`header`, `nav`, `main`, `footer`) e títulos em ordem hierárquica
- Link "Pular para o conteúdo" e foco visível em todos os elementos interativos, inclusive os criados com JS
- `label` em todos os campos; erros com `role="alert"` e `aria-invalid`; confirmações em `role="status"`
- Contraste adequado em texto, selos de situação, botões e ações sobre fundos escuros
- Área de toque mínima de 44 px e navegação completa pelo teclado (setas nas abas, Esc para fechar menu/diálogo)
- Ícones decorativos com `aria-hidden`; prévia de foto com texto alternativo
- Preferência `prefers-reduced-motion` respeitada; texto ajustável de 100 % a 200 %
- Tradução automática via [VLibras](https://www.gov.br/governodigital/pt-br/acessibilidade-e-usuario/vlibras/vlibras)
- Linguagem simples e direta

---

## ODS

| ODS | Metas | Conexão com o Zela |
| --- | --- | --- |
| **11 — Cidades e comunidades sustentáveis** | 11.3, 11.7 | Moradores participam do cuidado de espaços públicos seguros e acessíveis |
| **16 — Paz, justiça e instituições eficazes** | 16.6, 16.7 | Cada etapa do serviço público fica visível ao cidadão; decisões participativas |
| **10 — Redução das desigualdades** | 10.2 | Linguagem simples, texto ampliável e páginas leves dão voz a idosos e a quem tem pouca conexão |

---

## Tecnologias

- HTML, CSS e JavaScript puro — sem frameworks, sem build
- Dados simulados em `assets/js/dados.js`
- Mapas com tiles do [OpenStreetMap](https://www.openstreetmap.org/copyright)
- Consulta de trajetos via [API Valhalla](https://valhalla.github.io/valhalla/api/route/api-reference/) (servidor FOSSGIS)
- APIs públicas: [ViaCEP](https://viacep.com.br/) e [Nominatim](https://nominatim.org/)
- `localStorage` para sessão, preferências, apoios e protocolos
- Fontes: Montserrat (títulos) e Inter (texto) via Google Fonts
- Pixel art em SVG gerado por código (`assets/js/comum.js`)

---

## Estrutura de arquivos

```
zela/
├── index.html                  # Página inicial (raiz, necessário para o GitHub Pages)
│
├── pages/                      # Demais páginas
│   ├── relatar.html
│   ├── acompanhar.html
│   ├── bairro.html
│   ├── rota.html
│   ├── entrar.html
│   ├── meus-avisos.html
│   ├── sobre.html
│   └── projeto.html            # Documentação do projeto (fora do menu)
│
├── assets/
│   ├── css/
│   │   └── style.css           # Tokens de design, componentes e responsivo
│   ├── js/
│   │   ├── dados.js            # Dados simulados (avisos, protocolos, rotas)
│   │   ├── comum.js            # Menu, tamanho de texto, pixel art, utilidades
│   │   ├── inicio.js           # Lógica da página inicial
│   │   ├── relatar.js          # Formulário de 4 passos + CEP + localização
│   │   ├── acompanhar.js       # Linha do tempo e confirmação
│   │   ├── bairro.js           # Mapa do bairro, filtros e "Eu também vi"
│   │   ├── entrar.js           # Login com celular + SMS simulado
│   │   ├── meus-avisos.js      # Avisos e apoios da conta
│   │   ├── rota.js             # Simulação de barreiras (Dijkstra por perfil)
│   │   └── rotas-reais.js      # Consulta ao Valhalla e exibição dos trajetos
│   └── img/
│       ├── favicon.svg
│       ├── abertura-animada.svg
│       ├── abertura.gif
│       └── cat-*.svg           # Ícones de categoria de problema
│
├── .nojekyll                   # Necessário para o GitHub Pages ignorar o Jekyll
└── README.md
```

---

## Deploy no GitHub Pages

1. Crie um repositório **público** no GitHub e envie estes arquivos para a branch `main`.
2. No repositório: **Settings → Pages → Build and deployment → Source: Deploy from a branch**.
3. Escolha a branch `main` e a pasta `/ (root)` e salve.
4. Em 1–2 minutos o site fica disponível em `https://SEU-USUARIO.github.io/NOME-DO-REPO/`.
