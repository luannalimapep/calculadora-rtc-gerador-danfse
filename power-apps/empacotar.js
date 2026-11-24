// Empacota o danfse.wasm (já compactado com gzip) em arquivos .js aceitos como
// recurso da web do Power Apps (Dataverse não aceita .wasm) e gera o danfse.html
// final com o número de partes.
// Uso: node power-apps/empacotar.js <danfse.wasm.gz> <pasta de saída>
const fs = require('fs');
const path = require('path');

const [, , origem, saida] = process.argv;
const LIMITE_POR_PARTE = 4000000; // caracteres; abaixo do limite padrão de 5 MB por recurso da web

const b64 = fs.readFileSync(origem).toString('base64');
const partes = [];
for (let i = 0; i < b64.length; i += LIMITE_POR_PARTE) partes.push(b64.slice(i, i + LIMITE_POR_PARTE));

fs.mkdirSync(saida, { recursive: true });
for (const f of fs.readdirSync(saida)) if (/^danfse_wasm_\d+\.js$/.test(f)) fs.unlinkSync(path.join(saida, f));

partes.forEach((p, i) => {
  const nome = path.join(saida, `danfse_wasm_${i + 1}.js`);
  fs.writeFileSync(nome, `globalThis.DANFSE_WASM_PARTES.push("${p}");\n`);
  console.log(`${nome}: ${fs.statSync(nome).size} bytes`);
});

const html = fs.readFileSync(path.join(__dirname, 'danfse.html'), 'utf8').replace('__PARTES__', String(partes.length));
fs.writeFileSync(path.join(saida, 'danfse.html'), html);
console.log(`danfse.html: ${partes.length} parte(s) do gerador`);
