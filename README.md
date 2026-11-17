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
| Rota acessível | `rota.html` | Simular caminhos por perfil de mobilidade |
| Entrar | `entrar.html` | Entrar com o celular e um código por SMS (simulado), sem senha |
| Meus avisos | `meus-avisos.html` | Lista dos avisos que a pessoa fez e apoiou, com a etapa de cada um |
| Sobre | `sobre.html` | Como o Zela funciona, quem ganha com ele e integrantes |
| Documentação (fora do menu) | `projeto.html` | Persona, problema, jornada, interações, ODS e acessibilidade — acesse por https://fabriciogallo.github.io/zela/projeto.html |

## Interações em JavaScript e o problema que cada uma resolve

| Tela | Interação | Problema de experiência resolvido |
| --- | --- | --- |
| Todas | Botões A− / A+, indicador que volta a 100% e VLibras | Amplia o texto em passos de 25%, até 200%, e oferece tradução automática para Libras |
| Todas | Menu recolhível no celular (fecha com Esc) | Libera a tela pequena para o conteúdo |
| Início | Abas "Como funciona" com setas do teclado | Explica o serviço aos poucos, sem texto longo |
| Início | Avisos por bairro + consulta rápida de protocolo | Mostra que vizinhos já usam e avisa na hora se o número está errado |
| Relatar | Passos com progresso, validação e foco no título | Divide a tarefa, evita erro no fim e orienta leitores de tela |
| Relatar | Busca por CEP (API ViaCEP) com máscara automática | Preenche rua, bairro e cidade sozinho; a pessoa só digita o número |
| Relatar | "Usar minha localização" (API OpenStreetMap/Nominatim) | Poupa digitação de endereço |
| Relatar | Detecção de aviso repetido → "Apoiar esse aviso" | Evita filas duplicadas e mostra que outros vizinhos se importam |
| Relatar | Foto com prévia, revisão com "Alterar", copiar protocolo | Dá segurança antes de enviar e impede que o número se perca |
| Acompanhar | Linha do tempo + avisos por SMS + "Ficou resolvido mesmo?" | Mostra o que acontece depois do envio e devolve a palavra ao morador |
| Meu bairro | Filtros, mapa ligado à lista, "Eu também vi" | Prioriza o mais urgente e ajuda a achar avisos perto de casa |
| Entrar / Meus avisos | Login sem senha (celular + código por SMS simulado), avisos e apoios guardados por pessoa, avisos feitos antes de entrar passam para a conta | Ninguém precisa guardar número de protocolo: tudo fica em um só lugar |
| Rota acessível | Simulação por perfil com algoritmo de Dijkstra, mapa com passos, leitura em voz alta e link para compartilhar | Mostra como escadas, inclinação, rampas e avisos fictícios mudam o caminho para quem usa cadeira de rodas, andador, carrinho ou tem baixa visão |

**Como testar:**
- Protocolos de exemplo: `ZL-2026-04817`, `ZL-2026-03991` (resolvido), `ZL-2026-05102`.
- Busca de CEP: em Relatar, passo 2, digite **01310-100** (preenche Avenida Paulista) ou **99999-999** (mostra o erro).
- Aviso repetido: em Relatar, escolha **Poste apagado** e digite **Rua das Palmeiras**.
- Rota acessível. Na simulação, escolha **Escola** e **UBS** com **Cadeira de rodas**. Compare o caminho tracejado com o desvio das barreiras.
- Login: em Entrar, use qualquer celular no formato (11) 9XXXX-XXXX; o código aparece na tela como um SMS simulado. Depois, os avisos feitos e apoiados aparecem em Meus avisos.
- Um aviso novo gera um protocolo que fica salvo no navegador e pode ser consultado em Acompanhar.

## Acessibilidade

- HTML semântico (`header`, `nav`, `main`, `footer`) e títulos em ordem
- Link "Pular para o conteúdo" e foco visível em todos os elementos, inclusive os criados com JS
- `label` em todos os campos; erros com `role="alert"` e `aria-invalid`; confirmações em `role="status"`
- Contraste de texto com o fundo, incluindo os selos de situação e as ações sobre painéis azuis
- Controles principais com área de toque de pelo menos 44 px e navegação pelo teclado. Use as setas nas abas e Esc para fechar o menu ou o diálogo da rota.
- Ícones decorativos com `aria-hidden`; prévia da foto com texto alternativo
- Preferência por movimento reduzido e tamanho do texto ajustável de 100% a 200%. Acione a porcentagem ao lado de A+ para voltar ao padrão.
- A lista de avisos em Meu bairro tem um atalho antes do mapa. A tela de acompanhamento mostra a situação de cada etapa em texto.
- Tradução automática pelo botão flutuante do [VLibras](https://www.gov.br/governodigital/pt-br/acessibilidade-e-usuario/vlibras/vlibras), no canto inferior em telas estreitas
- Linguagem simples e direta

## ODS

- **ODS 11 — Cidades e comunidades sustentáveis** (metas 11.3 e 11.7): participação dos moradores no cuidado de espaços públicos seguros e acessíveis.
- **ODS 16 — Paz, justiça e instituições eficazes** (metas 16.6 e 16.7): serviço público transparente e decisões participativas.
- **ODS 10 — Redução das desigualdades** (meta 10.2): inclusão de idosos e de quem tem pouca conexão.

## Tecnologias

- HTML, CSS e JavaScript puro (sem frameworks, sem build)
- Dados simulados em `js/dados.js`
- Mapas reais com blocos do [OpenStreetMap](https://www.openstreetmap.org/copyright) em Meu bairro e Rota acessível
- APIs públicas: [ViaCEP](https://viacep.com.br/) para buscar o endereço pelo CEP e [Nominatim / OpenStreetMap](https://nominatim.org/) para transformar a localização em endereço
- `localStorage` para lembrar tamanho do texto, bairro, conta (sessão), apoios e protocolos criados — em produção, a conta e os avisos ficariam em um servidor
- Fontes: Montserrat (títulos) e Inter (texto), via Google Fonts
- Paisagens em pixel art geradas em SVG por código (`js/comum.js`); a abertura usa uma versão animada (`img/abertura-animada.svg`, para de se mexer com "reduzir movimento") e há um GIF da cena em `img/abertura.gif`

## Estrutura

```
├── index.html
├── relatar.html
├── acompanhar.html
├── bairro.html
├── rota.html
├── sobre.html
├── entrar.html
├── meus-avisos.html
├── projeto.html      # documentação (persona, jornada, ODS) — fora do menu
├── css/style.css       # tokens, componentes e responsivo
├── js/dados.js         # dados simulados
├── js/comum.js         # texto, menu, retícula, utilidades
├── js/inicio.js
├── js/relatar.js
├── js/acompanhar.js
├── js/bairro.js
├── js/entrar.js       # login com celular + código
├── js/meus-avisos.js  # avisos e apoios da conta
├── js/rota.js         # rota acessível (Dijkstra por perfil)
└── img/favicon.svg
```

1. Crie um repositório **público** no GitHub e envie estes arquivos para a branch `main`.
2. No repositório: **Settings → Pages → Build and deployment → Source: Deploy from a branch**.
3. Escolha a branch `main` e a pasta `/ (root)` e salve.
4. Em 1–2 minutos o site fica no ar em `https://SEU-USUARIO.github.io/NOME-DO-REPO/`. Cole o link no topo deste README.
