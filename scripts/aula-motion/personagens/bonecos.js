// Bonecos da Família Queizy para as aulas em motion: formas simples (círculos, elipses, curvas),
// pensados para animar, com os traços que fazem cada um ser reconhecível. Não copiam o 3D do app.
//   Charlotte: chanel castanho repartido de lado, óculos redondos grandes, suéter creme.
//   Igor: barba, boné com óculos escuros em cima, camiseta preta com o bisão colorido.
// Coordenadas locais: (0,0) é a cintura (o quadro corta ali); a cabeça fica em (0,-330).
// Uso: const b = new Boneco(gElement, "charlotte"); b.update({ t, amp, look, arm, wave })
(function () {
  const P = { tinta: "#16131F", papel: "#FAF7F0", volt: "#DCFF4A", pink: "#FF4F8B", violeta: "#6B4BFF" };

  function face(o) {
    const eye = (x) => `<g class="eye" data-x="${x}"><ellipse rx="6.5" ry="8.5" fill="${P.tinta}"/><circle cx="2.2" cy="-3" r="2.3" fill="#fff"/></g>`;
    const brow = o.brow || 5;
    return `
    <g class="feat">
      <path class="brow" d="M-36 -32 Q-23 -40 -10 -32" stroke="${o.hair}" stroke-width="${brow}" fill="none" stroke-linecap="round"/>
      <path class="brow" d="M10 -32 Q23 -40 36 -32" stroke="${o.hair}" stroke-width="${brow}" fill="none" stroke-linecap="round"/>
      <g transform="translate(-23 -6)">${eye(0)}</g><g transform="translate(23 -6)">${eye(0)}</g>
      ${o.glasses ? `<g fill="rgba(255,255,255,.10)" stroke="${o.glasses}" stroke-width="5.5">
          <circle cx="-24" cy="-6" r="21"/><circle cx="24" cy="-6" r="21"/></g>
        <path d="M-4 -8 Q0 -13 4 -8 M-45 -10 L-56 -14 M45 -10 L56 -14" stroke="${o.glasses}" stroke-width="5" fill="none" stroke-linecap="round"/>` : ""}
      <path d="M1 8 Q-5 19 3 21" stroke="${o.shade}" stroke-width="3.2" fill="none" stroke-linecap="round"/>
      <circle cx="-36" cy="20" r="9.5" fill="${P.pink}" opacity="${o.blush}"/><circle cx="36" cy="20" r="9.5" fill="${P.pink}" opacity="${o.blush}"/>
      ${o.beard ? `<path d="M-24 30 Q0 20 24 30 Q12 27 0 31 Q-12 27 -24 30Z" fill="${o.hair}"/>` : ""}
      <path class="smile" d="M-14 35 Q0 46 14 35" stroke="${o.lip}" stroke-width="4.2" fill="none" stroke-linecap="round"/>
      <g class="mouth" transform="translate(0 39)" opacity="0">
        <ellipse class="m-out" rx="12" ry="6" fill="#4A1C27"/>
        <ellipse class="m-tongue" cx="0" cy="4" rx="7" ry="3" fill="#E0717E"/>
        <rect class="m-teeth" x="-8.5" y="-6" width="17" height="4.5" rx="2" fill="#fff"/>
      </g>
    </g>`;
  }

  function arm(o, side, base, rest) {
    // braço: manga + antebraço + mão; o ombro é o ponto de giro
    const skinFore = o.shortSleeve
      ? `<path d="M-15 70 L-14 128 Q0 138 14 128 L15 70 Z" fill="${o.skin}"/><path d="M-19 -6 Q0 -18 19 -6 L19 76 Q0 86 -19 76 Z" fill="${o.shirt}"/>`
      : `<path d="M-18 -6 Q0 -18 18 -6 L18 128 Q0 138 -18 128 Z" fill="${o.shirt}"/><rect x="-17" y="114" width="34" height="18" rx="7" fill="${o.shirtShade}"/>`;
    return `<g class="arm arm-${side}" data-base="${base}" data-rest="${rest}" transform="translate(${base}) rotate(${rest})">
      ${skinFore}<circle class="hand" cx="0" cy="146" r="18" fill="${o.skin}"/></g>`;
  }

  const LOOKS = {
    charlotte: () => {
      const o = { hair: "#5B3524", hairLight: "#7E4F35", skin: "#F2C3A1", shade: "#D99A78", lip: "#B4545A", blush: 0.28,
        glasses: "#2B1A14", shirt: "#F4EEE3", shirtShade: "#E2D7C4" };
      return { o, svg: `
      <g class="torso">
        <rect x="-15" y="-268" width="30" height="46" fill="${o.skin}"/>
        <path d="M-15 -248 Q0 -238 15 -248 L15 -232 Q0 -222 -15 -232 Z" fill="${o.shade}" opacity=".6"/>
        <path d="M-102 70 L-102 -150 Q-102 -222 -38 -228 L38 -228 Q102 -222 102 -150 L102 70 Z" fill="${o.shirt}"/>
        <path d="M66 -214 Q102 -196 102 -150 L102 70 L74 70 Q84 -60 66 -214 Z" fill="${o.shirtShade}"/>
        <path d="M-32 -228 Q0 -196 32 -228" stroke="${o.shirtShade}" stroke-width="9" fill="none" stroke-linecap="round"/>
        <circle cx="-52" cy="-160" r="9" fill="${P.volt}"/><circle cx="-52" cy="-160" r="9" fill="none" stroke="${P.tinta}" stroke-width="2.5"/>
      </g>
      ${arm(o, "R", "84 -196", -10)}
      <g class="head" transform="translate(0 -330)">
        <path d="M-88 -8 C-88 -72 -48 -100 0 -100 C48 -100 88 -72 88 -8 L90 50 C92 78 70 88 52 80 L-52 80 C-70 88 -92 78 -90 50 Z" fill="${o.hair}"/>
        <circle cx="-74" cy="62" r="20" fill="${o.hair}"/><circle cx="74" cy="62" r="20" fill="${o.hair}"/>
        <ellipse cx="0" cy="4" rx="57" ry="65" fill="${o.skin}"/>
        <path d="M-64 -6 C-66 -74 -10 -94 36 -78 C62 -68 72 -42 64 -6 C56 -40 26 -56 -6 -50 C-34 -44 -54 -26 -64 -6 Z" fill="${o.hair}"/>
        <path d="M-58 -40 C-44 -74 0 -86 34 -72" stroke="${o.hairLight}" stroke-width="5" fill="none" stroke-linecap="round"/>
        <path d="M70 0 C76 22 76 44 70 62" stroke="${o.hairLight}" stroke-width="5" fill="none" stroke-linecap="round"/>
        ${face(o)}
      </g>
      ${arm(o, "L", "-84 -196", 10)}` };
    },
    igor: () => {
      const o = { hair: "#2A1B15", skin: "#D59E76", shade: "#A86E4C", lip: "#9C4A45", blush: 0.12, beard: true, brow: 6.5,
        shirt: "#1F1C24", shirtShade: "#2C2833", shortSleeve: true };
      const strokes = [["#FF4F8B", -38, -12, 30], ["#FF8A3D", -18, -40, 60], ["#6B4BFF", 22, -34, -30], ["#3FA9F5", 34, 6, 70], ["#DCFF4A", -30, 22, -50], ["#FF4F8B", 10, 34, 20]]
        .map(([c, x, y, r]) => `<rect x="${x - 16}" y="${y - 5}" width="32" height="10" rx="5" fill="${c}" transform="rotate(${r} ${x} ${y})" opacity=".95"/>`).join("");
      return { o, svg: `
      <g class="torso">
        <rect x="-18" y="-268" width="36" height="46" fill="${o.skin}"/>
        <path d="M-114 70 L-114 -146 Q-114 -222 -46 -228 L46 -228 Q114 -222 114 -146 L114 70 Z" fill="${o.shirt}"/>
        <path d="M-30 -228 Q0 -200 30 -228" stroke="${o.shirtShade}" stroke-width="9" fill="none" stroke-linecap="round"/>
        <g transform="translate(0 -112)">
          <circle r="54" fill="#2C2833"/>${strokes}
          <path d="M-20 -6 Q-22 -26 -36 -30 Q-28 -16 -26 -4 Z M20 -6 Q22 -26 36 -30 Q28 -16 26 -4 Z" fill="${P.papel}"/>
          <path d="M-22 -10 Q0 -24 22 -10 L18 18 Q0 32 -18 18 Z" fill="#3B2A22"/>
          <circle cx="-8" cy="2" r="2.6" fill="${P.papel}"/><circle cx="8" cy="2" r="2.6" fill="${P.papel}"/>
        </g>
      </g>
      ${arm(o, "R", "98 -192", -8)}
      <g class="head" transform="translate(0 -330)">
        <circle cx="-56" cy="6" r="12" fill="${o.skin}"/><circle cx="56" cy="6" r="12" fill="${o.skin}"/>
        <ellipse cx="0" cy="4" rx="56" ry="65" fill="${o.skin}"/>
        <path d="M-57 0 Q-58 72 0 80 Q58 72 57 0 Q54 32 32 40 Q0 52 -32 40 Q-54 32 -57 0 Z" fill="${o.hair}"/>
        <path d="M-56 -30 L-52 -2 L-46 -30 Z M56 -30 L52 -2 L46 -30 Z" fill="${o.hair}"/>
        <path d="M-60 -32 Q-62 -100 0 -102 Q62 -100 60 -32 Z" fill="#8E867A"/>
        <path d="M-30 -96 Q0 -104 30 -96" stroke="#A39B8E" stroke-width="5" fill="none" stroke-linecap="round"/>
        <rect x="-66" y="-40" width="132" height="12" rx="6" fill="#6F685E"/>
        <g transform="translate(0 -66)">
          <rect x="-44" y="-11" width="38" height="22" rx="10" fill="${P.tinta}"/><rect x="6" y="-11" width="38" height="22" rx="10" fill="${P.tinta}"/>
          <path d="M-6 -2 Q0 -6 6 -2" stroke="${P.tinta}" stroke-width="4" fill="none"/>
          <path d="M-36 -4 L-26 -4 M14 -4 L24 -4" stroke="${P.volt}" stroke-width="3" stroke-linecap="round" opacity=".8"/>
        </g>
        ${face(o)}
      </g>
      ${arm(o, "L", "-98 -192", 8)}` };
    },
  };

  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

  class Boneco {
    constructor(root, who) {
      const { svg } = LOOKS[who]();
      root.innerHTML = `<g class="boneco">${svg}</g>`;
      this.root = root.firstElementChild;
      const q = (s) => this.root.querySelector(s);
      this.torso = q(".torso"); this.head = q(".head"); this.feat = q(".feat");
      this.eyes = [...this.root.querySelectorAll(".eye")]; this.brows = [...this.root.querySelectorAll(".brow")];
      this.smile = q(".smile"); this.mouth = q(".mouth"); this.mOut = q(".m-out"); this.mTongue = q(".m-tongue"); this.mTeeth = q(".m-teeth");
      this.arms = Object.fromEntries([...this.root.querySelectorAll(".arm")].map((a) => [a.classList[1].slice(4), a]));
      this.phase = rnd() * 6;
      this.blinks = []; let b = 0.9 + rnd(); while (b < 300) { this.blinks.push(b); b += 2.2 + rnd() * 2.8; }
    }
    // t: tempo; amp: volume da fala (0..1); look: para onde olha (-1 esquerda, 1 direita); arms: { L, R } em graus (opcional)
    update({ t, amp = 0, look = 0, arms = {}, talkAvg = 0 }) {
      const br = Math.sin(t * 1.7 + this.phase) * 0.004; // respiro quase imperceptível
      this.torso.setAttribute("transform", `translate(0 ${-br * 230}) scale(1 ${1 + br})`);
      const tilt = Math.sin(t * 0.8 + this.phase) * 1.4 + talkAvg * Math.sin(t * 2.3 + this.phase) * 2.2 + look * 2;
      this.head.setAttribute("transform", `translate(${look * 5} ${-330 - br * 230}) rotate(${tilt.toFixed(2)})`);
      this.feat.setAttribute("transform", `translate(${look * 9} 0)`);
      let sy = 1;
      for (const b of this.blinks) if (t >= b && t < b + 0.16) sy = 1 - 0.92 * Math.sin((Math.PI * (t - b)) / 0.16);
      for (const e of this.eyes) e.setAttribute("transform", `scale(1 ${sy.toFixed(3)})`);
      this.brows.forEach((b) => b.setAttribute("transform", `translate(0 ${(-talkAvg * 5).toFixed(2)})`));
      const open = amp > 0.07;
      this.smile.setAttribute("opacity", open ? 0 : 1);
      this.mouth.setAttribute("opacity", open ? 1 : 0);
      if (open) {
        this.mOut.setAttribute("rx", (11 + amp * 6).toFixed(2));
        this.mOut.setAttribute("ry", (4 + amp * 12).toFixed(2));
        this.mTongue.setAttribute("cy", (2 + amp * 7).toFixed(2));
        this.mTeeth.setAttribute("y", (-4 - amp * 10).toFixed(2));
      }
      for (const [side, a] of Object.entries(this.arms)) {
        const ang = arms[side] ?? +a.dataset.rest + Math.sin(t * 1.1 + this.phase + (side === "L" ? 0 : 2)) * 1.5;
        a.setAttribute("transform", `translate(${a.dataset.base}) rotate(${ang.toFixed(2)})`);
      }
    }
  }
  window.Boneco = Boneco;
  window.QPAL = P;
})();
