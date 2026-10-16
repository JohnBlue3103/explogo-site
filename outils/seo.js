// Référencement du site : écrit dans le <head> de chaque page le titre, la
// description, l'adresse canonique, les aperçus réseaux sociaux (Open Graph,
// Twitter) et les données structurées (JSON-LD), puis génère sitemap.xml.
//
// À relancer après une modification des pages :  node outils/seo.js
// Le bloc généré se trouve entre <!-- SEO:debut --> et <!-- SEO:fin -->.

const fs = require('fs');
const path = require('path');

const RACINE = path.join(__dirname, '..');
const SITE = 'https://explogo.fr';
const AUJOURDHUI = new Date().toISOString().slice(0, 10);
const STORES = {
  android: 'https://play.google.com/store/apps/details?id=com.john.blue3103.explogomobile',
  ios: 'https://apps.apple.com/fr/app/explogo/id6749705613',
};

// Pages publiques : titre (≤ 60 caractères), description (≤ 160), image d'aperçu
const PAGES = [
  {
    fichier: 'index.html', url: '/', image: 'accueil', priorite: '1.0',
    titre: 'ExploGo – L’appli pour découvrir l’histoire autour de vous',
    description: 'Appli gratuite pour explorer l’histoire autour de vous : 26 000 lieux certifiés, châteaux, églises, batailles, monuments. Scannez sur place, gagnez de l’XP.',
  },
  {
    fichier: 'explorateurs.html', image: 'explorateurs', priorite: '0.9', fil: 'Explorateurs',
    titre: 'Explorateurs – Chaque balade devient une quête | ExploGo',
    description: 'Transformez vos sorties en aventure : scannez les lieux sur place, gagnez de l’XP et des niveaux, collectionnez les monuments et suivez vos statistiques.',
  },
  {
    fichier: 'enseignants.html', image: 'enseignants', priorite: '0.9', fil: 'Enseignants',
    titre: 'Enseignants – Histoire et patrimoine en classe | ExploGo',
    description: 'ExploGo pour les enseignants : données vérifiées, récits immersifs et accessibles, activités en classe et en sortie pour des cours d’histoire interactifs.',
  },
  {
    fichier: 'tourisme.html', image: 'tourisme', priorite: '0.9', fil: 'Tourisme',
    titre: 'Tourisme local – Redécouvrez votre ville | ExploGo',
    description: 'Redécouvrez votre ville avec ExploGo : lieux clés en un coup d’œil, anecdotes locales et patrimoine français à partager avec vos proches.',
  },
  {
    fichier: 'contact.html', image: 'accueil', priorite: '0.5', fil: 'Contact',
    titre: 'Contact – ExploGo',
    description: 'Une question, un problème technique ou une suggestion sur l’application ExploGo ? Écrivez à l’équipe, nous vous répondons.',
  },
  {
    fichier: 'mentions-legales.html', image: 'accueil', priorite: '0.2', fil: 'Mentions légales',
    titre: 'Mentions légales – ExploGo',
    description: 'Mentions légales du site et de l’application ExploGo : éditeur, hébergement, propriété intellectuelle et responsabilités.',
  },
  {
    fichier: 'confidentialite.html', image: 'accueil', priorite: '0.2', fil: 'Confidentialité',
    titre: 'Politique de confidentialité – ExploGo',
    description: 'Politique de confidentialité d’ExploGo : données collectées, finalités, durée de conservation, droits des utilisateurs et suppression du compte.',
  },
  {
    fichier: 'conditions-utilisation.html', image: 'accueil', priorite: '0.2', fil: 'Conditions d’utilisation',
    titre: 'Conditions d’utilisation – ExploGo',
    description: 'Conditions d’utilisation d’ExploGo : règles d’usage du site et de l’application, comptes, contenus publiés, mineurs et responsabilités.',
  },
];

// Pages utilitaires : jamais dans les résultats de recherche
const PAGES_PRIVEES = ['backoffice.html', 'email-confirmed.html', 'reset-password.html', '404.html'];

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const texte = (html) => html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const urlDe = (p) => SITE + (p.url || '/' + p.fichier);

// Questions / réponses des <details> de la page (FAQ visible) → FAQPage
function faqDe(html) {
  const qr = [];
  for (const m of html.matchAll(/<details[^>]*>\s*<summary[^>]*>([\s\S]*?)<\/summary>([\s\S]*?)<\/details>/g)) {
    const q = texte(m[1]); const r = texte(m[2]);
    if (q && r) qr.push({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: r } });
  }
  return qr;
}

const ORGANISATION = {
  '@type': 'Organization', '@id': SITE + '/#organisation', name: 'ExploGo', url: SITE + '/',
  logo: SITE + '/assets/img/logo.png',
};

