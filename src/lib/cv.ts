// CV: transforma cv.json (gerado de ficha/CV.md) em estruturas para a página web e para a página de impressão (PDF).
// UMA fonte de verdade para o CV web e o CV em PDF (rodada 2): as duas usam `visibleInCv`.
//   preview: tudo aparece, com as marcas [A CONFIRMAR]
//   público: item com marca aberta NÃO aparece, salvo as marcas de public-rules.json -> accepted_marks
import { cv, inline, isPreview, approved, effStatus, publicRules, talkGroups, publicationsAll as publications, type Status } from './data';

export type CvItem = { md: string; status: string; needs?: string[]; ref_id?: string; kind?: string; role?: string; dup_of?: string };
export type CvBlock = { t: 'p' | 'label' | 'h3' | 'ul'; md?: string; items?: CvItem[]; preview_only?: boolean };
export type CvSection = { id: string; title: string; blocks: CvBlock[] };

export const sections: CvSection[] = cv.sections as CvSection[];
export const section = (id: string) => sections.find((s) => s.id === id)!;

const pubById = new Map((publications as any[]).map((p) => [p.id as string, p]));
const held = new Set<string>(publicRules.hold_ids.map((h) => h.id));
export const isHeld = (it: { ref_id?: string }) => !!it.ref_id && held.has(it.ref_id);

// ------------------------------------------------------------------ marcas
type Mark = { q: string; note: string };
/** Marcas {{tbc|Q|nota}} ainda abertas (perguntas não aprovadas) num texto. */
export function openMarks(md: string): Mark[] {
  const out: Mark[] = [];
  const re = /\{\{tbc\|([^|}]*)\|([^}]*)\}\}/g;
  let m;
  while ((m = re.exec(md))) {
    const qs = m[1].split(',').filter(Boolean);
    if (qs.length && qs.every((q) => approved.has(q))) continue;
    out.push({ q: m[1], note: m[2] });
  }
  return out;
}
const isAccepted = (m: Mark) => publicRules.accepted_marks.some((a) => a.q === m.q && m.note.startsWith(a.note_starts));
/** No público: o texto tem alguma marca aberta que NÃO está na lista de aceitas? */
export function blockedInPublic(md: string): boolean {
  if (/\[A CONFIRMAR\]/.test(md)) return true;
  return openMarks(md).some((m) => !isAccepted(m));
}

/** Situação efetiva de um item do CV: se ele é uma publicação da ficha 02, vale a situação de publications.json. */
function statusOf(it: CvItem): Status {
  const pub = it.ref_id ? pubById.get(it.ref_id) : null;
  return effStatus(pub ?? (it as any));
}

/** O item aparece? target: 'web' (páginas) ou 'pdf'. */
export function visibleInCv(it: CvItem, target: 'web' | 'pdf' = 'web'): boolean {
  const st = statusOf(it);
  const statusOk = st === 'published' || (isPreview && (st === 'pending' || (st as string) === 'draft')) || (target === 'pdf' && st === 'in_press');
  if (!statusOk) return false;
  if (!isPreview) {
    if (blockedInPublic(it.md)) return false;
    if (isHeld(it)) return false;
  }
  if (target === 'pdf' && it.dup_of) return false; // V-01: o PDF não repete em Service o que está em Publications
  return true;
}
/** Parágrafo (introdução, supervisão, idiomas) visível? */
export function visibleParagraph(b: CvBlock): boolean {
  if (b.t !== 'p') return false;
  if (b.preview_only) return isPreview;
  return isPreview || !blockedInPublic(b.md ?? '');
}

// ------------------------------------------------------------------ datas
/** Coluna de datas, igual no CV web e no PDF (rodada 3a, revisor R2-12): a forma da ficha (CV.md), com o que ela confirma ("Nov 2024", "Jul–Dec 2021");
 *  "2025–present" vira "2025 –" (DS §2.3); intervalos sem espaços ("2019–2022"). Meses não confirmados nunca estão no texto da ficha (a marca Q18 cobre o que falta). */
export function whenLabel(when: string): string {
  if (/\bor\b/.test(when)) return when;
  if (/present/i.test(when)) { const m = when.match(/^([A-Z][a-z]{2}) ((?:19|20)\d\d)/); if (m) return `${m[1]} ${m[2]} –`; const y = when.match(/\b(?:19|20)\d\d\b/)?.[0]; return y ? `${y} –` : when; }
  return when.replace(/\s*[–-]\s*/g, '–');
}
/** compatibilidade: o nome antigo continua exportado */
export const yearsOf = whenLabel;
const startYear = (when: string) => Number(when.match(/\b(?:19|20)\d\d\b/)?.[0] ?? 0);

/** Separa "**quando.** texto" em { when, rest }. */
export function splitLead(md: string): { when: string | null; rest: string } {
  const m = md.match(/^\*\*(.+?)\.\*\*\s*(.*)$/s);
  if (m) return { when: m[1], rest: m[2] };
  return { when: null, rest: md };
}

/** Educação: "**Curso, Instituição, 2010–2013.** Dissertation: …" -> anos | "**Curso, Instituição**. Dissertation: …" (a pontuação da ficha é preservada). */
export function splitEducation(md: string): { when: string; rest: string } | null {
  const m = md.match(/^\*\*(.+?),\s*(\d{4}[–-]\d{4})(\.?)\*\*\s*(.*)$/s);
  if (!m) return null;
  const [, title, years, dot, tail] = m;
  return { when: years, rest: (dot ? `**${title}**. ${tail}` : `**${title}** ${tail}`).trim() };
}

