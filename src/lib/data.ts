// Camada de dados do site público. Os arquivos neste repositório contêm apenas conteúdo aprovado para publicação.
import release from '../data/release.json';
import site from '../data/site.json';
import publicationsGen from '../data/publications.json';
import talksLocal from '../data/talks.json';
import cvGen from '../data/cv.json';
import bios from '../data/bios.json';
import project from '../data/project.json';
import keywordsFile from '../data/keywords.json';
import feed from '../data/feed.json';
import podcast from '../data/podcast.json';
import publicRules from '../data/public-rules.json';
import { MODE, isPreview } from './mode';

export { MODE, isPreview, site, publicRules };

export type Tbc = { q: string; note: string };
export type Status = 'published' | 'pending' | 'draft' | 'in_press' | 'merged' | 'education_only' | 'hidden';
type Item = { status?: string; needs?: string[]; tbc?: Tbc[] };

export const approved = new Set<string>(release.approved);

/** Resolve publication state for approved public content. */
export function effStatus(it: Item): Status {
  const s = (it.status ?? 'published') as Status;
  if (s === 'pending' && it.needs && it.needs.length > 0 && it.needs.every((q) => approved.has(q))) return 'published';
  return s;
}

/** Visibility is still shared with a local preview, but public data carries no private drafts. */
export function isVisible(it: Item): boolean {
  const s = effStatus(it);
  if (s === 'published') return true;
  if (s === 'pending' || s === 'draft') return isPreview;
  return false;
}

/** Marcas [A CONFIRMAR] ainda abertas (só no preview). */
export function activeMarks(tbc?: Tbc[]): Tbc[] {
  if (!isPreview || !tbc) return [];
  return tbc.filter((t) => !approved.has(t.q));
}

export function markLabel(t: Tbc): string {
  return `[A CONFIRMAR: ${t.note} · ${t.q}]`;
}

// ------------------------------------------------------------------ texto
export function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Markdown mínimo da ficha: *itálico*, **negrito**, URLs soltas, e marcas {{tbc|Q|nota}}. */
export function inline(md: string, opts: { marks?: boolean } = {}): string {
  const showMarks = opts.marks ?? isPreview;
  let out = esc(md);
  // marcas
  out = out.replace(/\{\{tbc\|([^|}]*)\|([^}]*)\}\}/g, (_m, q: string, note: string) => {
    const qs = q.split(',').filter(Boolean);
    if (!showMarks) return '';
    if (qs.length && qs.every((x) => approved.has(x))) return '';
    return `<span class="tbc">[A CONFIRMAR: ${note}${q ? ' · ' + q.replace(/,/g, ', ') : ''}]</span>`;
  });
  out = out.replace(/\[A CONFIRMAR\]/g, showMarks ? '<span class="tbc">[A CONFIRMAR]</span>' : '');
  out = out.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
  out = out.replace(/\*([^*]+)\*/g, '<i>$1</i>');
  out = out.replace(/(^|[\s(])(https?:\/\/[^\s<)]+[^\s<).,;])/g, '$1<a href="$2">$2</a>');
  // limpa espaços deixados por marcas ocultas
  out = out.replace(/\s+([.;,])/g, '$1').replace(/\s{2,}/g, ' ').trim();
  return out;
}

export function stripMarks(md: string): string {
  return md.replace(/\{\{tbc\|[^}]*\}\}/g, '').replace(/\s+([.;,])/g, '$1').replace(/\s{2,}/g, ' ').trim();
}

