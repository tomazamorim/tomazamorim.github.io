// Pós-processamento de dist/<modo>: PDF do CV, remoção da página de impressão, pesos das páginas (colofão), sitemap (só público).
import { launch } from './_browser.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { startServer } from './serve.mjs';

const mode = process.argv[2] === 'public' ? 'public' : 'preview';
const dir = path.resolve(`dist/${mode}`);
fs.mkdirSync(path.resolve('generated'), { recursive: true });
const site = JSON.parse(fs.readFileSync('src/data/site.json', 'utf8'));
const siteUrl = (process.env.SITE_URL || site.site_url).replace(/\/$/, '');
const kb1 = (b) => (b / 1000).toFixed(1);

// 1) PDF do CV
const pdfSrc = path.resolve('generated', `cv-${mode}.pdf`);
if (fs.existsSync(pdfSrc)) {
  fs.mkdirSync(path.join(dir, 'cv'), { recursive: true });
  fs.copyFileSync(pdfSrc, path.join(dir, 'cv', 'tomaz-amorim-izabel-cv.pdf'));
  console.log('[post] CV PDF copiado');
} else console.log('[post] sem PDF do CV neste modo (botão ausente)');

// 1b) retrato para download: só existe no público depois de PHOTO (o fotógrafo permite o download e a reutilização)
const release = JSON.parse(fs.readFileSync('src/data/release.json', 'utf8'));
if (mode === 'public' && !release.approved.includes('PHOTO')) {
  fs.rmSync(path.join(dir, 'downloads'), { recursive: true, force: true });
  console.log('[post] downloads/ removido do público (PHOTO não aprovado)');
}

// 1c) copy.js só vai no pacote se alguma página o referencia (verificador N2, revisor R2-13)
const allHtml = [];
(function w(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const f = path.join(d, e.name); e.isDirectory() ? w(f) : e.name.endsWith('.html') && allHtml.push(f); } })(dir);
if (!allHtml.some((f) => fs.readFileSync(f, 'utf8').includes('/copy.js'))) {
  fs.rmSync(path.join(dir, 'copy.js'), { force: true });
  console.log('[post] copy.js removido (nenhuma página o usa)');
}

// 2) página de impressão não vai ao ar
fs.rmSync(path.join(dir, 'cv', 'print'), { recursive: true, force: true });

// 3) lista de páginas
const pages = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const f = path.join(d, e.name);
    if (e.isDirectory()) walk(f);
    else if (e.name === 'index.html') pages.push('/' + path.relative(dir, d).replace(/\\/g, '/') + (path.relative(dir, d) ? '/' : ''));
    else if (e.name === '404.html') pages.push('/404.html');
  }
})(dir);
pages.sort();

