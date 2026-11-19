import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const fonte = readFileSync(new URL('../assets/js/voz.js', import.meta.url), 'utf8');

function ambiente({ nativo = true, vozes = [], preferencias = {} } = {}) {
  const eventos = [], falas = [];
  const sintese = {
    paused: false, getVoices: () => vozes, speak: f => falas.push(f), cancel() {},
    pause() { this.paused = true; }, resume() { this.paused = false; }, addEventListener() {}
  };
  const janela = { addEventListener() {}, dispatchEvent(e) { eventos.push(e.detail); } };
  if (nativo) { janela.speechSynthesis = sintese; janela.SpeechSynthesisUtterance = class { constructor(texto) { this.text = texto; } }; }
  const contexto = {
    window: janela, ZELA: { store: { get: (chave, padrao) => preferencias[chave] ?? padrao, set() {} } },
    document: { addEventListener() {} },
    SpeechSynthesisUtterance: janela.SpeechSynthesisUtterance, CustomEvent: class { constructor(_, o) { this.detail = o.detail; } },
    fetch() { throw new Error('A leitura do aparelho não deve chamar um serviço externo.'); }
  };
  vm.runInNewContext(fonte, contexto);
  return { voz: contexto.ZELA.voz, eventos, falas, sintese };
}

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

test('respeita a voz e a velocidade escolhidas pela pessoa', () => {
  const escolhida = { lang: 'pt-BR', name: 'Voz escolhida', voiceURI: 'br-escolhida' };
  const a = ambiente({
    vozes: [escolhida, { lang: 'pt-BR', name: 'Outra Voz Natural' }],
    preferencias: { 'voz-preferida': 'aparelho:br-escolhida', 'voz-velocidade': 0.8 }
  });
  a.voz.falar('Uma instrução.');
  assert.equal(a.falas[0].voice, escolhida);
  assert.equal(a.falas[0].rate, 0.8);
});

test('preferências antigas ou inválidas usam a voz automática em ritmo normal', () => {
  const brasileira = { lang: 'pt-BR', name: 'Voz Brasileira', voiceURI: 'br' };
  const a = ambiente({ vozes: [brasileira], preferencias: { 'voz-preferida': 'servico-antigo:voz', 'voz-velocidade': 99 } });
  a.voz.falar('Uma instrução.');
  assert.equal(a.falas[0].voice, brasileira);
  assert.equal(a.falas[0].rate, 1);
});

test('uma falha do sintetizador mantém a alternativa em texto', () => {
  const a = ambiente();
  a.voz.falar('Uma instrução.');
  a.falas[0].onerror({ error: 'synthesis-failed' });
  assert.equal(a.eventos.at(-1).estado, 'indisponivel');
  assert.match(a.eventos.at(-1).mensagem, /texto/);
});
