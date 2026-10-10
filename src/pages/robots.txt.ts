import { isPreview, absoluteUrl } from '../lib/data';
export const GET = () =>
  new Response(
    isPreview
      ? 'User-agent: *\nDisallow: /\n'
      : `User-agent: *\nAllow: /\n\nSitemap: ${absoluteUrl('/sitemap.xml')}\n`,
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
  );
