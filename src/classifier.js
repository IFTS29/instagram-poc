/**
 * src/classifier.js
 * ============================================================================
 * Lógica de validación de hashtags y clasificación de publicaciones por categorías.
 * Resuelve qué pasa cuando una publicación contiene uno o múltiples hashtags.
 */

import { CONFIG } from '../config.js';

/**
 * Valida si el caption cumple la regla de negocio del hashtag.
 * - Si hay hashtags definidos en config.js, exige que contenga al menos uno de ellos.
 * - Si no hubiese lista, exige al menos un '#' cualquiera.
 */
export function matchesHashtagRule(caption, customConfig = CONFIG) {
  const categories = getPostCategories(caption, customConfig);
  return categories.length > 0;
}

/**
 * Clasifica una publicación en una o más categorías según sus hashtags.
 * 
 * REGLA ESTRICTA:
 * Si una publicación no contiene ninguno de los hashtags de las categorías
 * configuradas en config.js, devuelve un array vacío [] y NO debe entrar a la web.
 */
export function getPostCategories(caption, customConfig = CONFIG) {
  const postTags = new Set(extractHashtags(caption));
  const categories = customConfig.categories || {};
  const allowMulti = customConfig.allowMultiCategory !== false; // true por defecto
  const matched = [];

  for (const [catKey, catConfig] of Object.entries(categories)) {
    const targetTags = (catConfig.hashtags || []).map(t => {
      const trimmed = t.trim().toLowerCase();
      return trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
    });

    if (targetTags.some(tag => postTags.has(tag))) {
      matched.push(catKey);
      if (!allowMulti) {
        break; // Toma solo la primera categoría encontrada
      }
    }
  }

  // REGLA ESTRICTA: Sin fallback automático a 'novedades'.
  // Si no coincide con ninguna categoría, devuelve [] y queda descartada.
  return matched;
}

/**
 * Valida si una publicación cumple con el filtro de fecha configurado.
 * Permite descartar publicaciones con más de X días de antigüedad o anteriores a una fecha.
 */
export function matchesDateRule(timestamp, customConfig = CONFIG) {
  const filter = customConfig.dateFilter;
  if (!filter || !filter.enabled) return true;
  if (!timestamp) return true;

  const postDate = new Date(timestamp);
  if (isNaN(postDate.getTime())) return true;

  // 1. Antigüedad máxima en días (ej. 90 días)
  if (filter.maxDaysOld && filter.maxDaysOld > 0) {
    const now = new Date();
    const diffMs = now.getTime() - postDate.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    if (diffDays > filter.maxDaysOld) {
      return false; // Descartado por antigüedad
    }
  }

  // 2. Fecha mínima estricta (ej. '2026-01-01')
  if (filter.sinceDate) {
    const min = new Date(filter.sinceDate);
    if (!isNaN(min.getTime()) && postDate < min) {
      return false; // Descartado por ser anterior a la fecha mínima
    }
  }

  return true;
}

/**
 * Extrae todos los hashtags presentes en un texto
 */
export function extractHashtags(caption) {
  if (!caption) return [];
  const matches = caption.match(/#[\p{L}\p{N}_]+/gu);
  return matches ? matches.map(t => t.toLowerCase()) : [];
}
