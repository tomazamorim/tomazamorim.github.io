// Sites-artigo: a estrutura existe; na v1 não há nenhum artigo (nada na navegação, no sitemap nem em cartões).
// Para publicar um artigo: crie src/content/articles/<slug>.md com o campo  status: "published"  (padrão: "draft").
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const articles = defineCollection({
  loader: glob({ pattern: '**/[^_]*.{md,mdx}', base: './src/content/articles' }),
  schema: z.object({
    title: z.string(),
    status: z.enum(['draft', 'published']).default('draft'),
    published: z.date().optional(),
    citation: z.string().optional(),
    concept: z.string().optional(),
  }),
});

export const collections = { articles };
