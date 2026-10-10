// Posts do blog (Hypotheses) lidos de um feed RSS no build. Configuração: src/data/feed.json.
import { feed, isPreview } from './data';

export type Post = { title: string; url: string; date: string; dateISO: string };
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function decode(s: string) {
  return s.replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0?39;/g, '’').trim();
}

export function parseRss(xml: string, limit: number): Post[] {
  const items = [...xml.matchAll(/<item[\s>][\s\S]*?<\/item>/g)].map((m) => m[0]);
  const posts: Post[] = [];
  for (const it of items) {
    const title = it.match(/<title[^>]*>([\s\S]*?)<\/title>/)?.[1];
    const link = it.match(/<link[^>]*>([\s\S]*?)<\/link>/)?.[1];
    const pub = it.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/)?.[1];
    if (!title || !link || !pub) continue;
    const d = new Date(decode(pub));
    if (isNaN(+d)) continue;
    posts.push({ title: decode(title), url: decode(link), date: `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`, dateISO: d.toISOString().slice(0, 10) });
  }
  return posts.sort((a, b) => b.dateISO.localeCompare(a.dateISO)).slice(0, limit);
}

export async function loadPosts(): Promise<{ posts: Post[]; example: boolean; blog: string | null }> {
  if (feed.feed_url) {
    try {
      const r = await fetch(feed.feed_url, { signal: AbortSignal.timeout(15000) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const posts = parseRss(await r.text(), feed.limit);
      if (posts.length) return { posts, example: false, blog: feed.blog_name };
      console.warn('[feed] feed sem itens legíveis');
    } catch (e) {
      console.warn('[feed] falha ao ler o feed:', (e as Error).message);
    }
  }
  if (isPreview) {
    const ex = Array.from({ length: 3 }, () => ({ title: '[Example post title]', url: '#', date: '[dd Mon yyyy]', dateISO: '' }));
    return { posts: ex, example: true, blog: feed.blog_name };
  }
  return { posts: [], example: false, blog: null };
}
