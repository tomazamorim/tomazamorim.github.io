// Modo de build, por variável de ambiente: SITE_MODE=preview|public (padrão: preview).
export type Mode = 'preview' | 'public';
export const MODE: Mode = process.env.SITE_MODE === 'public' ? 'public' : 'preview';
export const isPreview = MODE === 'preview';
