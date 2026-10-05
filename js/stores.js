// Téléchargement : sur téléphone, les boutons "Télécharger" mènent directement
// au bon store (un QR code ne sert à rien sur l'appareil qui l'affiche) et le
// store de l'appareil passe en premier dans la liste.
(() => {
  const STORES = {
    android: "https://play.google.com/store/apps/details?id=com.john.blue3103.explogomobile",
    ios: "https://apps.apple.com/fr/app/explogo/id6749705613",
  };

  const ua = navigator.userAgent || "";
  // iPadOS se présente comme un Mac : on le reconnaît à l'écran tactile
  const ios = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
  const android = /Android/i.test(ua);
  const plateforme = ios ? "ios" : android ? "android" : null;
  if (!plateforme) return;

  // boutons "Télécharger" (en-tête, hero…) : directement vers le store
  document.querySelectorAll('a[href="#telecharger"]').forEach((a) => {
    a.href = STORES[plateforme];
    a.target = "_blank";
    a.rel = "noopener";
  });

  // le store de l'appareil en premier
  document.querySelectorAll(".store-list").forEach((liste) => {
    const lien = liste.querySelector(`[data-store="${plateforme}"]`);
    const li = lien && lien.closest("li");
    if (li && li !== liste.firstElementChild) liste.prepend(li);
  });
})();