// 4) pesos medidos com Chromium (cache frio): bytes do corpo efetivamente transferidos (texto com gzip)
const { server, port } = await startServer(dir, 0);
const browser = await launch();
const external = [];
// The Talks page intentionally embeds Spotify players and clickable YouTube thumbnails.
// Permit only those provider resources on that page; all other third-party requests still fail the build.
function allowedEmbedRequest(pagePath, rawUrl) {
  if (pagePath !== '/talks/') return false;
  if (rawUrl.startsWith('blob:https://open.spotify.com/')) return true;
  let host;
  try { host = new URL(rawUrl).hostname.toLowerCase(); } catch { return false; }
  return host === 'i.ytimg.com'
    || host === 'spotify.com'
    || host.endsWith('.spotify.com')
    || host === 'spotifycdn.com'
    || host.endsWith('.spotifycdn.com')
    || host === 'scdn.co'
    || host.endsWith('.scdn.co')
    || host === 'sentry.io'
    || host.endsWith('.sentry.io');
}
async function measure(u) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  let total = 0, n = 0;
  const pending = [];
  page.on('request', (r) => { if (!r.url().startsWith(`http://127.0.0.1:${port}`) && !r.url().startsWith('data:') && !allowedEmbedRequest(u, r.url())) external.push(`${u} -> ${r.url()}`); });
  page.on('requestfinished', (req) => pending.push(req.sizes().then((s) => { total += s.responseBodySize + s.responseHeadersSize; n++; })));
  // Spotify's embedded player can keep connections open indefinitely; measure Talks after DOM content is ready.
  await page.goto(`http://127.0.0.1:${port}${u}`, { waitUntil: u === '/talks/' ? 'domcontentloaded' : 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(200);
  await Promise.all(pending);
  await ctx.close();
  return { bytes: total, requests: n };
}
const label = (u) => {
  if (u === '/') return 'Home';
  if (u === '/cv/') return 'CV';
  if (u === '/404.html') return '404 (page not found)';
  const parts = u.replace(/^\/|\/$/g, '').split('/').map((x) => x.replace(/-/g, ' '));
  const head = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
  return [head, ...parts.slice(1)].join(' · ');
};
const weights = {};
for (const u of pages) weights[u] = await measure(u);

function weightsHtml() {
  const rows = [];
  const kwPages = pages.filter((u) => /^\/research\/keywords\/[^/]+\/$/.test(u));
  for (const u of pages) {
    if (kwPages.includes(u)) continue;
    rows.push(`<tr><td>${label(u)}</td><td class="n">${kb1(weights[u].bytes)} KB</td><td class="n">${weights[u].requests}</td></tr>`);
  }
  if (kwPages.length) {
    const b = kwPages.map((u) => weights[u].bytes);
    rows.push(`<tr><td>Research · keywords · &lt;term&gt; (${kwPages.length} entries)</td><td class="n">${kb1(Math.min(...b))}–${kb1(Math.max(...b))} KB</td><td class="n">${weights[kwPages[0]].requests}</td></tr>`);
  }
  const all = Object.values(weights).map((w) => w.bytes);  // inclui a 404, como a tabela (verificador N1)
  const lo = kb1(Math.min(...all)), hi = kb1(Math.max(...all));
  return `<p>Measured when the site is built, with a cold cache: HTML, style sheet, fonts, images and script actually requested, with text compressed (gzip). Pages transfer between ${lo} and ${hi} KB (1 KB = 1000 bytes). Built ${new Date().toISOString().slice(0, 10)}.</p>` +
    `<details class="weights"><summary>Page by page</summary><table><thead><tr><th>Page</th><th class="n">Transferred</th><th class="n">Requests</th></tr></thead><tbody>${rows.join('')}</tbody></table></details>`;
}
const colophon = path.join(dir, 'colophon', 'index.html');
if (fs.existsSync(colophon)) {
  const raw = fs.readFileSync(colophon, 'utf8');
  if (raw.includes('%%WEIGHTS%%')) {
    fs.writeFileSync(colophon, raw.replace('%%WEIGHTS%%', `<!--W-->${weightsHtml()}<!--/W-->`));
    weights['/colophon/'] = await measure('/colophon/');   // agora com o texto e a tabela
    fs.writeFileSync(colophon, fs.readFileSync(colophon, 'utf8').replace(/<!--W-->[\s\S]*?<!--\/W-->/, `<!--W-->${weightsHtml()}<!--/W-->`));
  }
}
if (external.length) { console.error('[post] REQUISIÇÕES A TERCEIROS:', external); process.exit(1); }
console.log('[post] nenhuma requisição a terceiros em', pages.length, 'páginas');
fs.writeFileSync(path.resolve('generated', `weights-${mode}.json`), JSON.stringify(weights, null, 1));
await browser.close();
server.close();
console.log('[post] pesos:', pages.length, 'páginas; maior:', kb1(Math.max(...Object.values(weights).map((w) => w.bytes))), 'KB');

// 5) sitemap (só público; sem rascunhos nem páginas noindex)
if (mode === 'public') {
  const today = new Date().toISOString().slice(0, 10);
  const urls = pages.filter((u) => u !== '/404.html').filter((u) => !/noindex/.test(fs.readFileSync(path.join(dir, u, 'index.html'), 'utf8')));
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${siteUrl}${u}</loc><lastmod>${today}</lastmod></url>`).join('\n')}\n</urlset>\n`;
  fs.writeFileSync(path.join(dir, 'sitemap.xml'), xml);
  console.log('[post] sitemap.xml:', urls.length, 'URLs');
}
