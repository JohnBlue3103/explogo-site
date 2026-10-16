// Pages « patrimoine » pour le référencement : une page par département et une
// page par commune (au moins MIN_LIEUX lieux), générées depuis la base ExploGo.
//
// 1) exporter les lieux :  bash outils/export-lieux.sh   (écrit outils/donnees/lieux.jsonl, hors Git)
// 2) générer les pages  :  node outils/patrimoine.js
//
// Les pages ne montrent qu'un EXTRAIT de chaque récit : le texte complet reste dans l'appli.
// Tout le dossier patrimoine/ est réécrit à chaque lancement.

const fs = require('fs');
const path = require('path');

const RACINE = path.join(__dirname, '..');
const SORTIE = path.join(RACINE, 'patrimoine');
const SITE = 'https://explogo.fr';
const MIN_LIEUX = 5;                 // en dessous, pas de page commune (page trop mince)
const AUJOURDHUI = new Date().toISOString().slice(0, 10);
const STORES = {
  android: 'https://play.google.com/store/apps/details?id=com.john.blue3103.explogomobile',
  ios: 'https://apps.apple.com/fr/app/explogo/id6749705613',
};

// Départements : nom exact dans la base → [code, région]
const DEPARTEMENTS = {
  'Ain': ['01', 'Auvergne-Rhône-Alpes'], 'Aisne': ['02', 'Hauts-de-France'], 'Allier': ['03', 'Auvergne-Rhône-Alpes'],
  'Alpes-de-Haute-Provence': ['04', 'Provence-Alpes-Côte d’Azur'], 'Hautes-Alpes': ['05', 'Provence-Alpes-Côte d’Azur'],
  'Alpes-Maritimes': ['06', 'Provence-Alpes-Côte d’Azur'], 'Ardèche': ['07', 'Auvergne-Rhône-Alpes'], 'Ardennes': ['08', 'Grand Est'],
  'Ariège': ['09', 'Occitanie'], 'Aube': ['10', 'Grand Est'], 'Aude': ['11', 'Occitanie'], 'Aveyron': ['12', 'Occitanie'],
  'Bouches-du-Rhône': ['13', 'Provence-Alpes-Côte d’Azur'], 'Calvados': ['14', 'Normandie'], 'Cantal': ['15', 'Auvergne-Rhône-Alpes'],
  'Charente': ['16', 'Nouvelle-Aquitaine'], 'Charente-Maritime': ['17', 'Nouvelle-Aquitaine'], 'Cher': ['18', 'Centre-Val de Loire'],
  'Corrèze': ['19', 'Nouvelle-Aquitaine'], 'Corse-du-Sud': ['2A', 'Corse'], 'Haute-Corse': ['2B', 'Corse'],
  'Côte-d\'Or': ['21', 'Bourgogne-Franche-Comté'], 'Côtes-d\'Armor': ['22', 'Bretagne'], 'Creuse': ['23', 'Nouvelle-Aquitaine'],
  'Dordogne': ['24', 'Nouvelle-Aquitaine'], 'Doubs': ['25', 'Bourgogne-Franche-Comté'], 'Drôme': ['26', 'Auvergne-Rhône-Alpes'],
  'Eure': ['27', 'Normandie'], 'Eure-et-Loir': ['28', 'Centre-Val de Loire'], 'Finistère': ['29', 'Bretagne'], 'Gard': ['30', 'Occitanie'],
  'Haute-Garonne': ['31', 'Occitanie'], 'Gers': ['32', 'Occitanie'], 'Gironde': ['33', 'Nouvelle-Aquitaine'], 'Hérault': ['34', 'Occitanie'],
  'Ille-et-Vilaine': ['35', 'Bretagne'], 'Indre': ['36', 'Centre-Val de Loire'], 'Indre-et-Loire': ['37', 'Centre-Val de Loire'],
  'Isère': ['38', 'Auvergne-Rhône-Alpes'], 'Jura': ['39', 'Bourgogne-Franche-Comté'], 'Landes': ['40', 'Nouvelle-Aquitaine'],
  'Loir-et-Cher': ['41', 'Centre-Val de Loire'], 'Loire': ['42', 'Auvergne-Rhône-Alpes'], 'Haute-Loire': ['43', 'Auvergne-Rhône-Alpes'],
  'Loire-Atlantique': ['44', 'Pays de la Loire'], 'Loiret': ['45', 'Centre-Val de Loire'], 'Lot': ['46', 'Occitanie'],
  'Lot-et-Garonne': ['47', 'Nouvelle-Aquitaine'], 'Lozère': ['48', 'Occitanie'], 'Maine-et-Loire': ['49', 'Pays de la Loire'],
  'Manche': ['50', 'Normandie'], 'Marne': ['51', 'Grand Est'], 'Haute-Marne': ['52', 'Grand Est'], 'Mayenne': ['53', 'Pays de la Loire'],
  'Meurthe-et-Moselle': ['54', 'Grand Est'], 'Meuse': ['55', 'Grand Est'], 'Morbihan': ['56', 'Bretagne'], 'Moselle': ['57', 'Grand Est'],
  'Nièvre': ['58', 'Bourgogne-Franche-Comté'], 'Nord': ['59', 'Hauts-de-France'], 'Oise': ['60', 'Hauts-de-France'], 'Orne': ['61', 'Normandie'],
  'Pas-de-Calais': ['62', 'Hauts-de-France'], 'Puy-de-Dôme': ['63', 'Auvergne-Rhône-Alpes'], 'Pyrénées-Atlantiques': ['64', 'Nouvelle-Aquitaine'],
  'Hautes-Pyrénées': ['65', 'Occitanie'], 'Pyrénées-Orientales': ['66', 'Occitanie'], 'Bas-Rhin': ['67', 'Grand Est'], 'Haut-Rhin': ['68', 'Grand Est'],
  'Rhône': ['69', 'Auvergne-Rhône-Alpes'], 'Haute-Saône': ['70', 'Bourgogne-Franche-Comté'], 'Saône-et-Loire': ['71', 'Bourgogne-Franche-Comté'],
  'Sarthe': ['72', 'Pays de la Loire'], 'Savoie': ['73', 'Auvergne-Rhône-Alpes'], 'Haute-Savoie': ['74', 'Auvergne-Rhône-Alpes'],
  'Paris': ['75', 'Île-de-France'], 'Seine-Maritime': ['76', 'Normandie'], 'Seine-et-Marne': ['77', 'Île-de-France'], 'Yvelines': ['78', 'Île-de-France'],
  'Deux-Sèvres': ['79', 'Nouvelle-Aquitaine'], 'Somme': ['80', 'Hauts-de-France'], 'Tarn': ['81', 'Occitanie'], 'Tarn-et-Garonne': ['82', 'Occitanie'],
  'Var': ['83', 'Provence-Alpes-Côte d’Azur'], 'Vaucluse': ['84', 'Provence-Alpes-Côte d’Azur'], 'Vendée': ['85', 'Pays de la Loire'],
  'Vienne': ['86', 'Nouvelle-Aquitaine'], 'Haute-Vienne': ['87', 'Nouvelle-Aquitaine'], 'Vosges': ['88', 'Grand Est'], 'Yonne': ['89', 'Bourgogne-Franche-Comté'],
  'Territoire de Belfort': ['90', 'Bourgogne-Franche-Comté'], 'Essonne': ['91', 'Île-de-France'], 'Hauts-de-Seine': ['92', 'Île-de-France'],
  'Seine-Saint-Denis': ['93', 'Île-de-France'], 'Val-de-Marne': ['94', 'Île-de-France'], 'Val-d\'Oise': ['95', 'Île-de-France'],
  'Guadeloupe': ['971', 'Guadeloupe'], 'Martinique': ['972', 'Martinique'], 'Guyane': ['973', 'Guyane'], 'La Réunion': ['974', 'La Réunion'],
  'Mayotte': ['976', 'Mayotte'], 'Saint-Pierre-et-Miquelon': ['975', 'Saint-Pierre-et-Miquelon'],
};

