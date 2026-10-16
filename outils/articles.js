// Articles du site (référencement), avec publication programmée.
//
// Un article = un fichier dans outils/articles/ (nommé AAAA-MM-JJ-sujet.js) qui exporte
// { slug, date, titre, h1, description, image, chapo, corps }.
// Seuls les articles dont la date (heure de Paris) est arrivée sont publiés : les autres
// restent invisibles jusqu'à leur jour. La tâche GitHub .github/workflows/publier-articles.yml
// relance ce script chaque lundi matin et met en ligne ce qui est arrivé à échéance.
//
//   node outils/articles.js            génère ce qui est publiable aujourd'hui
//   node outils/articles.js --apercu   génère aussi les articles à venir (pour relecture locale)
//
// Écrit articles/<slug>/index.html, la liste articles/index.html et sitemap-articles.xml.

const fs = require('fs');
const path = require('path');
const { page, esc, SITE } = require('./gabarit');

const RACINE = path.join(__dirname, '..');
const SOURCES = path.join(__dirname, 'articles');
const APERCU = process.argv.includes('--apercu');
const AUJOURDHUI = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date()); // AAAA-MM-JJ

const tous = fs.readdirSync(SOURCES).filter((f) => f.endsWith('.js')).sort()
  .map((f) => ({ fichier: f, ...require(path.join(SOURCES, f)) }));
for (const a of tous) {
  for (const champ of ['slug', 'date', 'titre', 'h1', 'description', 'image', 'chapo', 'corps']) {
    if (!a[champ]) throw new Error(`${a.fichier} : champ « ${champ} » manquant`);
  }
  if (a.description.length > 160) console.warn(`⚠ ${a.fichier} : description de ${a.description.length} caractères`);
}
const publies = tous.filter((a) => APERCU || a.date <= AUJOURDHUI);
const aVenir = tous.filter((a) => a.date > AUJOURDHUI);

// Les liens internes d'un article doivent pointer vers une page qui existe (ou un article publié)
const urlArticle = (a) => `/articles/${a.slug}/`;
for (const a of publies) {
  for (const m of a.corps.matchAll(/href="(\/[^"#]*)"/g)) {
    const u = m[1];
    const cible = u.endsWith('/') ? path.join(RACINE, u, 'index.html') : path.join(RACINE, u);
    const versArticle = publies.some((b) => urlArticle(b) === u);
    if (!versArticle && !fs.existsSync(cible)) throw new Error(`${a.fichier} : lien cassé ${u}`);
  }
}

// On repart de zéro : un article retiré ou pas encore daté disparaît du site
fs.rmSync(path.join(RACINE, 'articles'), { recursive: true, force: true });
const ecrire = (url, html) => {
  const dossier = path.join(RACINE, url);
  fs.mkdirSync(dossier, { recursive: true });
  fs.writeFileSync(path.join(dossier, 'index.html'), html);
};
const dateFr = (d) => new Date(d + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
const recents = [...publies].sort((a, b) => b.date.localeCompare(a.date));

for (const a of publies) {
  const url = urlArticle(a);
  const autres = recents.filter((b) => b !== a).slice(0, 3);
  ecrire(url, page({
    url, type: 'WebPage', image: a.image, titre: a.titre, description: a.description, h1: a.h1,
    appel: 'Partez à la découverte avec l’appli ExploGo',
    fil: [['Accueil', '/'], ['Articles', '/articles/'], [a.h1, url]],
    contenu: `    <p class="art-date">Publié le <time datetime="${a.date}">${dateFr(a.date)}</time></p>
    <article class="article">
      <p class="art-chapo">${esc(a.chapo)}</p>
${a.corps}
    </article>
${autres.length ? `    <section class="pat-section">
      <h2>À lire aussi</h2>
      <ul class="pat-liens">
${autres.map((b) => `        <li><a href="${urlArticle(b)}">${esc(b.h1)}</a></li>`).join('\n')}
      </ul>
    </section>` : ''}`,
    jsonld: [{
      '@type': 'Article', headline: a.h1, description: a.description, inLanguage: 'fr-FR',
      datePublished: a.date, dateModified: a.date, image: `${SITE}/assets/og/${a.image}.jpg`,
      mainEntityOfPage: SITE + url,
      author: { '@type': 'Organization', name: 'ExploGo', url: SITE + '/' },
      publisher: { '@type': 'Organization', name: 'ExploGo', logo: { '@type': 'ImageObject', url: SITE + '/assets/img/logo.png' } },
    }],
  }));
}

ecrire('/articles/', page({
  url: '/articles/', titre: 'Articles : histoire et patrimoine à découvrir | ExploGo',
  description: 'Idées de visites et lieux d’histoire à découvrir en France : les articles d’ExploGo sur le patrimoine, ville par ville et région par région.',
  h1: 'Articles', fil: [['Accueil', '/'], ['Articles', '/articles/']],
  appel: 'Partez à la découverte avec l’appli ExploGo',
  contenu: `    <ul class="art-liste">
${recents.map((a) => `      <li><a href="${urlArticle(a)}"><h2>${esc(a.h1)}</h2><p>${esc(a.description)}</p><span>${dateFr(a.date)}</span></a></li>`).join('\n')}
    </ul>`,
}));

fs.writeFileSync(path.join(RACINE, 'sitemap-articles.xml'), [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  `  <url><loc>${SITE}/articles/</loc><lastmod>${recents[0] ? recents[0].date : AUJOURDHUI}</lastmod></url>`,
  ...recents.map((a) => `  <url><loc>${SITE}${urlArticle(a)}</loc><lastmod>${a.date}</lastmod></url>`),
  '</urlset>', '',
].join('\n'));

console.log(`${publies.length} article(s) publié(s)${APERCU ? ' (aperçu, y compris ceux à venir)' : ''}, ${aVenir.length} à venir : ${aVenir.map((a) => a.date).join(', ') || 'aucun'}.`);
