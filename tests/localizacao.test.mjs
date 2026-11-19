import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const busca = readFileSync(new URL('../assets/js/busca-locais.js', import.meta.url), 'utf8');
const preferencia = readFileSync(new URL('../assets/js/preferencia-bairro.js', import.meta.url), 'utf8');

function buscador(features, ok = true) {
  let pedido;
  const contexto = {
    ZELA: { bairros: {} }, URLSearchParams,
    fetch: async url => { pedido = new URL(url); return { ok, json: async () => ({ features }) }; }
  };
  vm.runInNewContext(busca, contexto);
  return { consultar: contexto.ZELA.buscaLocais.bairroPelaPosicao, pedido: () => pedido };
}
const bairro = { type: 'district', osm_value: 'suburb', countrycode: 'BR', name: 'Bairro de Teste', city: 'Cidade de Teste', state: 'SP' };
const rua = { type: 'street', countrycode: 'BR', name: 'Rua de Teste', district: bairro.name, city: bairro.city, state: 'SP' };
const coords = { latitude: -23.5612345, longitude: -46.6512345 };

test('GPS preserva a rua encontrada e mantém a posição enviada aproximada', async () => {
  const b = buscador([{ properties: bairro }, { properties: rua }]);
  const resultado = await b.consultar(coords);
  assert.equal(resultado.nome, bairro.name);
  assert.equal(resultado.rotuloBusca, rua.name);
  assert.equal(b.pedido().searchParams.get('lat'), '-23.561');
  assert.equal(b.pedido().searchParams.get('lon'), '-46.651');
  assert(b.pedido().searchParams.getAll('layer').includes('street'));
});

test('GPS sem rua mantém o bairro disponível sem inventar endereço', async () => {
  const resultado = await buscador([{ properties: bairro }]).consultar(coords);
  assert.equal(resultado.nome, bairro.name);
  assert.equal(resultado.rotuloBusca, undefined);
});

test('falha do provedor não produz um bairro ou endereço falso', async () => {
  await assert.rejects(buscador([], false).consultar(coords), /indisponível/);
});

test('selecionar um endereço mantém a rua no campo e salva somente o bairro', () => {
  const elementos = new Map();
  function elemento() {
    const attrs = {};
    return { textContent: '', hidden: false, setAttribute(k, v) { attrs[k] = v; }, getAttribute(k) { return attrs[k] || ''; }, after(e) { elementos.set(e.id, e); } };
  }
  ['local', 'local-gps', 'local-gps-status'].forEach(id => elementos.set(id, elemento()));
  let configSeletor, recebido, salvo;
  const contexto = {
    window: { isSecureContext: false }, navigator: {},
    document: { getElementById: id => elementos.get(id), createElement: elemento },
    ZELA: {
      bairros: {}, conta: { atual: () => null }, store: { get: () => null, set: (_, v) => { salvo = v; } },
      iniciarCampoLocal: config => {
        configSeletor = config;
        return { definir: valor => { elementos.get('local').value = valor?.rotuloBusca || valor?.nome || ''; }, semRascunho: () => true };
      }
    }
  };
  vm.runInNewContext(preferencia, contexto);
  const campo = contexto.ZELA.iniciarCampoBairro('local', { escolher: valor => { recebido = valor; } });
  configSeletor.escolher({ tipo: 'bairro', nome: bairro.name, cidade: bairro.city, estado: 'SP', rotuloBusca: 'Rua de Teste · 12345-000' });
  assert.equal(elementos.get('local').value, 'Rua de Teste · 12345-000');
  assert.match(elementos.get('local-endereco').textContent, /Rua de Teste/);
  assert.equal(elementos.get('local-endereco').hidden, false);
  assert.equal(campo.escolhido().nome, bairro.name);
  contexto.ZELA.bairroPreferido.salvar(recebido);
  assert.equal(salvo.nome, bairro.name);
  assert.equal(salvo.rotuloBusca, undefined);
});
