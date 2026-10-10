// Download the approved PDF copies into the public build. Their persistent publisher/repository links remain on each publication record.
import fs from 'node:fs/promises';
import path from 'node:path';

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
    filename: 'CL-01-introduccion-esteticas-del-extractivismo.pdf',
    url: 'https://biblioteca-repositorio.clacso.edu.ar/bitstreams/15f7ea6f-6c78-4949-8004-9b4414b9c26c/download',
  },
];

const outDir = path.resolve('public/downloads/publications');
await fs.mkdir(outDir, { recursive: true });
for (const item of downloads) {
  const response = await fetch(item.url, { redirect: 'follow' });
  if (!response.ok) throw new Error(`PDF download failed for ${item.filename}: HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length < 1000 || bytes.subarray(0, 5).toString('ascii') !== '%PDF-') {
    throw new Error(`The source did not return a valid PDF for ${item.filename}: ${response.url}`);
  }
  await fs.writeFile(path.join(outDir, item.filename), bytes);
  console.log(`Downloaded ${item.filename} (${bytes.length.toLocaleString()} bytes)`);
}
