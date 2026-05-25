const fs = require('fs');
const path = require('path');

const target = path.join(process.cwd(), 'node_modules', 'react-native-css-interop', 'dist', 'metro', 'index.js');

function main() {
  if (!fs.existsSync(target)) return;
  const input = fs.readFileSync(target, 'utf8');
  if (input.includes('addedFiles:') && input.includes('modifiedFiles:') && input.includes('deletedFiles:')) return;

  const re = /haste\.emit\("change", \{\r?\n(\s*)eventsQueue:\s*\[/;
  if (!re.test(input)) return;

  const output = input.replace(re, (_match, indent) => {
    return `haste.emit("change", {\n${indent}addedFiles: new Map(),\n${indent}modifiedFiles: new Map([[filePath, { modifiedTime: Date.now(), size: 1, type: "virtual" }]]),\n${indent}deletedFiles: new Set(),\n${indent}eventsQueue: [`;
  });
  fs.writeFileSync(target, output, 'utf8');
}

main();
