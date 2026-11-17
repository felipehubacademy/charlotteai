// Charlotte em motion: boneco 2D em peças (SVG), versão animada da Charlotte 3D do app.
// Traços que a fazem reconhecível: cabelo castanho ondulado na altura do queixo, repartido de lado;
// óculos grandes de armação escura; olhos castanho-esverdeados; suéter creme de gola redonda;
// calça preta de cintura alta; tênis branco.
//
// Uso:  el.innerHTML = Charlotte.svg();  Charlotte.apply(el, estado)
// estado (tudo opcional):
//   head   inclinação da cabeça em graus (+ = para a direita da tela)
//   nod    aceno de cabeça em px (+ = para baixo)
//   gaze   [x, y] olhar, de -1 a 1
//   blink  0 aberto, 1 fechado
//   mouth  abertura da boca, 0 a 1 (vem da voz)
//   smile  0 a 1 (sorriso da boca fechada)
//   brow   0 a 1 (sobrancelhas levantadas)
//   armL / armR  { s: ombro, e: cotovelo, w: punho } em graus; L = braço do lado esquerdo da tela
//   handL / handR  "open" | "point" | "relax"
//   breathe 0 a 1 (respiro, quase imperceptível)
(function () {
  const C = {
    skin: "#F2C3A1", skinShade: "#E2A684", blush: "#F29C8C",
    hair: "#5B3524", hairShade: "#40241A", hairLight: "#7B4B33",
    frame: "#3A2219", iris: "#7C5B2F", pupil: "#1F140E",
    lip: "#C9675F", mouthIn: "#5B1F26", tongue: "#E27380", teeth: "#FFFFFF",
    sweater: "#F4EEE3", sweaterShade: "#E1D6C4", sweaterLine: "#D3C6B1",
    pants: "#221F27", pantsShade: "#16141A",
    shoe: "#FFFFFF", shoeShade: "#E4E4EA", sole: "#D4D4DC",
  };

  // Braço em coordenadas locais: ombro em (0,0), apontando para baixo (+y).
  function arm(side) {
    const m = side === "L" ? -1 : 1; // espelha o polegar (sempre do lado do corpo)
    return `
    <g class="arm-${side}">
      <g class="fore-${side}" transform="translate(0,146)">
        <path d="M-19,-8 L19,-8 L16,126 L-16,126 Z" fill="${C.sweater}" stroke="${C.sweaterLine}" stroke-width="2.5"/>
        <rect x="-17.5" y="108" width="35" height="20" rx="6" fill="${C.sweaterShade}"/>
        <path d="M-10,110 v16 M-3,110 v16 M4,110 v16 M11,110 v16" stroke="${C.sweaterLine}" stroke-width="1.6"/>
        <g class="hand-${side}" transform="translate(0,128)">
          <g class="h-open">
            <path d="M${-14 * m},-2 L${14 * m},-2 C${17 * m},8 ${18 * m},20 ${15 * m},30 L${-15 * m},30 C${-17 * m},20 ${-17 * m},8 ${-14 * m},-2 Z" fill="${C.skin}"/>
            <rect x="${m > 0 ? 6 : -13}" y="20" width="7.5" height="24" rx="3.75" fill="${C.skin}"/>
            <rect x="${m > 0 ? -1 : -6.5}" y="20" width="7.5" height="29" rx="3.75" fill="${C.skin}"/>
            <rect x="${m > 0 ? -8 : 0.5}" y="20" width="7.5" height="28" rx="3.75" fill="${C.skin}"/>
            <rect x="${m > 0 ? -15 : 7.5}" y="18" width="7.5" height="23" rx="3.75" fill="${C.skin}"/>
            <path d="M${-13 * m},6 C${-25 * m},10 ${-30 * m},22 ${-26 * m},28 C${-22 * m},32 ${-16 * m},24 ${-12 * m},18 Z" fill="${C.skin}"/>
            <path d="M${-8 * m},12 C${-2 * m},16 ${6 * m},16 ${11 * m},12" fill="none" stroke="${C.skinShade}" stroke-width="2" stroke-linecap="round"/>
          </g>
          <g class="h-relax">
            <path d="M${-13 * m},-2 L${13 * m},-2 C${16 * m},10 ${16 * m},24 ${12 * m},34 C${8 * m},42 ${-8 * m},42 ${-11 * m},32 C${-14 * m},22 ${-15 * m},10 ${-13 * m},-2 Z" fill="${C.skin}"/>
            <path d="M${-12 * m},10 C${-18 * m},16 ${-18 * m},26 ${-12 * m},28 Z" fill="${C.skinShade}"/>
          </g>
          <g class="h-point">
            <path d="M${-13 * m},-2 L${13 * m},-2 C${16 * m},8 ${16 * m},20 ${12 * m},28 C${6 * m},34 ${-8 * m},34 ${-12 * m},26 C${-15 * m},18 ${-15 * m},8 ${-13 * m},-2 Z" fill="${C.skin}"/>
            <rect x="${m > 0 ? 1 : -9}" y="18" width="8" height="38" rx="4" fill="${C.skin}"/>
            <path d="M${-12 * m},8 C${-20 * m},12 ${-20 * m},22 ${-12 * m},24 Z" fill="${C.skinShade}"/>
          </g>
        </g>
      </g>
      <path d="M-24,-10 C-27,40 -23,110 -20,150 L20,150 C23,110 27,40 24,-10 Q0,-26 -24,-10 Z" fill="${C.sweater}"/>
      <path d="M-25.5,26 C-26,70 -23,115 -20,150 M25.5,26 C26,70 23,115 20,150" fill="none" stroke="${C.sweaterLine}" stroke-width="2.5" stroke-linecap="round"/>
    </g>`;
  }

  function eye(cx) {
    return `
    <g class="eye" data-cx="${cx}">
      <ellipse cx="${cx}" cy="268" rx="18" ry="20" fill="#fff"/>
      <g class="iris"><circle cx="${cx}" cy="271" r="13" fill="${C.iris}"/><circle cx="${cx}" cy="271" r="13" fill="none" stroke="#5E4220" stroke-width="2"/>
      <circle cx="${cx}" cy="271" r="7" fill="${C.pupil}"/>
      <circle cx="${cx + 4.5}" cy="265.5" r="3.8" fill="#fff"/><circle cx="${cx - 4}" cy="276" r="1.6" fill="#fff" opacity=".8"/></g>
      <path d="${cx > 300 ? `M${cx - 20},266 Q${cx - 2},242 ${cx + 20},262 L${cx + 25},257` : `M${cx - 25},257 L${cx - 20},262 Q${cx + 2},242 ${cx + 20},266`}" fill="none" stroke="${C.pupil}" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M${cx - 13},287 Q${cx},292 ${cx + 13},287" fill="none" stroke="${C.skinShade}" stroke-width="2" stroke-linecap="round" opacity=".8"/>
    </g>`;
  }

  function svg() {
    return `
<svg viewBox="0 0 600 1200" xmlns="http://www.w3.org/2000/svg" class="charlotte" overflow="visible">
  <ellipse cx="300" cy="1166" rx="120" ry="14" fill="#16131F" opacity=".10"/>
  <g class="body">
    <!-- pernas e tênis -->
    <rect x="257" y="1092" width="33" height="22" fill="${C.skin}"/><rect x="310" y="1092" width="33" height="22" fill="${C.skin}"/>
    <path d="M222,636 L302,636 L300,700 L292,1100 L251,1100 C247,1000 237,860 229,760 C225,720 220,680 222,636 Z" fill="${C.pants}"/>
    <path d="M378,636 L298,636 L300,700 L308,1100 L349,1100 C353,1000 363,860 371,760 C375,720 380,680 378,636 Z" fill="${C.pants}"/>
    <path d="M340,700 C346,820 344,960 330,1098 L349,1100 C353,1000 363,860 371,760 C374,730 376,700 377,680 Z" fill="${C.pantsShade}" opacity=".8"/>
    <path d="M262,740 L268,1090 M338,740 L332,1090" stroke="${C.pantsShade}" stroke-width="2"/>
    <path d="M236,1110 C236,1098 292,1096 296,1108 L298,1146 C298,1156 290,1162 280,1162 L230,1162 C214,1162 210,1146 220,1134 C228,1124 236,1120 236,1110 Z" fill="${C.shoe}"/>
    <path d="M364,1110 C364,1098 308,1096 304,1108 L302,1146 C302,1156 310,1162 320,1162 L370,1162 C386,1162 390,1146 380,1134 C372,1124 364,1120 364,1110 Z" fill="${C.shoe}"/>
    <path d="M212,1150 L298,1150 L298,1156 C298,1160 292,1164 284,1164 L222,1164 C214,1164 211,1158 212,1150 Z" fill="${C.sole}"/>
    <path d="M388,1150 L302,1150 L302,1156 C302,1160 308,1164 316,1164 L378,1164 C386,1164 389,1158 388,1150 Z" fill="${C.sole}"/>
    <path d="M250,1116 l26,-2 M252,1124 l24,-2 M350,1116 l-26,-2 M348,1124 l-24,-2" stroke="${C.shoeShade}" stroke-width="3" stroke-linecap="round"/>
    <!-- cintura alta -->
    <path d="M224,622 L376,622 L380,660 L220,660 Z" fill="${C.pants}"/>
    <path d="M222,656 L378,656" stroke="${C.pantsShade}" stroke-width="2"/>
    <g class="torso">
      <path d="M208,402 C232,391 262,387 282,387 Q300,401 318,387 C338,387 368,391 392,402 C404,408 408,424 406,446 L392,560 C388,592 382,614 378,628 L222,628 C218,614 212,592 208,560 L194,446 C192,424 196,408 208,402 Z" fill="${C.sweater}"/>
      <path d="M362,410 C384,420 400,432 404,452 L390,560 C386,590 381,612 378,628 L352,628 C366,560 372,480 362,410 Z" fill="${C.sweaterShade}" opacity=".75"/>
      <path d="M226,620 L374,620" stroke="${C.sweaterLine}" stroke-width="2"/>
      <!-- pescoço -->
      <path d="M283,330 L283,390 Q300,403 317,390 L317,330 Z" fill="${C.skin}"/>
      <path d="M283,352 Q300,366 317,352 L317,372 Q300,382 283,372 Z" fill="${C.skinShade}" opacity=".7"/>
      <path d="M279,387 Q300,409 321,387" fill="none" stroke="${C.sweaterLine}" stroke-width="7" stroke-linecap="round"/>
    </g>
    <g class="armL-root" transform="translate(226,424)">${arm("L")}</g>
    <g class="armR-root" transform="translate(374,424)">${arm("R")}</g>
    <g class="head">
      <!-- cabelo de trás (chanel ondulado, aparece atrás do pescoço) -->
      <path d="M300,142 C372,142 414,186 418,250 C420,300 420,340 410,372 C398,392 370,394 352,386 L350,330 L250,330 L248,386 C230,394 202,392 190,372 C180,340 180,300 182,250 C186,186 228,142 300,142 Z" fill="${C.hairShade}"/>
      <!-- rosto -->
      <path d="M300,172 C350,172 384,205 384,262 C384,300 371,330 341,348 C327,357 313,362 300,362 C287,362 273,357 259,348 C229,330 216,300 216,262 C216,205 250,172 300,172 Z" fill="${C.skin}"/>
      <ellipse cx="249" cy="309" rx="14" ry="8" fill="${C.blush}" opacity=".45"/>
      <ellipse cx="351" cy="309" rx="14" ry="8" fill="${C.blush}" opacity=".45"/>
      ${eye(266)}${eye(334)}
      <g class="brows">
        <path d="M246,234 Q265,223 284,231" fill="none" stroke="${C.hair}" stroke-width="5.5" stroke-linecap="round"/>
        <path d="M316,231 Q335,223 354,234" fill="none" stroke="${C.hair}" stroke-width="5.5" stroke-linecap="round"/>
      </g>
      <path d="M293,302 Q300,308 307,302" fill="none" stroke="${C.skinShade}" stroke-width="3.2" stroke-linecap="round"/>
      <g class="mouth"></g>
      <!-- óculos -->
      <g fill="rgba(255,255,255,.07)" stroke="${C.frame}" stroke-width="5">
        <rect x="232" y="241" width="64" height="55" rx="25"/>
        <rect x="304" y="241" width="64" height="55" rx="25"/>
      </g>
      <path d="M296,262 Q300,256 304,262 M233,256 L216,252 M367,256 L384,252" fill="none" stroke="${C.frame}" stroke-width="5" stroke-linecap="round"/>
      <!-- sombra da franja na testa -->
      <path d="M268,184 C312,198 352,214 376,262 L386,262 C372,220 330,192 272,174 Z" fill="${C.skinShade}" opacity=".6"/>
      <!-- cabelo da frente: risca do lado esquerdo da tela, franja varrida para a direita, volume ondulado dos lados -->
      <path d="M276,140 C246,140 214,152 196,186 C182,212 180,238 180,262 C176,282 170,296 176,316 C182,330 172,344 176,360 C180,380 196,394 214,388 C224,384 226,374 220,368 C212,350 214,330 218,312 C214,292 214,270 218,248 C222,222 236,200 256,186 C264,180 270,178 276,176 Z" fill="${C.hair}"/>
      <path d="M268,140 C330,130 400,150 416,212 C424,240 420,262 424,282 C430,302 420,320 426,338 C432,358 424,380 404,390 C392,396 380,388 384,378 C392,360 384,344 388,326 C390,306 384,282 384,262 C376,232 352,206 318,192 C298,184 282,180 268,176 Z" fill="${C.hair}"/>
      <path d="M262,148 C300,140 360,146 392,186 M392,206 C408,236 406,262 410,286 M410,304 C404,322 410,340 406,362 M226,166 C204,190 196,222 196,256 M194,282 C188,300 196,318 192,340" fill="none" stroke="${C.hairLight}" stroke-width="4.5" stroke-linecap="round" opacity=".9"/>
      <path d="M276,176 C310,186 350,204 372,240 M276,176 C262,184 246,196 236,212" fill="none" stroke="${C.hairShade}" stroke-width="3" stroke-linecap="round" opacity=".6"/>
    </g>
  </g>
</svg>`;
  }

  const set = (el, sel, tr) => { const n = el.querySelector(sel); if (n) n.setAttribute("transform", tr); };

  function mouthPath(o, smile) {
    const cx = 300, y = 327;
    if (o < 0.06) {
      const s = 6 + 5 * smile;
      return `<path d="M${cx - 17},${y} Q${cx},${y + s} ${cx + 17},${y}" fill="none" stroke="${C.lip}" stroke-width="3.6" stroke-linecap="round"/>`;
    }
    const w = 18 - 5 * o;          // meia largura: abre mais, fica um pouco mais estreita (vogal "o")
    const top = y - 1 - 2 * o;
    const bot = y + 6 + 20 * o;
    const d = `M${cx - w},${y} Q${cx},${top} ${cx + w},${y} Q${cx + w * 0.9},${bot} ${cx},${bot} Q${cx - w * 0.9},${bot} ${cx - w},${y} Z`;
    return `
      <clipPath id="mclip"><path d="${d}"/></clipPath>
      <path d="${d}" fill="${C.mouthIn}"/>
      <g clip-path="url(#mclip)">
        <rect x="${cx - w}" y="${top - 2}" width="${2 * w}" height="${4 + 3 * o}" fill="${C.teeth}"/>
        <ellipse cx="${cx}" cy="${bot + 2}" rx="${w * 0.7}" ry="${4 + 5 * o}" fill="${C.tongue}"/>
      </g>
      <path d="${d}" fill="none" stroke="${C.lip}" stroke-width="3" stroke-linejoin="round"/>`;
  }

  function apply(root, s = {}) {
    const g = (k, d) => (s[k] == null ? d : s[k]);
    const breathe = g("breathe", 0);
    set(root, ".torso", `translate(300,628) scale(${1 + 0.004 * breathe},${1 + 0.006 * breathe}) translate(-300,-628)`);
    const head = g("head", 0), nod = g("nod", 0);
    set(root, ".head", `translate(0,${nod - 2.2 * breathe}) rotate(${head} 300 372)`);
    const [gx, gy] = g("gaze", [0, 0]);
    const blink = Math.min(1, Math.max(0, g("blink", 0)));
    root.querySelectorAll(".eye").forEach((e) => {
      const cx = +e.dataset.cx;
      e.setAttribute("transform", `translate(${cx},268) scale(1,${1 - 0.9 * blink}) translate(${-cx},-268)`);
      e.querySelector(".iris").setAttribute("transform", `translate(${gx * 4},${gy * 3})`);
    });
    set(root, ".brows", `translate(0,${-6 * g("brow", 0)})`);
    root.querySelector(".mouth").innerHTML = mouthPath(g("mouth", 0), g("smile", 1));
    for (const side of ["L", "R"]) {
      const a = { s: side === "L" ? 9 : -9, e: side === "L" ? -6 : 6, w: 0, ...(s["arm" + side] || {}) };
      set(root, `.arm-${side}`, `rotate(${a.s})`);
      set(root, `.fore-${side}`, `translate(0,146) rotate(${a.e})`);
      set(root, `.hand-${side}`, `translate(0,128) rotate(${a.w})`);
      const h = s["hand" + side] || "relax";
      for (const k of ["open", "relax", "point"]) root.querySelector(`.hand-${side} .h-${k}`).style.display = k === h ? "" : "none";
    }
    // braço levantado passa para a frente do tronco; ao lado do corpo também: sempre na frente
  }

  window.Charlotte = { svg, apply, colors: C };
})();
