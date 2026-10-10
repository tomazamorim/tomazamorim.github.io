import { bibFields, absoluteUrl, site, type Pub } from './data';

const TYPE: Record<string, string> = {
  book: 'Book', edited: 'Book', chapters: 'Chapter', articles: 'ScholarlyArticle',
  translations: 'CreativeWork', poetry: 'Book', reviews: 'Article', other: 'CreativeWork',
};

/** schema.org por tipo: ScholarlyArticle / Book / Chapter conforme a ficha; título e veículo vêm do BibTeX da ficha. */
export function pubJsonLd(p: Pub): Record<string, unknown> {
  const f = bibFields(p.bibtex);
  const name = f.subtitle ? `${f.title}: ${f.subtitle}` : f.title;
  const o: Record<string, unknown> = {
    '@type': TYPE[p.group] ?? 'CreativeWork',
    name,
    author: { '@type': 'Person', name: 'Tomaz Amorim Izabel' },
  };
  if (p.group === 'translations') {
    o.translator = { '@type': 'Person', name: 'Tomaz Amorim Izabel' };
    delete o.author;
    o.author = { '@type': 'Person', name: (f.author ?? '').split(',').reverse().join(' ').trim() };
  }
  if (p.year) o.datePublished = String(p.year);
  if (f.pages) o.pagination = f.pages;
  const venue = f.journaltitle ?? f.booktitle;
  if (venue) o.isPartOf = { '@type': p.group === 'articles' || f.journaltitle ? 'Periodical' : 'Book', name: venue };
  if (f.publisher) o.publisher = { '@type': 'Organization', name: f.publisher };
  if (f.isbn) o.isbn = f.isbn;
  if (p.doi) { o.identifier = { '@type': 'PropertyValue', propertyID: 'DOI', value: p.doi }; o.url = `https://doi.org/${p.doi}`; }
  else if (p.url) o.url = p.url;
  if (p.license && p.url) o.license = p.license;
  return o;
}

export function pubListJsonLd(pubs: Pub[], path: string) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'CollectionPage', url: absoluteUrl(path), name: 'Publications of Dr. Tomaz Amorim', about: { '@type': 'Person', name: site.name_title } },
      ...pubs.map(pubJsonLd),
    ],
  };
}
