// babel-plugin-phosphor.js — importa cada ícone do phosphor-react-native pelo arquivo dele.
//
// `import { House, Gear } from 'phosphor-react-native'` puxava a biblioteca inteira (cerca de 1.500 ícones,
// uns 5 MB) para o pacote do app, e cada atualização automática baixava tudo de novo. Aqui vira
// `import { House } from 'phosphor-react-native/lib/module/icons/House'`, um por ícone.
// Nome sem arquivo próprio (tipos como IconProps) continua no import original.
const fs = require('fs');
const path = require('path');

const PKG = 'phosphor-react-native';
const ICONS_DIR = path.join(path.dirname(require.resolve(`${PKG}/package.json`)), 'lib/module/icons');

function iconFile(name) {
  for (const base of [name, name.replace(/Icon$/, '')]) {
    if (base && fs.existsSync(path.join(ICONS_DIR, `${base}.js`))) return base;
  }
  return null;
}

module.exports = function ({ types: t }) {
  return {
    visitor: {
      ImportDeclaration(p) {
        if (p.node.source.value !== PKG || p.node.importKind === 'type') return;
        const keep = [];
        const split = [];
        for (const s of p.node.specifiers) {
          const file = t.isImportSpecifier(s) && s.importKind !== 'type' ? iconFile(s.imported.name) : null;
          if (file) split.push(t.importDeclaration([s], t.stringLiteral(`${PKG}/lib/module/icons/${file}`)));
          else keep.push(s);
        }
        if (!split.length) return;
        if (keep.length) split.push(t.importDeclaration(keep, t.stringLiteral(PKG)));
        p.replaceWithMultiple(split);
      },
    },
  };
};
