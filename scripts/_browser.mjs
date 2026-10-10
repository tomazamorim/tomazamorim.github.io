// Chromium para o PDF do CV e a medição de pesos. Nesta máquina: /opt/npm-tools + /opt/pw-browsers. Em outro ambiente (GitHub Actions, Netlify, Cloudflare):
// instale `playwright` (npm i --no-save playwright && npx playwright install chromium) e, se precisar, aponte PLAYWRIGHT_MODULE e CHROMIUM_PATH.
import fs from 'node:fs';
const mod = process.env.PLAYWRIGHT_MODULE || (fs.existsSync('/opt/npm-tools/node_modules/playwright/index.mjs') ? '/opt/npm-tools/node_modules/playwright/index.mjs' : 'playwright');
const { chromium } = await import(mod);
const local = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const executablePath = process.env.CHROMIUM_PATH || (fs.existsSync(local) ? local : undefined);
export const launch = () => chromium.launch(executablePath ? { executablePath } : {});
