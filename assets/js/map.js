/* ============================================================
   MAP.JS — Carte interactive Pause IA
   - Pan / zoom maison (souris + tactile)
   - Chargement des sources depuis data/ressources.json
   - Placement automatique des cercles dans leurs polygones
   - Bulle d'info au survol
   ============================================================ */

(function () {
  'use strict';

  const MAP_WIDTH = 2048;
  const MAP_HEIGHT = 1152;

  const viewport = document.getElementById('mapViewport');
  const stage = document.getElementById('mapStage');
  const sourcesContainer = document.getElementById('mapSources');
  const tooltip = document.getElementById('sourceTooltip');
  const tooltipFlag = document.getElementById('sourceTooltipFlag');
  const tooltipTitle = document.getElementById('sourceTooltipTitle');
  const tooltipDesc = document.getElementById('sourceTooltipDesc');

  /* ============================================================
     PAN / ZOOM MAISON
     ============================================================ */

  const initial = window.__mapInitialFit;
  let scale = initial.scale;
  let x = initial.x;
  let y = initial.y;
  const MIN_SCALE = initial.scale * 0.5;
  const MAX_SCALE = 4;

  function apply() {
    stage.style.transform =
      `translate(${x}px, ${y}px) scale(${scale})`;
    // Compensation du zoom UNIQUEMENT pour les labels statiques :
    // ils gardent leur taille à l'écran, peu importe le niveau de zoom.
    // Les cercles de sources zooment normalement avec la carte.
    const inv = 1 / scale;
    document.querySelectorAll('.zone-static-label').forEach((l) => {
      l.style.transform = `translate(-50%, -50%) scale(${inv})`;
    });
  }

  // ----- Drag souris -----
  let dragging = false;
  let dragStartX = 0, dragStartY = 0;
  let panStartX = 0, panStartY = 0;
  let dragMoved = false; // pour distinguer drag de clic

  viewport.addEventListener('mousedown', (e) => {
    dragging = true;
    dragMoved = false;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    panStartX = x;
    panStartY = y;
    viewport.style.cursor = 'grabbing';
    e.preventDefault();
  });

  window.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragMoved = true;
    x = panStartX + dx;
    y = panStartY + dy;
    apply();
  });

  window.addEventListener('mouseup', () => {
    if (!dragging) return;
    dragging = false;
    viewport.style.cursor = 'grab';
  });

  // ----- Zoom molette (autour du curseur) -----
  viewport.addEventListener('wheel', (e) => {
    e.preventDefault();
    const rect = viewport.getBoundingClientRect();
    const cursorX = e.clientX - rect.left;
    const cursorY = e.clientY - rect.top;
    const zoomFactor = -e.deltaY > 0 ? 1.15 : 1 / 1.15;
    const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale * zoomFactor));
    if (newScale === scale) return;
    const ratio = newScale / scale;
    x = cursorX - (cursorX - x) * ratio;
    y = cursorY - (cursorY - y) * ratio;
    scale = newScale;
    apply();
  }, { passive: false });

  // ----- Tactile : pan 1 doigt + pinch 2 doigts -----
  let touchMode = null;
  let touchStartDist = 0, touchStartScale = 1;
  let touchStartX = 0, touchStartY = 0;
  let touchPanStartX = 0, touchPanStartY = 0;

  viewport.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      touchMode = 'pan';
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      touchPanStartX = x;
      touchPanStartY = y;
    } else if (e.touches.length === 2) {
      touchMode = 'pinch';
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchStartDist = Math.hypot(dx, dy);
      touchStartScale = scale;
    }
  }, { passive: true });

  viewport.addEventListener('touchmove', (e) => {
    if (touchMode === 'pan' && e.touches.length === 1) {
      x = touchPanStartX + (e.touches[0].clientX - touchStartX);
      y = touchPanStartY + (e.touches[0].clientY - touchStartY);
      apply();
      e.preventDefault();
    } else if (touchMode === 'pinch' && e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const newScale = Math.max(
        MIN_SCALE,
        Math.min(MAX_SCALE, touchStartScale * (dist / touchStartDist))
      );
      const rect = viewport.getBoundingClientRect();
      const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
      const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;
      const ratio = newScale / scale;
      x = cx - (cx - x) * ratio;
      y = cy - (cy - y) * ratio;
      scale = newScale;
      apply();
      e.preventDefault();
    }
  }, { passive: false });

  viewport.addEventListener('touchend', () => { touchMode = null; });

  // ----- Re-centrage au resize -----
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const vw = viewport.clientWidth;
      const vh = viewport.clientHeight;
      const margin = 0.92;
      scale = Math.min((vw / MAP_WIDTH) * margin, (vh / MAP_HEIGHT) * margin);
      x = (vw - MAP_WIDTH * scale) / 2;
      y = (vh - MAP_HEIGHT * scale) / 2;
      apply();
    }, 150);
  });

  /* ============================================================
     CORRESPONDANCE NOMS DE ZONES ↔ IDENTIFIANTS COURTS
     Utilisé pour relier les polygones SVG (par data-name) aux
     labels (par data-zone) et aux sources du JSON (par zone).
     ============================================================ */
  const ZONE_IDS = {
    'Forêt des blogs': 'foret',
    'Monts des newsletters': 'monts',
    'Village de la sécurité': 'village',
    'Plaine militante': 'plaine',
    'Rives des podcasts': 'rives',
    'Delta des vidéos': 'delta',
    'Avant-poste des prédictions': 'avant-poste',
    'Île des ressources': 'ile',
  };

  /* ============================================================
     SYNCHRONISATION HOVER POLYGONE → LABEL
     Au survol d'un polygone, on active le label statique
     correspondant (encadré noir + bordure orange).
     ============================================================ */

  document.querySelectorAll('.zone').forEach((poly) => {
    const name = poly.dataset.name;
    const zoneId = ZONE_IDS[name];
    if (!zoneId) return;
    const label = document.querySelector(
      `.zone-static-label[data-zone="${zoneId}"]`
    );
    if (!label) return;
    poly.addEventListener('mouseenter', () => label.classList.add('active'));
    poly.addEventListener('mouseleave', () => label.classList.remove('active'));
  });

  /* ============================================================
     LECTURE DES POLYGONES
     On parse les attributs "points" des <polygon class="zone">
     en se basant sur leur attribut data-name pour construire un
     dictionnaire { id-de-zone: [[x,y], [x,y], ...] }.
     ============================================================ */

  function readPolygons() {
    const out = {};
    document.querySelectorAll('.zone').forEach((poly) => {
      const name = poly.dataset.name;
      const id = ZONE_IDS[name];
      if (!id) return;
      const pts = poly.getAttribute('points')
        .trim()
        .split(/\s+/)
        .map((p) => p.split(',').map(Number))
        .filter((p) => p.length === 2 && !isNaN(p[0]) && !isNaN(p[1]));
      out[id] = pts;
    });
    return out;
  }

  /* ============================================================
     PLACEMENT AUTOMATIQUE DANS UN POLYGONE
     Calcule la boîte englobante du polygone, divise en grille
     selon le nombre de sources à placer, et retourne les positions
     des cellules dont le centre est À L'INTÉRIEUR du polygone.
     ============================================================ */

  // Test "point dans polygone" (algorithme ray-casting)
  function pointInPolygon(point, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [xi, yi] = polygon[i];
      const [xj, yj] = polygon[j];
      const intersect =
        (yi > point[1]) !== (yj > point[1]) &&
        point[0] < ((xj - xi) * (point[1] - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }

  function bbox(polygon) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    polygon.forEach(([px, py]) => {
      if (px < minX) minX = px;
      if (px > maxX) maxX = px;
      if (py < minY) minY = py;
      if (py > maxY) maxY = py;
    });
    return { minX, minY, maxX, maxY };
  }

  // Place n points dans le polygone, en grille, centrés sur la bbox.
  function autoPlace(polygon, n) {
    if (n <= 0) return [];
    const box = bbox(polygon);
    const w = box.maxX - box.minX;
    const h = box.maxY - box.minY;

    // Grille : on essaie d'avoir un ratio cohérent avec celui de la bbox
    let cols = Math.ceil(Math.sqrt(n * (w / h)));
    let rows = Math.ceil(n / cols);
    if (cols < 1) cols = 1;
    if (rows < 1) rows = 1;

    // Liste des cellules (centres) qui sont À L'INTÉRIEUR du polygone
    const cellW = w / (cols + 1);
    const cellH = h / (rows + 1);
    const candidates = [];
    for (let r = 1; r <= rows; r++) {
      for (let c = 1; c <= cols; c++) {
        const px = box.minX + c * cellW;
        const py = box.minY + r * cellH;
        if (pointInPolygon([px, py], polygon)) {
          candidates.push([px, py]);
        }
      }
    }

    // Si on n'a pas assez de candidats valides, on densifie la grille
    if (candidates.length < n) {
      const extra = autoPlaceDense(polygon, n, box);
      return extra.slice(0, n);
    }

    // Si on en a trop, on prend ceux les plus proches du centre de la bbox
    const cx = (box.minX + box.maxX) / 2;
    const cy = (box.minY + box.maxY) / 2;
    candidates.sort((a, b) => {
      const da = (a[0] - cx) ** 2 + (a[1] - cy) ** 2;
      const db = (b[0] - cx) ** 2 + (b[1] - cy) ** 2;
      return da - db;
    });
    return candidates.slice(0, n).map(p => ({ x: p[0], y: p[1] }));
  }

  // Fallback : grille très dense pour trouver assez de candidats
  function autoPlaceDense(polygon, n, box) {
    const w = box.maxX - box.minX;
    const h = box.maxY - box.minY;
    const step = Math.min(w, h) / 20;
    const candidates = [];
    for (let py = box.minY + step; py < box.maxY; py += step) {
      for (let px = box.minX + step; px < box.maxX; px += step) {
        if (pointInPolygon([px, py], polygon)) {
          candidates.push({ x: px, y: py });
        }
      }
    }
    // Sélection régulière dans la liste pour bien étaler
    if (candidates.length <= n) return candidates;
    const stepIdx = candidates.length / n;
    const result = [];
    for (let i = 0; i < n; i++) {
      result.push(candidates[Math.floor(i * stepIdx)]);
    }
    return result;
  }

  /* ============================================================
     RENDU DES SOURCES
     ============================================================ */

  function flagEmoji(lang) {
    if (lang === 'fr') return '🇫🇷';
    if (lang === 'en' || lang === 'gb') return '🇬🇧';
    return '';
  }

  function renderSources(sources, polygons) {
    // Grouper les sources par zone
    const byZone = {};
    sources.forEach((src) => {
      if (!byZone[src.zone]) byZone[src.zone] = [];
      byZone[src.zone].push(src);
    });

    // Pour chaque zone, calculer les positions auto pour celles
    // qui n'ont pas de x/y explicites
    Object.keys(byZone).forEach((zoneId) => {
      const polygon = polygons[zoneId];
      if (!polygon) {
        console.warn('[map] zone inconnue dans le JSON:', zoneId);
        return;
      }
      const list = byZone[zoneId];
      const needAuto = list.filter(s => s.x == null || s.y == null);
      if (needAuto.length === 0) return;
      const positions = autoPlace(polygon, needAuto.length);
      needAuto.forEach((src, i) => {
        if (positions[i]) {
          src.x = positions[i].x;
          src.y = positions[i].y;
        }
      });
    });

    // Créer les éléments DOM
    sources.forEach((src) => {
      if (src.x == null || src.y == null) return; // skip si pas placée
      const marker = document.createElement('a');
      marker.className = 'source-marker';
      marker.href = src.url || '#';
      marker.target = '_blank';
      marker.rel = 'noopener';
      marker.style.left = src.x + 'px';
      marker.style.top = src.y + 'px';

      // Logo si fourni, sinon initiales
      if (src.logo) {
        const img = document.createElement('img');
        img.src = src.logo;
        img.alt = src.title || '';
        img.onerror = () => {
          // Fallback en cas d'erreur de chargement du logo
          img.remove();
          const fb = document.createElement('span');
          fb.className = 'source-marker-fallback';
          fb.textContent = (src.title || '?').slice(0, 2);
          marker.appendChild(fb);
        };
        marker.appendChild(img);
      } else {
        const fb = document.createElement('span');
        fb.className = 'source-marker-fallback';
        fb.textContent = (src.title || '?').slice(0, 2);
        marker.appendChild(fb);
      }

      // Empêcher le clic si l'utilisateur a fait un drag
      marker.addEventListener('click', (e) => {
        if (dragMoved) {
          e.preventDefault();
        }
      });

      // Tooltip au survol
      marker.addEventListener('mouseenter', () => {
        showTooltip(src, marker);
      });
      marker.addEventListener('mouseleave', () => {
        hideTooltip();
      });

      sourcesContainer.appendChild(marker);
    });
  }

  /* ============================================================
     TOOLTIP
     Positionnée à côté du cercle (statique, pas suivant la souris).
     ============================================================ */

  function showTooltip(src, marker) {
    tooltipTitle.textContent = src.title || '';
    tooltipDesc.textContent = src.description || '';
    tooltipFlag.textContent = flagEmoji(src.lang);

    // Positionner à droite du marqueur, ou à gauche si pas la place
    const rect = marker.getBoundingClientRect();
    tooltip.classList.add('visible');
    // Mesurer la tooltip après l'avoir affichée pour bien la placer
    const tipRect = tooltip.getBoundingClientRect();
    const margin = 14;
    let left = rect.right + margin;
    if (left + tipRect.width > window.innerWidth - 10) {
      left = rect.left - tipRect.width - margin;
    }
    let top = rect.top + (rect.height - tipRect.height) / 2;
    if (top < 10) top = 10;
    if (top + tipRect.height > window.innerHeight - 10) {
      top = window.innerHeight - tipRect.height - 10;
    }
    tooltip.style.left = left + 'px';
    tooltip.style.top = top + 'px';
  }

  function hideTooltip() {
    tooltip.classList.remove('visible');
  }

  /* ============================================================
     CHARGEMENT DES SOURCES DEPUIS LE JSON
     ============================================================ */

  fetch('data/ressources.json')
    .then((r) => {
      if (!r.ok) throw new Error('JSON introuvable');
      return r.json();
    })
    .then((sources) => {
      const polygons = readPolygons();
      console.log('[map] sources chargées:', sources.length);
      console.log('[map] zones lues:', Object.keys(polygons));
      renderSources(sources, polygons);
      // Appliquer la compensation de zoom aux nouveaux markers
      apply();
    })
    .catch((err) => {
      console.warn('[map] Pas de sources chargées :', err.message);
    });

  apply();
})();
