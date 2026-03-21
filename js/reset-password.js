const params  = new URLSearchParams(window.location.search);
const token   = params.get('token');
const form    = document.getElementById('form');
const btn     = document.getElementById('btn');
const msgEl   = document.getElementById('msg');

function showMsg(text, type) {
  msgEl.textContent = text;
  msgEl.className   = 'msg ' + type;
  msgEl.style.display = 'block';
}

if (!token) {
  showMsg('Lien invalide ou expiré.', 'error');
  btn.disabled = true;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  msgEl.style.display = 'none';

  const pwd  = document.getElementById('pwd').value.trim();
  const pwd2 = document.getElementById('pwd2').value.trim();

  if (pwd.length < 8) {
    return showMsg('Le mot de passe doit contenir au moins 8 caractères.', 'error');
  }
  if (pwd !== pwd2) {
    return showMsg('Les mots de passe ne correspondent pas.', 'error');
  }

  btn.disabled    = true;
  btn.textContent = 'Envoi en cours…';

  try {
    const res = await fetch('https://api.explogo.fr/auth/reset-password', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ token, password: pwd }),
    });

    const txt = await res.text();

    if (!res.ok) {
      showMsg(txt || 'Erreur lors de la réinitialisation.', 'error');
      btn.disabled    = false;
      btn.textContent = 'Valider';
    } else {
      form.style.display = 'none';
      showMsg('Mot de passe modifié ! Vous pouvez maintenant vous connecter dans l\'application.', 'success');
    }
  } catch {
    showMsg('Serveur indisponible. Réessayez plus tard.', 'error');
    btn.disabled    = false;
    btn.textContent = 'Valider';
  }
});
