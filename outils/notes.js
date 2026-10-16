// Notes de l'appli sur les stores, affichées sur l'accueil (bandeau sous le bouton
// « Télécharger ») et reprises par outils/seo.js dans les données structurées
// (étoiles dans les résultats Google).
//
//   node outils/notes.js   met à jour la note App Store (API publique d'Apple) et le bandeau
//
// La note Google Play n'a pas d'accès public : elle se saisit à la main dans outils/notes.json.
// La tâche GitHub du lundi (.github/workflows/publier-articles.yml) lance ce script.

const fs = require('fs');
const path = require('path');

const RACINE = path.join(__dirname, '..');
const FICHIER = path.join(__dirname, 'notes.json');
const APP_STORE_ID = '6749705613';
const AUJOURDHUI = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date());

const virgule = (n) => n.toFixed(1).replace('.', ',');
const pluriel = (n, un, plusieurs) => `${n.toLocaleString('fr-FR')} ${n > 1 ? plusieurs : un}`;

// Note globale : moyenne des deux stores pondérée par le nombre de notes
function noteGlobale(notes) {
  const stores = [notes.appStore, notes.googlePlay].filter((s) => s && s.note && s.nombre > 0);
  const nombre = stores.reduce((t, s) => t + s.nombre, 0);
  if (!nombre) return null;
  return { note: stores.reduce((t, s) => t + s.note * s.nombre, 0) / nombre, nombre };
}

function bandeau(notes) {
  const parts = [];
  if (notes.appStore.note && notes.appStore.nombre) parts.push(`${virgule(notes.appStore.note)} sur l’App Store`);
  if (notes.googlePlay.note && notes.googlePlay.nombre) parts.push(`${virgule(notes.googlePlay.note)} sur Google Play`);
  const g = noteGlobale(notes);
  if (!g) return '';
  return `<a class="note-stores" href="#telecharger" aria-label="Note de l’appli : ${virgule(g.note)} sur 5, ${pluriel(g.nombre, 'note', 'notes')}">`
    + `<span class="note-etoiles" style="--note:${g.note.toFixed(2)}" aria-hidden="true">★★★★★</span>`
    + `<span><strong>${parts.join(' · ')}</strong> · ${pluriel(g.nombre, 'note', 'notes')}</span></a>`;
}

async function main() {
  const notes = JSON.parse(fs.readFileSync(FICHIER, 'utf8'));
  try {
    const r = await fetch(`https://itunes.apple.com/lookup?id=${APP_STORE_ID}&country=fr`);
    const app = (await r.json()).results?.[0];
    if (app && app.userRatingCount > 0) {
      const avant = JSON.stringify([notes.appStore.note, notes.appStore.nombre]);
      notes.appStore.note = Math.round(app.averageUserRating * 100) / 100;
      notes.appStore.nombre = app.userRatingCount;
      if (JSON.stringify([notes.appStore.note, notes.appStore.nombre]) !== avant) notes.appStore.maj = AUJOURDHUI;
    }
  } catch (e) {
    console.warn('⚠ App Store injoignable, on garde la note précédente :', e.message);
  }
  fs.writeFileSync(FICHIER, JSON.stringify(notes, null, 2) + '\n');

  // bandeau de l'accueil, entre <!-- NOTES:debut --> et <!-- NOTES:fin -->
  const index = path.join(RACINE, 'index.html');
  let html = fs.readFileSync(index, 'utf8');
  const eol = html.includes('\r\n') ? '\r\n' : '\n';
  const m = html.match(/([ \t]*)<!-- NOTES:debut -->[\s\S]*?<!-- NOTES:fin -->/);
  if (!m) throw new Error('marqueurs NOTES absents de index.html');
  const contenu = bandeau(notes);
  html = html.replace(m[0], `${m[1]}<!-- NOTES:debut -->${contenu ? eol + m[1] + contenu + eol + m[1] : ''}<!-- NOTES:fin -->`);
  fs.writeFileSync(index, html);

  const g = noteGlobale(notes);
  console.log(g ? `Note affichée : ${virgule(g.note)}/5 sur ${g.nombre} notes (App Store ${notes.appStore.note ?? '—'} / ${notes.appStore.nombre}, Google Play ${notes.googlePlay.note ?? '—'} / ${notes.googlePlay.nombre}).` : 'Aucune note à afficher.');
}

module.exports = { noteGlobale };
if (require.main === module) main();
