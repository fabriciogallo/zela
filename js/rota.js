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
    if (t.incl > p.inclMax) add(Infinity, nivelIncl(t.incl) + ", acima do limite de 8% para cadeira de rodas");
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
  var resultado = $("resultado"), ultimo = null;

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
    var perfil = (form.querySelector('input[name="perfil"]:checked') || {}).value;
    return {
      de: selDe.value, para: selPara.value, perfil: perfil,
      noite: $("p-noite").checked, avisos: $("p-avisos").checked, descanso: $("p-descanso").checked
    };
  }

  function aplicarPref(p) {
    if (p.de && R.lugares[p.de]) selDe.value = p.de;
    if (p.para && R.lugares[p.para]) selPara.value = p.para;
    if (p.perfil && PESOS[p.perfil]) form.querySelector('input[name="perfil"][value="' + p.perfil + '"]').checked = true;
    if (typeof p.noite === "boolean") $("p-noite").checked = p.noite;
    if (typeof p.avisos === "boolean") $("p-avisos").checked = p.avisos;
    if (typeof p.descanso === "boolean") $("p-descanso").checked = p.descanso;
  }

  function validar(p) {
    var ok = true;
    $("err-perfil").textContent = "";
    $("err-destino").textContent = "";
    selPara.removeAttribute("aria-invalid");
    if (!p.perfil) { $("err-perfil").textContent = "Escolha como você se locomove para a rota respeitar suas necessidades."; ok = false; }
    if (p.de === p.para) {
      $("err-destino").textContent = "O destino é igual ao ponto de partida. Escolha outro lugar em “Indo para”.";
      selPara.setAttribute("aria-invalid", "true"); ok = false;
    }
    return ok;
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

  function etiquetas(t, p) {
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
    ultimo = res;
    var p = res.p, perfil = R.perfis[p.perfil];
    resultado.hidden = false;
    $("res-titulo").textContent = nomeLugar(p.de) + " → " + nomeLugar(p.para);
    $("res-perfil").textContent = "Rota para: " + perfil.nome.toLowerCase() + (p.noite ? " · à noite" : "");

    var semRota = !res.rota;
    $("sem-rota").hidden = !semRota;
    $("com-rota").hidden = semRota;
    pararFala();

    if (semRota) {
      desenharMapa(null, res.curto, p);
      if (anunciar) { ZELA.anunciar("Não encontramos uma rota sem barreiras para esse trajeto."); $("res-titulo").focus(); }
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
          '<ul class="list-reset route-tags">' + etiquetas(x.t, p).map(function (e) { return "<li>" + ZELA.escapar(e) + "</li>"; }).join("") + "</ul>" +
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
      $("porque-intro").textContent = "O caminho mais curto já é o mais tranquilo para você. Nada a desviar.";
    }
    $("st-evitados").textContent = String(itens.length);

    desenharMapa(rota, res.curto, p);

    /* Link para compartilhar */
    var q = "?de=" + p.de + "&para=" + p.para + "&perfil=" + p.perfil + (p.noite ? "&noite=1" : "");
    $("btn-relatar").href = "relatar.html?tipo=calcada";
    $("link-rota").value = location.href.split("?")[0] + q;

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
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    var ruas = el("g", { fill: "none", "stroke-linecap": "round" }, svg);

    R.trechos.forEach(function (t) {
      var g = pontoMeio(t);
      el("path", { d: g.d, stroke: "#f2f2f2", "stroke-width": t.escada ? 6 : 12 }, ruas);
      if (t.escada) el("path", { d: g.d, stroke: "#000", "stroke-width": 12, "stroke-dasharray": "2 6" }, ruas);
    });

    if (curto && rota && curto.map(function (x) { return x.t.id; }).join() !== rota.map(function (x) { return x.t.id; }).join()) {
      curto.forEach(function (x) { el("path", { d: pontoMeio(x.t).d, stroke: "#000", "stroke-width": 3, "stroke-dasharray": "8 7" }, ruas); });
    }
    if (rota) rota.forEach(function (x) { el("path", { d: pontoMeio(x.t).d, stroke: "#f26b21", "stroke-width": 9 }, ruas); });

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
        el("rect", { x: l.x - 9, y: l.y - 9, width: 18, height: 18, rx: 5, fill: noCaminho ? "#f26b21" : "#f2f2f2", stroke: "#000", "stroke-width": 2.5 }, svg);
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
  var btnOuvir = $("btn-ouvir");
  var temVoz = "speechSynthesis" in window;
  if (!temVoz) { btnOuvir.hidden = true; }

  function pararFala() {
    if (temVoz) window.speechSynthesis.cancel();
    btnOuvir.setAttribute("aria-pressed", "false");
    btnOuvir.textContent = "Ouvir as instruções";
  }

  btnOuvir.addEventListener("click", function () {
    if (btnOuvir.getAttribute("aria-pressed") === "true") { pararFala(); return; }
    var textos = Array.prototype.map.call(document.querySelectorAll("#passos .t-lead"), function (e) { return e.textContent; });
    var fala = new SpeechSynthesisUtterance(textos.map(function (t, i) { return "Passo " + (i + 1) + ". " + t; }).join(" "));
    fala.lang = "pt-BR"; fala.rate = 0.9;
    fala.onend = pararFala;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(fala);
    btnOuvir.setAttribute("aria-pressed", "true");
    btnOuvir.textContent = "Parar a leitura";
  });

  /* ---------- Copiar link ---------- */
  $("btn-copiar-rota").addEventListener("click", function () {
    var campo = $("link-rota");
    var feito = function () { $("copiado").textContent = "Link copiado. Mande para quem vai com você."; };
    if (navigator.clipboard) navigator.clipboard.writeText(campo.value).then(feito, function () { campo.select(); feito(); });
    else { campo.select(); document.execCommand("copy"); feito(); }
  });

  /* ---------- Eventos ---------- */
  $("btn-inverter").addEventListener("click", function () {
    var a = selDe.value; selDe.value = selPara.value; selPara.value = a;
    ZELA.anunciar("Invertido. Saindo de " + nomeLugar(selDe.value) + ", indo para " + nomeLugar(selPara.value) + ".");
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var p = lerPref();
    if (!validar(p)) {
      var erro = form.querySelector(".error:not(:empty)");
      var alvo = erro && erro.id === "err-perfil" ? form.querySelector('input[name="perfil"]') : selPara;
      alvo.focus();
      return;
    }
    ZELA.store.set("rota", p);
    $("copiado").textContent = "";
    render(calcular(p), true);
  });

  /* Início: link compartilhado > preferência salva > padrão */
  var qs = new URLSearchParams(location.search);
  var salvo = ZELA.store.get("rota", null) || {};
  var ini = {
    de: qs.get("de") || salvo.de || "casa",
    para: qs.get("para") || salvo.para || "ubs",
    perfil: qs.get("perfil") || salvo.perfil || "cadeira",
    noite: qs.has("noite") ? true : !!salvo.noite,
    avisos: salvo.avisos !== false,
    descanso: !!salvo.descanso
  };
  aplicarPref(ini);
  var p0 = lerPref();
  if (p0.perfil && p0.de !== p0.para) render(calcular(p0), false);
})();
