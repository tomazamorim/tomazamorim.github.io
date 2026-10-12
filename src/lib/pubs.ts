// Publications na web (rodada 3a, design v1.1 §6.5): agrupadas por tipo; item acadêmico sem o nome do autor; item de imprensa em uma linha.
// Tudo é derivado do que a ficha dá (ref em Chicago e BibTeX); nada é redigitado.
import { visiblePubs, bibFields, inline, site, type Pub } from './data';

export const OWNER = 'Amorim, Tomaz';

export type GroupId = 'books' | 'edited' | 'articles' | 'chapters' | 'translations' | 'poetry' | 'theses' | 'press';
export const GROUPS: { id: GroupId; label: string }[] = [
  { id: 'books', label: 'Books' },
  { id: 'edited', label: 'Edited volumes' },
  { id: 'articles', label: 'Journal articles' },
  { id: 'theses', label: 'Theses and dissertations' },
  { id: 'chapters', label: 'Book chapters' },
  { id: 'translations', label: 'Translations' },
  { id: 'poetry', label: 'Poetry' },
  { id: 'press', label: 'Essays, reviews & press' },
];

export function groupOf(p: Pub): GroupId {
  switch (p.group) {
    case 'book': return 'books';
    case 'edited': return 'edited';
    case 'articles': return 'articles';
    case 'chapters': return 'chapters';
    case 'translations': return 'translations';
    case 'poetry': return 'poetry';
    case 'thesis': return 'theses';
    case 'other': return 'press';
    default: return 'press'; // reviews
  }
}

const first = (n: string) => { const [l, f] = n.split(',').map((x) => x.trim()); return f ? `${f} ${l}` : l; };
const names = (s: string | undefined) => (s ? s.split(/\s+and\s+/).map((x) => x.trim()) : []);
const plain = (md: string) => md.replace(/\*([^*]+)\*/g, '$1');
const strip = (s: string) => s.replace(/[.,;\s]+$/, '').trim();

export type View = {
  p: Pub;
  id: string;
  group: GroupId;
  year: string;
  titleMd: string;      // markdown mínimo: *itálico*
  quoted: boolean;      // true: título entre aspas (artigo, capítulo); false: itálico (livro, volume)
  lang: string;
  meta: string;         // markdown mínimo
  credit: string;       // markdown mínimo, linha de crédito (coautores, organizadores, tradutor)
  cite: string;         // referência Chicago completa, texto simples
  press?: { date: string; venue: string; titleMd: string; url: string | null };
};

