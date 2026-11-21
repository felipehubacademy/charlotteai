  window.setup = (d) => {
    D = d; T = d.T; L = d.lines;
    $("b-l03").innerHTML = bubbleHTML("Charlotte", ["Hi,", "Igor!"], "Oi, Igor!");
    $("b-l04").innerHTML = bubbleHTML("Igor", ["Hello,", "Charlotte!"], "Olá, Charlotte!");
    $("b-l07").innerHTML = bubbleHTML("Charlotte", ["Coffee?"], "Café?");
    $("b-l08").innerHTML = bubbleHTML("Igor", ["Yes!"], "Sim!");
    $("b-l09").innerHTML = bubbleHTML("Charlotte", ["Pizza?"], "Pizza?");
    $("b-l10").innerHTML = bubbleHTML("Igor", ["No!"], "Não!");
    $("b-ask2").innerHTML = bubbleHTML("Charlotte", ["Coffee?"], "");
    $("b-l13").innerHTML = bubbleHTML("Igor", ["Bye,", "Charlotte!"], "Tchau, Charlotte!");
    $("b-l14").innerHTML = bubbleHTML("Charlotte", ["Bye,", "Igor!"], "Tchau, Igor!");
    $("b-ask3").innerHTML = bubbleHTML("Charlotte", ["Hi!", "I'm", "Charlotte."], "Oi! Eu sou a Charlotte.");
    $("b-ask3").classList.add("side");
    SEQ = [
      { id: "street", at: -1 },
      { id: "type0", at: T.type0, o: [640, 360] },
      { id: "street", at: T.street2, o: [640, 300] },
      { id: "type1", at: T.type1, o: [640, 360] },
      { id: "igor", at: T.igor, o: [830, 200] },
      { id: "cafe", at: T.cafe, o: [640, 360] },
      { id: "type2", at: T.type2, o: [640, 360] },
      { id: "cafe", at: T.cafe2, o: [400, 300] },
      { id: "bye", at: T.bye, o: [640, 360] },
      { id: "type3", at: T.type3, o: [640, 360] },
      { id: "bye", at: T.bye2, o: [400, 260] },
      { id: "review", at: T.review, o: [640, 360] },
      { id: "end", at: T.end, o: [640, 600] },
    ];
    grains();
  };

  const blob = (id, t, s = 1) => { $(id).querySelector(".blobs").style.transform = `translate(${Math.sin(t * .3) * 40 * s}px, ${Math.cos(t * .25) * 30}px) rotate(${t * 2 * s}deg)`; };
  // palavra repetida: dá um pulinho de escala quando é dita de novo
  const pulse = (t, a) => 1 + .08 * Math.sin(Math.PI * prog(t, a - .05, a + .45));

  R.street = (t) => {
    const H = HEAD.street, second = t >= T.street2 - .01;
    const c = second
      ? camAt(t, [[T.street2, { x: 640, y: 340, s: 1.1 }], [L.l03.start - .5, { x: 520, y: 330, s: 1.38 }], [L.l04.start - .35, { x: 820, y: 300, s: 1.38 }]])
      : camAt(t, [[0, { x: 640, y: 380, s: 1.04 }], [L.l01.start - .8, { x: 400, y: 300, s: 1.7 }, 1.4]]);
    placeImg($("L-street"), c, t);
    const titleOut = prog(t, 1.9, 2.4);
    $("shade").style.opacity = .55 * (1 - ease(prog(t, 1.8, 2.6)));
    $("title").style.opacity = 1 - titleOut; $("title").style.transform = `translateY(${-titleOut * 20}px)`;
    $("title").querySelectorAll(".t .w").forEach((s, i) => { const k = out(prog(t, .3 + i * .18, .75 + i * .18)); s.style.opacity = k; s.style.transform = `translateY(${(1 - k) * 40}px)`; });
    $("title").querySelector(".k").style.opacity = out(prog(t, .1, .5));
    const ik = out(prog(t, L.l01.start - .5, L.l01.start)) * (1 - prog(t, L.l01.end + .1, L.l01.end + .5));
    $("intro").style.opacity = second ? 0 : ik;
    const part = (sel, a) => { const e = $("intro").querySelector(sel), k = out(prog(t, a - .1, a + .3)); e.style.opacity = k; e.style.transform = `translateY(${(1 - k) * 18}px)`; };
    part(".hi", wt("l01", 0)); part(".name", wt("l01", 4)); part(".role", wt("l01", 5));
    part(".today", wt("l01", 7)); part(".goal", wt("l01", 16)); part(".go", wt("l01", 23));
    bubble($("b-l03"), t, second ? L.l03.start : 1e9, L.l03.end + .5, words("l03", [0, 1]), H.charlotte, c);
    bubble($("b-l04"), t, second ? L.l04.start : 1e9, T.type1, words("l04", [0, 1]), H.igor, c);
  };

  R.type0 = (t) => {
    blob("L-type0", t);
    const hk = out(prog(t, wt("l02", 2) - .1, wt("l02", 5) + .2)); pos($("k0-h"), 92, 1, hk, (1 - hk) * 12);
    [6, 7, 8].forEach((wi, i) => {
      const e = $("c" + i), a = wt("l02", wi), k = out(prog(t, a - .35, a + .05));
      e.style.opacity = k; e.style.transform = `translateY(${(1 - k) * -60}px) rotate(${(1 - k) * (i - 1) * 8}deg) scale(${pulse(t, a)})`;
      e.classList.toggle("on", t >= a);
    });
    const lk = out(prog(t, wt("l02", 9) - .1, wt("l02", 9) + .3)); pos($("k0-lab"), 520, 1, lk, (1 - lk) * 16);
  };

  R.type1 = (t) => {
    blob("L-type1", t, -1);
    const show = (id, a, b, rep) => {
      const w = $(id), k = out(prog(t, wt("l05", a) - .1, wt("l05", a) + .3));
      const e = w.querySelector(".e"); e.style.opacity = k; e.style.transform = `translateY(${(1 - k) * 40}px) scale(${pulse(t, wt("l05", rep))})`;
      const pk = out(prog(t, wt("l05", b) - .1, wt("l05", b) + .3)); const p = w.querySelector(".p"); p.style.opacity = pk; p.style.transform = `translateY(${(1 - pk) * 14}px)`;
      // o sopro: o h fica Volt e as linhas saem da letra
      const sk = ease(prog(t, wt("l05", 11) - .2, wt("l05", 11) + .5));
      w.querySelector("b").style.color = sk > .3 ? "#DCFF4A" : "#FAF7F0";
      w.querySelectorAll("svg path").forEach((p, i) => { const q = ease(prog(t, wt("l05", 11) - .2 + i * .08, wt("l05", 11) + .4 + i * .08)); p.style.strokeDashoffset = 70 * (1 - q); });
      const breath = .5 + .5 * Math.sin(t * 4);
      w.querySelector("svg").style.transform = `translateX(${-sk * breath * 6}px)`;
    };
    show("w-hi", 0, 2, 24); show("w-hello", 3, 5, 25);
    const tk = out(prog(t, wt("l05", 11) - .2, wt("l05", 11) + .25)); pos($("h-tip"), 448, lerp(.9, 1, tk), tk);
    const t2 = out(prog(t, wt("l05", 13) - .1, wt("l05", 13) + .3)); pos($("h-tip2"), 560, 1, t2, (1 - t2) * 12);
    $("h-tip2").querySelector("strong").style.opacity = out(prog(t, wt("l05", 19) - .1, wt("l05", 19) + .3));
  };

  R.igor = (t) => {
    const c = camAt(t, [[T.igor, { x: 680, y: 380, s: 1.04 }], [T.igor + .1, { x: 720, y: 330, s: 1.12 }, 6]]);
    placeImg($("L-igor"), c, t);
  };

  R.cafe = (t) => {
    const H = HEAD.cafe, second = t >= T.cafe2 - .01;
    const c = second
      ? camAt(t, [[T.cafe2, { x: 480, y: 330, s: 1.2 }], [T.cafe2 + .1, { x: 440, y: 320, s: 1.38 }, 6]])
      : camAt(t, [[T.cafe, { x: 640, y: 360, s: 1.04 }], [L.l07.start - .5, { x: 450, y: 330, s: 1.3 }], [L.l08.start - .3, { x: 820, y: 300, s: 1.3 }, .7],
          [L.l09.start - .3, { x: 450, y: 330, s: 1.3 }, .7], [L.l10.start - .3, { x: 820, y: 300, s: 1.3 }, .7]]);
    placeImg($("L-cafe"), c, t);
    ["l07", "l08", "l09", "l10"].forEach((id, i, a) => {
      const end = i < 3 ? L[a[i + 1]].start - .15 : T.type2;
      bubble($("b-" + id), t, second ? 1e9 : L[id].start, end, words(id, [0]), i % 2 ? H.igor : H.charlotte, c);
    });
    bubble($("b-ask2"), t, second ? wt("l12", 4) : 1e9, 1e9, words("l12", [4]), H.charlotte, c);
  };

  R.type2 = (t) => {
    blob("L-type2", t);
    [[0, 2, 22], [3, 5, 23], [7, 12, 7]].forEach(([a, b, rep], i) => {
      const e = $("yn" + i), k = out(prog(t, wt("l11", a) - .2, wt("l11", a) + .25));
      e.style.opacity = k; e.style.transform = `translateX(${(1 - k) * -50}px)`;
      e.querySelector(".e").style.transform = `scale(${rep !== a ? pulse(t, wt("l11", rep)) : 1})`;
      const pk = out(prog(t, wt("l11", b) - .1, wt("l11", b) + .3)); const p = e.querySelector(".p"); p.style.opacity = pk;
    });
    const yk = out(prog(t, wt("l11", 14) - .1, wt("l11", 16) + .2)); pos($("yn-y"), 600, 1, yk, (1 - yk) * 12);
  };

  R.bye = (t) => {
    const H = HEAD.bye, second = t >= T.bye2 - .01;
    const c = second
      ? camAt(t, [[T.bye2, { x: 430, y: 330, s: 1.4 }], [T.bye2 + .1, { x: 430, y: 310, s: 1.52 }, 6]])
      : camAt(t, [[T.bye, { x: 640, y: 360, s: 1.04 }], [L.l13.start - .4, { x: 820, y: 340, s: 1.25 }], [L.l14.start - .3, { x: 520, y: 340, s: 1.2 }]]);
    placeImg($("L-bye"), c, t);
    bubble($("b-l13"), t, second ? 1e9 : L.l13.start, L.l14.start - .1, words("l13", [0, 1]), H.igor, c);
    bubble($("b-l14"), t, second ? 1e9 : L.l14.start, T.type3, words("l14", [0, 1]), H.charlotte, c);
    bubble($("b-ask3"), t, second ? wt("l16", 6) : 1e9, 1e9, words("l16", [6, 7, 8]), H.charlotte, c, "side");
  };

  R.type3 = (t) => {
    blob("L-type3", t, -1);
    const ek = out(prog(t, wt("l15", 0) - .15, wt("l15", 0) + .3));
    $("by-en").style.opacity = ek; $("by-en").style.transform = `translateX(-50%) translateY(${(1 - ek) * 40}px) scale(${pulse(t, wt("l15", 12))})`;
    $("by-en").style.color = t > wt("l15", 0) + .4 ? "#DCFF4A" : "#FAF7F0";
    const pk = out(prog(t, wt("l15", 2) - .1, wt("l15", 2) + .3)); pos($("by-pt"), 380, 1, pk, (1 - pk) * 20);
    const tk = out(prog(t, wt("l15", 3) - .1, wt("l15", 7) + .2)); pos($("by-tip"), 520, 1, tk, (1 - tk) * 12);
    $("by-tip").querySelector("s").style.opacity = out(prog(t, wt("l15", 8) - .1, wt("l15", 8) + .3));
  };

  R.review = (t) => {
    blob("L-review", t);
    const hk = out(prog(t, L.l17.start - .1, L.l17.start + .4)); $("rv-h").style.opacity = hk;
    const at = [3, 4, 5, 6, 7, 9];
    at.forEach((wi, i) => {
      const e = $("rv" + i), k = out(prog(t, wt("l17", wi) - .2, wt("l17", wi) + .2));
      e.style.opacity = k; e.style.transform = `translateY(${(1 - k) * 30}px) scale(${lerp(.92, 1, k)})`;
      e.classList.toggle("on", t >= wt("l17", wi) - .1 && t < (i < 5 ? wt("l17", at[i + 1]) - .1 : wt("l17", 10)));
    });
    const gk = out(prog(t, wt("l17", 10) - .1, wt("l17", 10) + .35)); pos($("rv-go"), 590, 1, gk, (1 - gk) * 16);
  };

  R.end = (t) => {
    const s = (sel, a, dy = 24) => { const e = document.querySelector(sel), k = out(prog(t, a, a + .45)); e.style.opacity = k; e.style.transform = `translateX(-50%) translateY(${(1 - k) * dy}px)`; };
    s("#end .t", T.end + .3); s("#end .s", T.end + .6); s("#end .b", T.end + .9); s("#end img", T.end + 1.1, 10);
  };
