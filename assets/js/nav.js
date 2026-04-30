/* ============================================================
   NAV.JS — Logique de la barre de navigation
   Met en évidence le lien correspondant à la page courante.
   L'onglet "Carte" garde sa couleur orange permanente (gérée en CSS).
   ============================================================ */

(function () {
  'use strict';

  // Récupère le nom de la page courante (par exemple "ressources.html")
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  const links = document.querySelectorAll('.nav-links a');

  links.forEach((link) => {
    const href = link.getAttribute('href');
    // Ne pas toucher à l'onglet Carte qui a déjà sa couleur permanente en CSS
    if (link.classList.contains('nav-carte')) return;
    // Marquer le lien actif en orange si c'est la page courante
    if (href === currentPath) {
      link.style.color = 'var(--orange)';
    }
  });
})();
