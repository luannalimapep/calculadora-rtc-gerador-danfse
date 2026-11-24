// Testa os recursos da web no Node, carregando o gerador do mesmo jeito que a
// página danfse.html faz no navegador, e gera o PDF de um XML de exemplo.
// Uso: node power-apps/testar.js <pasta dist> <xml de exemplo> <pdf de saída>
const fs = require('fs');
const path = require('path');

const [, , dist, xmlPath, pdfPath] = process.argv;

globalThis.require = require;
globalThis.fs = fs;
globalThis.path = path;
require(path.resolve(dist, 'wasm_exec.js'));

const html = fs.readFileSync(path.join(dist, 'danfse.html'), 'utf8');
const total = parseInt(html.match(/var TOTAL_PARTES = (\d+);/)[1], 10);
globalThis.DANFSE_WASM_PARTES = [];
for (let i = 1; i <= total; i++) require(path.resolve(dist, `danfse_wasm_${i}.js`));

(async () => {
  const b64 = globalThis.DANFSE_WASM_PARTES.join('');
  const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const fluxo = new Blob([bin]).stream().pipeThrough(new DecompressionStream('gzip'));
  const wasm = await new Response(fluxo).arrayBuffer();
  console.log(`WebAssembly descompactado: ${wasm.byteLength} bytes`);

  const go = new Go();
  const { instance } = await WebAssembly.instantiate(wasm, go.importObject);
  go.run(instance);
  for (let t = 0; t < 100 && !globalThis.danfseWasm; t++) await new Promise((r) => setTimeout(r, 50));
  if (!globalThis.danfseWasm || !globalThis.danfseWasm.ready) {
    throw new Error('gerador não iniciou: ' + (globalThis.danfseWasm && globalThis.danfseWasm.error));
  }

  const xml = fs.readFileSync(xmlPath, 'utf8');
  const r = globalThis.danfseWasm.gerarPdf(JSON.stringify({ xml, stc: 0, canhoto: true }));
  if (!r || !r.pdf) throw new Error('falha ao gerar: ' + (r && r.error));
  fs.writeFileSync(pdfPath, Buffer.from(r.pdf, 'base64'));
  console.log(`PDF gerado: ${r.size} bytes -> ${pdfPath}`);

  const ruim = globalThis.danfseWasm.gerarPdf(JSON.stringify({ xml: '<NFSe></NFSe>', stc: 0 }));
  if (!ruim || !ruim.error) throw new Error('XML inválido deveria retornar erro');
  console.log(`XML inválido retorna erro, como esperado: ${ruim.error}`);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
