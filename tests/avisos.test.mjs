import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const fonte = readFileSync(new URL('../assets/js/avisos.js', import.meta.url), 'utf8');
const alvo = { nome: 'Taboão', cidade: 'São Bernardo do Campo', estado: 'SP' };
const id = 'ZL-2026-44968';
function mural(protocolos, avisos = []) {
  const zela = {
    bairros: { angela: 'Jardim Ângela' }, avisos, formatoProtocolo: /^ZL-\d{4}-\d{5}$/,
    etapas: ['Recebido','Encaminhado','Em execução','Resolvido'].map(nome => ({ nome })),
    store: { get: () => protocolos }
  };
  vm.runInNewContext(fonte, { ZELA: zela, URLSearchParams });
  return zela.mural;
}
test('relato antigo aparece pelo bairro e cidade existentes no endereço sem alterar o original', () => {
  const protocolos = { [id]: { cat: 'luz', titulo: 'Poste de teste', local: 'Rua de Teste, 10 — Taboão — São Bernardo do Campo/SP', atual: 0, apoios: 1, dias: 0 } };
  const antes = JSON.stringify(protocolos);
  const lista = mural(protocolos).doBairro(alvo);
  assert.equal(lista.length, 1);
  assert.equal(lista[0].protocolo, id);
  assert.equal(lista[0].status, 'Recebido');
  assert.equal(lista[0].regiao.cidade, alvo.cidade);
  assert.equal(JSON.stringify(protocolos), antes);
});
test('bairro de mesmo nome em outra cidade não recebe o relato', () => {
  const feed = mural({ [id]: { titulo:'Teste', local:'Rua de Teste — Taboão — São Bernardo do Campo/SP', atual:0 } });
  assert.equal(feed.doBairro({ nome:'Taboão', cidade:'São Paulo' }).length, 0);
  assert.equal(feed.doBairro({ nome:'taboao', cidade:'sao bernardo do campo' }).length, 1);
});
test('novo relato com endereço manual usa a região confirmada e guarda risco e situação', () => {
  const feed = mural({ [id]: { titulo:'Calçada de teste', cat:'calcada', local:'Rua de Teste, 10', bairro:alvo, risco:true, atual:2, apoios:1, criadoEm:new Date().toISOString() } });
  const lista=feed.doBairro(alvo);
  assert.equal(lista.length,1); assert.equal(lista[0].status,'Em execução');
  assert.equal(lista[0].risco,true); assert.equal(lista[0].dias,0);
  assert.equal(lista[0].x,undefined); assert.equal(lista[0].y,undefined);
});
test('exemplos e relatos locais convivem sem mudar os IDs dos dados originais', () => {
  const exemplos=[{ id:1, bairro:'angela', titulo:'Exemplo', status:'Recebido' }];
  const feed=mural({ [id]:{ titulo:'Local', local:'Rua de Teste', bairro:{nome:'Jardim Ângela',cidade:'São Paulo'} } },exemplos);
  assert.equal(feed.doBairro({nome:'Jardim Ângela',cidade:'São Paulo'}).length,2);
  assert.equal(feed.encontrar(1).id,'1');
  assert.equal(feed.encontrar('local-'+id).protocolo,id);
  assert.equal(exemplos[0].id,1);
});
test('mesmo protocolo não aparece duas vezes ao integrar os registros', () => {
  const feed=mural({ [id]:{titulo:'Relato salvo',local:'Rua de Teste',bairro:alvo} },[{id:1,protocolo:id,bairro:'angela'}]);
  assert.equal(feed.todos().length,1);
  assert.equal(feed.todos()[0].titulo,'Relato salvo');
});
test('registros inválidos ou sem região conhecida não são atribuídos a um bairro arbitrário', () => {
  const feed=mural({ invalido:{titulo:'Erro',local:'Rua de Teste'}, [id]:{titulo:'Sem bairro',local:'Rua de Teste'}, 'ZL-2026-12345':null });
  assert.equal(feed.todos().length,1);
  assert.equal(feed.doBairro(alvo).length,0);
  assert.equal(feed.regiaoDoEndereco('Rua de Teste'),null);
});
test('link abre o bairro do relato e identifica o aviso na lista', () => {
  const feed=mural({ [id]:{titulo:'Relato',local:'Rua de Teste',bairro:alvo} });
  const link=new URL(feed.linkBairro(id),'https://exemplo.invalid/pages/');
  assert.equal(link.searchParams.get('bairro_nome'),alvo.nome);
  assert.equal(link.searchParams.get('cidade'),alvo.cidade);
  assert.equal(link.hash,'#aviso-local-'+id);
});
