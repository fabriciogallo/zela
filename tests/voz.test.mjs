import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const fonte = readFileSync(new URL('../assets/js/voz.js', import.meta.url), 'utf8');

function ambiente({ online = false, falha, nativo = true, vozes = [] } = {}) {
  const eventos = [], falas = [], ouvintes = {}, audios = [];
  const sintese = {
    paused: false, getVoices: () => vozes, speak: f => falas.push(f), cancel() {},
    pause() { this.paused = true; }, resume() { this.paused = false; }, addEventListener() {}
  };
  class AudioFalso {
    constructor() { audios.push(this); }
    pause() {} load() {} removeAttribute() {}
    play() { return Promise.resolve(); }
  }
  const janela = {
    ZELA_VOZ_CONFIG: online ? { endpoint: 'https://voz.example', vozes: [{ id: 'pt-BR-FranciscaNeural', nome: 'Teste' }] } : {},
    addEventListener(nome, fn) { ouvintes[nome] = fn; },
    dispatchEvent(e) { eventos.push(e.detail); }, setTimeout, clearTimeout
  };
  if (nativo) { janela.speechSynthesis = sintese; janela.SpeechSynthesisUtterance = class { constructor(texto) { this.text = texto; } }; }
  const contexto = {
    window: janela, ZELA: { store: { get: (_, padrao) => padrao, set() {} } },
    document: { addEventListener() {} }, Audio: AudioFalso,
    SpeechSynthesisUtterance: janela.SpeechSynthesisUtterance, CustomEvent: class { constructor(_, o) { this.detail = o.detail; } },
    fetch: falha || (async () => new Response(new Uint8Array([1]), { headers: { 'Content-Type': 'audio/mpeg' } })),
    AbortController, URL, setTimeout, clearTimeout, console
  };
  vm.runInNewContext(fonte, contexto);
  return { voz: contexto.ZELA.voz, eventos, falas, audios, sintese };
}
const assentar = () => new Promise(r => setTimeout(r, 10));

test('prioriza português brasileiro natural e expande abreviações na fala', () => {
  const brasil = { lang: 'pt-BR', name: 'Voz Natural', voiceURI: 'br-natural' };
  const a = ambiente({ vozes: [{ lang: 'pt-PT', name: 'Natural' }, { lang: 'pt-BR', name: 'Antiga' }, brasil] });
  a.voz.falar('Siga 100 m até a UBS.', { origem: 'rota' });
  assert.equal(a.falas[0].voice, brasil);
  assert(a.falas[0].text.includes('100 metros') && a.falas[0].text.includes('unidade básica de saúde'));
});
test('cancelar uma leitura longa impede a continuação por eventos atrasados', () => {
  const a = ambiente();
  a.voz.falar('Uma instrução curta. '.repeat(70), { origem: 'rota' });
  const primeira = a.falas[0];
  a.voz.pausar(); a.voz.retomar(); a.voz.parar();
  primeira.onend();
  assert.equal(a.falas.length, 1);
  assert.equal(a.eventos.at(-1).estado, 'parada');
});
test('sem sintetizador a indisponibilidade é informada sem impedir o texto', () => {
  const a = ambiente({ nativo: false });
  a.voz.falar('Texto acessível.');
  assert.equal(a.eventos.at(-1).estado, 'indisponivel');
  assert.match(a.eventos.at(-1).mensagem, /texto/);
});

test('começar outra leitura depois de pausar libera a síntese do aparelho', () => {
  const a = ambiente();
  a.voz.falar('Primeira instrução.', { origem: 'rota' });
  a.voz.pausar();
  assert.equal(a.sintese.paused, true);
  a.voz.falar('Outra instrução.', { origem: 'ajuda' });
  assert.equal(a.sintese.paused, false);
  assert.equal(a.falas.length, 2);
  assert.equal(a.eventos.at(-1).origem, 'ajuda');
});
test('falha de rede online usa a voz local e informa a troca', async () => {
  const a = ambiente({ online: true, falha: async () => new Response('', { status: 429 }) });
  a.voz.falar('Uma instrução.', { origem: 'rota' });
  await assentar();
  assert.equal(a.falas.length, 1);
  assert.match(a.eventos.at(-1).mensagem, /aparelho/);
});
test('uma resposta de voz atrasada não toca depois de Parar', async () => {
  let resolver;
  const a = ambiente({ online: true, falha: () => new Promise(r => { resolver = r; }) });
  a.voz.falar('Uma instrução.', { origem: 'rota' });
  a.voz.parar();
  resolver(new Response(new Uint8Array([1]), { headers: { 'Content-Type': 'audio/mpeg' } }));
  await assentar();
  assert.equal(a.falas.length, 0);
  assert.equal(a.eventos.at(-1).estado, 'parada');
});

test('o início atrasado do áudio não reativa uma leitura já parada', async () => {
  let resolver;
  const a = ambiente({ online: true });
  a.audios[0].play = () => new Promise(r => { resolver = r; });
  a.voz.falar('Uma instrução.', { origem: 'rota' });
  await assentar();
  assert.equal(typeof resolver, 'function');
  a.voz.parar(); resolver();
  await assentar();
  assert.equal(a.eventos.at(-1).estado, 'parada');
});

test('retomar com resposta atrasada respeita um novo comando Parar', async () => {
  let resolver;
  const a = ambiente({ online: true });
  a.voz.falar('Uma instrução.', { origem: 'rota' });
  await assentar();
  a.voz.pausar();
  a.audios[0].play = () => new Promise(r => { resolver = r; });
  a.voz.retomar(); a.voz.parar(); resolver();
  await assentar();
  assert.equal(a.eventos.at(-1).estado, 'parada');
});