export function viewOf(p: Pub): View {
  const f = bibFields(p.bibtex);
  const ref = p.ref;
  const m = ref.match(/^(.*?)\.\s+(\d{4}|n\.d\.)\.\s+(.*)$/s);
  const year = p.year ? String(p.year) : 'n.d.';
  const group = groupOf(p);
  let title = '';
  let after = '';
  let quoted = false;
  const rest = m ? m[3] : ref;
  const q = rest.match(/^“(.+?)”\s*(.*)$/s);
  const it = rest.match(/^\*([^*]+)\*\.?\s*(.*)$/s);
  if (q) { title = strip(q[1]); after = q[2]; quoted = true; }
  else if (it) { title = it[1]; after = it[2]; }
  else { title = strip(rest.replace(/^\[([^\]]+)\]\.?\s*/, (_x, a) => a.charAt(0).toUpperCase() + a.slice(1) + '. ')); after = ''; }

  // crédito
  const credit: string[] = [];
  const authors = names(f.author);
  const editors = names(f.editor);
  const owner = OWNER;
  const translator = f.translator && f.translator !== owner ? first(f.translator) : null;
  if (group === 'translations') {
    const orig = authors.filter((a) => a !== owner).map(first);
    if (orig.length) credit.push(`by ${orig.join(' and ')}`);
  } else if (group === 'edited') {
    const co = editors.filter((a) => a !== owner).map(first);
    if (co.length) credit.push(`with ${co.join(' and ')}`);
  } else {
    const co = authors.filter((a) => a !== owner).map(first);
    if (co.length) credit.push(`with ${co.join(' and ')}`);
  }
  if (translator) credit.push(`translated by ${translator}`);
  // texto que a ficha põe fora das aspas e que faz parte do título ("… de O direito materno [Das Mutterrecht]")
  const ext = after.match(/^(de \*.*?\])\.?\s*(.*)$/s);
  if (ext) { credit.push(ext[1].replace(/^de /, 'from ')); after = ext[2]; }

  let meta = year;
  if (group === 'chapters') {
    const ed = after.match(/edited by (.+?), (?:vol\. \d+, )?[\d–]+\./s);
    const book = after.match(/In \*(.+?)\*/s);
    if (book) credit.push(`in *${book[1]}*${ed ? `, edited by ${ed[1]}` : ''}`);
    if (f.pages) meta = `${year} · pp. ${f.pages.replace(/--|-/g, '–')}`;
  } else if (group === 'articles') {
    const v = strip(after);
    if (v) meta = `${year} · ${v}`;
  } else if (group === 'translations') {
    const a = strip(after.replace(/Translated by [^.]+\.\s*/s, ''));
    if (a) meta = `${year} · ${a}`;
  } else if (group !== 'press') {
    // livros, volumes, poesia: a última frase da referência é "Local: Editora"
    const parts = strip(after).split(/\.\s+/).filter(Boolean);
    const last = parts[parts.length - 1];
    if (last && /:/.test(last) && !/^#|\[/.test(last)) meta = `${year} · ${last}`;
  }

  // referência para citar (texto simples): a da ficha + o endereço permanente
  let cite = plain(ref).replace(/\s+/g, ' ').trim();
  if (p.doi && (p as any).doi_linked !== false) cite += ` https://doi.org/${p.doi}.`;
  else if (p.url) cite += ` ${p.url}`;

  const v: View = { p, id: p.id, group, year, titleMd: title, quoted, lang: (p as any).title_lang ?? 'en', meta, credit: ((p as any).credit_override as string | undefined) ?? credit.join(' · '), cite };

  if (group === 'press') {
    const venue = after.match(/\*([^*]+)\*/)?.[1] ?? '';
    let tail = after.replace(/\*[^*]+\*/, '').replace(/\(([^)]*)\)/, '').replace(/^[\s,.]+/, '');
    let date = strip(tail);
    if (!venue && date) {
      const dm = date.match(/(\d{1,2} [A-Z][a-z]{2} \d{4}|[A-Z][a-z]{2} \d{4}|\d{4})\s*$/);
      v.press = { date: dm ? dm[1] : year, venue: dm ? strip(date.slice(0, dm.index)) : date, titleMd: title, url: p.url };
    } else {
      v.press = { date: date || year, venue: venue || '', titleMd: title, url: p.url };
    }
    if (!/\d{4}/.test(v.press.date)) v.press.date = year;
  }
  return v;
}

export function groupedViews(opts: { cv?: boolean } = {}): { id: GroupId; label: string; views: View[] }[] {
  const all = visiblePubs(opts).filter((p) => !(p as any).merged_into).map(viewOf);
  return GROUPS.map((g) => ({ ...g, views: all.filter((v) => v.group === g.id) })).filter((g) => g.views.length > 0);
}

/** Título em HTML: itálico `*x*`; aspas só se for artigo/capítulo. */
export function titleHtml(v: View): string {
  const t = inline(v.titleMd, { marks: false });
  return v.quoted ? `“${t}”` : `<i>${t.replace(/<\/?i>/g, '')}</i>`;
}
export const authorName = site.name;

/** Selected work da Home: ids de src/data/selected.json -> itens publicados (a escolha é de Tomaz; default do designer). */
import selected from '../data/selected.json';
export const selectedMarks = selected.tbc ?? [];
export function selectedItems(): { v: View; typeLabel: string; credit: string; access: { href: string; label: string } | null }[] {
  const all = visiblePubs();
  return selected.ids
    .map((id) => all.find((p) => p.id === id))
    .filter(Boolean)
    .map((p) => {
      const v = viewOf(p as Pub);
      const f = bibFields((p as Pub).bibtex);
      const typeLabel = v.group === 'chapters' ? 'Chapter' : v.group === 'edited' ? 'Edited volume' : v.group === 'articles' ? 'Article' : v.group === 'books' ? 'Book' : (p as Pub).kind;
      const parts = [v.credit];
      if ((v.group === 'books' || v.group === 'edited') && f.publisher) parts.push(v.group === 'books' && f.address ? `${f.address}: ${f.publisher}` : f.publisher);
      const url = (p as Pub).url;
      const label = (p as Pub).url_label ?? '';
      return { v, typeLabel, credit: parts.filter(Boolean).join(' · '), access: url ? { href: url, label: label.charAt(0).toUpperCase() + label.slice(1) } : null };
    });
}
