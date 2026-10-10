// Download approved PDF copies for the public build, using curl so the runner's configured network proxy is respected.
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
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


// Build a downloadable PDF excerpt of the introduction from the locally hosted open-access volume.
// This is a 35-page selection: cover, acknowledgements, and the introduction (printed pages 9–41).
const volume = path.join(outDir, 'VO-01-esteticas-del-extractivismo.pdf');
const excerpt = path.join(outDir, 'VO-01-esteticas-del-extractivismo-introduccion.pdf');
const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'esteticas-introduccion-'));
try {
  if (!await fs.stat(volume).catch(() => null)) {
    throw new Error(`Source volume missing for introduction excerpt: ${volume}`);
  }
  const pattern = path.join(tmp, 'page-%d.pdf');
  const separate = spawnSync('pdfseparate', ['-f', '1', '-l', '41', volume, pattern], { encoding: 'utf8' });
  if (separate.error || separate.status !== 0) {
    throw new Error(`Could not extract volume pages: ${separate.error?.message ?? separate.stderr ?? separate.status}`);
  }
  const pageNumbers = [1, 4, ...Array.from({ length: 33 }, (_, i) => i + 9)];
  const inputs = pageNumbers.map(n => path.join(tmp, `page-${n}.pdf`));
  await fs.rm(excerpt, { force: true });
  const unite = spawnSync('pdfunite', [...inputs, excerpt], { encoding: 'utf8' });
  if (unite.error || unite.status !== 0) {
    throw new Error(`Could not assemble introduction PDF: ${unite.error?.message ?? unite.stderr ?? unite.status}`);
  }
  const check = spawnSync('pdfinfo', [excerpt], { encoding: 'utf8' });
  const bytes = await fs.readFile(excerpt);
  if (check.status !== 0 || !/Pages:\\s+35\\b/.test(check.stdout) || bytes.subarray(0, 5).toString('ascii') !== '%PDF-') {
    throw new Error('Introduction excerpt failed PDF validation (expected 35 pages).');
  }
  console.log(`Built Estéticas del extractivismo introduction PDF (${bytes.length.toLocaleString()} bytes)`);
} finally {
  await fs.rm(tmp, { recursive: true, force: true });
}
