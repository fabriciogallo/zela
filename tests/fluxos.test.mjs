import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function aplicativo(inicial = {}, bloquear = false) {
  const itens = new Map(Object.entries(inicial).map(([k,v]) => ['zela:'+k, JSON.stringify(v)]));
  const zela = {};
  const contexto = vm.createContext({
    ZELA:zela, window:{ZELA:zela}, document:{documentElement:{},addEventListener(){}}, URLSearchParams,
    localStorage:{getItem:k=>itens.get(k)??null,setItem:(k,v)=>{if(bloquear)throw new Error('armazenamento bloqueado');itens.set(k,v);}}
  });
  for (const nome of ['dados','comum','avisos']) vm.runInContext(readFileSync(new URL('../assets/js/'+nome+'.js',import.meta.url),'utf8'),contexto);
  return zela;
}

test('reabertura muda protocolo, prioridade e lista do bairro e persiste na leitura seguinte', () => {
  const z=aplicativo(),id='ZL-2026-03991';
  assert.equal(z.mural.avaliar(id,false),true);
  assert.equal(z.buscarProtocolo(id).dados.atual,0);
  const a=z.mural.doBairro({nome:'Grajaú',cidade:'São Paulo'}).find(a=>a.protocolo===id);
  assert.equal(a.status,'Recebido');assert.equal(z.prioridade(a,z.mural.totalApoios(a)).nivel,'Alta');
  assert.equal(z.store.get('avaliacoes',{})[id].situacao,'reaberto');
});

test('apoios anônimos passam à conta sem duplicar; outra conta mantém sua própria escolha', () => {
  const z=aplicativo({apoiados:{1:true}}),a=z.mural.encontrar(1);
  assert.equal(z.mural.totalApoios(a),24);
  z.conta.entrar('11900000001','Primeira pessoa');
  assert.equal(z.mural.apoiados()['1'],true);assert.equal(z.mural.totalApoios(a),24);
  z.conta.entrar('11900000002','Segunda pessoa');
  assert.equal(z.mural.apoiados()['1'],undefined);
  assert.equal(z.mural.apoiar(1,true),true);assert.equal(z.mural.totalApoios(a),25);
  assert.equal(z.buscarProtocolo(a.protocolo).dados.apoios,25);
  assert.equal(z.mural.apoiar(1,false),true);assert.equal(z.mural.totalApoios(a),24);
  z.conta.entrar('11900000001','Primeira pessoa');assert.equal(z.mural.apoiados()['1'],true);
});

test('armazenamento bloqueado informa falha sem fingir login, apoio ou reabertura', () => {
  const z=aplicativo({},true);
  assert.match(z.conta.entrar('11900000001','Teste').erro,/armazenamento/);
  assert.equal(z.conta.atual(),null);
  assert.equal(z.mural.apoiar(1,true),false);
  assert.equal(z.mural.avaliar('ZL-2026-03991',false),false);
  assert.equal(z.buscarProtocolo('ZL-2026-03991').dados.atual,3);
});

test('tipos inválidos no armazenamento usam o padrão e registros incompletos não impedem entrar', () => {
  const z=aplicativo({contas:null,apoiados:[],protocolos:{invalido:null}});
  assert.equal(Object.keys(z.store.get('contas',{})).length,0);
  assert.equal(Array.isArray(z.store.get('apoiados',{})),false);
  assert.equal(z.conta.entrar('11900000001','Teste').erro,undefined);
  assert.equal(z.conta.avisos().length,0);
});
