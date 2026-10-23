/**
 * src/views/home.js
 * ============================================================================
 * Plantilla HTML institucional para la portada (Home) del IFTS N.° 2.
 * Genera los carruseles independientes, normalización visual y manejo de errores
 * de imágenes para que NUNCA se rompa el diseño aunque se borren fotos locales.
 *
 * Estilos externos centralizados en: public/css/styles.css
 */

import { CONFIG } from '../../config.js';
import { getPostCategories } from '../classifier.js';

export function renderHomePage(posts = []) {
  // Asegurar que cada publicación tenga categorías calculadas
  const enrichedPosts = posts.map(p => {
    const cats = (p.categories && p.categories.length > 0)
      ? p.categories
      : getPostCategories(p.caption);
    return { ...p, categories: cats };
  });

  const novedadesPosts = enrichedPosts.filter(p => p.categories.includes('novedades'));
  const eventosPosts = enrichedPosts.filter(p => p.categories.includes('eventos'));

  // Helper para renderizar una tarjeta individual normalizada
  const renderCard = (post) => {
    const isVideo = post.mediaType === 'VIDEO';
    const mediaSource = isVideo ? (post.localVideo || post.videoUrl) : (post.localImage || post.imageUrl);
    const posterSource = post.localThumbnail || post.thumbnailUrl || 'images/placeholder.svg';
    const dateFormatted = post.timestamp ? new Date(post.timestamp).toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }) : 'Reciente';

    // Extraer hashtags para badges visuales
    const hashtagsFound = ((post.caption || '').match(/#[\p{L}\p{N}_]+/gu) || []).slice(0, 3);
    const cleanCaption = (post.caption || '')
      .replace(/#[\p{L}\p{N}_]+/gu, '')
      .trim();

    return `
      <article class="feed-card" data-id="${post.id}">
        <div class="card-media">
          ${isVideo ? `
            <video controls poster="/${posterSource}" preload="metadata" playsinline onerror="this.poster='/images/placeholder.svg'">
              <source src="/${mediaSource}" type="video/mp4">
              Tu navegador no soporta el reproductor de video.
            </video>
            <span class="media-type-badge video-badge">🎬 VIDEO</span>
          ` : `
            <img src="/${mediaSource}" alt="Publicación institucional" loading="lazy" onerror="this.onerror=null;this.src='/images/placeholder.svg';" />
            <span class="media-type-badge photo-badge">🖼️ FOTO</span>
          `}
          <span class="date-badge">${dateFormatted}</span>
        </div>
        <div class="card-body">
          <p class="card-caption" title="${(post.caption || '').replace(/"/g, '&quot;')}">
            ${cleanCaption || post.caption || 'Publicación institucional'}
          </p>
          <div class="card-hashtags">
            ${hashtagsFound.map(tag => `<span class="hashtag-tag">${tag}</span>`).join('')}
          </div>
          <div class="card-footer">
            <a href="${post.permalink || 'https://www.instagram.com/'}" target="_blank" rel="noopener noreferrer" class="instagram-link">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
              </svg>
              Ver en Instagram ↗
            </a>
          </div>
        </div>
      </article>
    `;
  };

  // Helper para renderizar una sección de carrusel adaptable
  const renderSection = (id, title, subtitle, badgeText, sectionPosts) => {
    const count = sectionPosts.length;
    const isAdaptiveCarousel = count >= 3;

    return `
      <section id="${id}" class="section-container">
        <div class="section-header">
          <div class="section-titles">
            <span class="section-badge">${badgeText}</span>
            <h2 class="section-title">${title}</h2>
            <p class="section-subtitle">${subtitle}</p>
          </div>
          ${isAdaptiveCarousel ? `
            <div class="carousel-nav-controls" aria-label="Controles de carrusel">
              <button class="nav-btn prev-btn" data-target="${id}-track" title="Publicaciones anteriores" aria-label="Anterior">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
              </button>
              <button class="nav-btn next-btn" data-target="${id}-track" title="Publicaciones siguientes" aria-label="Siguiente">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
              </button>
            </div>
          ` : ''}
        </div>

        ${count === 0 ? `
          <div class="empty-state">
            <p>No hay publicaciones disponibles para esta sección en este momento.</p>
            <span class="empty-hint">Podés agregar una con <code>npm run add-post</code> o haciendo clic en "Probar Publicación".</span>
          </div>
        ` : `
          <div class="carousel-wrapper">
            <div id="${id}-track" class="${isAdaptiveCarousel ? 'carousel-track' : 'cards-grid-centered'}">
              ${sectionPosts.map(renderCard).join('')}
            </div>
          </div>
        `}
      </section>
    `;
  };

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>IFTS N.° 29 — Tecnicatura Superior en Desarrollo de Software</title>
  <meta name="description" content="Portal oficial y prototipo web del IFTS N.° 29 con carruseles sincronizados de Instagram. Educación pública y gratuita en la Ciudad de Buenos Aires.">
  <link rel="stylesheet" href="/css/styles.css">
</head>
<body>

  <!-- Barra Superior -->
  <div class="top-bar">
    <div><strong>Gobierno de la Ciudad Autónoma de Buenos Aires</strong> — DGETyFP</div>
    <div><span>Instagram Oficial: </span><a href="https://www.instagram.com/clinica.meelar/" target="_blank">@clinica.meelar</a></div>
  </div>

  <!-- Header y Navegación -->
  <header class="header">
    <div class="header-content">
      <a href="#" class="brand">
        <div class="brand-logo-badge">
          <span>IFTS</span>
          <span>29</span>
        </div>
        <div class="brand-text">
          <h1>IFTS N.° 29</h1>
          <p>Tecnicatura Superior en Desarrollo de Software</p>
        </div>
      </a>

      <div class="nav-actions">
        <ul class="nav-links">
          <li><a href="#carreras">La Carrera</a></li>
          <li><a href="#novedades">Novedades</a></li>
          <li><a href="#eventos">Eventos</a></li>
          <li><a href="#contacto">Contacto</a></li>
        </ul>
        <button class="btn-test" onclick="openTestModal()">🧪 Probar Publicación</button>
        <button id="btnSync" class="sync-btn" onclick="triggerSync()">
          <span class="btn-icon">🔄</span>
          <span class="btn-text">Sincronizar Feed</span>
        </button>
      </div>
    </div>
  </header>

  <!-- Hero Institucional -->
  <section class="hero">
    <div class="hero-content">
      <span class="hero-tag">🏛️ FORMACIÓN TÉCNICA SUPERIOR PÚBLICA Y GRATUITA</span>
      <h2>Formamos a los desarrolladores de software del futuro</h2>
      <p>
        El Instituto de Formación Técnica Superior N.° 29 brinda una propuesta académica orientada a las tecnologías más demandadas por la industria. Aprendé programación moderna, bases de datos y arquitectura de sistemas con titulación oficial en la Ciudad de Buenos Aires.
      </p>

      <div class="hero-features">
        <div class="feature-card">
          <h3>🎓 Título Oficial</h3>
          <p>Validez nacional aprobada por el Ministerio de Educación.</p>
        </div>
        <div class="feature-card">
          <h3>💻 Carrera Gratuita</h3>
          <p>100% pública y sin costo de aranceles ni matrículas.</p>
        </div>
        <div class="feature-card">
          <h3>⏰ Turno Vespertino</h3>
          <p>Horarios diseñados para permitir el estudio y el trabajo simultáneo.</p>
        </div>
        <div class="feature-card">
          <h3>🤝 Prácticas Reales</h3>
          <p>Proyectos colaborativos y vinculación activa con empresas IT.</p>
        </div>
      </div>
    </div>
  </section>

  <!-- Carrusel 1: Últimas Novedades (#novedades) -->
  ${renderSection(
    'novedades',
    CONFIG.categories?.novedades?.title || 'Últimas Novedades',
    CONFIG.categories?.novedades?.subtitle || 'Avisos académicos, inscripciones y comunicados oficiales del instituto',
    '#novedades',
    novedadesPosts
  )}

  <!-- Sección Curricular: La Carrera -->
  <section id="carreras" class="career-banner">
    <div class="career-container">
      <span class="section-badge">Plan de Estudios</span>
      <h2 class="section-title">Tecnicatura Superior en Desarrollo de Software</h2>
      <p class="section-subtitle">Duración: 3 Años (6 cuatrimestres). Modalidad presencial con laboratorios equipados.</p>

      <div class="career-grid">
        <div class="career-step">
          <span class="career-step-number">1° AÑO</span>
          <h3>Fundamentos y Algoritmos</h3>
          <p>Lógica de programación, algoritmos y estructuras de datos, sistemas operativos, arquitectura de computadoras y bases matemáticas.</p>
        </div>
        <div class="career-step">
          <span class="career-step-number">2° AÑO</span>
          <h3>Desarrollo Web &amp; Backend</h3>
          <p>Programación orientada a objetos (POO), bases de datos relacionales y no relacionales, diseño web moderno y servicios backend.</p>
        </div>
        <div class="career-step">
          <span class="career-step-number">3° AÑO</span>
          <h3>Arquitectura &amp; Práctica</h3>
          <p>Ingeniería de software, seguridad informática, metodologías ágiles (Scrum) y Práctica Profesionalizante orientada a proyectos reales.</p>
        </div>
      </div>
    </div>
  </section>

  <!-- Carrusel 2: Eventos y Vida Estudiantil (#eventos) -->
  ${renderSection(
    'eventos',
    CONFIG.categories?.eventos?.title || 'Eventos y Vida Estudiantil',
    CONFIG.categories?.eventos?.subtitle || 'Talleres, charlas, hackathons y actividades de la comunidad tecnológica',
    '#eventos',
    eventosPosts
  )}

  <!-- Footer Institucional -->
  <footer id="contacto" class="footer">
    <div class="footer-content">
      <div>
        <h4>IFTS N.° 29</h4>
        <p>Instituto de Formación Técnica Superior N.° 29</p>
        <p>Dirección General de Educación Técnico Productiva (DGETyFP)</p>
        <p>Ministerio de Educación — CABA</p>
      </div>
      <div>
        <h4>Sede y Contacto</h4>
        <p>📍 Ciudad Autónoma de Buenos Aires</p>
        <p>📧 contacto@ifts29.edu.ar</p>
        <p>⏰ Horario de Secretaría: 18:30 a 22:00 hs</p>
      </div>
      <div>
        <h4>Integración Técnica</h4>
        <p>PoC Instagram Graph API v26.0</p>
        <p>Desarrollado por el Equipo <strong>404-Solutions</strong></p>
        <p>Arquitectura modular desacoplada en Node.js ES Modules.</p>
      </div>
    </div>
    <div class="footer-bottom">
      <span>© 2026 IFTS N.° 29 — Todos los derechos reservados</span>
      <span>${posts.length} publicaciones sincronizadas en local</span>
    </div>
  </footer>

  <!-- Modal Interactivo para Probar Publicaciones -->
  <div id="testPostModal" class="modal-overlay" onclick="if(event.target===this) closeTestModal()">
    <div class="modal-card">
      <h3>🧪 Probar Publicación Manual</h3>
      <p>Probá cómo el clasificador ubica automáticamente tu publicación en el carrusel correspondiente según sus hashtags.</p>
      
      <form id="testPostForm" onsubmit="submitTestPost(event)">
        <div class="form-group">
          <label>Texto / Caption (debe incluir #novedades o #eventos):</label>
          <textarea id="testCaption" rows="3" required placeholder="Ej: Nueva jornada de robótica educativa en el IFTS 29. #eventos #talleres"></textarea>
        </div>

        <div class="form-group">
          <label>Tipo de Medio:</label>
          <select id="testMediaType" onchange="updateMediaHint()">
            <option value="IMAGE">🖼️ Imagen</option>
            <option value="VIDEO">🎬 Video</option>
          </select>
        </div>

        <div class="form-group">
          <label>¿Qué archivo multimedia querés usar?</label>
          <select id="testMediaSource" onchange="toggleUploadInput()">
            <option value="sample">🎨 Muestra predeterminada (Recomendado)</option>
            <option value="upload">📁 Subir un archivo desde mi computadora</option>
          </select>
          <span id="mediaHint" style="display:block;margin-top:6px;font-size:12px;color:var(--text-muted);">
            Se usará una gráfica institucional prediseñada del IFTS N.° 29.
          </span>
        </div>

        <div class="form-group" id="fileUploadContainer" style="display:none;">
          <label>Seleccionar archivo de tu PC (JPG, PNG o MP4):</label>
          <input type="file" id="testFileInput" accept="image/*,video/mp4" style="padding:6px;background:#f8fafc;">
        </div>

        <div class="form-actions">
          <button type="button" class="btn-secondary" onclick="closeTestModal()">Cancelar</button>
          <button type="submit" id="btnSubmitPost" class="btn-primary">Publicar y Ubicar</button>
        </div>
      </form>
    </div>
  </div>

  <!-- Toast Notification -->
  <div id="toastNotification" class="toast">
    <span id="toastIcon">✅</span>
    <span id="toastMessage">Operación realizada con éxito</span>
  </div>

  <!-- Scripts Frontend -->
  <script>
    function initCarousels() {
      document.querySelectorAll('.carousel-nav-controls').forEach(controls => {
        const prevBtn = controls.querySelector('.prev-btn');
        const nextBtn = controls.querySelector('.next-btn');
        if (!prevBtn || !nextBtn) return;

        const targetId = nextBtn.dataset.target;
        const track = document.getElementById(targetId);
        if (!track) return;

        const scrollStep = 340;

        prevBtn.addEventListener('click', () => {
          track.scrollBy({ left: -scrollStep, behavior: 'smooth' });
        });

        nextBtn.addEventListener('click', () => {
          track.scrollBy({ left: scrollStep, behavior: 'smooth' });
        });

        const updateBtnStates = () => {
          const atStart = track.scrollLeft <= 5;
          const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 5;
          prevBtn.disabled = atStart;
          nextBtn.disabled = atEnd;
        };

        track.addEventListener('scroll', updateBtnStates, { passive: true });
        updateBtnStates();
      });

      // Pausar otros videos al dar play a uno
      const videos = document.querySelectorAll('video');
      videos.forEach(vid => {
        vid.addEventListener('play', () => {
          videos.forEach(other => {
            if (other !== vid && !other.paused) other.pause();
          });
        });
      });
    }

    async function triggerSync() {
      const btn = document.getElementById('btnSync');
      const icon = btn.querySelector('.btn-icon');
      const label = btn.querySelector('.btn-text');

      btn.disabled = true;
      icon.classList.add('icon-spin');
      label.textContent = 'Sincronizando...';

      try {
        const res = await fetch('/api/sync', { method: 'POST' });
        const data = await res.json();

        if (data.success) {
          showToast('✅ ¡Feed sincronizado exitosamente con Meta!');
          setTimeout(() => window.location.reload(), 1200);
        } else {
          showToast('⚠️ Meta: ' + (data.error || 'Aviso en la sincronización'));
          btn.disabled = false;
          icon.classList.remove('icon-spin');
          label.textContent = 'Sincronizar Feed';
        }
      } catch (err) {
        showToast('❌ Error de conexión al sincronizar');
        btn.disabled = false;
        icon.classList.remove('icon-spin');
        label.textContent = 'Sincronizar Feed';
      }
    }

    function openTestModal() {
      document.getElementById('testPostModal').classList.add('open');
      updateMediaHint();
    }

    function closeTestModal() {
      document.getElementById('testPostModal').classList.remove('open');
    }

    function toggleUploadInput() {
      const src = document.getElementById('testMediaSource').value;
      const container = document.getElementById('fileUploadContainer');
      container.style.display = src === 'upload' ? 'block' : 'none';
      updateMediaHint();
    }

    function updateMediaHint() {
      const src = document.getElementById('testMediaSource').value;
      const type = document.getElementById('testMediaType').value;
      const hint = document.getElementById('mediaHint');

      if (src === 'upload') {
        hint.textContent = type === 'VIDEO'
          ? 'Subí un video en formato .mp4 desde tu computadora.'
          : 'Subí una foto en formato .jpg o .png desde tu computadora.';
      } else {
        hint.textContent = type === 'VIDEO'
          ? 'Se usará el video institucional real (.mp4 con audio y poster descargado).'
          : 'Se usará una gráfica vectorial institucional del IFTS N.° 29.';
      }
    }

    async function submitTestPost(e) {
      e.preventDefault();
      const btn = document.getElementById('btnSubmitPost');
      const caption = document.getElementById('testCaption').value;
      const mediaType = document.getElementById('testMediaType').value;
      const mediaSource = document.getElementById('testMediaSource').value;
      const fileInput = document.getElementById('testFileInput');

      btn.disabled = true;
      btn.textContent = 'Procesando...';

      let fileBase64 = null;
      let fileName = null;

      if (mediaSource === 'upload' && fileInput.files && fileInput.files.length > 0) {
        const file = fileInput.files[0];
        fileName = file.name;
        fileBase64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result;
            const base64 = result.substring(result.indexOf(',') + 1);
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      }

      try {
        const res = await fetch('/api/test-post', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ caption, mediaType, fileBase64, fileName })
        });
        const data = await res.json();
        if (data.success) {
          showToast('✅ Publicación agregada a: [' + data.categories.join(', ') + ']');
          closeTestModal();
          setTimeout(() => window.location.reload(), 1000);
        } else {
          alert('Error: ' + data.error);
          btn.disabled = false;
          btn.textContent = 'Publicar y Ubicar';
        }
      } catch (err) {
        alert('Error: ' + err.message);
        btn.disabled = false;
        btn.textContent = 'Publicar y Ubicar';
      }
    }

    function showToast(message) {
      const toast = document.getElementById('toastNotification');
      const toastMsg = document.getElementById('toastMessage');
      toastMsg.textContent = message;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 4000);
    }

    document.addEventListener('DOMContentLoaded', initCarousels);
  </script>
</body>
</html>`;
}
