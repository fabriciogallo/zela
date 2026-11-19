import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from './worker.mjs';

const origem = 'https://fabriciogallo.github.io';
const base = { ALLOWED_ORIGINS: origem, AZURE_SPEECH_KEY: 'chave-ficticia-de-teste', AZURE_SPEECH_REGION: 'brazilsouth', VOZ_LIMIT: { limit: async () => ({ success: true }) } };
const valido = { texto: 'Vire à direita.', voz: 'pt-BR-FranciscaNeural', velocidade: 1 };
function pedido(dados = valido, headers = {}) {
  return new Request('https://voz.example/', { method: 'POST', headers: { Origin: origem, 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(dados) });
}
test('recusa origem externa e chave ausente', async () => {
  assert.equal((await worker.fetch(pedido(valido, { Origin: 'https://outra.example' }), base)).status, 403);
  const resposta = await worker.fetch(pedido(), { ...base, AZURE_SPEECH_KEY: '' });
  assert.equal(resposta.status, 503);
  assert(!JSON.stringify(await resposta.json()).includes(base.AZURE_SPEECH_KEY));
});
test('recusa corpo longo, voz não autorizada e valores incorretos', async () => {
  for (const dado of [{ ...valido, texto: 'x'.repeat(1201) }, { ...valido, voz: 'outra-voz' }, { ...valido, velocidade: 100 }, null]) {
    assert.equal((await worker.fetch(pedido(dado), base)).status, 400);
  }
  assert.equal((await worker.fetch(pedido({ ...valido, texto: 'x'.repeat(5000) }), base)).status, 413);
});
test('limita pedidos antes de chamar o provedor', async () => {
  const env = { ...base, VOZ_LIMIT: { limit: async () => ({ success: false }) } };
  assert.equal((await worker.fetch(pedido(), env)).status, 429);
});
test('escapa SSML e devolve áudio sem expor a chave', async t => {
  const anterior = globalThis.fetch;
  t.after(() => { globalThis.fetch = anterior; });
  globalThis.fetch = async (url, init) => {
    assert.equal(new URL(url).hostname, 'brazilsouth.tts.speech.microsoft.com');
    assert(init.body.includes('&lt;voice&gt;') && init.body.includes('&amp;'));
    return new Response(new Uint8Array([1, 2, 3]), { headers: { 'Content-Type': 'audio/mpeg' } });
  };
  const resposta = await worker.fetch(pedido({ ...valido, texto: '<voice> Rua A & B' }), base);
  assert.equal(resposta.status, 200);
  assert.equal(resposta.headers.get('Access-Control-Allow-Origin'), origem);
  assert.equal(resposta.headers.get('Cache-Control'), 'no-store');
  assert.equal((await resposta.arrayBuffer()).byteLength, 3);
});
test('falha do provedor retorna mensagem genérica', async t => {
  const anterior = globalThis.fetch;
  t.after(() => { globalThis.fetch = anterior; });
  globalThis.fetch = async () => new Response('erro interno e detalhes privados', { status: 401 });
  const resposta = await worker.fetch(pedido(), base);
  assert.equal(resposta.status, 503);
  assert(!(await resposta.text()).includes('privados'));
});
