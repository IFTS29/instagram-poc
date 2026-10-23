/**
 * src/meta.js
 * ============================================================================
 * Cliente y sincronizador con Meta Graph API v26.0
 * (Solo se ejecuta si se dispone de credenciales en .env).
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { CONFIG } from '../config.js';
import { matchesHashtagRule, getPostCategories, matchesDateRule } from './classifier.js';
import { DATA_FILE, IMAGES_DIR, saveFeed, loadFeed, getMockFeedData, loadDeletedPostIds } from './feed.js';

export async function refreshLongLivedToken(token) {
  console.log('\n[🔄] Solicitando renovación del Long-Lived Token a Meta...');
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;

  if (!appId || !appSecret) {
    console.error('[-] Para renovar en graph.facebook.com necesitas definir META_APP_ID y META_APP_SECRET en el .env');
    return;
  }

  const refreshUrl = `https://graph.facebook.com/v26.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${token}`;

  try {
    const res = await fetch(refreshUrl);
    const data = await res.json();

    if (!res.ok || data.error) {
      console.error('[-] Error al renovar el token:', data.error?.message || data);
      return;
    }

    const daysLeft = Math.floor((data.expires_in || 0) / 86400);
    console.log('[✅] ¡Token renovado con éxito!');
    console.log(`     Nuevo token: ${data.access_token}`);
    console.log(`     Vigencia restante: ${daysLeft} días (${data.expires_in} segundos)`);
    console.log('     Recuerda actualizar tu archivo .env con este nuevo token.\n');
  } catch (err) {
    console.error('[-] Error de red al renovar token:', err.message);
  }
}

export async function downloadMediaFile(mediaUrl, filename) {
  if (!mediaUrl) return null;
  const filePath = path.join(IMAGES_DIR, filename);

  try {
    try {
      await fs.access(filePath);
      return `images/${filename}`;
    } catch {
      // Proceder a descargar si no existe
    }

    const res = await fetch(mediaUrl, {
      headers: { 'User-Agent': 'IFTS29-Instagram-PoC/1.0' }
    });

    if (!res.ok) {
      throw new Error(`Status ${res.status}: ${res.statusText}`);
    }

    const arrayBuffer = await res.arrayBuffer();
    await fs.writeFile(filePath, Buffer.from(arrayBuffer));
    return `images/${filename}`;
  } catch (err) {
    console.warn(`[!] Advertencia: No se pudo descargar ${filename}: ${err.message}`);
    return null;
  }
}

export async function fetchInstagramFeed() {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  const accountId = process.env.INSTAGRAM_ACCOUNT_ID;
  const limit = parseInt(CONFIG.limit || '20', 10);

  if (!token || token === 'tu_token_de_larga_duracion_aqui') {
    console.warn('\n===============================================================');
    console.warn('[!] AVISO: No se encontró INSTAGRAM_ACCESS_TOKEN válido en .env');
    console.warn('    Operando con datos locales / modo prueba.');
    console.warn('===============================================================\n');
    const existing = await loadFeed();
    return { success: true, count: existing.length, posts: existing };
  }

  if (!accountId) {
    console.error('[-] Falta definir INSTAGRAM_ACCOUNT_ID en el archivo .env');
    return { success: false, error: 'Falta INSTAGRAM_ACCOUNT_ID' };
  }

  console.log('\n===============================================================');
  console.log('  SINCRONIZANDO CON INSTAGRAM GRAPH API (Meta Graph API v26.0)');
  console.log(`  Cuenta ID: ${accountId}`);
  console.log('===============================================================\n');

  try {
    const profileUrl = `https://graph.facebook.com/v26.0/${accountId}?fields=id,username,name&access_token=${token}`;
    const profileRes = await fetch(profileUrl);
    const profile = await profileRes.json();

    if (!profileRes.ok || profile.error) {
      console.warn('[!] Advertencia de cuenta en Meta (posible revisión preventiva):', profile.error?.message);
      console.log('[i] Se preservan los datos locales de la última sincronización.\n');
      const existing = await loadFeed();
      return { success: false, error: profile.error?.message, posts: existing };
    }

    console.log(`[👤] Conectado: @${profile.username || 'N/A'} (ID: ${profile.id})`);
  } catch (err) {
    console.warn('[-] Advertencia al consultar perfil:', err.message);
  }

  const fields = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp';
  const batchSize = Math.max(limit, 25);
  let nextUrl = `https://graph.facebook.com/v26.0/${accountId}/media?fields=${fields}&limit=${batchSize}&access_token=${token}`;

  await fs.mkdir(IMAGES_DIR, { recursive: true });
  const feedResults = [];
  const deletedIds = await loadDeletedPostIds();
  let pageCount = 0;
  const MAX_PAGES = 10;

  try {
    while (nextUrl && feedResults.length < limit && pageCount < MAX_PAGES) {
      pageCount++;
      const res = await fetch(nextUrl);
      const result = await res.json();

      if (!res.ok || result.error) {
        console.error('[❌] Error devuelto por Meta Graph API:', result.error?.message);
        break;
      }

      const posts = result.data || [];
      if (posts.length === 0) break;

      for (const post of posts) {
        // Validación de lista de exclusión (moderación de descartados)
        if (deletedIds.includes(String(post.id))) {
          console.log(`  🚫 Post ID ${post.id} IGNORADO (marcado como descartado en el archivo de exclusión)`);
          continue;
        }

        const caption = post.caption || '';
        const categories = getPostCategories(caption);

        if (categories.length === 0) {
          console.log(`  ⏭️ Post ID ${post.id} DESCARTADO (no pertenece a ninguna categoría configurada)`);
          continue;
        }

        // Validación de fecha (si el filtro está activado en config.js)
        if (!matchesDateRule(post.timestamp)) {
          console.log(`  ⏭️ Post ID ${post.id} DESCARTADO (supera el límite de antigüedad permitido)`);
          continue;
        }

        if (post.media_type === 'VIDEO') {
          const localThumb = await downloadMediaFile(post.thumbnail_url, `${post.id}_thumb.jpg`);
          const localVideo = await downloadMediaFile(post.media_url, `${post.id}.mp4`);

          feedResults.push({
            id: post.id,
            caption,
            mediaType: 'VIDEO',
            permalink: post.permalink,
            timestamp: post.timestamp,
            localThumbnail: localThumb,
            localVideo: localVideo,
            categories
          });
        } else {
          const localImg = await downloadMediaFile(post.media_url, `${post.id}.jpg`);

          feedResults.push({
            id: post.id,
            caption,
            mediaType: post.media_type || 'IMAGE',
            permalink: post.permalink,
            timestamp: post.timestamp,
            localImage: localImg,
            categories
          });
        }

        if (feedResults.length >= limit) break;
      }

      nextUrl = result.paging?.next || null;
    }

    // FUSIÓN ACUMULATIVA (Merge inteligente):
    // Conserva publicaciones previas locales y agrega/actualiza las nuevas de Meta.
    const existingPosts = await loadFeed();
    const validExisting = existingPosts.filter(p => !deletedIds.includes(String(p.id)));

    // IDs devueltos por Meta en este fetch para actualizar o anteponer
    const newIds = new Set(feedResults.map(p => String(p.id)));

    // Combinar: lo nuevo de Meta primero, seguido de las publicaciones locales que no vinieron en este lote
    const mergedPosts = [
      ...feedResults,
      ...validExisting.filter(p => !newIds.has(String(p.id)))
    ];

    if (mergedPosts.length > 0) {
      await saveFeed(mergedPosts);
      console.log(`[✅] Sincronización exitosa: ${mergedPosts.length} publicaciones activas (${feedResults.length} de Meta, ${mergedPosts.length - feedResults.length} locales preservadas).`);
      return { success: true, count: mergedPosts.length, newCount: feedResults.length, posts: mergedPosts };
    } else {
      console.warn('[!] Meta no devolvió publicaciones nuevas con los hashtags configurados. Se preserva el feed local.');
      const existing = await loadFeed();
      return { success: true, count: existing.length, posts: existing, notice: 'Sin publicaciones nuevas' };
    }
  } catch (err) {
    console.error('[-] Error durante la sincronización:', err.message);
    const existing = await loadFeed();
    return { success: false, error: err.message, posts: existing };
  }
}
