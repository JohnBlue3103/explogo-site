const API_URL = "https://api.explogo.fr";

const form = document.getElementById("contactForm");
const statusMessage = document.getElementById("statusMessage");

form.addEventListener("submit", async (e) => {

  e.preventDefault();

  const sujet = document.getElementById("sujet").value;
  const message = document.getElementById("message").value;

  if(message.trim().length < 10){
    statusMessage.innerText = "Merci de décrire votre message.";
    return;
  }

  statusMessage.innerText = "Envoi...";

  try {

    const res = await fetch(`${API_URL}/api/support/message`,{
      method:"POST",
      headers:{
        "Content-Type":"application/json"
      },
      body:JSON.stringify({
        sujet,
        message
      })
    });

    if(!res.ok) throw new Error();

    statusMessage.innerText = "Message envoyé ✔";
    form.reset();

  } catch {

    statusMessage.innerText = "Erreur lors de l'envoi.";

  }

});