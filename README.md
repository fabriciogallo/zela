# Zela — Zeladoria Colaborativa

> Sua rua avisa. A prefeitura responde.

Projeto acadêmico da **FIAP**, desenvolvido para a **Global Solution**, no contexto de CitizenTech. É um protótipo: os relatos, as contas e os SMS são simulados; as consultas a endereços e trajetos usam serviços externos.

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
| Rota acessível | `pages/rota.html` | Buscar ruas e CEPs, ver bairros próximos e planejar trajetos por perfil de mobilidade |
| Sua conta | `pages/entrar.html` | Acesso aos avisos e apoios com celular e código por SMS (simulado), com bairro opcional |
| Meus avisos | `pages/meus-avisos.html` | Avisos feitos e apoiados; consulta e alteração do bairro do perfil |
| Sobre | `pages/sobre.html` | Como o Zela funciona, integrantes e conexão com os ODS |

---

## Interações em JavaScript

| Tela | Interação | Problema de experiência resolvido |
| --- | --- | --- |
| Todas | Painel Leitura e VLibras | Texto até 200%, contraste, links destacados, áreas de toque maiores, espaçamento e tradução automática para Libras |
| Todas | Menu recolhível (fecha com Esc), que volta ao rolar para cima | Dá acesso à navegação e à conta sem voltar até o topo |
| Início | Abas "Como funciona" com setas do teclado | Explica o serviço em partes, sem muro de texto |
| Início | Avisos por bairro + consulta rápida de protocolo | Mostra que vizinhos já usam; avisa na hora se o número está errado |
| Início / Meu bairro / Perfil | Busca por bairro, rua, CEP ou geolocalização | Mostra os avisos do bairro escolhido e permite salvar a região no perfil sem depender do GPS |
| Relatar | 4 passos com progresso, validação e foco no título | Divide a tarefa, evita erro no fim e orienta leitores de tela |
| Relatar | Rascunho automático com recuperação por até 7 dias | Permite sair e continuar depois, sem repetir o preenchimento; a foto precisa ser escolhida novamente |
| Relatar | Busca por CEP via API ViaCEP | Preenche rua, bairro e cidade automaticamente |
| Relatar | "Usar minha localização" (OpenStreetMap/Nominatim) | Poupa digitação do endereço |
| Relatar | Detecção de aviso repetido → "Apoiar esse aviso" | Evita filas duplicadas; mostra que outros vizinhos se importam |
| Relatar | Foto com prévia, revisão com "Alterar", copiar protocolo | Dá segurança antes de enviar e impede que o número se perca |
| Acompanhar | Linha do tempo + avisos por SMS + "Ficou resolvido mesmo?" | Mostra o que acontece após o envio e devolve a palavra ao morador |
| Meu bairro | Filtros, mapa ligado à lista e "Eu também vi" | Prioriza o mais urgente e facilita encontrar avisos perto de casa |
| Sua conta / Meus avisos | Login sem senha (celular + código SMS simulado) | Avisos e apoios ficam salvos por pessoa; ninguém precisa guardar protocolo |
| Rota acessível | Sugestões por rua, CEP ou localização atual na saída e no destino | Distingue ruas de mesmo nome pelo bairro e pela cidade e permite preencher qualquer ponto pelo GPS |
| Rota acessível | Consulta real ao Valhalla / OpenStreetMap | Sugere trajetos por perfil de mobilidade e mostra distância, tempo estimado e instruções em português, com leitura em voz alta |
| Início / Meu bairro / Rota acessível | Perfil de mobilidade lembrado no aparelho, sem exigir conta | Evita escolher o mesmo perfil em cada página |
| Rota acessível | Preferências opcionais recolhidas e instruções por etapas | Mantém saída, destino e perfil em destaque; permite avançar, voltar e ouvir uma instrução por vez |
| Rota acessível | Fonte, data da consulta e disponibilidade dos dados | Diferencia uma consulta sem registros de uma consulta indisponível; não promete acessibilidade verificada em campo |
| Todas | Ajuda falada opcional, voz e velocidade ajustáveis | Oferece outra forma de acompanhar o conteúdo, com pausa e parada, mantendo tudo disponível em texto |

### Como testar

