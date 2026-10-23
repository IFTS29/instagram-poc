/**
 * src/feed.js
 * ============================================================================
 * Gestión de almacenamiento y persistencia del feed en JSON.
 * Maneja lectura, escritura segura, regeneración ante borrados y agregados manuales.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONFIG } from '../config.js';
import { getPostCategories, matchesHashtagRule, matchesDateRule } from './classifier.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

export const DATA_FILE = path.join(ROOT_DIR, 'data', 'instagram-feed.json');
export const DELETED_FILE = path.join(ROOT_DIR, 'data', 'deleted-posts.json');
export const IMAGES_DIR = path.join(ROOT_DIR, 'images');

/**
 * Carga los IDs de las publicaciones que el administrador eliminó explícitamente.
 * Estas publicaciones quedan en la "lista negra" y Meta jamás las vuelve a agregar.
 */
export async function loadDeletedPostIds() {
  try {
    const raw = await fs.readFile(DELETED_FILE, 'utf-8');
    const data = JSON.parse(raw);
    if (Array.isArray(data)) {
      return data.map(item => (typeof item === 'object' && item !== null && item.id ? String(item.id) : String(item)));
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Registra una publicación en el archivo de descartados/exclusión.
 * Guarda metadata de cuándo y qué se descartó para registro de auditoría.
 */
export async function registerDeletedPostId(id, postDetails = null) {
  if (!id) return;
  const targetId = String(id);
  let records = [];
  try {
    const raw = await fs.readFile(DELETED_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) records = parsed;
  } catch {}

  const exists = records.some(item => (typeof item === 'object' && item !== null ? String(item.id) : String(item)) === targetId);
  if (!exists) {
    records.push({
      id: targetId,
      discardedAt: new Date().toISOString(),
      caption: postDetails?.caption || '',
      mediaType: postDetails?.mediaType || ''
    });
    await fs.mkdir(path.dirname(DELETED_FILE), { recursive: true });
    await fs.writeFile(DELETED_FILE, JSON.stringify(records, null, 2), 'utf-8');
  }
}

/**
 * Elimina/descarta explícitamente una publicación por su ID.
 * - La remueve del feed activo.
 * - Registra sus datos en data/deleted-posts.json para que futuras sincronizaciones la ignoren permanentemente.
 */
export async function deletePostById(id) {
  const posts = await loadFeed();
  const targetId = String(id);
  const targetPost = posts.find(p => String(p.id) === targetId);
  const remaining = posts.filter(p => String(p.id) !== targetId);

  // Registrar en archivo de exclusión permanente
  await registerDeletedPostId(targetId, targetPost);

  // Guardar feed actualizado sin esa publicación
  await saveFeed(remaining);
  console.log(`[🗑️] Publicación ID ${targetId} descartada por el administrador y registrada en lista de exclusión.`);
  return { success: true, deletedId: targetId, remainingCount: remaining.length };
}

/**
 * Genera el conjunto de datos de prueba enriquecido (Mock Mode)
 */
export function getMockFeedData() {
  return [
    {
      id: '18081732734367202',
      caption: 'Prueba técnica de sincronización multimedia en la plataforma web del IFTS N.° 29. Conectando la institución con la comunidad a través de Instagram Graph API. #test #novedades #institucional',
      mediaType: 'VIDEO',
      permalink: 'https://www.instagram.com/reel/De0lwBIPlA6/',
      timestamp: '2026-10-23T03:27:07+0000',
      localThumbnail: 'images/18081732734367202_thumb.jpg',
      localVideo: 'images/18081732734367202.mp4',
      categories: ['novedades']
    },
    {
      id: 'mock_novedad_002',
      caption: '¡Inscripciones abiertas para el ciclo lectivo 2026! 🎓 Tecnicatura Superior en Desarrollo de Software. Educación superior pública, gratuita y con titulación oficial en la Ciudad de Buenos Aires. ¡Vení a formar parte del IFTS N.° 29! #novedades #inscripciones #institucional',
      mediaType: 'IMAGE',
      permalink: 'https://www.instagram.com/p/mock_inscripciones/',
      timestamp: '2026-10-22T15:00:00+0000',
      localImage: 'images/mock_inscripciones.svg',
      categories: ['novedades']
    },
    {
      id: 'mock_novedad_003',
      caption: 'Masterclass abierta: "Inteligencia Artificial en el Desarrollo de Software Moderno" 🤖 Abordaremos modelos generativos, agentes autónomos y herramientas para potenciar la productividad profesional. Jueves 19 hs en el Aula Magna. #novedades #comunicado',
      mediaType: 'IMAGE',
      permalink: 'https://www.instagram.com/p/mock_ia/',
      timestamp: '2026-10-20T18:30:00+0000',
      localImage: 'images/mock_ia.svg',
      categories: ['novedades']
    },
    {
      id: 'mock_evento_001',
      caption: 'Llega la 4ta edición del Torneo de Programación & Hackathon estudiantil organizado por 404-Solutions y el IFTS N.° 29 🚀 48 horas continuas de resolución de desafíos, mentorías con profesionales del sector y premios para los mejores proyectos. ¡Anotá a tu equipo! #eventos #hackathon #estudiantes',
      mediaType: 'IMAGE',
      permalink: 'https://www.instagram.com/p/mock_hackathon/',
      timestamp: '2026-10-18T20:00:00+0000',
      localImage: 'images/mock_hackathon.svg',
      categories: ['eventos']
    },
    {
      id: 'mock_evento_002',
      caption: 'Taller extracurricular intensivo: "Git & GitHub para Trabajo en Equipo" 💻 Aprendé flujos de trabajo reales: Gitflow, ramas de features, Pull Requests, Code Review y resolución de conflictos como en las mejores empresas. #eventos #talleres #estudiantes',
      mediaType: 'IMAGE',
      permalink: 'https://www.instagram.com/p/mock_git/',
      timestamp: '2026-10-15T19:00:00+0000',
      localImage: 'images/mock_git.svg',
      categories: ['eventos']
    },
    {
      id: 'mock_evento_003',
      caption: 'Invitación especial a la Muestra Anual de Proyectos de Software del IFTS N.° 29 ✨ Nuestros estudiantes de 2do y 3er año exponen sus sistemas, aplicaciones móviles y desarrollos web ante la comunidad y empresas de la industria. ¡Entrada libre y gratuita! #eventos #comunidad',
      mediaType: 'IMAGE',
      permalink: 'https://www.instagram.com/p/mock_muestra/',
      timestamp: '2026-10-10T17:30:00+0000',
      localImage: 'images/mock_muestra.svg',
      categories: ['eventos']
    }
  ];
}

/**
 * Lee el feed persistido. Si no existe, lo regenera con el dataset inicial.
 * Filtra automáticamente cualquier publicación que esté en la lista de exclusión.
 */
export async function loadFeed() {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf-8');
    const posts = JSON.parse(raw);
    if (!Array.isArray(posts)) return [];
    const deletedIds = await loadDeletedPostIds();
    return posts.filter(p => !deletedIds.includes(String(p.id)));
  } catch {
    console.log('[*] Archivo data/instagram-feed.json no encontrado. Regenerando con datos de prueba...');
    const initialData = getMockFeedData();
    await saveFeed(initialData);
    return initialData;
  }
}

/**
 * Guarda el feed en data/instagram-feed.json
 * - Ordena cronológicamente de más reciente a más antiguo.
 * - Limita estrictamente al tope configurado (ej. 20 posts).
 *   Si llega una publicación nueva, entra en el puesto 1 y la 21 se descarta.
 */
export async function saveFeed(posts) {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.mkdir(IMAGES_DIR, { recursive: true });

  const limit = parseInt(CONFIG.limit || '20', 10);

  // Ordenar siempre por fecha descendente
  const sorted = [...posts].sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));

  // Acotar al límite máximo configurado
  const trimmed = sorted.slice(0, limit);

  await fs.writeFile(DATA_FILE, JSON.stringify(trimmed, null, 2), 'utf-8');
}

