import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '../dist');
const pages = ['index.html', 'menu/index.html', 'access/index.html', '404.html'];
const errors = [];
for (const page of pages) {
  const html = await readFile(path.join(root, page), 'utf8');
  if (!html.includes('POPII') || !html.includes('lang="ja"')) errors.push(`${page}: missing identity`);
  if ((html.match(/<h1[ >]/g) ?? []).length !== 1) errors.push(`${page}: expected one h1`);
  if (/TODO|PLACEHOLDER|PARADISE8|Endless/.test(html)) errors.push(`${page}: unrelated or placeholder content`);
  if (/AI生成|イメージ写真|当店の施術事例ではありません/.test(html)) errors.push(`${page}: unwanted image annotation`);
  for (const match of html.matchAll(/(?:href|src)="(\/[^"?#]*)(#[^"]*)?"/g)) {
    let file = match[1];
    if (file.endsWith('/')) file += 'index.html';
    try { if (!(await stat(path.join(root, file))).size) errors.push(`${page}: empty asset ${file}`); }
    catch { errors.push(`${page}: missing asset ${file}`); }
    if (match[2]) {
      const target = await readFile(path.join(root, file), 'utf8');
      if (!target.includes(`id="${match[2].slice(1)}"`)) errors.push(`${page}: missing fragment ${match[2]}`);
    }
  }
  const ids = new Set([...html.matchAll(/id="([^"]+)"/g)].map(m => m[1]));
  for (const match of html.matchAll(/href="#([^"]+)"/g)) if(!ids.has(match[1])) errors.push(`${page}: missing anchor ${match[1]}`);
  for (const tag of html.matchAll(/<img [^>]+>/g)) if(!/alt="[^"]+"/.test(tag[0]) || !/width="\d+"/.test(tag[0]) || !/height="\d+"/.test(tag[0])) errors.push(`${page}: image metadata incomplete`);
  if (page !== '404.html' && (!html.includes('storeId=H000480498') || !html.includes('tel:0223665420'))) errors.push(`${page}: reservation link missing`);
  if (page !== '404.html' && !html.includes('第1')) errors.push(`${page}: holiday information missing`);
  console.log(`Checked ${page}`);
}
const home = await readFile(path.join(root, 'index.html'), 'utf8');
const menu = await readFile(path.join(root, 'menu/index.html'), 'utf8');
if(!home.includes('常に旬なヘアを提案しつつ、かつ丁寧な仕事を心がけています。')) errors.push('Requested concept statement missing');
for (const price of ['3,400','3,200','1,500','2,500','2,000','4,800','5,800','4,500','6,500','7,800','8,000','8,500','15,000','16,000','18,000','3,000','3,500','7,000','1,200']) if(!menu.includes(price)) errors.push(`Missing menu price ${price}`);
if(errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log('All required pages, local links, assets, reservation links, and menu prices passed.');