- **Protocolo:** `ZL-2026-04817` (em execução), `ZL-2026-03991` (resolvido), `ZL-2026-05102`.
- **CEP:** em Relatar → passo 2, digite **01310-100** (Avenida Paulista) ou **99999-999** (erro).
- **Aviso repetido:** em Relatar, escolha **Poste apagado** e escreva **Rua das Palmeiras**.
- **Sua conta:** use qualquer celular no formato (11) 9XXXX-XXXX; o código aparece como SMS simulado.
- **Leitura:** abra **Aa Leitura** na barra superior em telas compactas ou no canto inferior esquerdo em telas maiores, alinhado ao botão de relato. Experimente **Leitura confortável** ou ajuste tamanho do texto, contraste, links, animações, espaço entre linhas, botões e aparência. Troque de página para confirmar a preferência salva; **Voltar ao padrão** preserva o bairro, a conta e os avisos.
- **Meu bairro:** busque **Grajaú** para ver avisos simulados ou **01310-100** para escolher Bela Vista e experimentar o estado sem avisos. Você também pode salvar ou remover o bairro em **Meus avisos → Seus dados**.
- **Rota acessível:** em **Escolher pela região**, selecione Cidade Tiradentes. Escolha o Terminal e a Casa de Cultura como saída e destino, mantenha o perfil **Cadeira de rodas** e clique em **Buscar trajeto**.
- **Busca de locais:** nos campos **Saindo de** e **Indo para**, digite **Rua das Flores** ou **01310-100, 1000** e escolha uma sugestão. Os dois campos também aceitam **Minha localização atual**. Para ver os bairros da região, use **Bairros próximos** e permita o acesso à localização no navegador.
- **Rascunho:** preencha parte de um relato e recarregue a página. Escolha **Continuar de onde parei** ou **Descartar rascunho**. O envio concluído limpa o rascunho; falhas ao guardar o aviso mantêm as respostas na tela.
- **Perfil de mobilidade:** escolha um perfil na chamada da rota no Início. Abra Meu bairro e depois Rota acessível para confirmar a mesma escolha.
- **Instruções:** busque um trajeto e use **Próxima instrução**, **Instrução anterior** e **Ver todas as instruções**. O avanço é manual; não há navegação automática pela posição em tempo real.
- **Voz:** em Leitura, escolha voz e velocidade e use **Testar esta voz**. Depois experimente a apresentação de uma página, a ajuda do relato, um aviso em Acompanhar e uma instrução de trajeto. Nenhum áudio começa sem uma ação da pessoa.

---

## Acessibilidade

