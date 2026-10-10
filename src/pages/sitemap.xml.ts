import { absoluteUrl, isPreview, projectPublishable } from '../lib/data';

export const GET = () => {
  if (isPreview) {
    return new Response('', { status: 404 });
  }

  const paths = [
    '/',
    '/cv/',
    '/publications/',
    '/talks/',
    '/grants/',
    '/teaching/',
    '/colophon/',
    ...(projectPublishable() ? ['/research/'] : []),
  ];

  const xmlEscape = (value: string) =>
    value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

  const entries = paths
    .map((path) => `  <url><loc>${xmlEscape(absoluteUrl(path))}</loc></url>`)
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
