import fs from 'node:fs/promises';
import path from 'node:path';
import { launch } from './_browser.mjs';

const root = process.cwd();
const outDir = path.resolve(process.argv[2] || 'dist/public');
const imageCandidates = [
  path.join(root, 'public/downloads/tomaz-amorim-foto-ricson-onodera-hd.jpg'),
  path.join(root, 'public/downloads/tomaz-amorim-foto-ricson-onodera.jpg'),
];
let photoPath = null;
for (const candidate of imageCandidates) {
  try { await fs.access(candidate); photoPath = candidate; break; } catch {}
}
if (!photoPath) throw new Error('Could not find the approved portrait for the social preview image.');

const photoBytes = await fs.readFile(photoPath);
if (photoBytes[0] !== 0xff || photoBytes[1] !== 0xd8) {
  throw new Error('The portrait used for the social preview is not a valid JPEG.');
}
const photoUrl = `data:image/jpeg;base64,${photoBytes.toString('base64')}`;
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; width: 1200px; height: 630px; overflow: hidden; }
  body { background: #f5f2e9; color: #172b36; font-family: Georgia, "Times New Roman", serif; }
  .card { display: flex; width: 1200px; height: 630px; overflow: hidden; position: relative; }
  .portrait { position: relative; width: 445px; height: 630px; flex: 0 0 445px; overflow: hidden; background: #d8ded3; }
  .portrait img { width: 100%; height: 100%; display: block; object-fit: cover; object-position: 44% 28%; }
  .photo-credit { position: absolute; left: 26px; bottom: 24px; color: #fff; font: 12px/1.3 Arial, sans-serif; letter-spacing: .08em; text-transform: uppercase; text-shadow: 0 1px 8px rgba(0,0,0,.7); }
  .content { flex: 1; position: relative; padding: 70px 76px 52px 76px; display: flex; flex-direction: column; background: #f5f2e9; }
  .kicker { display: flex; align-items: center; gap: 13px; font: 13px/1.2 Arial, sans-serif; letter-spacing: .22em; text-transform: uppercase; color: #286a59; }
  .kicker::before { content: ""; width: 35px; height: 3px; background: #286a59; display: block; }
  h1 { font-size: 76px; line-height: .97; letter-spacing: -.045em; font-weight: 500; margin: 46px 0 24px; color: #152935; }
  .rule { width: 76px; height: 2px; background: #47789a; margin: 0 0 28px; }
  .disciplines { font: 14px/1.4 Arial, sans-serif; letter-spacing: .13em; color: #326e60; text-transform: uppercase; margin: 0 0 20px; }
  .disciplines span { color: #4b7997; margin: 0 7px; }
  .description { max-width: 560px; color: #334650; font-size: 25px; line-height: 1.42; margin: 0; }
  .footer { margin-top: auto; display: flex; align-items: center; justify-content: space-between; border-top: 1px solid #c8d1c9; padding-top: 17px; color: #365d70; font: 13px/1.2 Arial, sans-serif; letter-spacing: .16em; }
  .dots { display: flex; gap: 8px; }
  .dots i { display: block; width: 9px; height: 9px; border-radius: 50%; background: #286a59; }
  .dots i:last-child { background: #47789a; }
  .leaf { position: absolute; width: 190px; height: 190px; right: -34px; top: -38px; border: 1px solid rgba(40,106,89,.12); border-radius: 50%; }
  .leaf::before, .leaf::after { content: ""; position: absolute; border: 1px solid rgba(71,120,154,.14); border-radius: 50% 0 50% 0; width: 110px; height: 46px; right: 42px; top: 68px; transform: rotate(-35deg); }
  .leaf::after { right: 14px; top: 100px; transform: rotate(28deg); border-color: rgba(40,106,89,.16); }
</style>
</head>
<body>
  <div class="card">
    <div class="portrait"><img src="${photoUrl}" alt=""><div class="photo-credit">Photo © Ricson Onodera</div></div>
    <div class="content">
      <div class="leaf"></div>
      <div class="kicker">Academic website</div>
      <h1>Tomaz<br>Amorim</h1>
      <div class="rule"></div>
      <p class="disciplines">Research <span>·</span> Writing <span>·</span> Teaching</p>
      <p class="description">Literature, extractivism and infrastructure in Latin America.</p>
      <div class="footer"><span>TOMAZAMORIM.COM</span><span class="dots"><i></i><i></i><i></i></span></div>
    </div>
  </div>
</body>
</html>`;
const browser = await launch();
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await fs.mkdir(outDir, { recursive: true });
  const output = path.join(outDir, 'og-image.jpg');
  await page.screenshot({ path: output, type: 'jpeg', quality: 91 });
  const generated = await fs.readFile(output);
  if (generated.length < 15000 || generated[0] !== 0xff || generated[1] !== 0xd8 || generated[2] !== 0xff) {
    throw new Error('Generated Open Graph image failed JPEG validation.');
  }
  console.log(`Generated 1200 × 630 Open Graph image: ${output} (${generated.length.toLocaleString()} bytes)`);
} finally {
  await browser.close();
}
