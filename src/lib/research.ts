// Subsite de pesquisa: tudo é derivado dos dados (keywords.json, gerado de ficha/09-keywords-v2.json; publications.json; talks.json).
// Nenhum texto de conteúdo é escrito aqui.
import { visibleKeywords, kwUrl, bibFields, inline, visibleTalks, talkGroupsOf, isVisible, publicationsAll as publications, type KwTerm } from './data';
import { viewOf, titleHtml } from './pubs';

export { kwUrl };

const LANG_NAME: Record<string, string> = { es: 'Spanish', pt: 'Portuguese', en: 'English' };
export const langName = (l: string) => LANG_NAME[l] ?? l;

/** Nomes que o verbete mostra além do termo: variantes em outras línguas (cada um com a língua em que foi publicado). */
export const otherNames = (k: KwTerm) => k.names as { lang: string; text: string; source: string; page: string | null }[];

/** Línguas (ordenadas) em que o termo tem nome: es · pt · en. Autores não têm. */
export function kwLangs(k: KwTerm): string[] {
  const set = new Set<string>(otherNames(k).map((n) => n.lang));
  if (k.kind === 'keyword') set.add('en');
  return ['es', 'pt', 'en'].filter((l) => set.has(l));
}

// ---------------------------------------------------------------- margens e faixas da página da pesquisa
const norm = (s: string) => s.toLowerCase();
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** Formas que o texto do projeto pode usar para um verbete: o termo (sem o parêntese), cada parte de "A / B", e os nomes em inglês. Plural simples aceito. */
function formsOf(k: KwTerm): string[] {
  const base = norm(k.term).replace(/\s*\(.*?\)/g, '');
  return [base, ...base.split(' / '), ...otherNames(k).filter((n) => n.lang === 'en').map((n) => norm(n.text))].filter(Boolean);
}
/** Verbetes (visíveis) cujo termo ou nome em inglês aparece no texto (palavra inteira; plural simples). */
export function termsIn(text: string): KwTerm[] {
  const t = norm(text);
  return visibleKeywords().filter((k) => formsOf(k).some((f) => new RegExp(`(^|[^a-z])${esc(f)}s?([^a-z]|$)`).test(t)));
}

// ---------------------------------------------------------------- páginas, citações, fontes
/** "70" -> "p. 70"; "70–71", "96, 111" -> "pp. 70–71", "pp. 96, 111"; sem página -> null. */
export function pageLabel(page: string | null | undefined): string | null {
  if (!page) return null;
  return (/[–,-]/.test(page) ? 'pp. ' : 'p. ') + page;
}

/** Aspas internas de uma citação: o texto vai entre “ ”, as internas viram ‘ ’. Nenhuma palavra muda. */
export function nestQuotes(t: string): string {
  return t.replace(/“/g, '‘').replace(/”/g, '’').replace(/"([^"]*)"/g, '‘$1’');
}

const pubOf = (id: string) => (publications as any[]).find((p) => p.id === id) ?? null;
export const isWeb = (sig: string) => sig === 'WEB-P4';

/** "Extractivismo y modernismo: el caso de…" -> "Extractivismo y modernismo" (título curto do texto citado, do BibTeX da ficha). */
export function shortTitle(sig: string): string {
  const pub = pubOf(sig);
  if (!pub) return 'Project 4';
  const f = bibFields(pub.bibtex);
  return (f.title ?? '').split(':')[0].trim() || 'Project 4';
}

const plain = (md: string) => md.replace(/\*([^*]+)\*/g, '$1');
const P4 = { html: '“Project 4: Extractivism and Infrastructure in Brazilian Literature.” DFG Research Unit FOR 5710.', url: 'https://infra-aesthetics.de/project4/', label: 'infra-aesthetics.de/project4' };

/** Uma entrada por texto citado: referência completa (HTML e texto simples para o botão Copy), páginas citadas, tradução e coautoria. */
export function sourceRefs(k: KwTerm) {
  const sigs = [...new Set(k.quotes.map((q) => q.source))];
  return sigs.map((sig) => {
    const quotes = k.quotes.filter((q) => q.source === sig);
    const pub = pubOf(sig);
    const pages = quotes.map((q) => q.page).filter(Boolean) as string[];
    const nums = [...new Set(pages.flatMap((p) => p.split(/[,–-]/).map((x) => x.trim())))];
    const plural = pages.length > 1 || pages.some((p) => /[–,-]/.test(p));
    const pagesText = pages.length ? `${plural ? 'pp.' : 'p.'} ${[...new Set(pages)].sort((a, b) => parseInt(a) - parseInt(b)).join(', ')}` : '';
    const url = pub ? pub.url : (quotes.find((q) => q.source_url)?.source_url ?? P4.url);
    const label = pub ? pub.url_label : P4.label;
    return {
      sig, short: shortTitle(sig), year: pub?.year ?? null,
      html: pub ? inline(pub.ref, { marks: false }) : P4.html,
      plain: (pub ? plain(pub.ref) : P4.html) + (url ? ` ${url}` : ''),
      url, label, pages: pagesText, nums,
      translator: quotes.find((q) => q.translator)?.translator as string | undefined,
      translatorLang: langName(quotes.find((q) => q.translator)?.lang ?? ''),
      coauthor: quotes.find((q) => q.coauthor)?.coauthor as string | undefined,
    };
  });
}

/** Glosa do índice: a primeira oração da definição (até o primeiro ponto final seguido de espaço), sem alterar palavras. */
export function glossOf(k: KwTerm): string | null {
  const d = (k as any).definition as string | null;
  if (!d) return null;
  const m = d.match(/^(.+?[.!?])(\s|$)/s);
  return m ? m[1] : d;
}

// ---------------------------------------------------------------- Near, publicações e falas relacionadas
export function nearOf(k: KwTerm): KwTerm[] {
  const vis = visibleKeywords();
  return (k.near as string[]).map((s) => vis.find((o) => o.slug === s)).filter(Boolean) as KwTerm[];
}

/** Publicações relacionadas que estão na página Publications (publicadas e visíveis; "In press" e textos só do CV não entram). */
export function relatedPubs(k: KwTerm) {
  return (k.related_pubs as string[])
    .map((id) => pubOf(id))
    .filter((p) => p && isVisible(p) && !p.cv_only && p.status !== 'in_press' && !p.merged_into)
    .map((p) => {
      const v = viewOf(p);
      return { id: p.id as string, year: v.year, html: titleHtml(v), credit: v.credit, kind: p.kind as string, lang: v.lang };
    })
    .sort((a, b) => b.year.localeCompare(a.year));
}

/** Falas relacionadas que estão em Talks (só as visíveis; as "lattes_candidate" nunca existem em talks.json). */
export function relatedTalks(k: KwTerm) {
  const ids = new Set((k.related_talks as { id: string }[]).map((t) => t.id));
  return talkGroupsOf(visibleTalks().filter((t) => ids.has(t.id)));
}
