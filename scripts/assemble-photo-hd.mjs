import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const partsDir = path.join(here, 'photo-source');
const parts = fs.readdirSync(partsDir)
  .filter((name) => /^part-\d+\.b64$/.test(name))
  .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));

if (parts.length === 0) {
  throw new Error('High-resolution portrait source parts are missing.');
}

const base64 = parts.map((name) => fs.readFileSync(path.join(partsDir, name), 'utf8').trim()).join('');
const bytes = Buffer.from(base64, 'base64');
if (bytes.length < 500_000 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
  throw new Error('High-resolution portrait failed validation (expected a JPEG of at least 500 KB).');
}

const destination = path.join(here, '..', 'public', 'downloads', 'tomaz-amorim-foto-ricson-onodera-hd.jpg');
fs.mkdirSync(path.dirname(destination), { recursive: true });
fs.writeFileSync(destination, bytes);
console.log(`Assembled high-resolution portrait: ${bytes.length} bytes from ${parts.length} source chunks.`);
