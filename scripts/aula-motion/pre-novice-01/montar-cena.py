#!/usr/bin/env python3
# Monta aula.html da PN01: CSS e utilitários do piloto (novice-01/aula.html) + _body.html + _scene.js.
#   python3 scripts/aula-motion/pre-novice-01/montar-cena.py
import os, re
D = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(D, '../novice-01/aula.html')).read()
css = src[src.index('<style>'):src.index('</style>') + 8]
helpers = src[src.index('<script>') + 8:src.index('  window.setup = (d) => {')]
helpers = re.sub(r"const HEAD = \{.*?\n  \};", """const HEAD = {
    street: { charlotte: [462, 196], igor: [811, 158] },
    igor: { igor: [832, 174] },
    cafe: { charlotte: [306, 209], igor: [800, 163] },
    bye: { charlotte: [384, 206], igor: [960, 238] },
  };""", helpers, flags=re.S)
helpers = re.sub(r"\n    const c = \$\(\"stars\"\).*?\n", "\n", helpers)
helpers = helpers.replace('    for (let i = 0; i < 110; i++)', '    if (0) for (let i = 0; i < 110; i++)')
mid = src[src.index('  // ---------- câmera das cenas com imagem'):src.index('  R.street = (t) => {')]
tail = src[src.index('  // ---------- pergunta'):src.index('</script>')]
tail = tail.replace('const ids = ["l05", "l06", "l07", "l08", "l09", "l11", "l14", "l15"];', 'const ids = ["l02", "l05", "l06", "l11", "l12", "l15", "l17"];')
head = '''<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<!-- Aula PN01 "Oi!" (horizontal 1280x720), formato do piloto novice-01: quadrinho animado + tipografia + 3 pausas.
     Gerado por montar-cena.py (não edite aqui: edite _body.html e _scene.js).
     window.setup(data) recebe a linha do tempo de render-aula.mjs; window.seek(t) desenha o quadro t. -->
'''
body = open(os.path.join(D, '_body.html')).read()
scene = open(os.path.join(D, '_scene.js')).read()
open(os.path.join(D, 'aula.html'), 'w').write(head + css + '</head>\n<body>\n' + body + '<script>\n' + helpers + mid + scene + '\n' + tail + '</script>\n</body></html>\n')
