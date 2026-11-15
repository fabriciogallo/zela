# Zela — Zeladoria Colaborativa

> Sua rua avisa. A prefeitura responde.

**Deploy:** https://fabriciogallo.github.io/zela/ · **Repositório:** https://github.com/fabriciogallo/zela

## Integrantes

| Nome | RM |
| --- | --- |
| Edu Eder Batagelo Rodrigues Carvalho | RM573260 |
| Fabricio Costa Gallo | RM570263 |
| Kauã Aurelio Silva | RM568854 |
| Matheus Santos Matta | RM570854 |
| Patrick de Souza Bigi dos Santos | RM572748 |

## O problema

Buracos, postes apagados, lixo e calçadas quebradas aparecem toda semana nos bairros da periferia. Os canais oficiais existem, mas o morador não sabe para quem reclamar, os avisos se repetem e ninguém vê o andamento. O resultado é descrença: o problema fica, e a pessoa para de avisar.

**Cidadão beneficiado:** moradores de bairros periféricos de grandes cidades — em especial pessoas idosas, com pouca familiaridade digital e internet instável (persona: Dona Cida, 64 anos, Jardim Ângela, São Paulo).

> [COMPLETAR COM A EQUIPE: o que vocês observaram no território, quem entrevistaram e com que frequência o problema acontece.]

## A solução

O Zela é uma plataforma web de zeladoria colaborativa. O morador:

1. **Relata** o problema em 4 passos curtos (tipo, local, detalhes, revisão).
2. **Apoia** um aviso que um vizinho já fez, em vez de criar um repetido — e o apoio aumenta a prioridade.
3. **Acompanha** cada etapa pelo número do protocolo (recebido → encaminhado → em execução → resolvido).
4. **Confirma** se o problema foi resolvido de verdade ou pede para reabrir.

### Jornada do usuário

| Etapa | O que a pessoa sente | Como o Zela responde |
| --- | --- | --- |
| Percebe | Não sabe a quem reclamar | Início explica em uma frase e lista os tipos de problema |
| Relata | Medo de errar o formulário | 4 passos, um assunto por tela, ajuda ao lado, erros claros |
| Descobre que não está só | — | Detecta aviso parecido e oferece "apoiar" |
| Acompanha | Protocolo some num papel | Número para copiar, linha do tempo e aviso por SMS |
| Confirma | "Resolveu mesmo?" | Morador confirma ou reabre o aviso |

## Páginas

| Página | Arquivo | Para quê |
| --- | --- | --- |
| Início | `index.html` | Entender o serviço, escolher o tipo de problema, ver o bairro, consultar protocolo |
| Relatar | `relatar.html` | Fazer um aviso em 4 passos e receber o protocolo |
| Acompanhar | `acompanhar.html` | Ver as etapas do aviso, ligar avisos por SMS, confirmar a solução |
| Meu bairro | `bairro.html` | Filtrar avisos, ver no mapa e apoiar os mais urgentes |
| Rota acessível | `rota.html` | Traçar o caminho com menos barreiras para quem tem mobilidade limitada |
| Sobre | `sobre.html` | Como o Zela funciona, quem ganha com ele e integrantes |
| Documentação (fora do menu) | `projeto.html` | Persona, problema, jornada, interações, ODS e acessibilidade — acesse por https://fabriciogallo.github.io/zela/projeto.html |

## Interações em JavaScript e o problema que cada uma resolve

| Tela | Interação | Problema de experiência resolvido |
| --- | --- | --- |
| Todas | Botões A− / A+ (lembrados entre páginas) | Quem enxerga pouco lê sem mexer nas configurações do celular |
| Todas | Menu recolhível no celular (fecha com Esc) | Libera a tela pequena para o conteúdo |
| Início | Abas "Como funciona" com setas do teclado | Explica o serviço aos poucos, sem texto longo |
| Início | Avisos por bairro + consulta rápida de protocolo | Mostra que vizinhos já usam e avisa na hora se o número está errado |
| Relatar | Passos com progresso, validação e foco no título | Divide a tarefa, evita erro no fim e orienta leitores de tela |
| Relatar | "Usar minha localização" (API OpenStreetMap/Nominatim) | Poupa digitação de endereço |
| Relatar | Detecção de aviso repetido → "Apoiar esse aviso" | Evita filas duplicadas e mostra que outros vizinhos se importam |
| Relatar | Foto com prévia, revisão com "Alterar", copiar protocolo | Dá segurança antes de enviar e impede que o número se perca |
| Acompanhar | Linha do tempo + avisos por SMS + "Ficou resolvido mesmo?" | Mostra o que acontece depois do envio e devolve a palavra ao morador |
| Meu bairro | Filtros, mapa ligado à lista, "Eu também vi" | Prioriza o mais urgente e ajuda a achar avisos perto de casa |
| Rota acessível | Rota por perfil (cadeira de rodas, andador, carrinho, baixa visão) com algoritmo de Dijkstra, mapa com passos, "Ouvir as instruções" (voz do navegador), link para compartilhar | Desvia de escadas, ladeiras acima de 8%, calçadas quebradas e dos avisos abertos no Zela, e explica por que o caminho mais curto foi evitado |

