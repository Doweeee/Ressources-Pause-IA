/* ============================================================
   NAV.JS — Logique de la barre de navigation
   Met en évidence l'onglet correspondant à la page courante via
   la classe .is-active (style défini dans base.css).
   ============================================================ */

(function () {
  'use strict';

  // Récupère le nom de la page courante (par exemple "ressources.html")
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  const links = document.querySelectorAll('.nav-links a');

  links.forEach((link) => {
    const href = link.getAttribute('href');
    if (href === currentPath) {
      link.classList.add('is-active');
    }
  });
})();