- HTML semântico (`header`, `nav`, `main`, `footer`) e títulos em ordem hierárquica
- Link "Pular para o conteúdo" e foco visível em todos os elementos interativos, inclusive os criados com JS
- `label` em todos os campos; erros com `role="alert"` e `aria-invalid`; confirmações em `role="status"`
- Contraste adequado em texto, selos de situação, botões e ações sobre fundos escuros
- Área de toque mínima de 44 px e navegação pelo teclado (setas nas abas, Esc para fechar o menu)
- Ícones decorativos com `aria-hidden`; prévia de foto com texto alternativo
- Preferência `prefers-reduced-motion` respeitada; texto ajustável de 100 % a 200 %
- Painel **Ajustes de leitura** em todas as páginas, com janela nativa, fechamento por Esc e retorno do foco ao botão que abriu
- Atalho **Leitura confortável**, alto contraste, links sublinhados, mais espaço entre linhas, botões maiores e fundo acolhedor opcionais
- Preferências guardadas só neste navegador; se o armazenamento estiver bloqueado, os ajustes continuam funcionando na página atual
- Tradução automática via [VLibras](https://www.gov.br/governodigital/pt-br/acessibilidade-e-usuario/vlibras/vlibras)
- Linguagem simples e direta

### Leitura em voz alta

O site usa as vozes em português disponíveis no aparelho. A escolha automática prioriza português brasileiro e vozes naturais quando instaladas. A qualidade varia conforme o sistema e o navegador.

A leitura usa o recurso de voz do navegador, sem cadastro, chave ou serviço adicional do projeto. É possível escolher uma voz disponível, ajustar a velocidade, pausar, retomar e parar. Quando a voz não está disponível, as instruções continuam em texto.

### Acessibilidade para pessoas surdas: próxima etapa

As instruções, os alertas e as confirmações já têm texto; a voz é opcional. O VLibras oferece uma tradução automática complementar. Isso não substitui a revisão com pessoas surdas nem torna o site acessível para todos os perfis de surdez.

A proposta para a equipe é validar primeiro os fluxos com pessoas surdas, incluindo quem usa Libras e quem prefere português escrito. Depois, produzir vídeos curtos em Libras com tradução humana revisada para as tarefas essenciais (planejar rota, relatar e acompanhar), acompanhados de legendas revisadas e transcrição. No vídeo-pitch, incluir legendas que identifiquem também sons relevantes. Não depender de alertas sonoros ou de contato por chamada de voz; qualquer atendimento futuro precisa oferecer um canal escrito.

Referências: [barreiras auditivas — W3C](https://www.w3.org/WAI/people-use-web/abilities-barriers/auditory/), [línguas de sinais — W3C](https://www.w3.org/WAI/media/av/sign-languages/).

### Verificação e limites

Em ambiente local isolado, com dados fictícios, foram verificados recuperação e descarte de rascunhos, envio, armazenamento bloqueado, perfil entre páginas, falha e ausência de registros de mapa, controles de voz e navegação das instruções por teclado. As vozes foram simuladas nos testes para verificar os controles; isso não mede a qualidade do áudio real.

Testes automatizados da leitura pelo aparelho (Node.js):

```sh
node --test tests/voz.test.mjs
```

A revisão visual considera telas pequenas e desktop, ampliação de texto até 200%, alto contraste e movimento reduzido. A análise automática com axe complementa a revisão; não certifica conformidade com WCAG. O contraste de itens sobre imagens e mapas exige avaliação visual adicional.

Antes da entrega, ainda são necessários testes com NVDA, TalkBack e VoiceOver em aparelhos reais, zoom nativo do navegador a 400%, escuta das vozes disponíveis em cada aparelho e testes de tarefas com pessoas idosas e com deficiência. Registrar se conseguem escolher uma rota, compreender os limites dos dados, recuperar um relato e concluir a tarefa sem ajuda. Veja [como envolver usuários na avaliação — W3C](https://www.w3.org/WAI/test-evaluate/involving-users/).

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
- APIs públicas: [ViaCEP](https://viacep.com.br/), [Nominatim](https://nominatim.org/) e [Photon](https://github.com/komoot/photon#demo-server). A busca usa o servidor de demonstração do Photon, com pausa entre digitação e consulta. A posição enviada para identificar o bairro é arredondada; a preferência salva no navegador guarda só a identificação do bairro e da cidade.
- `localStorage` para sessão, preferências, apoios e protocolos
- Web Speech do navegador para leitura opcional
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
│   │   ├── style.css           # Tokens de design, componentes e responsivo
│   │   └── acessibilidade.css  # Painel e preferências opcionais de leitura
│   ├── js/
│   │   ├── acessibilidade.js   # Carrega preferências cedo e monta o painel Leitura
│   │   ├── dados.js            # Avisos e protocolos simulados, pontos públicos e bairros
│   │   ├── comum.js            # Menu, VLibras, pixel art e utilidades
│   │   ├── mobilidade.js       # Perfil compartilhado entre Início, bairro e rota
│   │   ├── voz.js              # Leitura, pausa, parada, vozes e velocidade
│   │   ├── inicio.js           # Lógica da página inicial
│   │   ├── relatar.js          # Formulário de 4 passos + CEP + localização
│   │   ├── acompanhar.js       # Linha do tempo e confirmação
│   │   ├── bairro.js           # Mapa do bairro, filtros e "Eu também vi"
│   │   ├── entrar.js           # Login com celular + SMS simulado
│   │   ├── meus-avisos.js      # Avisos e apoios da conta
│   │   ├── busca-locais.js     # Sugestões de bairros, ruas, CEPs e bairros próximos
│   │   ├── preferencia-bairro.js # Seleção por GPS ou busca e preferência do aparelho ou perfil
│   │   └── rotas-reais.js      # Consulta ao Valhalla e exibição dos trajetos
│   └── img/
│       ├── favicon.svg
│       ├── abertura-animada.svg
│       ├── abertura.gif
│       ├── relatar-problema.svg # Ícone local do botão flutuante
│       └── cat-*.svg           # Ícones de categoria de problema
│
├── tests/                      # Testes dos controles de voz
├── .nojekyll                   # Necessário para o GitHub Pages ignorar o Jekyll
└── README.md
```

---

## Deploy no GitHub Pages

1. Crie um repositório **público** no GitHub e envie estes arquivos para a branch `main`.
2. No repositório: **Settings → Pages → Build and deployment → Source: Deploy from a branch**.
3. Escolha a branch `main` e a pasta `/ (root)` e salve.
4. Em 1–2 minutos o site fica disponível em `https://SEU-USUARIO.github.io/NOME-DO-REPO/`.
