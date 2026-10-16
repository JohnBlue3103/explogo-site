// Gabarit commun des pages générées (patrimoine, articles) : en-tête, pied de page,
// balises de référencement et appel à télécharger l'appli.

const SITE = 'https://explogo.fr';
const STORES = {
  android: 'https://play.google.com/store/apps/details?id=com.john.blue3103.explogomobile',
  ios: 'https://apps.apple.com/fr/app/explogo/id6749705613',
};
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function page({ url, titre, description, h1, fil, contenu, jsonld, type = "CollectionPage", image = "tourisme", appel = "Ces lieux vous attendent dans l’appli ExploGo" }) {
  const filLd = {
    '@type': 'BreadcrumbList',
    itemListElement: fil.map(([nom, u], i) => ({ '@type': 'ListItem', position: i + 1, name: nom, item: SITE + u })),
  };
  const ld = { '@context': 'https://schema.org', '@graph': [
    { '@type': type, '@id': SITE + url + '#page', url: SITE + url, name: titre, description, inLanguage: 'fr-FR', isPartOf: { '@id': SITE + '/#site' } },
    filLd, ...(jsonld || []),
  ] };
  const imageUrl = `${SITE}/assets/og/${image}.jpg`;
  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(titre)}</title>
  <meta name="description" content="${esc(description)}" />
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />
  <link rel="canonical" href="${SITE + url}" />
  <meta name="theme-color" content="#2B8EA0" />
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="ExploGo" />
  <meta property="og:locale" content="fr_FR" />
  <meta property="og:title" content="${esc(titre)}" />
  <meta property="og:description" content="${esc(description)}" />
  <meta property="og:url" content="${SITE + url}" />
  <meta property="og:image" content="${imageUrl}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="apple-itunes-app" content="app-id=6749705613" />
  <link rel="icon" type="image/png" href="/assets/favicon.png">
  <link rel="stylesheet" href="/css/index.css">
  <link rel="stylesheet" href="/css/patrimoine.css">
  <script type="application/ld+json">${JSON.stringify(ld)}</script>
</head>
<body>
  <a class="skip-link" href="#contenu">Aller au contenu</a>
  <header class="site-header pat-header">
    <nav class="nav" aria-label="Navigation principale">
      <a class="brand" href="/" aria-label="ExploGo, retour à l'accueil">
        <img src="/assets/img/logo.png" alt="" class="brand-logo" width="256" height="256">
        <span class="brand-name">ExploGo</span>
      </a>
      <ul class="nav-links">
        <li><a href="/patrimoine/">Patrimoine par département</a></li>
        <li><a href="/explorateurs.html">Explorateurs</a></li>
        <li><a href="/tourisme.html">Tourisme</a></li>
      </ul>
      <ul class="nav-cta"><li><a class="btn btn-primary" href="#telecharger">Télécharger</a></li></ul>
    </nav>
  </header>
  <main id="contenu" class="patrimoine container">
    <nav class="fil" aria-label="Fil d’Ariane"><ol>${fil.map(([nom, u], i) => i === fil.length - 1
      ? `<li aria-current="page">${esc(nom)}</li>` : `<li><a href="${u}">${esc(nom)}</a></li>`).join('')}</ol></nav>
    <h1>${esc(h1)}</h1>
${contenu}
    <section id="telecharger" class="pat-cta" aria-labelledby="titre-telecharger">
      <h2 id="titre-telecharger">${esc(appel)}</h2>
      <p>Approchez-vous d’un lieu pour le scanner, lisez son récit complet, gagnez de l’expérience et complétez votre collection. L’appli est gratuite.</p>
      <div class="pat-stores">
        <a class="btn btn-primary" href="${STORES.android}" target="_blank" rel="noopener">Google Play</a>
        <a class="btn btn-primary" href="${STORES.ios}" target="_blank" rel="noopener">App Store</a>
      </div>
    </section>
  </main>
  <footer class="site-footer">
    <div class="container">
      <nav aria-label="Liens de bas de page">
        <ul class="footer-links">
          <li><a href="/patrimoine/">Patrimoine par département</a></li>
          <li><a href="/conditions-utilisation.html">Conditions d'utilisation</a></li>
          <li><a href="/confidentialite.html">Politique de confidentialité</a></li>
          <li><a href="/mentions-legales.html">Mentions légales</a></li>
        </ul>
      </nav>
      <p class="copyright">© <span>ExploGo</span> — Tous droits réservés.</p>
    </div>
  </footer>
</body>
</html>
`;
}

module.exports = { page, esc, SITE, STORES };