/** Texto do CV na web: o mesmo do PDF (só normaliza espaços). */
export function webText(md: string): string {
  return md.replace(/\s+/g, ' ').trim();
}

export const slugOf = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export type Row = { when: string; html: string; key: string; role?: string };

/** Linhas de uma seção em forma de tabela (anos | texto), agrupadas pelos rótulos da ficha. `desc`: ordem decrescente pelo ano de início. */
export function rowsOf(
  sectionId: string,
  opts: { education?: boolean; desc?: boolean; filter?: (it: CvItem) => boolean } = {},
): { label: string | null; rows: Row[] }[] {
  const s = section(sectionId);
  const groups: { label: string | null; rows: Row[] }[] = [];
  let label: string | null = null;
  for (const b of s.blocks) {
    if (b.t === 'label') { label = b.md ?? null; continue; }
    if (b.t !== 'ul') continue;
    const rows: Row[] = [];
    for (const it of (b.items ?? []).filter((i) => visibleInCv(i, 'web') && (!opts.filter || opts.filter(i)))) {
      let when = '';
      let rest = it.md;
      if (opts.education) {
        const e = splitEducation(it.md);
        if (e) { when = yearsOf(e.when); rest = e.rest; }
      } else {
        const l = splitLead(it.md);
        if (l.when) { when = yearsOf(l.when); rest = l.rest; }
      }
      rows.push({ when, html: inline(webText(rest)), key: it.md.slice(0, 24), role: it.role });
    }
    if (opts.desc) rows.sort((a, b) => startYear(b.when) - startYear(a.when)); // ordenação estável: empates mantêm a ordem da ficha
    if (rows.length) groups.push({ label, rows });
  }
  return groups;
}

/** Blocos de parágrafo de uma seção (supervisão, idiomas), só os visíveis. */
export function parasOf(sectionId: string): string[] {
  return section(sectionId).blocks
    .filter((b) => b.t === 'p' && visibleParagraph(b))
    .map((b) => inline(webText(b.md ?? '')));
}

/** A seção tem algo a mostrar na web? */
export function hasWebContent(sectionId: string, opts: { education?: boolean } = {}): boolean {
  return rowsOf(sectionId, opts).length > 0 || parasOf(sectionId).length > 0;
}

// ------------------------------------------------------------------ Grants em três blocos (rodada 2)
export function grantBlocks() {
  const all = section('grants-and-fellowships').blocks.flatMap((b) => b.items ?? []);
  const kinds: { id: 'funding' | 'fellowship' | 'award'; title: string }[] = [
    { id: 'funding', title: 'Research funding' },
    { id: 'fellowship', title: 'Fellowships' },
    { id: 'award', title: 'Awards' },
  ];
  return kinds
    .map((k) => {
      const rows: Row[] = [];
      for (const it of all.filter((i) => i.kind === k.id && visibleInCv(i, 'web'))) {
        const l = splitLead(it.md);
        // a função (papel) tem coluna própria: a frase da ficha que a repete sai da coluna de texto
        let rest = l.rest;
        if (it.role) rest = rest.replace(/\s*Principal Investigator of subproject TP 4 “[^”]*”\.?/, '');
        rows.push({ when: yearsOf(l.when ?? ''), html: inline(webText(rest)), key: it.md.slice(0, 24), role: it.role });
      }
      rows.sort((a, b) => startYear(b.when) - startYear(a.when));
      return { ...k, rows };
    })
    .filter((g) => g.rows.length > 0);
}

// ------------------------------------------------------------------ Talks no CV (web e PDF público): as mesmas de /talks/
export function talkLine(t: { date_label: string; city: string; title: string; event: string; institution?: string | null }): string {
  const title = /[.?!]$/.test(t.title) ? t.title : t.title + '.';
  return `${t.date_label}. “${title}” ${t.event}${t.institution ? ', ' + t.institution : ''}, ${t.city}.`;
}
/** Linha de fala para o PDF público (mesmas falas e agrupamento de /talks/): reapresentações em "Also presented". */
export function talkPdfLine(g: { main: any; also: any[] }): string {
  let line = `**${g.main.date_label}.** ` + talkLine(g.main).slice(g.main.date_label.length + 2);  // data em destaque: a lista de falas usa a mesma tabela de datas das outras seções
  if (g.also.length) {
    const segs: { title: string; items: any[] }[] = [];
    for (const a of g.also) {
      const sg = segs.find((x) => x.title === a.title);
      if (sg) sg.items.push(a); else segs.push({ title: a.title, items: [a] });
    }
    const where = (a: any) => `${a.event}${a.institution ? ', ' + a.institution : ''}, ${a.city}, ${a.date_label}`;
    line += ' Also presented' + segs.map((sg, i) => `${i ? ' · ' : ': '}${sg.title !== g.main.title ? `as “${sg.title}”, ` : ''}${sg.items.map(where).join('; ')}`).join('') + '.';
  }
  return line;
}
export { talkGroups };

// ---------------------------------------------------------------- PDF
/** Marcas ainda abertas no que o PDF deste modo mostra. No público, o filtro de `visibleInCv` já tirou os itens com marca; sobram só as aceitas. */
export function unresolvedMarks(): number {
  let n = 0;
  const count = (md: string) => {
    n += openMarks(md).filter((m) => isPreview || !isAccepted(m)).length;
    n += (md.match(/\[A CONFIRMAR\]/g) || []).length;
  };
  for (const s of sections) for (const b of s.blocks) {
    if (b.t === 'p' && visibleParagraph(b)) count(b.md ?? '');
    for (const i of b.items ?? []) if (visibleInCv(i, 'pdf')) count(i.md);
  }
  return n;
}
