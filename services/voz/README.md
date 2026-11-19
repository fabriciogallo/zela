# Voz neural opcional

O site funciona sem este serviço, usando as vozes disponíveis no aparelho. Este Worker permite usar Azure Speech sem expor a chave no HTML ou JavaScript público. A integração fica desativada enquanto `assets/js/voz-config.js` tiver `endpoint` vazio.

## Opção gratuita pesquisada

Em 19/11/2026, o [Azure Speech F0](https://azure.microsoft.com/en-us/pricing/details/speech/) oferece 500 mil caracteres mensais de texto para voz neural. As vozes brasileiras [Francisca e Antônio](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=tts) são aceitas pelo Worker. É necessário criar uma conta Azure e um recurso Speech **F0**; não criar um recurso S0 para esta configuração gratuita.

O [Google Cloud Text-to-Speech](https://cloud.google.com/text-to-speech/pricing) também tem cotas gratuitas, mas exige faturamento ativo e pode cobrar o excedente. A integração deste repositório usa Azure; não há chamadas à API do Google.

## Ativação pela equipe

1. Criar o recurso Azure Speech F0 e guardar a chave e a região. Não colocar a chave em nenhum arquivo do site ou commit.
2. Criar uma conta Cloudflare Workers e revisar o plano e os limites disponíveis. O código não cria contas nem recursos automaticamente.
3. Ajustar `AZURE_SPEECH_REGION` e as origens autorizadas em `wrangler.toml`. Usar somente origens exatas; para teste local, acrescentar `http://localhost:4176` explicitamente. O namespace do limitador deve ser exclusivo na conta.
4. Nesta pasta, cadastrar a chave como secret, pelo terminal:

   ```sh
   npx wrangler secret put AZURE_SPEECH_KEY
   npx wrangler deploy
   ```

5. Copiar a URL HTTPS publicada para `endpoint` em `assets/js/voz-config.js`. Esse endereço é público; ele não é uma chave.
6. Testar uma voz online no painel Leitura e uma instrução de trajeto. Conferir o consumo no Azure. Se a cota acabar ou a rede falhar, o site informa a mudança e tenta a voz do aparelho.

## Funcionamento e limites

- O texto só é enviado ao provedor quando a pessoa pede uma leitura e está usando uma voz online. Endereços presentes nas instruções fazem parte desse texto.
- Pedidos aceitam apenas duas vozes, três velocidades e até 1.200 caracteres. O corpo é limitado e o SSML recebe escape.
- A origem é restrita e há limite de 20 pedidos por minuto por origem e IP em cada região Cloudflare. Isso reduz abuso, mas CORS não autentica usuários e esse limite é aproximado; redes móveis ou compartilhadas podem dividir a mesma cota. Usar o plano F0 limita o consumo gratuito no provedor.
- Áudios são mantidos apenas em memória no navegador, com cache pequeno. O Worker não grava textos ou áudios e responde com `Cache-Control: no-store`. O processamento externo continua sujeito às condições do provedor.
- A voz online precisa de internet. A disponibilidade e o som das vozes locais dependem do navegador e do sistema. A qualidade percebida ainda precisa ser ouvida nos aparelhos do público.

Referências: [REST do Azure](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/rest-text-to-speech), [limites do Azure](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/speech-services-quotas-and-limits), [limitação de pedidos no Cloudflare](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/).

## Verificação local sem credenciais

```sh
node --test services/voz/worker.test.mjs
```

Os testes substituem o provedor por respostas fictícias e não consomem a cota Azure. A publicação do Worker e a escuta de vozes reais dependem da conta e da configuração da equipe.
