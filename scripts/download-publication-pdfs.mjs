// Download approved PDF copies for the public build, using curl so the runner's configured network proxy is respected.
import fs from 'node:fs/promises';
import path from 'node:path';
import { PDFDocument } from 'pdf-lib';
import { spawnSync } from 'node:child_process';

const downloads = [
  {
    filename: 'AR-02-notas-sobre-o-castelo.pdf',
    url: 'https://www.e-publicacoes.uerj.br/matraga/article/download/73461/754/287482',
  },
  {
    filename: 'AR-03-interrupcao-e-montagem.pdf',
    url: 'https://periodicos.ufmg.br/index.php/cadernosbenjaminianos/article/view/30407/24026',
  }
];

const outDir = path.resolve('public/downloads/publications');
await fs.mkdir(outDir, { recursive: true });
for (const item of downloads) {
  const output = path.join(outDir, item.filename);
  const result = spawnSync('curl', [
    '--fail', '--location', '--silent', '--show-error',
    '--user-agent', 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36',
    '--referer', 'https://biblioteca-repositorio.clacso.edu.ar/handle/CLACSO/281270',
    '--max-time', '120', '--retry', '2', '--retry-all-errors',
    '--output', output, item.url,
  ], { encoding: 'utf8', timeout: 150_000 });
  if (result.error || result.status !== 0) {
    throw new Error(`PDF download failed for ${item.filename}: ${result.error?.message ?? result.stderr ?? result.status}`);
  }
  const bytes = await fs.readFile(output);
  if (bytes.length < 1000 || bytes.subarray(0, 5).toString('ascii') !== '%PDF-') {
    throw new Error(`Source did not return a valid PDF for ${item.filename}`);
  }
  console.log(`Downloaded ${item.filename} (${bytes.length.toLocaleString()} bytes)`);
}


// Build a downloadable PDF excerpt of the introduction from the approved hosted volume.
// Page selection mirrors the supplied 35-page extract: cover, acknowledgements, and physical pages 9–41.
const volume = path.join(outDir, 'VO-01-esteticas-del-extractivismo.pdf');
const excerpt = path.join(outDir, 'VO-01-esteticas-del-extractivismo-introduccion.pdf');
const volumeBytes = await fs.readFile(volume);
const volumePdf = await PDFDocument.load(volumeBytes);
const excerptPdf = await PDFDocument.create();
const pageIndices = [0, 3, ...Array.from({ length: 33 }, (_, i) => i + 8)];
const pages = await excerptPdf.copyPages(volumePdf, pageIndices);
for (const page of pages) excerptPdf.addPage(page);
const excerptBytes = await excerptPdf.save();
await fs.writeFile(excerpt, excerptBytes);
const validation = await PDFDocument.load(excerptBytes);
if (validation.getPageCount() !== 35 || excerptBytes.subarray(0, 5).toString('ascii') !== '%PDF-') {
  throw new Error('Introduction excerpt failed PDF validation (expected 35 pages).');
}
console.log(`Built Estéticas del extractivismo introduction PDF (${excerptBytes.length.toLocaleString()} bytes)`);
