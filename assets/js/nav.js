/* ============================================================
   NAV.JS — Logique de la barre de navigation
   Met en évidence l'onglet correspondant à la page courante via
   la classe .is-active (style défini dans base.css).
   Robuste aux variations d'URL (avec/sans extension, avec slash final).
   ============================================================ */

(function () {
  'use strict';

  // Normalise un chemin : retire le slash final, l'extension .html, le préfixe.
  function normalize(path) {
    if (!path) return '';
    // garde uniquement le dernier segment significatif
    let p = path.split('/').filter(Boolean).pop() || '';
    // retire l'extension .html
    p = p.replace(/\.html$/, '');
    return p.toLowerCase();
  }

  const currentPath = normalize(window.location.pathname);
  // Si on est à la racine du site (path vide ou "Ressources-Pause-IA"),
  // c'est la page index/carte par défaut.
  const isRootIndex = currentPath === '' || currentPath === 'ressources-pause-ia';

  const links = document.querySelectorAll('.nav-links a');

  links.forEach((link) => {
    const linkPath = normalize(link.getAttribute('href'));
    const isActive =
      linkPath === currentPath ||
      (isRootIndex && linkPath === 'index');
    if (isActive) {
      link.classList.add('is-active');
    }
  });

  console.log('[nav] currentPath:', currentPath, 'isRootIndex:', isRootIndex);
})();