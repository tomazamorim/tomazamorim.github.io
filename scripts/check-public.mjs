import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const root = path.resolve('dist/public');
const fail = (m) => { console.error(`FAIL: ${m}`); process.exitCode = 1; };
if (!fs.existsSync(root)) { console.error('Run npm run build:public first.'); process.exit(1); }
const files=[];
(function walk(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const f=path.join(d,e.name);if(e.isDirectory())walk(f);else files.push(f)}})(root);
const html=files.filter(f=>f.endsWith('.html'));
const texts=html.map(f=>[f,fs.readFileSync(f,'utf8')]);
const joined=texts.map(x=>x[1]).join('\n');
const forbidden=[/A CONFIRMAR/i,/pending_approval/i,/ficha_notes/i,/KW_APPROVED/i,/lattes_candidate/i,/Conference proceedings/i,/Cited as Amorim Izabel, Tomaz/i,/<summary>Cite<\/summary>/i,/<summary>BibTeX<\/summary>/i,/\.\.\,\s*,/];
for(const re of forbidden)if(re.test(joined))fail(`Public HTML contains forbidden/internal text: ${re}`);
for(const route of ['index.html','cv/index.html','publications/index.html','talks/index.html','research/index.html','grants/index.html','teaching/index.html','colophon/index.html','impressum/index.html','datenschutz/index.html','for-organizers/index.html','sitemap.xml','cv/tomaz-amorim-izabel-cv.pdf'])if(!fs.existsSync(path.join(root,route)))fail(`Missing public output: ${route}`);
const pdfDir=path.join(root,'downloads/publications');
const hosted=fs.existsSync(pdfDir)?fs.readdirSync(pdfDir).filter(x=>x.toLowerCase().endsWith('.pdf')):[];
if(hosted.length!==15)fail(`Expected 15 hosted publication PDFs, found ${hosted.length}`);
if(fs.existsSync(path.join(root,'cv/tomaz-amorim-izabel-cv.pdf'))){
  const cv=path.join(root,'cv/tomaz-amorim-izabel-cv.pdf');
  try { const info=execFileSync('pdfinfo',[cv],{encoding:'utf8'}); if(!/Pages:\s+7\b/.test(info))fail('CV PDF should have 7 pages'); } catch { console.warn('pdfinfo unavailable; skipped PDF page count'); }
  try { const txt=execFileSync('pdftotext',['-layout',cv,'-'],{encoding:'utf8'}); const section=txt.split(/In press\s*/i)[1]?.split(/\n\s*Talks\s*\n/i)[0]||''; for(const title of ['Na Semana que vem','Extractivism and Modernism: The Case','Telluric Immigration: The Rivers','Desconstruindo o Antropocentrismo'])if(!section.includes(title))fail(`CV PDF missing accepted item: ${title}`); if(/Dossier on extractivism|Para além do antropocentrismo: convivialidades mais-que-humanas.*Forthcoming/i.test(section))fail('CV PDF contains a removed In-press item'); if(/A CONFIRMAR|Q\d{1,2}/i.test(txt))fail('CV PDF contains a placeholder'); } catch { console.warn('pdftotext unavailable; skipped CV text checks'); }
}
if(!joined.includes('Preferred citation: Amorim, Tomaz. Earlier publications may appear under historical name variants.'))fail('Preferred citation text missing from site');
if(!joined.includes('https://ojs.ifch.unicamp.br/index.php/teoriacritica/article/view/3979'))fail('Dissonância article URL missing');
if(!joined.includes('Recorded talks and events')||!joined.includes('Sonhos Intranquilos')||!joined.includes('Introdução à obra de Franz Kafka'))fail('Recorded talks/podcast sections missing');
if(!joined.includes('editorial-subsection'))fail('Editorial heading anchor not updated');
if(!joined.includes('Still under construction.'))fail('Research under-construction notice missing');
if(!joined.includes('https://biblioteca-repositorio.clacso.edu.ar/bitstreams/15f7ea6f-6c78-4949-8004-9b4414b9c26c/download'))fail('CLACSO introduction PDF endpoint missing');
if(fs.existsSync(path.join(root,'research/keywords/index.html')))fail('Keywords index must be hidden from the public build');
for(const file of ['AR-02-notas-sobre-o-castelo.pdf','AR-03-interrupcao-e-montagem.pdf','VO-01-esteticas-del-extractivismo-introduccion.pdf'])if(!hosted.includes(file))fail(`Missing hosted publication PDF: ${file}`);
if(!joined.includes('Introduction PDF'))fail('Estéticas introduction PDF button missing from Publications');
if(!joined.includes('PDF excerpt'))fail('Arquipélago excerpt label missing');
if(!joined.includes('Read the afterword') || !joined.includes('/downloads/publications/LV-01-arquipelago-posfacio-excerpt.pdf'))fail('Arquipélago afterword link missing from Selected Work');
const articlesHtml=fs.readFileSync(path.join(root,'publications/index.html'),'utf8');
for(const [id,title] of [['VO-02','Uneafro Brasil: 12 anos de luta'],['VO-03','Ponto Virgulina: revista de tradução literária'],['PO-01','Marte atacado'],['PO-02','Meia lua soco'],['PO-03','Plástico pluma'],['PO-04','Manifesto Baphywave']])if(!articlesHtml.includes(title))fail(`Expected public publication ${id} missing`);
for(const id of ['AR-08','AR-09','AR-10'])if((articlesHtml.match(new RegExp(`id="${id}"`,'g'))||[]).length!==0)fail(`${id} must be hidden from Publications`);
for(const [id,title] of [['OU-01','Escravidão e Ditadura: por mais Comissões da Verdade'],['OU-02','Novos mercados da violência no Brasil: as armas não letais']])if((articlesHtml.match(new RegExp(`id="${id}"`,'g'))||[]).length!==1||!articlesHtml.includes(title))fail(`2013 press item ${id} missing or duplicated`);
const ids=[];for(const [f,s] of texts)for(const m of s.matchAll(/\sid="([^"]+)"/g))ids.push([f,m[1]]);const seen=new Map();for(const [f,id] of ids){if(seen.has(`${f}:${id}`))fail(`Duplicate HTML id #${id} in ${path.relative(root,f)}`);seen.set(`${f}:${id}`,true)}

const sitemapPath = path.join(root, 'sitemap.xml');
if (fs.existsSync(sitemapPath)) {
  const sitemapXml = fs.readFileSync(sitemapPath, 'utf8');
  if (!sitemapXml.includes('/for-organizers/')) fail('For Organizers page missing from sitemap.xml');
} else fail('sitemap.xml missing from public output');
const ogImagePath = path.join(root, 'og-image.jpg');
if (!fs.existsSync(ogImagePath)) fail('Open Graph preview image missing from public output');
else {
  const bytes = fs.readFileSync(ogImagePath);
  if (bytes.length < 15000 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) fail('Open Graph preview image is not a valid JPEG');
}
if (!joined.includes('property="og:image"') || !joined.includes('content="image/jpeg"')) fail('Open Graph image metadata missing');
if (!joined.includes('name="twitter:card" content="summary_large_image"') || !joined.includes('name="twitter:image"')) fail('Twitter large-image metadata missing');

if(process.exitCode)process.exit(1);
console.log(`check:public passed: ${html.length} HTML pages, ${hosted.length} publication PDFs, CV PDF present.`);
