// Download approved PDF copies for the public build, using curl so the runner's configured network proxy is respected.
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const downloads = [
  {
    filename: 'AR-02-notas-sobre-o-castelo.pdf',
    url: 'https://www.e-publicacoes.uerj.br/matraga/article/download/73461/754/287482',
  },
  {
    filename: 'AR-03-interrupcao-e-montagem.pdf',
    url: 'https://periodicos.ufmg.br/index.php/cadernosbenjaminianos/article/view/30407/24026',
  },
  {
    filename: 'CL-01-esteticas-introduccion.pdf',
    url: 'https://biblioteca-repositorio.clacso.edu.ar/bitstreams/15f7ea6f-6c78-4949-8004-9b4414b9c26c/download',
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
