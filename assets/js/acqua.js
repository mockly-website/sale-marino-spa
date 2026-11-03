/* Animazione firma: acqua bassa sulla sabbia che si increspa dove tocchi.
   WebGL leggero: una sola immagine deformata da cerchi d'onda. Se WebGL manca
   o è attivo "riduci movimento", resta la foto ferma. */
(function () {
  "use strict";
  var box = document.querySelector("[data-water]");
  if (!box) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var img = box.querySelector("img");
  var canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  var gl = canvas.getContext("webgl", { antialias: false, alpha: false, premultipliedAlpha: false, powerPreference: "low-power" });
  if (!gl) return;

  var MAX = 10;
  var vs = "attribute vec2 p;varying vec2 v;void main(){v=p*.5+.5;gl_Position=vec4(p,0.,1.);}";
  var fs = [
    "precision mediump float;",
    "varying vec2 v;",
    "uniform sampler2D tex;",
    "uniform vec2 res;",      // misura in px del canvas
    "uniform vec2 cover;",    // scala per riempire come object-fit: cover
    "uniform float t;",
    "uniform vec4 drops[" + MAX + "];", // x, y (0..1), inizio, forza
    "float height(vec2 q){",
    "  float a=res.x/res.y;",
    "  vec2 s=vec2(q.x*a,q.y);",
    // respiro dell'acqua: onde lunghe e lente
    "  float h=sin(s.x*7.+t*.55)*.25+sin(s.y*9.-t*.42+s.x*2.)*.22+sin((s.x+s.y)*13.+t*.8)*.1;",
    "  h*=.35;",
    "  for(int i=0;i<" + MAX + ";i++){",
    "    vec4 d=drops[i];",
    "    float age=t-d.z;",
    "    if(d.w<=0.||age<0.||age>4.5) continue;",
    "    vec2 c=vec2(d.x*a,d.y);",
    "    float dist=distance(s,c);",
    "    float front=age*.32;",
    "    float k=dist-front;",
    "    float env=exp(-k*k*90.)*exp(-age*.85)*d.w;",
    "    h+=sin(k*95.)*env*1.6;",
    "  }",
    "  return h;",
    "}",
    "void main(){",
    "  vec2 e=vec2(1.5/res.y,0.);",
    "  float h=height(v);",
    "  vec2 g=vec2(height(v+e.xy)-height(v-e.xy),height(v+e.yx)-height(v-e.yx));",
    "  vec2 uv=(v-.5)/cover+.5;",
    "  uv.y=1.-uv.y;",
    "  uv+=g*vec2(.035,-.035);",
    "  vec3 col=texture2D(tex,clamp(uv,.001,.999)).rgb;",
    "  float light=clamp(dot(normalize(vec3(-g*7.,1.)),normalize(vec3(-.4,.5,1.))),0.,1.);",
    "  col+=pow(light,24.)*.28;",          // riflessi del sole
    "  col*=.94+h*.06;",
    "  gl_FragColor=vec4(col,1.);",
    "}"
  ].join("\n");

  function sh(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  var prog;
  try {
    prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  } catch (err) { return; }
  gl.useProgram(prog);

  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(prog, "p");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  var u = {
    res: gl.getUniformLocation(prog, "res"),
    cover: gl.getUniformLocation(prog, "cover"),
    t: gl.getUniformLocation(prog, "t"),
    drops: gl.getUniformLocation(prog, "drops")
  };
  var drops = new Float32Array(MAX * 4);
  var next = 0;
  var start = performance.now();
  var texW = 1, texH = 1, ready = false;

  function now() { return (performance.now() - start) / 1000; }
  function drop(x, y, strength) {
    drops[next * 4] = x; drops[next * 4 + 1] = y;
    drops[next * 4 + 2] = now(); drops[next * 4 + 3] = strength;
    next = (next + 1) % MAX;
    wake();
  }

  function resize() {
    var r = box.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, r.width < 700 ? 1.5 : 1.25);
    var w = Math.max(1, Math.round(r.width * dpr));
    var h = Math.max(1, Math.round(r.height * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w; canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
    gl.uniform2f(u.res, w, h);
    var ca = w / h, ta = texW / texH;
    gl.uniform2f(u.cover, ca > ta ? 1 : ta / ca, ca > ta ? ca / ta : 1);
  }

  // texture: la stessa foto già caricata dalla pagina, nella misura giusta
  var tex = gl.createTexture();
  var source = new Image();
  source.decoding = "async";
  source.src = window.innerWidth < 900 ? "assets/img/acqua-900.webp" : "assets/img/acqua-1600.webp";
  source.onload = function () {
    texW = source.naturalWidth; texH = source.naturalHeight;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, source);
    ready = true;
    box.insertBefore(canvas, img.nextSibling);
    resize();
    frame();
    box.classList.add("is-live");
    var hint = document.querySelector("[data-water-hint]");
    if (hint) hint.classList.remove("hero__hint--off");
    // la prima goccia, da sola, per far capire che l'acqua è viva
    setTimeout(function () { drop(0.66, 0.58, 1); }, 650);
  };

  var running = false, visible = true, idleDrop = 0;
  function frame() {
    if (!ready) return;
    var t = now();
    gl.uniform1f(u.t, t);
    gl.uniform4fv(u.drops, drops);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    // ogni tanto cade una goccia da sola
    if (t - idleDrop > 6.5) { idleDrop = t; drop(0.45 + Math.random() * 0.45, 0.35 + Math.random() * 0.45, 0.55); }
    if (running) requestAnimationFrame(frame);
  }
  function wake() {
    if (!running && visible && ready && !document.hidden) { running = true; requestAnimationFrame(frame); }
  }
  function sleep() { running = false; }

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (en) {
      visible = en[0].isIntersecting;
      if (visible) wake(); else sleep();
    }).observe(box);
  }
  document.addEventListener("visibilitychange", function () { if (document.hidden) sleep(); else wake(); });
  window.addEventListener("resize", function () { if (ready) { resize(); if (!running) frame(); } });

  // tocco e mouse: il tocco non blocca lo scorrimento
  var hero = box.parentElement;
  var lastMove = 0;
  function pos(e) {
    var r = box.getBoundingClientRect();
    return [(e.clientX - r.left) / r.width, 1 - (e.clientY - r.top) / r.height];
  }
  hero.addEventListener("pointerdown", function (e) {
    if (e.target.closest("a, button")) return;
    var p = pos(e); drop(p[0], p[1], 1);
  }, { passive: true });
  hero.addEventListener("pointermove", function (e) {
    var t = performance.now();
    var gap = e.pointerType === "mouse" ? 140 : 90;
    if (t - lastMove < gap) return;
    if (e.pointerType !== "mouse" && !e.pressure) return;
    lastMove = t;
    var p = pos(e); drop(p[0], p[1], e.pointerType === "mouse" ? 0.35 : 0.6);
  }, { passive: true });

  running = true;
})();
