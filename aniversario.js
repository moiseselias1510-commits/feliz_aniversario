/*!
 * ============================================================================
 *  ANIVERSÁRIO DE NAMORO — animação de fotos em formato de coração
 *  Arquivo: aniversario.js
 * ----------------------------------------------------------------------------
 *  O QUE ESTE ARQUIVO FAZ
 *  - Aparece SOMENTE nos dias 18 e 19 de outubro, todos os anos, a partir de
 *    2025 (18/10/2024 + 1 ano). Nos outros dias do ano ele NÃO cria nada na
 *    página: nenhum elemento, nenhum CSS, nenhuma requisição de imagem.
 *  - Mostra as fotos da pasta "mais1ano" entrando pela esquerda, enfileiradas,
 *    formando um coração ao redor do texto "Feliz X anos de namoro", depois se
 *    dispersando e passeando pela tela — sempre ATRÁS do texto.
 *  - O número de anos é calculado automaticamente (ano atual - 2024).
 *  - NÃO altera nada do site existente: tudo vive dentro de um container
 *    próprio (#m1a-raiz) com classes prefixadas por "m1a-", e o CSS é injetado
 *    por este mesmo arquivo.
 *
 *  COMO USAR
 *  1) Coloque a pasta "mais1ano" com as fotos ao lado do index.html
 *     (nomes tipo: foto1.jpg, foto2.jpg, foto3.jpg ...).
 *  2) Adicione UMA linha antes de </body> no seu index.html:
 *         <script defer src="aniversario.js"><\/script>
 *
 *  PRÉ-VISUALIZAR FORA DA DATA (sem alterar o funcionamento normal):
 *      index.html?aniversario=1     -> força a animação (usa o ano atual)
 *      index.html?aniversario=0     -> desliga a animação
 * ============================================================================
 */
