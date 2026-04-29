/* ============================================================
   NAV.JS — Logique de la barre de navigation
   Pour l'instant : rien de particulier. Réservé pour plus tard
   (menu mobile, indication de la page active, etc.).
   ============================================================ */

(function () {
  'use strict';

  // Marquer le lien de la page courante comme "actif"
  // (utile quand tu seras sur ressources.html ou vulgarisation.html)
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  const links = document.querySelectorAll('.nav-links a');
  links.forEach((link) => {
    if (link.getAttribute('href') === currentPath) {
      link.style.color = 'var(--orange)';
    }
  });
})();