function donneesStructurees(p, html) {
  const graphe = [];
  if (p.fichier === 'index.html') {
    graphe.push(ORGANISATION);
    graphe.push({ '@type': 'WebSite', '@id': SITE + '/#site', url: SITE + '/', name: 'ExploGo', inLanguage: 'fr-FR', publisher: { '@id': SITE + '/#organisation' } });
    graphe.push({
      '@type': 'MobileApplication', name: 'ExploGo', operatingSystem: 'Android, iOS',
      applicationCategory: 'TravelApplication', applicationSubCategory: 'Histoire et patrimoine',
      description: p.description, inLanguage: 'fr-FR', image: `${SITE}/assets/og/${p.image}.jpg`,
      installUrl: [STORES.android, STORES.ios], downloadUrl: [STORES.android, STORES.ios],
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
      publisher: { '@id': SITE + '/#organisation' },
    });
  }
  graphe.push({
    '@type': 'WebPage', '@id': urlDe(p) + '#page', url: urlDe(p), name: p.titre, description: p.description,
    inLanguage: 'fr-FR', isPartOf: { '@id': SITE + '/#site' },
    primaryImageOfPage: `${SITE}/assets/og/${p.image}.jpg`,
  });
  if (p.fil) {
    graphe.push({
      '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Accueil', item: SITE + '/' },
        { '@type': 'ListItem', position: 2, name: p.fil, item: urlDe(p) },
      ],
    });
  }
  const faq = faqDe(html);
  if (faq.length) graphe.push({ '@type': 'FAQPage', '@id': urlDe(p) + '#faq', mainEntity: faq });
  return { '@context': 'https://schema.org', '@graph': graphe };
}

function blocPublic(p, html) {
  const image = `${SITE}/assets/og/${p.image}.jpg`;
  return [
    `<title>${esc(p.titre)}</title>`,
    `<meta name="description" content="${esc(p.description)}" />`,
    `<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />`,
    `<link rel="canonical" href="${urlDe(p)}" />`,
    `<meta name="theme-color" content="#2B8EA0" />`,
    `<link rel="manifest" href="/site.webmanifest" />`,
    `<meta property="og:type" content="${p.fichier === 'index.html' ? 'website' : 'article'}" />`,
    `<meta property="og:site_name" content="ExploGo" />`,
    `<meta property="og:locale" content="fr_FR" />`,
    `<meta property="og:title" content="${esc(p.titre)}" />`,
    `<meta property="og:description" content="${esc(p.description)}" />`,
    `<meta property="og:url" content="${urlDe(p)}" />`,
    `<meta property="og:image" content="${image}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="${esc(p.titre)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(p.titre)}" />`,
    `<meta name="twitter:description" content="${esc(p.description)}" />`,
    `<meta name="twitter:image" content="${image}" />`,
    `<meta name="apple-itunes-app" content="app-id=6749705613" />`,
    `<script type="application/ld+json">${JSON.stringify(donneesStructurees(p, html))}</script>`,
  ];
}

// Remplace le bloc SEO (ou les anciennes balises) dans le <head>
function ecrire(fichier, lignes, garderTitre) {
  const chemin = path.join(RACINE, fichier);
  let html = fs.readFileSync(chemin, 'utf8');
  const eol = html.includes('\r\n') ? '\r\n' : '\n';
  html = html.replace(/[ \t]*<!-- SEO:debut -->[\s\S]*?<!-- SEO:fin -->\r?\n?/, '');
  if (!garderTitre) html = html.replace(/[ \t]*<title>[\s\S]*?<\/title>\r?\n?/, '');
  html = html
    .replace(/[ \t]*<meta\s+name="description"[\s\S]*?\/?>\r?\n?/, garderTitre ? (m) => m : '')
    .replace(/[ \t]*<meta\s+name="robots"[^>]*>\r?\n?/g, '')
    .replace(/[ \t]*<link\s+rel="canonical"[^>]*>\r?\n?/g, '');
  const indent = (html.match(/\n([ \t]*)<meta[^>]+viewport/) || [, '    '])[1];
  const bloc = [`<!-- SEO:debut -->`, ...lignes, `<!-- SEO:fin -->`].map((l) => indent + l).join(eol) + eol;
  const viewport = html.match(/[ \t]*<meta[^>]+name="viewport"[^>]*>\r?\n/);
  if (!viewport) throw new Error('pas de meta viewport dans ' + fichier);
  html = html.replace(viewport[0], viewport[0] + bloc);
  fs.writeFileSync(chemin, html);
}

for (const p of PAGES) {
  const html = fs.readFileSync(path.join(RACINE, p.fichier), 'utf8');
  ecrire(p.fichier, blocPublic(p, html), false);
  if (p.titre.length > 60) console.warn('⚠ titre long', p.fichier, p.titre.length);
  if (p.description.length > 160) console.warn('⚠ description longue', p.fichier, p.description.length);
}
for (const f of PAGES_PRIVEES) {
  if (fs.existsSync(path.join(RACINE, f))) ecrire(f, ['<meta name="robots" content="noindex, nofollow" />'], true);
}

const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
  ...PAGES.map((p) => [
    '  <url>',
    `    <loc>${urlDe(p)}</loc>`,
    `    <lastmod>${AUJOURDHUI}</lastmod>`,
    `    <priority>${p.priorite}</priority>`,
    `    <image:image><image:loc>${SITE}/assets/og/${p.image}.jpg</image:loc></image:image>`,
    '  </url>',
  ].join('\n')),
  '</urlset>', '',
].join('\n');
fs.writeFileSync(path.join(RACINE, 'sitemap.xml'), sitemap);
console.log(`SEO écrit sur ${PAGES.length} pages publiques, ${PAGES_PRIVEES.length} pages en noindex, sitemap.xml à jour.`);
