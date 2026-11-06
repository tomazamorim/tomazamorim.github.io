// Keywords v3: verbetes, links internos e barra lateral.
import data from '../data/keywords-v3.json';

export type KwEntry = (typeof data.entries)[number];
export const entries: KwEntry[] = data.entries;
export const kwUrl3 = (slug: string) => `/research/keywords/${slug}/`;

export const KIND_LABEL: Record<string, string> = {
  concept: 'Concept',
  interlocutor: 'Author',
  image: 'Image',
};
export const GROUPS = [
  { id: 'concepts', kind: 'concept', label: 'Concepts' },
  { id: 'authors', kind: 'interlocutor', label: 'Authors' },
  { id: 'images', kind: 'image', label: 'Images' },
];

// Termo (ou parte de "A / B") -> slug, para os negritos do texto e os itens da barra lateral.
const bySurface = new Map<string, KwEntry>();
for (const e of entries) {
  bySurface.set(e.term.toLowerCase(), e);
  for (const part of e.term.split(' / ')) bySurface.set(part.trim().toLowerCase(), e);
}
export const entryFor = (s: string): KwEntry | undefined =>
  bySurface.get(s.trim().toLowerCase()) ?? bySurface.get(s.trim().toLowerCase().replace(/s$/, ''));

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Markdown mínimo do texto-base: **termo** vira link para o verbete; *itálico*; URLs viram links. Nenhuma palavra muda. */
/** Aspas tipográficas na exibição (o texto-base usa aspas retas); nenhuma palavra muda. */
function smart(s: string): string {
  return s
    .replace(/(^|[\s(\[—–/])"/g, '$1“').replace(/"/g, '”')
    .replace(/(^|[\s(\[“—–/])'/g, '$1‘').replace(/'/g, '’');
}

export function md(s: string, self?: string): string {
  let h = esc(smart(s));
  h = h.replace(/\*\*([^*]+)\*\*/g, (_, t) => {
    const e = entryFor(t);
    return e && e.slug !== self ? `<a class="kwl" href="${kwUrl3(e.slug)}">${t}</a>` : `<strong>${t}</strong>`;
  });
  h = h.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  h = h.replace(/(https?:\/\/[^\s<]+?)(\.?)(?=\s|$)/g, '<a href="$1">$1</a>$2');
  return h;
}

/** Item da barra lateral: verbete vira link; o resto fica como texto. */
export function sideItem(s: string): string {
  const e = entryFor(s);
  return e ? `<a href="${kwUrl3(e.slug)}">${esc(s)}</a>` : md(s);
}

/** Glosa do índice: a primeira frase do verbete, sem os parênteses de referência. */
export function gloss(e: KwEntry): string {
  const p = e.paragraphs[0].replace(/\s*\([^()]*\d[^()]*\)/g, '');
  const m = p.match(/^(.+?[.!?])(\s|$)/s);
  return md(m ? m[1] : p, e.slug).replace(/<a [^>]*>([^<]*)<\/a>/g, '$1');
}

export const citeHtml = (e: KwEntry, site: string) =>
  md(e.cite.replace('[URL]', `${site}${kwUrl3(e.slug)}`));
