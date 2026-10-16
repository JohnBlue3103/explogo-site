// Articles du site (référencement) : chaque article est un objet ci-dessous.
// Pour en ajouter un : copier un bloc dans ARTICLES, puis  node outils/articles.js
// Écrit articles/<slug>/index.html, la liste articles/index.html et sitemap-articles.xml.

const fs = require('fs');
const path = require('path');
const { page, esc, SITE } = require('./gabarit');

const RACINE = path.join(__dirname, '..');
const T = '/patrimoine/haute-garonne/toulouse/';

const ARTICLES = [
  {
    slug: 'que-voir-a-toulouse-patrimoine',
    date: '2026-10-16',
    titre: 'Que voir à Toulouse : 12 lieux pour remonter le temps | ExploGo',
    h1: 'Que voir à Toulouse : 12 lieux pour remonter le temps',
    description: 'Basilique Saint-Sernin, Capitole, hôtels du pastel, Pont-Neuf, canal du Midi : 12 lieux d’histoire à découvrir à Toulouse, de l’Antiquité au 19e siècle.',
    image: 'tourisme',
    chapo: 'De la ville romaine de Tolosa aux hôtels des marchands de pastel, Toulouse se lit comme un livre d’histoire à ciel ouvert. Voici 12 lieux pour la parcourir, de l’Antiquité au 19e siècle, tous présents dans l’appli ExploGo.',
    corps: `
      <h2>1. La basilique Saint-Sernin, la grande église romane</h2>
      <p>Commencée à la fin du 11e siècle, Saint-Sernin est l’une des plus grandes églises romanes d’Europe. Elle accueillait les pèlerins en route vers Saint-Jacques-de-Compostelle, et elle est inscrite à ce titre au patrimoine mondial de l’UNESCO. Faites le tour du chevet pour admirer l’étagement de ses chapelles, puis levez les yeux vers son clocher octogonal en brique.</p>

      <h2>2. Le Capitole, la maison des capitouls</h2>
      <p>Pendant des siècles, Toulouse a été gouvernée par des magistrats élus, les capitouls. Leur maison commune, le Capitole, abrite toujours la mairie. Sa longue façade de brique et de pierre, élevée au 18e siècle, domine la plus célèbre place de la ville.</p>

      <h2>3. La cathédrale Saint-Étienne, deux églises en une</h2>
      <p>Saint-Étienne surprend dès l’entrée : sa nef et son chœur ne sont pas dans le même axe. Le chantier s’est étalé sur plusieurs siècles et deux projets se sont succédé sans jamais être raccordés. Le résultat est une cathédrale unique, où l’on voit l’histoire de sa construction.</p>

      <h2>4. Les vestiges de Tolosa, la ville romaine</h2>
      <p>Bien avant les capitouls, Toulouse était Tolosa, une cité romaine entourée d’un rempart. Des fragments de cette enceinte subsistent encore dans la ville, notamment autour de la tour des Hauts-Murats. Ils rappellent que les rues du centre suivent encore, par endroits, le tracé antique.</p>

      <h2>5. L’hôtel d’Assézat, l’âge d’or du pastel</h2>
      <p>Au 16e siècle, Toulouse s’enrichit grâce au pastel, une plante dont on tirait une teinture bleue très recherchée. Les marchands bâtissent alors de somptueux hôtels particuliers. Celui de Pierre d’Assézat, avec sa cour Renaissance, en est le plus bel exemple.</p>

      <h2>6. L’hôtel de Bernuy, un autre palais de marchand</h2>
      <p>Jean de Bernuy, lui aussi enrichi par le pastel, fait construire au début du 16e siècle un hôtel aux cours monumentales. ExploGo recense près de 70 demeures et hôtels particuliers à Toulouse : chacun raconte une famille et une époque.</p>

      <h2>7. Le Pont-Neuf, le plus vieux pont de la ville</h2>
      <p>Malgré son nom, le Pont-Neuf est le plus ancien pont de Toulouse encore debout. Commencé au 16e siècle et achevé au siècle suivant, il a résisté aux crues de la Garonne grâce aux grandes ouvertures percées dans ses piles.</p>

      <h2>8. Le canal du Midi, l’œuvre de Pierre-Paul Riquet</h2>
      <p>Creusé au 17e siècle sous Louis XIV, le canal du Midi relie Toulouse à la Méditerranée. Ce chantier hors norme, conçu par Pierre-Paul Riquet, est inscrit au patrimoine mondial de l’UNESCO. Ses berges ombragées sont aujourd’hui une promenade très appréciée.</p>

      <h2>9. Les Ponts-Jumeaux, le carrefour des canaux</h2>
      <p>C’est ici que se rejoignent le canal du Midi, le canal de Brienne et le canal latéral à la Garonne. Ce nœud d’eau, aménagé au 18e siècle, est orné d’un grand bas-relief en marbre à la gloire du canal.</p>

      <h2>10. Notre-Dame-du-Taur, sur les pas de saint Sernin</h2>
      <p>Selon la tradition, cette église marque l’endroit où le corps de saint Saturnin, premier évêque de Toulouse, fut abandonné après son martyre : il aurait été traîné par un taureau, d’où le nom de « Taur ». Son clocher-mur est typique du gothique toulousain.</p>

      <h2>11. Saint-Pierre-des-Cuisines, l’une des plus anciennes églises du Sud-Ouest</h2>
      <p>Ses origines remontent à l’Antiquité tardive, et l’édifice actuel date en partie du 11e siècle. Restaurée, l’ancienne église est devenue une salle de concert : on y écoute aujourd’hui de la musique sous des voûtes millénaires.</p>

      <h2>12. Notre-Dame-de-la-Daurade, au bord de la Garonne</h2>
      <p>Reconstruite à partir de la fin du 18e siècle à l’emplacement d’une église très ancienne, la Daurade abrite la statue de la Vierge noire, très vénérée par les Toulousains. Son parvis donne sur les quais de la Garonne, parfaits pour finir la balade au coucher du soleil.</p>

      <h2>Explorer Toulouse avec ExploGo</h2>
      <p>Ces 12 lieux ne sont qu’un début : l’appli en recense <a href="${T}">105 à Toulouse</a>, des tours médiévales aux immeubles Art déco. Sur place, approchez-vous d’un lieu pour le scanner et découvrir son récit, raconté par un témoin de l’époque. Vous gagnez de l’expérience à chaque découverte et complétez votre collection.</p>
      <p>Envie d’aller plus loin ? Découvrez aussi <a href="/patrimoine/haute-garonne/">tout le patrimoine de la Haute-Garonne</a>.</p>`,
  },
];