/**
 * Agrega una publicación manual o de prueba para testing.
 * Permite usar imágenes/videos de muestra o subir archivos reales.
 */
export async function addCustomPost({
  caption,
  mediaType = 'IMAGE',
  sourceImagePath,
  fileBuffer,
  fileExtension,
  permalink
}) {
  const categories = getPostCategories(caption);
  if (categories.length === 0) {
    throw new Error('La publicación no pertenece a ninguna de las categorías configuradas (#novedades o #eventos).');
  }

  const posts = await loadFeed();
  const id = `test_${Date.now()}`;
  const type = mediaType.toUpperCase();

  let localMedia = null;
  let localThumb = null;

  // 1. Si se subió un archivo vía web (Buffer)
  if (fileBuffer) {
    const ext = fileExtension || (type === 'VIDEO' ? '.mp4' : '.jpg');
    const filename = `${id}${ext}`;
    const destPath = path.join(IMAGES_DIR, filename);
    await fs.writeFile(destPath, fileBuffer);
    localMedia = `images/${filename}`;
    if (type === 'VIDEO') {
      localThumb = 'images/18081732734367202_thumb.jpg';
    }
  }
  // 2. Si se pasó una ruta local desde la consola CLI
  else if (sourceImagePath) {
    try {
      const ext = path.extname(sourceImagePath) || (type === 'VIDEO' ? '.mp4' : '.jpg');
      const filename = `${id}${ext}`;
      const destPath = path.join(IMAGES_DIR, filename);
      await fs.copyFile(sourceImagePath, destPath);
      localMedia = `images/${filename}`;
      if (type === 'VIDEO') {
        localThumb = 'images/18081732734367202_thumb.jpg';
      }
    } catch (err) {
      console.warn(`[!] No se pudo copiar el archivo fuente (${err.message}). Usando muestra.`);
    }
  }

  // 3. Si no se subió archivo, usar las muestras institucionales reales existentes
  if (!localMedia) {
    if (type === 'VIDEO') {
      localMedia = 'images/18081732734367202.mp4';
      localThumb = 'images/18081732734367202_thumb.jpg';
    } else {
      // Elegir muestra según la categoría
      localMedia = categories.includes('eventos')
        ? 'images/mock_hackathon.svg'
        : 'images/mock_inscripciones.svg';
    }
  }

  const newPost = {
    id,
    caption,
    mediaType: type,
    permalink: permalink || 'https://www.instagram.com/clinica.meelar/',
    timestamp: new Date().toISOString(),
    categories
  };

  if (type === 'VIDEO') {
    newPost.localVideo = localMedia;
    newPost.localThumbnail = localThumb || 'images/18081732734367202_thumb.jpg';
  } else {
    newPost.localImage = localMedia;
  }

  // Insertar al inicio para que aparezca primero en el carrusel
  posts.unshift(newPost);
  await saveFeed(posts);

  return { post: newPost, total: posts.length, categories };
}
