// Build the public Astro site. The approved public CV PDF is versioned under public/cv/ and is copied by Astro.
import { spawnSync } from 'node:child_process';
const mode = process.argv[2] === 'public' ? 'public' : 'preview';
const env = { ...process.env, SITE_MODE: mode };
const run = (cmd, args) => {
  const r = spawnSync(cmd, args, { stdio: 'inherit', env });
  if (r.status !== 0) { console.error(`Build failed: ${cmd} ${args.join(' ')}`); process.exit(r.status ?? 1); }
};
if (mode === 'public') run('node', ['scripts/download-publication-pdfs.mjs']);
run('node', ['node_modules/astro/astro.js', 'build']);
run('node', ['scripts/postbuild.mjs', mode]);