const urls = [];
const ecrire = (url, html) => {
  const dossier = path.join(RACINE, url);
  fs.mkdirSync(dossier, { recursive: true });
  fs.writeFileSync(path.join(dossier, 'index.html'), html);
  urls.push(url);
};
const dateFr = (d) => new Date(d + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

for (const a of ARTICLES) {
  const url = `/articles/${a.slug}/`;
  ecrire(url, page({
    url, type: 'WebPage', image: a.image, titre: a.titre, description: a.description, h1: a.h1,
    appel: 'Partez à la découverte avec l’appli ExploGo',
    fil: [['Accueil', '/'], ['Articles', '/articles/'], [a.h1, url]],
    contenu: `    <p class="art-date">Publié le <time datetime="${a.date}">${dateFr(a.date)}</time></p>
    <article class="article">
      <p class="art-chapo">${esc(a.chapo)}</p>
${a.corps}
    </article>`,
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
  description: 'Idées de visites et lieux d’histoire à découvrir en France : les articles d’ExploGo sur le patrimoine, ville par ville.',
  h1: 'Articles', fil: [['Accueil', '/'], ['Articles', '/articles/']],
  appel: 'Partez à la découverte avec l’appli ExploGo',
  contenu: `    <ul class="art-liste">
${[...ARTICLES].sort((a, b) => b.date.localeCompare(a.date)).map((a) => `      <li><a href="/articles/${a.slug}/"><h2>${esc(a.h1)}</h2><p>${esc(a.description)}</p><span>${dateFr(a.date)}</span></a></li>`).join('\n')}
    </ul>`,
}));

fs.writeFileSync(path.join(RACINE, 'sitemap-articles.xml'), [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...urls.map((u) => `  <url><loc>${SITE}${u}</loc><lastmod>${(ARTICLES.find((a) => u.includes(a.slug)) || ARTICLES[0]).date}</lastmod></url>`),
  '</urlset>', '',
].join('\n'));
console.log(`${ARTICLES.length} article(s), liste et sitemap-articles.xml écrits.`);