**Como testar:**
- Protocolos de exemplo: `ZL-2026-04817`, `ZL-2026-03991` (resolvido), `ZL-2026-05102`.
- Aviso repetido: em Relatar, escolha **Poste apagado** e digite **Rua das Palmeiras**.
- Rota acessível: de **Escola** para **UBS** com **Cadeira de rodas** — o mapa mostra o caminho mais curto (tracejado) e o desvio da escadaria e da calçada quebrada.
- Um aviso novo gera um protocolo que fica salvo no navegador e pode ser consultado em Acompanhar.

## Acessibilidade

- HTML semântico (`header`, `nav`, `main`, `footer`) e títulos em ordem
- Link "Pular para o conteúdo" e foco visível em todos os elementos, inclusive os criados com JS
- `label` em todos os campos; erros com `role="alert"` e `aria-invalid`; confirmações em `role="status"`
- Contraste mínimo de 4,5:1 — texto preto sobre fundos claros (laranja #f26b21, verdes #d5e0b0 / #b7c88a / #839a4c)
- Alvos de toque com pelo menos 44 px; navegação completa pelo teclado (abas com setas, Esc fecha o menu)
- Ícones decorativos com `aria-hidden`; prévia da foto com texto alternativo
- Respeita `prefers-reduced-motion`; tamanho do texto ajustável
- Linguagem simples e direta

## ODS

- **ODS 11 — Cidades e comunidades sustentáveis** (metas 11.3 e 11.7): participação dos moradores no cuidado de espaços públicos seguros e acessíveis.
- **ODS 16 — Paz, justiça e instituições eficazes** (metas 16.6 e 16.7): serviço público transparente e decisões participativas.
- **ODS 10 — Redução das desigualdades** (meta 10.2): inclusão de idosos e de quem tem pouca conexão.

## Tecnologias

- HTML, CSS e JavaScript puro (sem frameworks, sem build)
- Dados simulados em `js/dados.js`
- API pública: [Nominatim / OpenStreetMap](https://nominatim.org/) para transformar a localização em endereço
- `localStorage` para lembrar tamanho do texto, bairro, apoios e protocolos criados
- Fontes: Barlow Condensed e DM Sans (Google Fonts)

## Estrutura

```
├── index.html
├── relatar.html
├── acompanhar.html
├── bairro.html
├── rota.html
├── sobre.html
├── projeto.html      # documentação (persona, jornada, ODS) — fora do menu
├── css/style.css       # tokens, componentes e responsivo
├── js/dados.js         # dados simulados
├── js/comum.js         # texto, menu, retícula, utilidades
├── js/inicio.js
├── js/relatar.js
├── js/acompanhar.js
├── js/bairro.js
├── js/rota.js         # rota acessível (Dijkstra por perfil)
└── img/favicon.svg
```

## Rodar localmente

Abra `index.html` no navegador. Para a localização funcionar, use um servidor local (o navegador só libera a localização em `https` ou `localhost`):

```bash
python -m http.server 8000
```

Depois acesse http://localhost:8000.

## Deploy no GitHub Pages

1. Crie um repositório **público** no GitHub e envie estes arquivos para a branch `main`.
2. No repositório: **Settings → Pages → Build and deployment → Source: Deploy from a branch**.
3. Escolha a branch `main` e a pasta `/ (root)` e salve.
4. Em 1–2 minutos o site fica no ar em `https://SEU-USUARIO.github.io/NOME-DO-REPO/`. Cole o link no topo deste README.
