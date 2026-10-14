/** Run automatically by GitHub Actions, or: node scripts/configure-seo.mjs https://example.com/portfolio/ */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const supplied = process.argv[2];
if (!supplied) throw new Error('Pass the final public URL, including the repository path where applicable.');
const base = new URL(supplied.endsWith('/') ? supplied : supplied + '/');
if (!['https:', 'http:'].includes(base.protocol) || base.username || base.password || base.search || base.hash) throw new Error('Use an ordinary public http(s) URL without credentials, query or fragment.');
const esc = s => s.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
const files = ['index.html','applaws.html','palocleves.html','dicho-y-hecho.html','nogue.html'];
const urlFor = (file,lang) => new URL((lang === 'es' ? 'es/' : '') + (file === 'index.html' ? '' : file),base).href;
let locations = [];
for (const lang of ['en','es']) for (const file of files) {
  const local = path.join(root,lang === 'es' ? 'es' : '',file);
  const url = urlFor(file,lang), en = urlFor(file,'en'), es = urlFor(file,'es');
  let html = fs.readFileSync(local,'utf8');
  html = html.replace(/<link rel="canonical"[^>]*>/g,'').replace(/<link rel="alternate"[^>]*>/g,'').replace(/<meta property="og:url"[^>]*>/g,'');
  html = html.replace(/<meta property="og:image"[^>]*>/,`<meta property="og:image" content="${esc(new URL('assets/social-preview.jpg',base).href)}">`);
  html = html.replace('</head>',`<link rel="canonical" href="${esc(url)}"><link rel="alternate" hreflang="en" href="${esc(en)}"><link rel="alternate" hreflang="es" href="${esc(es)}"><link rel="alternate" hreflang="x-default" href="${esc(en)}"><meta property="og:url" content="${esc(url)}"></head>`);
  html = html.replace(/<script type="application\/ld\+json">(.*?)<\/script>/s,(_,raw) => {
    const data = JSON.parse(raw); data.url = urlFor('index.html',lang);
    return '<script type="application/ld+json">' + JSON.stringify(data).replaceAll('<','\\u003c') + '</script>';
  });
  fs.writeFileSync(local,html);locations.push({url,en,es});
}
const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' + locations.map(x => `<url><loc>${esc(x.url)}</loc><xhtml:link rel="alternate" hreflang="en" href="${esc(x.en)}"/><xhtml:link rel="alternate" hreflang="es" href="${esc(x.es)}"/></url>`).join('\n') + '\n</urlset>\n';
fs.writeFileSync(path.join(root,'sitemap.xml'),xml);
fs.writeFileSync(path.join(root,'robots.txt'),'User-agent: *\nAllow: /\nSitemap: '+new URL('sitemap.xml',base).href+'\n');
// Correct even when GitHub serves 404.html from a deeply nested missing URL.
let notFound = fs.readFileSync(path.join(root,'404.html'),'utf8');
notFound = notFound.replace(/href="[^\"]*" data-home/g,`href="${esc(base.href)}" data-home`);
fs.writeFileSync(path.join(root,'404.html'),notFound);
console.log('SEO configured for '+base.href+' — 10 URLs, canonical, hreflang, social preview and sitemap.');