export function countMarks(md: string): number {
  return (md.match(/\{\{tbc\|/g) || []).length + (md.match(/\[A CONFIRMAR\]/g) || []).length;
}

// ------------------------------------------------------------------ build
const now = process.env.BUILD_DATE ? new Date(process.env.BUILD_DATE) : new Date();
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const buildDate = `${now.getUTCDate()} ${MONTHS[now.getUTCMonth()]} ${now.getUTCFullYear()}`;
export const buildDateISO = now.toISOString().slice(0, 10);

// ------------------------------------------------------------------ publicações
// O repositório público contém apenas registros já aprovados para publicação.
const publications: any[] = publicationsGen;
export const publicationsAll = publications;
export type Pub = (typeof publicationsGen)[number] & { cv_only?: boolean };

export const FILTERS: { slug: string; label: string; group: string | null }[] = [
  { slug: '', label: 'All', group: null },
  { slug: 'book', label: 'Book', group: 'book' },
  { slug: 'edited-volumes', label: 'Edited volumes', group: 'edited' },
  { slug: 'chapters', label: 'Chapters', group: 'chapters' },
  { slug: 'articles', label: 'Articles', group: 'articles' },
  { slug: 'translations', label: 'Translations', group: 'translations' },
  { slug: 'poetry', label: 'Poetry', group: 'poetry' },
  { slug: 'reviews', label: 'Reviews', group: 'reviews' },
  { slug: 'other', label: 'Other', group: 'other' },
];

/** Publicações da página /publications/ (e do que dela deriva). Itens `cv_only` (textos de graduação) ficam só no CV. */
export function visiblePubs(opts: { cv?: boolean } = {}): Pub[] {
  return publications
    .filter((p) => isVisible(p) && (opts.cv || !(p as any).cv_only))
    .sort((a, b) => (b.year ?? -1) - (a.year ?? -1) || a.order - b.order);
}

export function pubFilters() {
  const all = visiblePubs();
  return FILTERS.map((f) => ({
    ...f,
    count: f.group ? all.filter((p) => p.group === f.group).length : all.length,
  })).filter((f) => f.count > 0);
}

/** Campos do BibTeX da ficha (parser simples: chave = {valor}). */
export function bibFields(bib: string): Record<string, string> {
  const o: Record<string, string> = {};
  const re = /^\s*(\w+)\s*=\s*\{(.*)\},?\s*$/gm;
  let m;
  while ((m = re.exec(bib))) {
    o[m[1].toLowerCase()] = m[2]
      .replace(/``/g, '“')
      .replace(/''/g, '”')
      .replace(/\\&/g, '&')
      .replace(/--/g, '–');
  }
  return o;
}

// ------------------------------------------------------------------ falas
const talks: any[] = talksLocal;
export type Talk = (typeof talksLocal)[number] & { link?: string | null };
export function visibleTalks(): Talk[] {
  return (talks as Talk[]).filter((t) => isVisible(t)).sort((a, b) => b.date.localeCompare(a.date));
}

/** Reapresentações da mesma fala (campo "group" em talks.json) viram uma entrada só: a mais recente + "Also presented". */
export type TalkGroup = { main: Talk; also: Talk[] };
export function talkGroupsOf(list: Talk[]): TalkGroup[] {
  const out: TalkGroup[] = [];
  const byGroup = new Map<string, TalkGroup>();
  for (const t of list) {
    const g = (t as any).group as string | undefined;
    const hit = g ? byGroup.get(g) : undefined;
    if (hit) { hit.also.push(t); continue; }
    const grp: TalkGroup = { main: t, also: [] };
    out.push(grp);
    if (g) byGroup.set(g, grp);
  }
  return out;
}
export const talkGroups = (): TalkGroup[] => talkGroupsOf(visibleTalks());

/** A lista de falas é completa? (release.json -> lists_complete.talks). Enquanto não for, o título é "Selected talks". */
export const talksComplete: boolean = !!(release as any).lists_complete?.talks;
export const talksTitle = talksComplete ? 'Talks' : 'Selected talks';

// ------------------------------------------------------------------ bios, projeto
export const visibleBios = () => bios.filter((b) => isVisible(b));
// O PDF aprovado do CV é mantido como arquivo estático; os dados públicos não contêm itens In press.
function buildCv() {
  return JSON.parse(JSON.stringify(cvGen));
}
const cv = buildCv();
export { project, cv, keywordsFile, feed, podcast };

/** Interruptor que não é pergunta da ficha (PHOTO, DFGNR, COLOPHON, LEGAL, HOSTING, DOI): visível no preview; no público só depois de aprovado. */
export const gateOpen = (code: string): boolean => isVisible({ status: 'pending', needs: [code] });

/** O texto do Project 4 pode ir ao ar? (Q12). */
export const projectVisible = (): boolean => isVisible(project as Item);
/** Existe subsite de pesquisa? (texto do projeto liberado ou Keywords liberadas). Sem isso: sem página, sem link, sem sitemap. */
export const researchLede = (): string | null => ((site as any).research_lede as string | null) || null;
/** A pesquisa só vai ao público com o lede de Tomaz (designer, item 17); no preview o lugar do lede fica marcado. */
export const hasResearch = (): boolean => (projectVisible() || visibleKeywords().length > 0) && (isPreview || !!researchLede());
/** Destino do link "Research" do menu principal. */
export const researchHref = (): string => (projectVisible() ? '/research/' : '/research/keywords/');
export const projectPublishable = (): boolean => projectVisible() && (isPreview || !!researchLede());
/** Há verbetes de Keywords para o público? Só com KW_APPROVED (ou no preview). */
export const keywordsOpen = (): boolean => visibleKeywords().length > 0;
/** O site carrega algum script? (copy.js só existe onde há botões de copiar: bios, foto para organizadores, Keywords). */
export const siteHasScript = (): boolean => visibleBios().length > 0 || visibleKeywords().length > 0 || gateOpen('PHOTO');

// ------------------------------------------------------------------ keywords
export type KwTerm = (typeof keywordsFile.terms)[number];
/** Verbetes visíveis. Cada verbete tem needs ['KW_APPROVED']: no preview aparecem completos; no público, só depois que Tomaz aprovar. */
export function visibleKeywords(kind?: 'keyword' | 'author'): KwTerm[] {
  return keywordsFile.terms
    .filter((k) => isVisible(k as Item) && (!kind || k.kind === kind))
    .sort((a, b) => a.term.localeCompare(b.term, 'en'));
}

export function kwUrl(slug: string) {
  return `/research/keywords/${slug}/`;
}

export function hasPodcast(): boolean {
  return podcast.episodes.filter((e: any) => isVisible(e)).length > 0;
}

export function absoluteUrl(path: string): string {
  return site.site_url.replace(/\/$/, '') + path;
}
