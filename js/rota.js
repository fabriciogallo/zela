/* Zela — Rota acessível.
   Calcula o caminho com menos barreiras para o jeito de andar da pessoa
   (algoritmo de Dijkstra sobre os trechos de calçada de ZELA.rota). */
(function () {
  "use strict";

  var R = ZELA.rota;
  var $ = function (id) { return document.getElementById(id); };
  var SVGNS = "http://www.w3.org/2000/svg";

  /* Quanto cada barreira pesa para cada perfil. Infinity = trecho proibido. */
  var PESOS = {
    cadeira:  { escada: Infinity, inclMax: 8,  inclForte: 3,   inclMedia: 0.8, ruim: 3,   irregular: 1,   semRampa: Infinity, escuro: 0.5, tatil: 0 },
    andador:  { escada: 4,        inclMax: 99, inclForte: 2.5, inclMedia: 1,   ruim: 3,   irregular: 1.2, semRampa: 0.8,      escuro: 1,   tatil: 0 },
    carrinho: { escada: Infinity, inclMax: 99, inclForte: 1.2, inclMedia: 0.4, ruim: 1.5, irregular: 0.6, semRampa: 2,        escuro: 0.5, tatil: 0 },
    visual:   { escada: 1,        inclMax: 99, inclForte: 0.3, inclMedia: 0,   ruim: 2,   irregular: 1,   semRampa: 0.5,      escuro: 1.5, tatil: -0.3 }
  };

  function avisoAberto(id) {
    if (!id) return null;
    var a = ZELA.avisos.filter(function (x) { return x.id === id; })[0];
    return a && a.status !== "Resolvido" ? a : null;
  }

  function minusc(s) { return s.charAt(0).toLowerCase() + s.slice(1); }

  function nivelIncl(i) {
    if (i <= 2) return "plano";
    if (i <= 5) return "inclinação leve (" + i + "%)";
    if (i <= 8) return "ladeira moderada (" + i + "%)";
    return "ladeira forte (" + i + "%)";
  }

  /* Fator de custo de um trecho + motivos (em linguagem simples). */
  function avaliar(t, perfil, pref) {
    var p = PESOS[perfil], soma = 0, motivos = [];
    function add(v, txt) { if (v) { soma += v; if (v > 0 && txt) motivos.push(txt); } }

    if (t.escada) add(p.escada, "escadaria com " + t.escada + " degraus");
    if (t.incl > p.inclMax) add(Infinity, nivelIncl(t.incl) + ", acima do limite testado de " + p.inclMax + "%");
    else if (t.incl > 8) add(p.inclForte, nivelIncl(t.incl));
    else if (t.incl >= 5) add(p.inclMedia, nivelIncl(t.incl));
    if (t.piso === "ruim") add(p.ruim, "calçada em mau estado");
    if (t.piso === "irregular") add(p.irregular, "calçada irregular");
    if (!t.rampa && !t.escada) add(p.semRampa, "esquina sem rampa");
    if (pref.noite && !t.luz) add(p.escuro, "rua escura à noite");
    if (t.tatil) add(p.tatil);
    if (pref.descanso && t.banco) soma -= 0.15;

    var av = avisoAberto(t.aviso);
    if (av && pref.avisos) {
      if (av.cat === "luz") { if (pref.noite) add(p.escuro, "poste apagado (aviso nº " + av.id + " no Zela)"); }
      else if (av.cat === "buraco") add(1, minusc(av.titulo) + " (aviso nº " + av.id + " no Zela)");
      else add(4, minusc(av.titulo) + " (aviso nº " + av.id + " no Zela)");
    }
    return { fator: soma === Infinity ? Infinity : Math.max(0.6, 1 + soma), motivos: motivos };
  }

  /* Dijkstra. custoDe(t) devolve o custo do trecho ou Infinity. */
  function caminho(origem, destino, custoDe) {
    var dist = {}, ant = {}, aberto = {};
    Object.keys(R.lugares).forEach(function (k) { dist[k] = Infinity; aberto[k] = true; });
    dist[origem] = 0;
    while (true) {
      var u = null;
      Object.keys(aberto).forEach(function (k) { if (u === null || dist[k] < dist[u]) u = k; });
      if (u === null || dist[u] === Infinity) break;
      delete aberto[u];
      if (u === destino) break;
      R.trechos.forEach(function (t) {
        if (t.de !== u && t.para !== u) return;
        var v = t.de === u ? t.para : t.de;
        if (!aberto[v]) return;
        var c = custoDe(t);
        if (c === Infinity) return;
        if (dist[u] + c < dist[v]) { dist[v] = dist[u] + c; ant[v] = { de: u, t: t }; }
      });
    }
    if (dist[destino] === Infinity) return null;
    var passos = [], n = destino;
    while (n !== origem) { passos.unshift({ de: ant[n].de, para: n, t: ant[n].t }); n = ant[n].de; }
    return passos;
  }

  function nomeLugar(k) { return R.lugares[k].nome; }

  /* ---------- Formulário ---------- */
  var form = $("form-rota"), selDe = $("r-de"), selPara = $("r-para");
  var resultado = $("resultado");

  Object.keys(R.lugares).forEach(function (k) {
    var l = R.lugares[k];
    if (!l.destino) return;
    [selDe, selPara].forEach(function (sel) {
      var o = document.createElement("option");
      o.value = k; o.textContent = l.nome + " — " + l.ref;
      sel.appendChild(o);
    });
  });

  function lerPref() {
    return {
      de: selDe.value, para: selPara.value, perfil: form.elements.perfil.value,
      noite: $("p-noite").checked, avisos: $("p-avisos").checked, descanso: $("p-descanso").checked
    };
  }

  function aplicarPref(p) {
    selDe.value = p.de;
    selPara.value = p.para;
    form.elements.perfil.value = p.perfil;
    $("p-noite").checked = p.noite;
    $("p-avisos").checked = p.avisos;
    $("p-descanso").checked = p.descanso;
    limparErros();
  }

  function limparErros() {
    $("err-perfil").textContent = "";
    $("err-destino").textContent = "";
    selPara.removeAttribute("aria-invalid");
  }

  function validar(p) {
    limparErros();
    if (p.de === p.para) {
      $("err-destino").textContent = "O destino é igual ao ponto de partida. Escolha outro lugar em “Indo para”.";
      selPara.setAttribute("aria-invalid", "true");
      selPara.focus();
      return false;
    }
    if (!p.perfil) {
      $("err-perfil").textContent = "Escolha como você se locomove.";
      form.elements.perfil[0].focus();
      return false;
    }
    return true;
  }

  /* ---------- Resultado ---------- */
  function calcular(p) {
    var acessivel = caminho(p.de, p.para, function (t) {
      var a = avaliar(t, p.perfil, p);
      return a.fator === Infinity ? Infinity : t.m * a.fator;
    });
    var curto = caminho(p.de, p.para, function (t) { return t.m; });
    return { p: p, rota: acessivel, curto: curto };
  }

  function soma(rota, campo) { return rota.reduce(function (s, x) { return s + x.t[campo]; }, 0); }

  function etiquetas(t) {
    var tags = [nivelIncl(t.incl)];
    if (t.escada) tags.push("escadaria: " + t.escada + " degraus com corrimão");
    tags.push(t.piso === "bom" ? "calçada boa" : (t.piso === "ruim" ? "calçada em mau estado" : "calçada irregular"));
    tags.push(t.rampa ? "rampas nas esquinas" : "sem rampa na esquina");
    if (t.tatil) tags.push("piso tátil");
    if (t.banco) tags.push("banco para descansar");
    if (!t.luz) tags.push("pouca luz à noite");
    var av = avisoAberto(t.aviso);
    if (av) tags.push("aviso do Zela: " + minusc(av.titulo));
    return tags;
  }

  function textoPasso(x, i, total) {
    var t = x.t, txt = "";
    if (t.travessia) txt += t.travessia + " ";
    txt += (i === 0 ? "Saia pela " : "Siga pela ") + t.rua + " por " + t.m + " metros";
    var art = R.lugares[x.para].art || "a";
    txt += i === total - 1 ? " e chegue em " + nomeLugar(x.para) + "." : " até " + art + " " + nomeLugar(x.para) + ".";
    if (t.escada) txt += " Use o corrimão.";
    return txt;
  }

  function render(res, anunciar) {
    var p = res.p, perfil = R.perfis[p.perfil];
    resultado.hidden = false;
    $("res-titulo").textContent = "De " + nomeLugar(p.de) + " até " + nomeLugar(p.para);
    $("res-perfil").textContent = perfil.nome + (p.noite ? " · à noite" : "");
    $("trip-resumo").textContent = (R.lugares[p.de].curto || nomeLugar(p.de)) + " → " + (R.lugares[p.para].curto || nomeLugar(p.para)) + " · " + perfil.nome + (p.noite ? " · à noite" : "");

    var semRota = !res.rota;
    $("sem-rota").hidden = !semRota;
    $("com-rota").hidden = semRota;
    pararFala();

    if (semRota) {
      if (anunciar) $("sem-rota-t").focus();
      return;
    }

    var rota = res.rota, metros = soma(rota, "m");
    var maxIncl = Math.max.apply(null, rota.map(function (x) { return x.t.incl; }));
    $("st-dist").textContent = metros + " m";
    $("st-tempo").textContent = Math.max(1, Math.round(metros / perfil.mPorMin)) + " min";
    $("st-incl").textContent = maxIncl + "%";

    /* Passo a passo */
    var ol = $("passos");
    ol.innerHTML = "";
    rota.forEach(function (x, i) {
      var li = document.createElement("li");
      li.className = "route-step";
      li.innerHTML =
        '<span class="route-n" aria-hidden="true">' + (i + 1) + "</span>" +
        '<div class="stack" style="gap:8px;min-width:0">' +
          "<p class=\"t-lead\">" + ZELA.escapar(textoPasso(x, i, rota.length)) + "</p>" +
          '<ul class="list-reset route-tags">' + etiquetas(x.t).map(function (e) { return "<li>" + ZELA.escapar(e) + "</li>"; }).join("") + "</ul>" +
        "</div>";
      ol.appendChild(li);
    });
    var fim = document.createElement("li");
    fim.className = "route-step";
    fim.innerHTML = '<span class="route-n" aria-hidden="true">✓</span><p class="t-lead">Você chegou: <strong>' +
      ZELA.escapar(nomeLugar(p.para)) + "</strong>, " + ZELA.escapar(R.lugares[p.para].ref) + ".</p>";
    ol.appendChild(fim);

    /* Por que não o caminho mais curto? */
    var ids = rota.map(function (x) { return x.t.id; });
    var evitados = (res.curto || []).filter(function (x) { return ids.indexOf(x.t.id) < 0; });
    var porque = $("porque-lista");
    porque.innerHTML = "";
    var itens = [];
    evitados.forEach(function (x) {
      var a = avaliar(x.t, p.perfil, p);
      if (a.motivos.length) itens.push("<li><strong>" + ZELA.escapar(x.t.rua) + ":</strong> " + ZELA.escapar(a.motivos.join(", ")) + ".</li>");
    });
    var metrosCurto = res.curto ? soma(res.curto, "m") : metros;
    if (itens.length) {
      $("porque-intro").textContent = "O caminho mais curto tem " + metrosCurto + " m, mas passa por:";
      porque.innerHTML = itens.join("");
    } else {
      $("porque-intro").textContent = "O caminho mais curto atende às preferências selecionadas nesta simulação.";
    }
    $("st-evitados").textContent = String(itens.length);

    desenharMapa(rota, res.curto, p);

    /* Link para compartilhar */
    var link = new URL(location.href);
    link.hash = "";
    link.search = new URLSearchParams({
      de: p.de, para: p.para, perfil: p.perfil, noite: p.noite ? "1" : "0",
      avisos: p.avisos ? "1" : "0", descanso: p.descanso ? "1" : "0"
    });
    $("link-rota").value = link.href;

    if (anunciar) {
      ZELA.anunciar("Rota pronta: " + metros + " metros, cerca de " + $("st-tempo").textContent + ", em " + rota.length + " trechos.");
      $("res-titulo").focus();
    }
  }

  /* ---------- Mapa ---------- */
  function pontoMeio(t) {
    var a = R.lugares[t.de], b = R.lugares[t.para];
    var mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    if (!t.curva) return { x: mx, y: my, d: "M" + a.x + " " + a.y + " L" + b.x + " " + b.y };
    var dx = b.x - a.x, dy = b.y - a.y, len = Math.sqrt(dx * dx + dy * dy);
    var cx = mx + (-dy / len) * t.curva * 2, cy = my + (dx / len) * t.curva * 2;
    return { x: (a.x + 2 * cx + b.x) / 4, y: (a.y + 2 * cy + b.y) / 4, d: "M" + a.x + " " + a.y + " Q" + cx + " " + cy + " " + b.x + " " + b.y };
  }

  function el(nome, attrs, pai) {
    var e = document.createElementNS(SVGNS, nome);
    Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (pai) pai.appendChild(e);
    return e;
  }

  function desenharMapa(rota, curto, p) {
    var svg = $("rota-mapa");
    var caixa = svg.parentNode;
    if (!caixa.querySelector(".map-tiles")) ZELA.mapaReal(caixa, ZELA.centros.angela, 420 / 600);
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    var ruas = el("g", { fill: "none", "stroke-linecap": "round" }, svg);

    R.trechos.forEach(function (t) {
      var g = pontoMeio(t);
      el("path", { d: g.d, stroke: "rgba(31, 31, 41, 0.35)", "stroke-width": t.escada ? 4 : 6 }, ruas);
      if (t.escada) el("path", { d: g.d, stroke: "#000", "stroke-width": 12, "stroke-dasharray": "2 6" }, ruas);
    });

    if (curto && rota && curto.map(function (x) { return x.t.id; }).join() !== rota.map(function (x) { return x.t.id; }).join()) {
      curto.forEach(function (x) { el("path", { d: pontoMeio(x.t).d, stroke: "#000", "stroke-width": 3, "stroke-dasharray": "8 7" }, ruas); });
    }
    if (rota) rota.forEach(function (x) { el("path", { d: pontoMeio(x.t).d, "class": "route-path", "stroke-width": 9 }, ruas); });

    /* Avisos abertos no caminho */
    R.trechos.forEach(function (t) {
      if (!avisoAberto(t.aviso)) return;
      var m = pontoMeio(t);
      el("circle", { cx: m.x, cy: m.y, r: 11, fill: "#f2f2f2", stroke: "#a3300b", "stroke-width": 3 }, svg);
      var tx = el("text", { x: m.x, y: m.y + 5, "text-anchor": "middle", "font-size": 15, "font-weight": 700, fill: "#a3300b" }, svg);
      tx.textContent = "!";
    });

    /* Lugares */
    Object.keys(R.lugares).forEach(function (k) {
      var l = R.lugares[k], noCaminho = p && (k === p.de || k === p.para);
      if (l.destino) {
        el("rect", { x: l.x - 9, y: l.y - 9, width: 18, height: 18, rx: 5, fill: noCaminho ? "#1f1f29" : "#ffffff", stroke: "#000", "stroke-width": 2.5 }, svg);
        var nome = el("text", { x: l.x, y: l.y + (l.y > 300 ? -18 : 30), "text-anchor": "middle", "font-size": 15, "font-weight": 700, fill: "#000",
          stroke: "#f2f2f2", "stroke-width": 4, "paint-order": "stroke" }, svg);
        nome.textContent = l.curto;
      } else {
        el("circle", { cx: l.x, cy: l.y, r: 5, fill: "#000" }, svg);
      }
    });

    /* Números dos passos */
    if (rota) rota.forEach(function (x, i) {
      var m = pontoMeio(x.t);
      el("circle", { cx: m.x, cy: m.y, r: 13, fill: "#f2f2f2", stroke: "#000", "stroke-width": 2.5 }, svg);
      var tx = el("text", { x: m.x, y: m.y + 5, "text-anchor": "middle", "font-size": 15, "font-weight": 700, fill: "#000" }, svg);
      tx.textContent = String(i + 1);
    });
  }

  /* ---------- Ouvir instruções (leitura em voz alta) ---------- */
  var leituraAtual = null;
  ZELA.ligarLeituraRota = function (botao, selecaoPassos) {
    function finalizar(cancelar) {
      if (!leituraAtual || leituraAtual.botao !== botao) return;
      leituraAtual = null;
      botao.textContent = "Ouvir as instruções";
      if (cancelar) window.speechSynthesis.cancel();
    }
    if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
      botao.hidden = true;
    } else {
      botao.addEventListener("click", function () {
        var mesmaLeitura = leituraAtual && leituraAtual.botao === botao;
        if (leituraAtual) leituraAtual.finalizar(true);
        if (mesmaLeitura) return;

        var instrucoes = Array.from(document.querySelectorAll(selecaoPassos), function (el, i) {
          return "Passo " + (i + 1) + ". " + el.textContent.trim();
        });
        if (!instrucoes.length) return;
        var fala = new SpeechSynthesisUtterance(instrucoes.join(" "));
        fala.lang = "pt-BR";
        fala.rate = 0.9;
        fala.onend = function () {
          if (leituraAtual && leituraAtual.fala === fala) finalizar(false);
        };
        fala.onerror = function () {
          if (!leituraAtual || leituraAtual.fala !== fala) return;
          finalizar(false);
          ZELA.anunciar("A leitura em voz alta está indisponível. As instruções estão na lista de passos.");
        };
        leituraAtual = { botao: botao, fala: fala, finalizar: finalizar };
        botao.textContent = "Parar a leitura";
        window.speechSynthesis.speak(fala);
      });
    }
    return function () { finalizar(true); };
  };
  var pararFala = ZELA.ligarLeituraRota($("btn-ouvir"), "#passos .t-lead");
  /* ---------- Copiar link ---------- */
  $("btn-copiar-rota").addEventListener("click", function () {
    var campo = $("link-rota");
    var feito = function () { $("copiado").textContent = "Link copiado. Mande para quem vai com você."; };
    var selecionar = function () {
      campo.focus();
      campo.select();
      $("copiado").textContent = "Link selecionado para copiar.";
    };
    if (navigator.clipboard) navigator.clipboard.writeText(campo.value).then(feito, selecionar);
    else selecionar();
  });

  /* ---------- Eventos ---------- */
  $("btn-inverter").addEventListener("click", function () {
    var a = selDe.value; selDe.value = selPara.value; selPara.value = a;
    limparErros();
    ZELA.anunciar("Invertido. Saindo de " + nomeLugar(selDe.value) + ", indo para " + nomeLugar(selPara.value) + ".");
  });
  form.addEventListener("change", limparErros);

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var p = lerPref();
    if (!validar(p)) return;
    ZELA.store.set("rota", p);
    $("copiado").textContent = "";
    fecharDialogo();
    render(calcular(p), true);
  });

  /* ---------- Pop-up do trajeto ---------- */
  var dlg = $("dlg-rota"), salvoAntes = null;
  function abrirDialogo() {
    salvoAntes = lerPref();
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute("open", "");
    $("form-rota-t").focus();
  }
  function fecharDialogo(desfazer) {
    if (desfazer && salvoAntes) aplicarPref(salvoAntes);
    if (dlg.open) { if (dlg.close) dlg.close(); else dlg.removeAttribute("open"); }
    $("btn-trajeto").focus();
  }
  $("btn-trajeto").addEventListener("click", abrirDialogo);
  $("btn-fechar-dlg").addEventListener("click", function () { fecharDialogo(true); });
  dlg.addEventListener("cancel", function (e) { e.preventDefault(); fecharDialogo(true); }); /* tecla Esc */
  dlg.addEventListener("click", function (e) {
    if (e.target !== dlg) return;
    var r = dlg.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) fecharDialogo(true); /* clique fora */
  });

  /* Início: link compartilhado > preferência salva > padrão */
  var qs = new URLSearchParams(location.search);
  var compartilhada = ["de", "para", "perfil"].some(function (k) { return qs.has(k); });
  var salvo = compartilhada ? {
    de: qs.get("de"), para: qs.get("para"), perfil: qs.get("perfil"),
    noite: qs.get("noite") === "1", avisos: qs.get("avisos") !== "0", descanso: qs.get("descanso") === "1"
  } : ZELA.store.get("rota", null) || {};
  var ini = {
    de: R.lugares[salvo.de] && R.lugares[salvo.de].destino ? salvo.de : "casa",
    para: R.lugares[salvo.para] && R.lugares[salvo.para].destino ? salvo.para : "ubs",
    perfil: Object.hasOwn(R.perfis, salvo.perfil) ? salvo.perfil : "cadeira",
    noite: salvo.noite === true, avisos: salvo.avisos !== false, descanso: salvo.descanso === true
  };
  if (ini.de === ini.para) { ini.de = "casa"; ini.para = "ubs"; }
  aplicarPref(ini);
  var simulacao = $("simulacao");
  if (compartilhada || location.hash === "#simulacao") {
    simulacao.open = true;
    render(calcular(ini), false);
  }
  simulacao.addEventListener("toggle", function () {
    if (simulacao.open && resultado.hidden) render(calcular(lerPref()), false);
    if (!simulacao.open) pararFala();
  });
})();
