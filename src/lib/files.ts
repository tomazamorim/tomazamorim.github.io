// Arquivos gerados fora do Astro (PDF do CV) e seus tamanhos, lidos no build.
import fs from 'node:fs';
import path from 'node:path';
import { MODE } from './mode';

const root = process.cwd();
export const CV_PDF_NAME = 'tomaz-amorim-izabel-cv.pdf';

export function kb(bytes: number): string {
  // KB decimal (1 KB = 1000 bytes), como na ficha ("106 KB")
  return bytes >= 1_000_000 ? `${(bytes / 1_000_000).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1000))} KB`;
}

/** Approved public CV PDF, versioned as a static public asset. */
export function cvPdf(): { href: string; size: string; bytes: number } | null {
  const f = path.join(root, 'public', 'cv', CV_PDF_NAME);
  if (!fs.existsSync(f)) return null;
  const bytes = fs.statSync(f).size;
  return { href: `/cv/${CV_PDF_NAME}`, size: `${kb(bytes)}`, bytes };
}

export function portraitDownload(): { href: string; size: string; bytes: number } {
  const f = path.join(root, 'public', 'downloads', 'tomaz-amorim-foto-ricson-onodera-hd.jpg');
  const bytes = fs.statSync(f).size;
  return { href: '/downloads/tomaz-amorim-foto-ricson-onodera-hd.jpg', size: kb(bytes), bytes };
}