// Catégories : [titre de section, singulier, ordre d'affichage]
const CATEGORIES = {
  majeur: ['Lieux incontournables', 'lieu incontournable', 0],
  cathedrale: ['Cathédrales', 'cathédrale', 1],
  chateau: ['Châteaux', 'château', 2],
  eglise: ['Églises et chapelles', 'église ou chapelle', 3],
  fortification: ['Fortifications et remparts', 'fortification', 4],
  demeure: ['Demeures et hôtels particuliers', 'demeure', 5],
  antiquite: ['Vestiges antiques', 'vestige antique', 6],
  prehistoire: ['Sites préhistoriques', 'site préhistorique', 7],
  pont: ['Ponts', 'pont', 8],
  public: ['Édifices publics', 'édifice public', 9],
  agriculture: ['Patrimoine rural', 'patrimoine rural', 10],
  commerce: ['Patrimoine commercial', 'patrimoine commercial', 11],
};

// ── Outils ──────────────────────────────────────────────────────────────────
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const slug = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/œ/g, 'oe').replace(/æ/g, 'ae').replace(/['’]/g, '-').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const nombre = (n) => n.toLocaleString('fr-FR').replace(/ /g, ' ');
const pluriel = (n, un, plusieurs) => `${nombre(n)} ${n > 1 ? plusieurs : un}`;
function listeFr(items) {
  if (items.length <= 1) return items.join('');
  return items.slice(0, -1).join(', ') + ' et ' + items[items.length - 1];
}
// « de la Haute-Garonne », « du Tarn », « des Landes », « de l'Hérault », « de Paris »
const DE_LA = ['Charente', 'Charente-Maritime', 'Corrèze', 'Corse-du-Sud', 'Côte-d\'Or', 'Creuse', 'Dordogne', 'Drôme', 'Gironde',
  'Loire', 'Loire-Atlantique', 'Lozère', 'Manche', 'Marne', 'Mayenne', 'Meurthe-et-Moselle', 'Meuse', 'Moselle', 'Nièvre', 'Sarthe',
  'Saône-et-Loire', 'Savoie', 'Seine-Maritime', 'Seine-et-Marne', 'Seine-Saint-Denis', 'Somme', 'Vendée', 'Vienne', 'Guyane',
  'Guadeloupe', 'Martinique'];
function deLeDep(nom) {
  if (['Paris', 'Mayotte', 'La Réunion', 'Saint-Pierre-et-Miquelon'].includes(nom)) return 'de ' + nom;
  if (nom.startsWith('Haute-') || DE_LA.includes(nom)) return 'de la ' + nom;
  if (/^(Hautes-|Hauts-|Deux-|Alpes|Ardennes|Bouches-|Côtes-|Landes|Pyrénées|Vosges|Yvelines)/.test(nom)) return 'des ' + nom;
  if (/^[AEÉIOUY]/.test(nom) || nom === 'Hérault') return 'de l’' + nom;
  return 'du ' + nom;
}
const distanceKm = (a, b) => {
  const r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLon = (b.lon - a.lon) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
};

// Siècle lisible + rang chronologique (pour « les plus anciens »)
function siecleLisible(s) {
  if (!s) return '';
  return s.replace(/(\d+)\s*(eme|ème|e)\b/gi, '$1e').replace(/\s+/g, ' ').replace(/^1ere/i, '1re').trim();
}
function rangSiecle(s) {
  if (!s) return 99;
  const t = s.toLowerCase();
  if (/paléolithique|mésolithique/.test(t)) return -60;
  if (/néolithique/.test(t)) return -50;
  if (/âge du bronze|age du bronze/.test(t)) return -40;
  if (/âge du fer|age du fer|protohistoire/.test(t)) return -30;
  if (/gallo-romain|antiquité|romain/.test(t)) return 0;
  if (/haut moyen/.test(t)) return 7;
  if (/moyen age|moyen âge/.test(t)) return 11;
  const m = t.match(/(\d+)\s*(e|eme|ème|er)/);
  return m ? Number(m[1]) : 99;
}
function epoqueDe(rang) {
  if (rang <= -40) return 'la Préhistoire';
  if (rang < 5) return 'l’Antiquité';
  if (rang <= 15) return 'le Moyen Âge';
  if (rang < 99) return `le ${rang}e siècle`;
  return '';
}

// Extrait : saute la ligne de titre du récit, coupe proprement vers 230 caractères
function extrait(desc, max = 230) {
  if (!desc) return '';
  const lignes = desc.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  if (lignes.length > 1 && lignes[0].length < 140 && !/[.!?…»]$/.test(lignes[0])) lignes.shift();
  let t = lignes.join(' ').replace(/\s+/g, ' ').replace(/^[IVX]+\.\s*/, '');
  if (t.length <= max) return t;
  t = t.slice(0, max);
  return t.slice(0, t.lastIndexOf(' ')).replace(/[,;:–—-]\s*$/, '') + '…';
}
// Nom trop vague (« Eglise », « Ancien château »…) : on précise la commune
const GENERIQUE = /^(ancien(ne)?s+)?(église|eglise|château|chateau|hôtel|hotel|immeuble|maison|moulin|chapelle|pont|tour|croix|fontaine|lavoir|manoir|demeure|ferme|motte|castrum|logis|presbytère|halle|porte|calvaire|dolmen|menhir)$/i;
const generique = (l) => GENERIQUE.test(l.nom.trim());
const nomAffiche = (l) => (generique(l) ? `${l.nom} — ${l.commune}` : l.nom);
const proprietaire = (p) => (p && p.startsWith('propriété') ? p.charAt(0).toUpperCase() + p.slice(1) : '');

// ── Données ─────────────────────────────────────────────────────────────────
const brut = fs.readFileSync(path.join(__dirname, 'donnees', 'lieux.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
const lieux = [];
for (const l of brut) {
  if (!CATEGORIES[l.c] || !l.commune || !l.dep || l.lat == null) continue;
  const dep = l.dep.split(',')[0].trim();
  if (!DEPARTEMENTS[dep]) continue;
  lieux.push({ ...l, dep, commune: l.commune.trim(), rang: rangSiecle(l.siecle), lg: (l.desc || '').length });
}

const parDep = new Map();
for (const l of lieux) {
  if (!parDep.has(l.dep)) parDep.set(l.dep, new Map());
  const communes = parDep.get(l.dep);
  if (!communes.has(l.commune)) communes.set(l.commune, []);
  communes.get(l.commune).push(l);
}

const urlDep = (dep) => `/patrimoine/${slug(dep)}/`;
const urlCommune = (dep, c) => `/patrimoine/${slug(dep)}/${slug(c)}/`;
const centre = (ls) => ({ lat: ls.reduce((s, l) => s + l.lat, 0) / ls.length, lon: ls.reduce((s, l) => s + l.lon, 0) / ls.length });

// Toutes les communes qui ont une page (pour les liens « autour de »)
const communesAvecPage = [];
for (const [dep, communes] of parDep) {
  for (const [c, ls] of communes) if (ls.length >= MIN_LIEUX) communesAvecPage.push({ dep, c, n: ls.length, ...centre(ls) });
}

// Ordre d'affichage : incontournables, longs récits, plus anciens
const importance = (l) => (CATEGORIES[l.c][2] === 0 ? 0 : 1) * 1e6 + CATEGORIES[l.c][2] * 1e4 + (generique(l) ? 5000 : 0) - Math.min(l.lg, 700);
const parCategorie = (ls) => {
  const g = new Map();
  for (const l of [...ls].sort((a, b) => CATEGORIES[a.c][2] - CATEGORIES[b.c][2])) {
    if (!g.has(l.c)) g.set(l.c, []);
    g.get(l.c).push(l);
  }
  for (const v of g.values()) v.sort((a, b) => generique(a) - generique(b) || b.lg - a.lg || a.nom.localeCompare(b.nom, 'fr'));
  return g;
};

function resumeCategories(ls) {
  const g = parCategorie(ls);
  return listeFr([...g].sort((a, b) => b[1].length - a[1].length).slice(0, 4)
    .map(([c, v]) => pluriel(v.length, CATEGORIES[c][1], CATEGORIES[c][0].toLowerCase().replace(/^lieux /, 'lieux '))));
}

const { page } = require('./gabarit');

function carteLieu(l, avecCommune, depLieu) {
  const infos = [siecleLisible(l.siecle), proprietaire(l.proprio)].filter(Boolean);
  const lieu = avecCommune
    ? (communesAvecPage.some((x) => x.dep === depLieu && x.c === l.commune)
      ? `<a href="${urlCommune(depLieu, l.commune)}">${esc(l.commune)}</a>` : esc(l.commune))
    : '';
  return `      <li class="pat-lieu">
        <h3>${esc(nomAffiche(l))}</h3>
        <p class="pat-meta">${[lieu, ...infos.map(esc)].filter(Boolean).join(' · ')}</p>
        ${l.desc ? `<p class="pat-extrait">${esc(extrait(l.desc))}</p>` : ''}
      </li>`;
}

const attraction = (l) => ({
  '@type': 'TouristAttraction', name: nomAffiche(l),
  geo: { '@type': 'GeoCoordinates', latitude: l.lat, longitude: l.lon },
  address: { '@type': 'PostalAddress', addressLocality: l.commune, addressRegion: l.dep, addressCountry: 'FR' },
  ...(l.wd ? { sameAs: `https://www.wikidata.org/wiki/${l.wd}` } : {}),
});

// ── Génération ──────────────────────────────────────────────────────────────
fs.rmSync(SORTIE, { recursive: true, force: true });
const urlsSitemap = [];
const ecrire = (url, html) => {
  const dossier = path.join(RACINE, url);
  fs.mkdirSync(dossier, { recursive: true });
  fs.writeFileSync(path.join(dossier, 'index.html'), html);
  urlsSitemap.push(url);
};

const resumeDeps = [];
for (const [dep, communes] of [...parDep].sort((a, b) => a[0].localeCompare(b[0], 'fr'))) {
  const [code, region] = DEPARTEMENTS[dep];
  const tous = [...communes.values()].flat();
  if (tous.length < MIN_LIEUX) continue; // département trop peu fourni : pas de page
  const avecPage = [...communes].filter(([, ls]) => ls.length >= MIN_LIEUX).sort((a, b) => b[1].length - a[1].length);
  resumeDeps.push({ dep, code, region, n: tous.length, nCommunes: communes.size });

  // ---- pages communes
  for (const [c, ls] of avecPage) {
    const url = urlCommune(dep, c);
    const g = parCategorie(ls);
    const plusAncien = Math.min(...ls.map((l) => l.rang));
    const phares = [...ls].sort((a, b) => importance(a) - importance(b)).slice(0, 3).map((l) => l.nom);
    const moi = { lat: centre(ls).lat, lon: centre(ls).lon };
    const voisines = communesAvecPage.filter((x) => !(x.dep === dep && x.c === c))
      .map((x) => ({ ...x, d: distanceKm(moi, x) })).filter((x) => x.d < 45).sort((a, b) => a.d - b.d).slice(0, 8);
    const epoque = epoqueDe(plusAncien);
    const intro = `${c} (${dep}, ${region}) compte ${pluriel(ls.length, 'lieu d’histoire recensé', 'lieux d’histoire recensés')} dans ExploGo : ${resumeCategories(ls)}.`
      + (epoque ? ` Les plus anciens remontent à ${epoque}.` : '')
      + ` À ne pas manquer : ${listeFr(phares)}.`;
    const contenu = `    <p class="pat-intro">${esc(intro)}</p>
    <p class="pat-intro">Chaque lieu a son récit dans l’appli : une scène vivante, racontée par un témoin de l’époque. Voici un aperçu de ce qui vous attend à ${esc(c)}.</p>
    <nav class="pat-sommaire" aria-label="Catégories">${[...g].map(([cat, v]) => `<a href="#${cat}">${esc(CATEGORIES[cat][0])} <span>${v.length}</span></a>`).join('')}</nav>
${[...g].map(([cat, v]) => `    <section class="pat-section" id="${cat}">
      <h2>${esc(CATEGORIES[cat][0])} à ${esc(c)}</h2>
      <ul class="pat-lieux">
${v.map((l) => carteLieu(l, false, dep)).join('\n')}
      </ul>
    </section>`).join('\n')}
    <section class="pat-section">
      <h2>Autour de ${esc(c)}</h2>
      <ul class="pat-liens">
${voisines.map((x) => `        <li><a href="${urlCommune(x.dep, x.c)}">${esc(x.c)}</a> <span>${pluriel(x.n, 'lieu', 'lieux')} · ${Math.round(x.d)} km</span></li>`).join('\n')}
        <li><a href="${urlDep(dep)}">Tout le patrimoine ${esc(deLeDep(dep))}</a></li>
      </ul>
    </section>`;
    ecrire(url, page({
      url,
      titre: `${c} : ${nombre(ls.length)} lieux d’histoire à découvrir | ExploGo`,
      description: `Patrimoine de ${c} (${dep}) : ${resumeCategories(ls)}. Récits, siècles et lieux à découvrir avec l’appli ExploGo.`.slice(0, 158),
      h1: `${c} : ${pluriel(ls.length, 'lieu d’histoire à découvrir', 'lieux d’histoire à découvrir')}`,
      fil: [['Accueil', '/'], ['Patrimoine', '/patrimoine/'], [dep, urlDep(dep)], [c, url]],
      contenu,
      jsonld: [{ '@type': 'ItemList', name: `Patrimoine de ${c}`, numberOfItems: ls.length,
        itemListElement: ls.slice(0, 50).map((l, i) => ({ '@type': 'ListItem', position: i + 1, item: attraction(l) })) }],
    }));
  }

  // ---- page département
  const url = urlDep(dep);
  const g = parCategorie(tous);
  const plusAncien = Math.min(...tous.map((l) => l.rang));
  const epoque = epoqueDe(plusAncien);
  const topCommunes = avecPage.slice(0, 5).map(([c]) => c);
  const intro = `Le département ${deLeDep(dep)} (${code}, ${region}) rassemble ${pluriel(tous.length, 'lieu d’histoire', 'lieux d’histoire')} dans ExploGo, répartis sur ${pluriel(communes.size, 'commune', 'communes')} : ${resumeCategories(tous)}.`
    + (epoque ? ` Les plus anciens remontent à ${epoque}.` : '')
    + (topCommunes.length ? ` Les communes les plus riches : ${listeFr(topCommunes)}.` : '');
  const autres = [...communes].filter(([, ls]) => ls.length < MIN_LIEUX).sort((a, b) => a[0].localeCompare(b[0], 'fr'));
  const contenu = `    <p class="pat-intro">${esc(intro)}</p>
${avecPage.length ? `    <section class="pat-section">
      <h2>Les villes et villages à explorer</h2>
      <ul class="pat-liens pat-liens-grille">
${avecPage.map(([c, ls]) => `        <li><a href="${urlCommune(dep, c)}">${esc(c)}</a> <span>${pluriel(ls.length, 'lieu', 'lieux')}</span></li>`).join('\n')}
      </ul>
    </section>` : ''}
${[...g].map(([cat, v]) => `    <section class="pat-section" id="${cat}">
      <h2>${esc(CATEGORIES[cat][0])} ${esc(deLeDep(dep))} <span class="pat-compte">${nombre(v.length)}</span></h2>
      <ul class="pat-lieux">
${v.slice(0, 6).map((l) => carteLieu(l, true, dep)).join('\n')}
      </ul>
    </section>`).join('\n')}
${autres.length ? `    <section class="pat-section">
      <h2>Et aussi</h2>
      <p class="pat-autres">${autres.map(([c, ls]) => `${esc(c)} (${ls.length})`).join(' · ')}</p>
    </section>` : ''}`;
  ecrire(url, page({
    url,
    titre: `Patrimoine ${deLeDep(dep)} : ${pluriel(tous.length, 'lieu d’histoire', 'lieux d’histoire')} | ExploGo`,
    description: `Châteaux, églises, vestiges et monuments ${deLeDep(dep)} (${code}) : ${nombre(tous.length)} lieux d’histoire dans ${nombre(communes.size)} communes, à découvrir avec ExploGo.`.slice(0, 158),
    h1: `Patrimoine ${deLeDep(dep)} : ${pluriel(tous.length, 'lieu d’histoire', 'lieux d’histoire')}`,
    fil: [['Accueil', '/'], ['Patrimoine', '/patrimoine/'], [dep, url]],
    contenu,
    jsonld: [{ '@type': 'ItemList', name: `Patrimoine ${deLeDep(dep)}`, numberOfItems: tous.length,
      itemListElement: [...tous].sort((a, b) => importance(a) - importance(b)).slice(0, 30)
        .map((l, i) => ({ '@type': 'ListItem', position: i + 1, item: attraction(l) })) }],
  }));
}

// ---- page d'accueil du patrimoine : régions → départements
const parRegion = new Map();
for (const d of resumeDeps) {
  if (!parRegion.has(d.region)) parRegion.set(d.region, []);
  parRegion.get(d.region).push(d);
}
const total = resumeDeps.reduce((s, d) => s + d.n, 0);
ecrire('/patrimoine/', page({
  url: '/patrimoine/',
  titre: `Patrimoine de France par département : ${nombre(total)} lieux | ExploGo`,
  description: `Châteaux, églises, vestiges antiques et sites préhistoriques : ${nombre(total)} lieux d’histoire en France, classés par région et par département.`,
  h1: 'Le patrimoine de France, département par département',
  fil: [['Accueil', '/'], ['Patrimoine', '/patrimoine/']],
  contenu: `    <p class="pat-intro">ExploGo recense ${nombre(total)} lieux d’histoire partout en France : châteaux, églises et cathédrales, fortifications, demeures, vestiges antiques et sites préhistoriques. Choisissez un département pour découvrir ses lieux, commune par commune.</p>
${[...parRegion].sort((a, b) => a[0].localeCompare(b[0], 'fr')).map(([r, ds]) => `    <section class="pat-section">
      <h2>${esc(r)}</h2>
      <ul class="pat-liens pat-liens-grille">
${ds.sort((a, b) => a.dep.localeCompare(b.dep, 'fr')).map((d) => `        <li><a href="${urlDep(d.dep)}">${esc(d.dep)} (${d.code})</a> <span>${pluriel(d.n, 'lieu', 'lieux')}</span></li>`).join('\n')}
      </ul>
    </section>`).join('\n')}`,
}));

// ---- sitemap dédié
fs.writeFileSync(path.join(RACINE, 'sitemap-patrimoine.xml'), [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...urlsSitemap.map((u) => `  <url><loc>${SITE}${u}</loc><lastmod>${AUJOURDHUI}</lastmod></url>`),
  '</urlset>', '',
].join('\n'));

console.log(`${urlsSitemap.length} pages : 1 sommaire, ${resumeDeps.length} départements, ${urlsSitemap.length - 1 - resumeDeps.length} communes (${lieux.length} lieux utilisés sur ${brut.length}).`);