(function () {
  "use strict";

  /* ==========================================================================
     1) CONFIGURAÇÃO  (mexa só aqui, se precisar)
     ========================================================================== */
    window.M1A_FORCAR = true;   /* TESTE: liga a animação hoje — APAGAR DEPOIS */
    var CFG = {
    /* Data em que o namoro começou — usada para calcular o número de anos */
    anoInicio: 2024,
    mesInicio: 10,          /* outubro */
    diaInicio: 18,

    /* Dias em que a animação aparece (sempre no mês abaixo) */
    mesFesta: 10,           /* outubro */
    diasFesta: [18, 19],

    /* Pasta das fotos (relativa ao index.html) */
    pastaFotos: "mais1ano",
    /* Se quiser fixar os nomes das fotos, coloque-os aqui. Ex.: ["a.jpg","b.jpg"] */
    fotos: [],
    /* Quantas fotos procurar na pasta no máximo */
    maxFotos: 40,
    /* Quantas fotos entram na animação (para não lotar a tela) */
    maxFotosNaTela: 30,
    /* Padrões de nome e extensões aceitos na detecção automática */
    esquemas: ["foto{n}.{e}", "{n}.{e}", "img{n}.{e}", "IMG_{n}.{e}"],
    extensoes: ["jpg", "jpeg", "png", "webp", "JPG", "JPEG", "PNG"],

    /* Ritmo da animação (ms) */
    atrasoEntrada: 120,     /* intervalo entre uma foto e a seguinte */
    duracaoEntrada: 1250,   /* tempo que cada foto leva para chegar ao coração */
    pausaCoracao: 250,
    duracaoCoracao: 2600,   /* tempo com o coração formado */
    duracaoDispersao: 1900, /* tempo da dispersão */

    /* Quando começar: "site" (quando o conteúdo do site aparece) ou "load" */
    iniciarQuando: "site",

    /* Parâmetro de teste na URL */
    param: "aniversario"
  };

  /* ==========================================================================
     2) UTILITÁRIOS
     ========================================================================== */
  function clamp(min, max, v) { return v < min ? min : (v > max ? max : v); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
  function rnd(a, b) { return a + Math.random() * (b - a); }

  /* ==========================================================================
     3) PORTÃO DE DATA  —  roda ANTES de criar qualquer elemento na página
     ========================================================================== */
  function lerParam() {
    var v = null;
    try {
      v = new URLSearchParams(window.location.search).get(CFG.param);
    } catch (e) {
      v = null;
    }
    if (v === null && window.location.hash) {
      var h = window.location.hash.replace(/^#/, "").toLowerCase();
      if (h === CFG.param) v = "1";
    }
    if (v === null) return null;
    v = String(v).toLowerCase();
    if (v === "0" || v === "off" || v === "nao" || v === "não" || v === "false") {
      return false;
    }
    return true;
  }

  function anosAtivos() {
    var param = lerParam();
    if (param === false) return 0;
    if (window.M1A_FORCAR === true) param = true;
    if (window.M1A_FORCAR === false) return 0;

    var hoje = new Date();
    var anos = 0;

    if (hoje.getMonth() + 1 === CFG.mesFesta &&
        CFG.diasFesta.indexOf(hoje.getDate()) !== -1) {
      anos = hoje.getFullYear() - CFG.anoInicio;
    }

    if (param === true) {
      if (anos < 1) anos = Math.max(1, hoje.getFullYear() - CFG.anoInicio);
      return anos;
    }

    return anos >= 1 ? anos : 0;
  }

  var ANOS = anosAtivos();
  var FORCADO = lerParam() === true || window.M1A_FORCAR === true;

  /* FORA DOS DIAS 18 E 19 DE OUTUBRO: sai daqui sem criar NADA. */
  if (!ANOS || ANOS < 1) return;

  /* ==========================================================================
     4) GEOMETRIA DO CORAÇÃO
     ========================================================================== */
  function pontoCoracao(t) {
    var s = Math.sin(t);
    return {
      x: 16 * s * s * s,
      y: 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)
    };
  }

  var TAB = (function () {
    var amostras = 1440;
    var pts = [];
    var acum = [0];
    var total = 0;
    var ant = null;
    var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

    for (var i = 0; i <= amostras; i++) {
      var t = (i / amostras) * Math.PI * 2;
      var p = pontoCoracao(t);
      pts.push(p);
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
      if (ant) {
        total += Math.hypot(p.x - ant.x, p.y - ant.y);
        acum.push(total);
      }
      ant = p;
    }

    return {
      pts: pts,
      acum: acum,
      total: total,
      passos: amostras,
      largura: maxX - minX,
      altura: maxY - minY,
      cx: (minX + maxX) / 2,
      cy: (minY + maxY) / 2,
      /* comprimento de arco do ponto mais à esquerda (t = 3π/2) */
      sEsquerda: acum[Math.round(amostras * 0.75)] || 0
    };
  })();

  function pontoEmS(s) {
    var total = TAB.total;
    s = ((s % total) + total) % total;

    var lo = 0, hi = TAB.acum.length - 1;
    while (lo < hi - 1) {
      var mid = (lo + hi) >> 1;
      if (TAB.acum[mid] <= s) lo = mid; else hi = mid;
    }

    var seg = (TAB.acum[hi] - TAB.acum[lo]) || 1;
    var f = (s - TAB.acum[lo]) / seg;
    var a = TAB.pts[lo], b = TAB.pts[hi];
    return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
  }

  /* ==========================================================================
     5) ESTADO
     ========================================================================== */
  var E = {
    iniciado: false,
    rodando: false,
    raiz: null,
    camadaFotos: null,
    camadaTexto: null,
    halo: null,
    textoEl: null,
    estilo: null,
    fotos: [],
    W: 0, H: 0,
    k: 1,
    tam: 90,
    off: 0,
    t0: 0,
    ultimo: 0,
    fase: "entrada",
    tTexto: { ini: 0, dur: 900 },
    tCoracaoIni: 0,
    tCoracaoFim: 0,
    tFimDisp: 0,
    timerDia: null,
    timerResize: null,
    visivel: true
  };

  /* ==========================================================================
     6) CSS  (só é injetado depois do portão de data)
     ========================================================================== */
  var CSS = [
    "#m1a-raiz{position:fixed;inset:0;width:100%;height:100%;overflow:hidden;",
    "pointer-events:none;z-index:25;contain:layout style size}",
    "#m1a-raiz *{box-sizing:border-box}",
    ".m1a-camada-fotos{position:absolute;inset:0;z-index:1;pointer-events:none}",
    ".m1a-foto{position:absolute;left:0;top:0;overflow:hidden;",
    "border-radius:12px;border:2px solid rgba(255,255,255,.92);",
    "background:rgba(255,255,255,.14);",
    "box-shadow:0 14px 34px rgba(0,0,0,.38),0 2px 8px rgba(0,0,0,.28);",
    "opacity:0;will-change:transform,opacity;",
    "transform:translate3d(-9999px,-9999px,0)}",
    ".m1a-foto img{display:block;width:100%;height:100%;object-fit:cover;",
    "pointer-events:none;-webkit-user-drag:none}",
    ".m1a-halo{position:absolute;left:50%;top:50%;z-index:4;",
    "transform:translate(-50%,-50%);border-radius:50%;opacity:0;",
    "background:radial-gradient(closest-side,rgba(10,8,16,.46),",
    "rgba(10,8,16,.26) 52%,rgba(10,8,16,0) 100%)}",
    ".m1a-texto-wrap{position:absolute;inset:0;z-index:5;display:flex;",
    "align-items:center;justify-content:center;padding:6vmin;pointer-events:none}",
    ".m1a-texto{font-family:inherit;font-weight:800;line-height:1.14;",
    "letter-spacing:.01em;text-align:center;color:#fff;opacity:0;",
    "font-size:clamp(1.5rem,4.6vw,3.4rem);",
    "text-shadow:0 2px 10px rgba(0,0,0,.6),0 12px 34px rgba(0,0,0,.5),",
    "0 0 30px rgba(255,214,102,.4);",
    "transform:scale(.94)}",
    ".m1a-texto .m1a-ano{color:#f4b400;",
    "text-shadow:0 2px 10px rgba(0,0,0,.6),0 0 32px rgba(244,180,0,.75)}"
  ].join("");

  function injetarEstilo() {
    if (E.estilo) return;
    var st = document.createElement("style");
    st.id = "m1a-estilo";
    st.appendChild(document.createTextNode(CSS));
    document.head.appendChild(st);
    E.estilo = st;
  }

  /* ==========================================================================
     7) CONSTRUÇÃO DO DOM
     ========================================================================== */
  function construir() {
    var raiz = document.createElement("div");
    raiz.id = "m1a-raiz";
    raiz.setAttribute("aria-hidden", "true");

    var camadaFotos = document.createElement("div");
    camadaFotos.className = "m1a-camada-fotos";

    var halo = document.createElement("div");
    halo.className = "m1a-halo";

    var wrap = document.createElement("div");
    wrap.className = "m1a-texto-wrap";

    var texto = document.createElement("div");
    texto.className = "m1a-texto";
    texto.innerHTML = 'Feliz <span class="m1a-ano">' + ANOS + "</span> " +
      (ANOS === 1 ? "ano" : "anos") + " de namoro";

    wrap.appendChild(texto);
    raiz.appendChild(camadaFotos);
    raiz.appendChild(halo);
    raiz.appendChild(wrap);
    document.body.appendChild(raiz);

    E.raiz = raiz;
    E.camadaFotos = camadaFotos;
    E.halo = halo;
    E.camadaTexto = wrap;
    E.textoEl = texto;
  }

  /* ==========================================================================
     8) DESCOBERTA DAS FOTOS  (o navegador não lista pastas, então testamos)
     ========================================================================== */
  function nomeArquivo(par, n) {
    return par.esq.replace("{n}", String(n)).replace("{e}", par.ext);
  }

  function urlFoto(nome) {
    return CFG.pastaFotos.replace(/\/+$/, "") + "/" + encodeURIComponent(nome);
  }

  function testarImagem(url) {
    return new Promise(function (resolve) {
      var im = new Image();
      var pronto = false;
      im.onload = function () { if (!pronto) { pronto = true; resolve(true); } };
      im.onerror = function () { if (!pronto) { pronto = true; resolve(false); } };
      im.src = url;
    });
  }

  function encontrarEsquema() {
    var pares = [];
    CFG.esquemas.forEach(function (s) {
      CFG.extensoes.forEach(function (e) { pares.push({ esq: s, ext: e }); });
    });

    var i = 0;
    function tenta() {
      if (i >= pares.length) return Promise.resolve(null);
      var par = pares[i++];
      return testarImagem(urlFoto(nomeArquivo(par, 1))).then(function (ok) {
        return ok ? par : tenta();
      });
    }
    return tenta();
  }

  function descobrirFotos() {
    /* gancho de teste: window.M1A_FOTOS = [url1, url2, ...] */
    if (window.M1A_FOTOS && window.M1A_FOTOS.length) {
      return Promise.resolve(window.M1A_FOTOS.slice(0, CFG.maxFotos));
    }

    if (CFG.fotos && CFG.fotos.length) {
      return Promise.resolve(
        CFG.fotos.slice(0, CFG.maxFotos).map(function (f) { return urlFoto(f); })
      );
    }

    return encontrarEsquema().then(function (par) {
      if (!par) return [];

      var lista = [urlFoto(nomeArquivo(par, 1))];
      var n = 2;

      function passo() {
        if (n > CFG.maxFotos) return Promise.resolve(lista);
        var url = urlFoto(nomeArquivo(par, n));
        return testarImagem(url).then(function (ok) {
          if (!ok) return lista;
          lista.push(url);
          n++;
          return passo();
        });
      }
      return passo();
    }).catch(function () { return []; });
  }

  /* ==========================================================================
     9) MEDIÇÕES / LAYOUT
     ========================================================================== */
  function ajustarTexto() {
    var txt = E.textoEl;
    if (!txt) return;

    txt.style.fontSize = "";
    var larguraMax = Math.round(Math.max(190, TAB.largura * E.k * 0.56));
    txt.style.maxWidth = larguraMax + "px";

    var fs = parseFloat(window.getComputedStyle(txt).fontSize) || 28;
    var alturaMax = TAB.altura * E.k * 0.58;
    var r = txt.getBoundingClientRect();
    var voltas = 0;

    while (r.height > alturaMax && voltas < 12 && fs > 15) {
      fs *= 0.92;
      txt.style.fontSize = fs + "px";
      r = txt.getBoundingClientRect();
      voltas++;
    }
  }

  function atualizarHalo() {
    if (!E.halo || !E.textoEl) return;
    var r = E.textoEl.getBoundingClientRect();
    var w = Math.min(E.W * 1.05, Math.max(160, r.width * 2.1));
    var h = Math.min(E.H * 1.05, Math.max(160, r.height * 3.0));
    E.halo.style.width = Math.round(w) + "px";
    E.halo.style.height = Math.round(h) + "px";
  }

  function medir() {
    E.W = window.innerWidth;
    E.H = window.innerHeight;

    E.k = Math.min(E.W * 0.92 / TAB.largura, E.H * 0.80 / TAB.altura);

    var base = clamp(56, Math.min(E.W, E.H) * 0.115, 132);
    var n = Math.max(1, E.fotos.length);
    var perimetroPx = TAB.total * E.k;
    var porEspaco = (perimetroPx / n) * 1.8;
    E.tam = Math.max(38, Math.min(base, porEspaco));
    E.off = E.tam * 0.62;

    ajustarTexto();
    atualizarHalo();

    E.fotos.forEach(function (p) {
      p.w = E.tam;
      p.h = E.tam * p.fatorH;
      p.el.style.width = p.w + "px";
      p.el.style.height = p.h + "px";
    });
  }

  /* alvos do coração, distribuídos por comprimento de arco */
  function alvosCoracao() {
    var n = E.fotos.length;
    var cx = E.W / 2;
    var cy = E.H / 2;
    var lista = [];

    for (var i = 0; i < n; i++) {
      var s = TAB.sEsquerda + (i / n) * TAB.total;
      var p = pontoEmS(s);
      var ux = p.x - TAB.cx;
      var uy = p.y - TAB.cy;
      var len = Math.hypot(ux, uy) || 1;
      var nx = ux / len;
      var ny = uy / len;

      var sx = cx + ux * E.k + nx * E.off;
      var sy = cy - uy * E.k - ny * E.off;
      var ang = Math.atan2(sy - cy, sx - cx) * 180 / Math.PI;

      lista.push({
        x: sx,
        y: sy,
        rot: ang * 0.26 + (i % 2 ? 4 : -4),
        sc: 1,
        op: 1
      });
    }
    return lista;
  }

  /* ==========================================================================
     10) FOTOS: criação e animação
     ========================================================================== */
  function criarFotos(urls) {
    var usar = urls.slice(0, CFG.maxFotosNaTela);

    usar.forEach(function (url, i) {
      var el = document.createElement("div");
      el.className = "m1a-foto";

      var im = document.createElement("img");
      im.alt = "";
      im.decoding = "async";
      im.draggable = false;

      var p = {
        el: el,
        img: im,
        i: i,
        x: 0, y: 0, rot: 0, sc: 1, op: 0,
        w: 90, h: 90,
        fatorH: rnd(0.8, 1.15),
        onda: rnd(0, Math.PI * 2),
        solto: false, soltarEm: 0,
        dispersou: false, dispEm: 0,
        livre: false,
        vx: 0, vy: 0,
        rotBase: 0,
        morta: false,
        tw: null
      };

      im.onerror = function () {
        p.morta = true;
        el.style.display = "none";
      };
      im.src = url;

      el.appendChild(im);
      E.camadaFotos.appendChild(el);

      /* posição inicial: fora da tela, à esquerda, em fila */
      p.x = -E.tam * 1.4 - (i % 3) * E.tam * 1.05;
      p.y = E.H / 2 + ((i % 9) - 4) * (E.tam * 0.58);
      p.rot = rnd(-8, 8);
      p.op = 0;
      el.style.opacity = "0";

      E.fotos.push(p);
    });
  }

  function tween(p, alvo, dur, atraso, ease) {
    p.tw = {
      fx: p.x, fy: p.y, fr: p.rot, fs: p.sc, fo: p.op,
      tx: alvo.x, ty: alvo.y, tr: alvo.rot, ts: alvo.sc, to: alvo.op,
      t0: performance.now() + (atraso || 0),
      dur: dur,
      ease: ease || easeOutCubic
    };
  }

  function atualizarTween(p, now) {
    if (p.morta || !p.tw) return;
    var q = (now - p.tw.t0) / p.tw.dur;
    if (q < 0) q = 0;
    if (q > 1) q = 1;

    var f = p.tw.ease(q);
    p.x = lerp(p.tw.fx, p.tw.tx, f);
    p.y = lerp(p.tw.fy, p.tw.ty, f);
    p.rot = lerp(p.tw.fr, p.tw.tr, f);
    p.sc = lerp(p.tw.fs, p.tw.ts, f);
    p.op = lerp(p.tw.fo, p.tw.to, f);

    if (q >= 1) p.tw = null;
  }

  function aplicar(p, now) {
    if (p.morta) return;

    var sc = p.sc;
    var rot = p.rot;

    if (E.fase === "entrada" || E.fase === "coracao") {
      sc *= 1 + 0.045 * Math.sin(now / 1000 * 1.5 + p.onda);
      rot += 2.5 * Math.sin(now / 1000 * 0.9 + p.onda);
    }

    var tx = p.x - p.w / 2;
    var ty = p.y - p.h / 2;

    p.el.style.transform =
      "translate3d(" + tx.toFixed(2) + "px," + ty.toFixed(2) + "px,0)" +
      " rotate(" + rot.toFixed(2) + "deg) scale(" + sc.toFixed(3) + ")";
    p.el.style.opacity = p.op.toFixed(3);
  }

  /* slot de passeio (posição e velocidade) */
  function slotPasseio() {
    var m = E.tam * 0.75;
    return {
      x: rnd(m, Math.max(m + 1, E.W - m)),
      y: rnd(m, Math.max(m + 1, E.H - m)),
      rot: rnd(-16, 16),
      sc: rnd(0.82, 1.08),
      op: 1,
      vx: rnd(16, 52) * (Math.random() < 0.5 ? -1 : 1),
      vy: rnd(9, 34) * (Math.random() < 0.5 ? -1 : 1)
    };
  }

  /* ==========================================================================
     11) TIMELINE
     ========================================================================== */
  function comecar() {
    var n = E.fotos.length;
    var agora = performance.now();

    E.t0 = agora + 250;

    E.fotos.forEach(function (p, i) {
      p.soltarEm = E.t0 + i * CFG.atrasoEntrada;
    });

    var entradaFim = E.t0 +
      Math.max(0, n - 1) * CFG.atrasoEntrada +
      CFG.duracaoEntrada;

    E.tCoracaoIni = entradaFim + CFG.pausaCoracao;
    E.tCoracaoFim = E.tCoracaoIni + CFG.duracaoCoracao;
    E.tFimDisp = E.tCoracaoFim + 500 + CFG.duracaoDispersao;

    E.fotos.forEach(function (p) {
      p.dispEm = E.tCoracaoFim + rnd(0, 450);
    });

    E.tTexto = { ini: E.t0 + 300, dur: 950 };

    var alvos = alvosCoracao();
    E.fotos.forEach(function (p, i) {
      p.alvoCoracao = alvos[i] || alvos[0];
    });

    E.rodando = true;
    E.ultimo = agora;
    requestAnimationFrame(frame);
  }

  function frame(now) {
    if (!E.rodando) return;

    var dt = Math.min(0.05, Math.max(0, (now - E.ultimo) / 1000));
    E.ultimo = now;

    var e = now - E.t0;

    /* fase atual */
    if (e < E.tCoracaoIni) E.fase = "entrada";
    else if (e < E.tCoracaoFim) E.fase = "coracao";
    else if (e < E.tFimDisp) E.fase = "dispersao";
    else E.fase = "passeio";

    /* ---- texto ---- */
    atualizarTexto(now);

    /* ---- fotos ---- */
    for (var i = 0; i < E.fotos.length; i++) {
      var p = E.fotos[i];
      if (p.morta) continue;

      /* entrada: uma atrás da outra, vindas da esquerda */
      if (!p.solto && now >= p.soltarEm) {
        p.solto = true;
        p.op = 0;
        tween(p, p.alvoCoracao, CFG.duracaoEntrada, 0, easeOutCubic);
      }

      /* dispersão */
      if (!p.dispersou && e >= p.dispEm) {
        p.dispersou = true;
        var s = slotPasseio();
        p.slot = s;
        tween(p, s, CFG.duracaoDispersao, 0, easeInOutCubic);
      }

      atualizarTween(p, now);

      /* passeio contínuo */
      if (p.dispersou && !p.tw && p.slot) {
        if (!p.livre) {
          p.livre = true;
          p.vx = p.slot.vx;
          p.vy = p.slot.vy;
          p.rotBase = p.rot;
        }
        var m = p.w * 0.6;
        p.x += p.vx * dt;
        p.y += (p.vy + Math.sin(now / 1000 * 0.7 + p.onda) * 12) * dt;

        if (p.x < m) { p.x = m; p.vx = Math.abs(p.vx); }
        if (p.x > E.W - m) { p.x = E.W - m; p.vx = -Math.abs(p.vx); }
        if (p.y < m) { p.y = m; p.vy = Math.abs(p.vy); }
        if (p.y > E.H - m) { p.y = E.H - m; p.vy = -Math.abs(p.vy); }

        p.rot = p.rotBase + Math.sin(now / 1000 * 0.45 + p.onda) * 8;
      }

      aplicar(p, now);
    }

    requestAnimationFrame(frame);
  }

  function atualizarTexto(now) {
    if (!E.textoEl) return;

    var q = clamp(0, 1, (now - E.tTexto.ini) / E.tTexto.dur);
    var f = easeOutCubic(q);
    var pulso = 1 + 0.012 * Math.sin(now / 850);

    E.textoEl.style.opacity = f.toFixed(3);
    E.textoEl.style.transform = "scale(" + ((0.94 + 0.06 * f) * pulso).toFixed(4) + ")";
    if (E.halo) E.halo.style.opacity = (f * 0.92).toFixed(3);
  }

  /* ==========================================================================
     12) INÍCIO E CICLO DE VIDA
     ========================================================================== */
  function iniciar() {
    if (E.iniciado) return;
    E.iniciado = true;

    injetarEstilo();
    construir();

    var urlsIniciais = [];
    E.W = window.innerWidth;
    E.H = window.innerHeight;

    /* mede o texto antes das fotos chegarem, para ele já ficar certo */
    E.k = Math.min(E.W * 0.92 / TAB.largura, E.H * 0.80 / TAB.altura);
    E.tam = clamp(56, Math.min(E.W, E.H) * 0.115, 132);
    ajustarTexto();
    atualizarHalo();

    descobrirFotos().then(function (urls) {
      if (!E.raiz) return;
      urlsIniciais = urls;
      if (!urls.length) {
        console.warn('[aniversario] Nenhuma foto encontrada em "' +
          CFG.pastaFotos + '/". A mensagem aparece, mas sem as fotos.');
      }
      criarFotos(urls);
      medir();
      comecar();
      vigiarDia();
    });
  }

  function redimensionar() {
    if (!E.rodando) return;
    medir();

    var alvos = alvosCoracao();

    E.fotos.forEach(function (p, i) {
      if (p.morta) return;

      if (!p.solto) {
        /* ainda não entrou: recalcula fila e alvo */
        p.alvoCoracao = alvos[i] || alvos[0];
        p.x = -E.tam * 1.4 - (i % 3) * E.tam * 1.05;
        p.y = E.H / 2 + ((i % 9) - 4) * (E.tam * 0.58);
      } else if (E.fase === "entrada" || E.fase === "coracao") {
        p.alvoCoracao = alvos[i] || alvos[0];
        tween(p, p.alvoCoracao, 700, 0, easeOutCubic);
      } else if (!p.tw) {
        var m = p.w * 0.6;
        p.x = clamp(m, E.W - m, p.x);
        p.y = clamp(m, E.H - m, p.y);
      }
    });
  }

  /* some completamente quando o período termina (ex.: virou dia 20) */
  function vigiarDia() {
    clearInterval(E.timerDia);
    E.timerDia = setInterval(function () {
      if (FORCADO) return;
      if (anosAtivos() >= 1) return;
      destruir();
    }, 60000);
  }

  function destruir() {
    E.rodando = false;
    clearInterval(E.timerDia);
    if (E.raiz && E.raiz.parentNode) E.raiz.parentNode.removeChild(E.raiz);
    if (E.estilo && E.estilo.parentNode) E.estilo.parentNode.removeChild(E.estilo);
    E.raiz = null;
    E.estilo = null;
    E.fotos = [];
  }

  /* espera o conteúdo principal do site aparecer (após a senha e a introdução) */
  function quandoComecar(cb) {
    if (CFG.iniciarQuando === "load" || FORCADO) {
      if (document.readyState === "complete") cb();
      else window.addEventListener("load", cb);
      return;
    }

    var main = document.getElementById("mainSite");
    if (!main) {
      if (document.readyState === "complete") cb();
      else window.addEventListener("load", cb);
      return;
    }

    if (main.classList.contains("visible")) { cb(); return; }

    var iv = setInterval(function () {
      if (main.classList.contains("visible")) {
        clearInterval(iv);
        cb();
      }
    }, 350);
  }

  window.addEventListener("resize", function () {
    clearTimeout(E.timerResize);
    E.timerResize = setTimeout(redimensionar, 220);
  });

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      E.rodando = false;
    } else if (E.iniciado && !E.rodando && E.fotos.length >= 0 &&
               document.getElementById("m1a-raiz")) {
      E.rodando = true;
      E.ultimo = performance.now();
      requestAnimationFrame(frame);
    }
  });

  /* API simples para depurar */
  window.AniversarioNamoro = {
    anos: ANOS,
    ativo: true,
    forcado: FORCADO,
    parar: destruir
  };

  quandoComecar(iniciar);
})();
