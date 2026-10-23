/**
 * index.js - PoC de integración con Instagram Graph API
 * ======================================================
 * Proyecto: IFTS N.° 2 - Renovación Web
 * Equipo: 404-Solutions
 *
 * Soporta:
 *  - Ejecución por demanda vía Endpoint HTTP / Botón web (`GET /api/sync` o botón en `GET /`).
 *  - Ejecución programada periódica en segundo plano (`SYNC_INTERVAL_MINUTES`).
 *  - Ejecución única por CLI (`--sync-only`).
 *  - Renovación de token (`--refresh`).
 *  - Filtro estricto: SOLO publicaciones con hashtag van a la web.
 *  - Soporte completo para Imágenes (`IMAGE`) y Videos (`VIDEO`).
 */

import fs from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import http from 'node:http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const IMAGES_DIR = path.join(__dirname, 'images');
const DATA_FILE = path.join(__dirname, 'data', 'instagram-feed.json');

// -----------------------------------------------------------------------------
// Función para renovar token de 60 días
// -----------------------------------------------------------------------------
async function refreshLongLivedToken(token) {
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

// -----------------------------------------------------------------------------
// Función para descargar archivos binarios (imágenes y videos)
// -----------------------------------------------------------------------------
async function downloadMediaFile(mediaUrl, filename) {
  if (!mediaUrl) return null;
  const filePath = path.join(IMAGES_DIR, filename);

  try {
    // Si el archivo ya existe localmente, se reutiliza
    try {
      await fs.access(filePath);
      return `images/${filename}`;
    } catch {
      // No existe, proceder a descargarlo
    }

    const res = await fetch(mediaUrl, {
      headers: { 'User-Agent': 'IFTS2-Instagram-PoC/1.0' }
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

// -----------------------------------------------------------------------------
// Regla estricta de validación de hashtag
// -----------------------------------------------------------------------------
function matchesHashtagRule(caption, targetHashtag) {
  const text = (caption || '').toLowerCase();

  // Si se configuró un hashtag específico en el .env (ej: #test o #IFTSEventos)
  if (targetHashtag) {
    return text.includes(targetHashtag);
  }

  // REGLA DE NEGOCIO OBLIGATORIA:
  // Si no se configuró un hashtag específico, SOLO pasan posts que contengan al menos un '#'
  return /#[\p{L}\p{N}_]+/u.test(text) || text.includes('#');
}

// -----------------------------------------------------------------------------
// Función principal de sincronización
// -----------------------------------------------------------------------------
async function fetchInstagramFeed() {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  const accountId = process.env.INSTAGRAM_ACCOUNT_ID;
  const targetHashtag = (process.env.INSTAGRAM_HASHTAG || '').trim().toLowerCase();
  const limit = parseInt(process.env.INSTAGRAM_LIMIT || '12', 10);

  // Verificación de token
  if (!token || token === 'tu_token_de_larga_duracion_aqui') {
    console.warn('\n===============================================================');
    console.warn('[!] AVISO: No se encontró INSTAGRAM_ACCESS_TOKEN en el archivo .env');
    console.warn('    Para conectar con la API real, configura tus variables en .env');
    console.warn('===============================================================\n');
    return runMockMode();
  }

  if (!accountId) {
    console.error('[-] Falta definir INSTAGRAM_ACCOUNT_ID en el archivo .env');
    return { success: false, error: 'Falta INSTAGRAM_ACCOUNT_ID' };
  }

  console.log('\n===============================================================');
  console.log('  SINCRONIZANDO CON INSTAGRAM GRAPH API (Meta Graph API v26.0)');
  console.log(`  Cuenta ID      : ${accountId}`);
  console.log(`  Regla filtro   : ${targetHashtag ? `Hashtag específico "${targetHashtag}"` : 'Obligatorio: debe contener hashtag (#)'}`);
  console.log(`  Límite pedido  : ${limit} posts`);
  console.log('===============================================================\n');

  // 1. Verificación previa de conexión con la cuenta comercial
  try {
    const profileUrl = `https://graph.facebook.com/v26.0/${accountId}?fields=id,username,name&access_token=${token}`;
    const profileRes = await fetch(profileUrl);
    const profile = await profileRes.json();

    if (!profileRes.ok || profile.error) {
      console.error('[❌] Error de autenticación con la cuenta de Instagram:');
      console.error(`     Código : ${profile.error?.code}`);
      console.error(`     Mensaje: ${profile.error?.message}`);
      return { success: false, error: profile.error?.message };
    }

    console.log(`[👤] Cuenta conectada: @${profile.username || 'N/A'}${profile.name ? ` (${profile.name})` : ''} (ID: ${profile.id})`);
  } catch (err) {
    console.warn('[-] Advertencia al consultar perfil:', err.message);
  }

  // 2. Consulta de publicaciones con paginación
  const fields = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp';
  const batchSize = Math.max(limit, 25);
  let nextUrl = `https://graph.facebook.com/v26.0/${accountId}/media?fields=${fields}&limit=${batchSize}&access_token=${token}`;

  await fs.mkdir(IMAGES_DIR, { recursive: true });
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });

  const feedResults = [];
  let pageCount = 0;
  const MAX_PAGES = 10;

  try {
    while (nextUrl && feedResults.length < limit && pageCount < MAX_PAGES) {
      pageCount++;
      const res = await fetch(nextUrl);
      const result = await res.json();

      if (!res.ok || result.error) {
        console.error('[❌] Error devuelto por Meta Graph API:');
        console.error(`     Mensaje: ${result.error?.message}\n`);
        break;
      }

      const posts = result.data || [];
      if (posts.length === 0) break;

      console.log(`[🔍] Analizando lote ${pageCount} (${posts.length} publicaciones de la cuenta)...`);

      for (const post of posts) {
        const caption = post.caption || '';

        // VALIDACIÓN ESTRICTA: ¿Cumple con la regla de negocio del hashtag?
        if (!matchesHashtagRule(caption, targetHashtag)) {
          console.log(`  ⏭️ Post ID ${post.id} DESCARTADO (no contiene el hashtag requerido)`);
          continue;
        }

        // Procesar según el tipo de medio (IMAGE o VIDEO)
        if (post.media_type === 'VIDEO') {
          console.log(`  🎬 Post ID ${post.id} (VIDEO) aceptado. Descargando video y miniatura...`);
          const localThumb = await downloadMediaFile(post.thumbnail_url, `${post.id}_thumb.jpg`);
          const localVideo = await downloadMediaFile(post.media_url, `${post.id}.mp4`);

          feedResults.push({
            id: post.id,
            caption: caption,
            mediaType: 'VIDEO',
            permalink: post.permalink,
            timestamp: post.timestamp,
            localThumbnail: localThumb,
            localVideo: localVideo,
            videoUrl: post.media_url,
            thumbnailUrl: post.thumbnail_url
          });
        } else {
          console.log(`  🖼️ Post ID ${post.id} (IMAGEN) aceptado. Descargando imagen...`);
          const localImg = await downloadMediaFile(post.media_url, `${post.id}.jpg`);

          feedResults.push({
            id: post.id,
            caption: caption,
            mediaType: post.media_type,
            permalink: post.permalink,
            timestamp: post.timestamp,
            localImage: localImg,
            imageUrl: post.media_url
          });
        }

        if (feedResults.length >= limit) {
          break;
        }
      }

      nextUrl = result.paging?.next || null;
    }

    console.log(`\n[+] Total de publicaciones que cumplieron la regla: ${feedResults.length}`);

    // Guardar en feed.json
    await fs.writeFile(DATA_FILE, JSON.stringify(feedResults, null, 2), 'utf-8');
    console.log(`[✅] Feed guardado en: ${path.relative(__dirname, DATA_FILE)}`);
    console.log(`[✅] Archivos almacenados en: ${path.relative(__dirname, IMAGES_DIR)}/\n`);

    // Mostrar tabla resumen
    if (feedResults.length > 0) {
      console.table(
        feedResults.map(p => ({
          ID: p.id,
          Tipo: p.mediaType,
          Fecha: p.timestamp ? p.timestamp.substring(0, 10) : 'N/A',
          Archivo: p.mediaType === 'VIDEO' ? (p.localVideo ? 'Video MP4' : 'Fallo') : (p.localImage ? 'Imagen JPG' : 'Fallo'),
          Miniatura: p.mediaType === 'VIDEO' ? (p.localThumbnail ? 'JPG' : 'No') : 'N/A',
          Texto: (p.caption || '').substring(0, 35) + '...'
        }))
      );
    } else {
      console.warn('[!] Ninguna publicación cumplió la regla del hashtag.');
    }

    return { success: true, count: feedResults.length, posts: feedResults };
  } catch (err) {
    console.error('[-] Error crítico al sincronizar feed:', err.message);
    return { success: false, error: err.message };
  }
}

// -----------------------------------------------------------------------------
// Modo Simulación (Mock)
// -----------------------------------------------------------------------------
async function runMockMode() {
  const mockData = [
    {
      id: 'mock_179001',
      caption: 'Clase especial de enología y maridaje. #IFTSEventos',
      mediaType: 'IMAGE',
      permalink: 'https://instagram.com/p/mock1',
      timestamp: new Date().toISOString(),
      localImage: 'images/mock_sample.jpg'
    }
  ];

  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(mockData, null, 2), 'utf-8');
  console.log(`[✅] Feed simulado generado en: ${path.relative(__dirname, DATA_FILE)}`);
  return { success: true, count: mockData.length, posts: mockData };
}

// -----------------------------------------------------------------------------
// Servidor HTTP Local (Permite sincronizar por botón y exponer API)
// -----------------------------------------------------------------------------
function startHttpServer(port = 3000) {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);

    // CORS básico para permitir consumirlo desde el sitio web
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      return res.end();
    }

    // 1. Endpoint para ejecutar sincronización (por POST o GET al hacer click en un botón)
    if (url.pathname === '/api/sync') {
      console.log(`\n[⚡] Petición de sincronización recibida desde ${req.socket.remoteAddress}`);
      const result = await fetchInstagramFeed();
      res.writeHead(result.success ? 200 : 500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(result));
    }

    // 2. Endpoint para consultar el JSON del feed guardado
    if (url.pathname === '/api/feed') {
      try {
        const content = await fs.readFile(DATA_FILE, 'utf-8');
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(content);
      } catch {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Feed no generado aún' }));
      }
    }

    // 3. Servir archivos estáticos de /images/
    if (url.pathname.startsWith('/images/')) {
      const filename = path.basename(url.pathname);
      const filePath = path.join(IMAGES_DIR, filename);

      try {
        await fs.access(filePath);
        const ext = path.extname(filename).toLowerCase();
        const mimeTypes = {
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.png': 'image/png',
          '.mp4': 'video/mp4'
        };

        res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
        return createReadStream(filePath).pipe(res);
      } catch {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        return res.end('Archivo no encontrado');
      }
    }

    // 4. Panel Web interactivo con botón "Sincronizar Ahora"
    if (url.pathname === '/') {
      let currentFeed = [];
      try {
        const raw = await fs.readFile(DATA_FILE, 'utf-8');
        currentFeed = JSON.parse(raw);
      } catch {}

      const postsHtml = currentFeed.map(p => `
        <div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.08);display:flex;flex-direction:column;">
          <div style="background:#000;display:flex;align-items:center;justify-content:center;height:240px;overflow:hidden;">
            ${p.mediaType === 'VIDEO'
              ? `<video controls style="width:100%;height:100%;object-fit:cover;" poster="/${p.localThumbnail || ''}">
                   <source src="/${p.localVideo || ''}" type="video/mp4">
                   Tu navegador no soporta video MP4.
                 </video>`
              : `<img src="/${p.localImage || ''}" style="width:100%;height:100%;object-fit:cover;" alt="Post" />`
            }
          </div>
          <div style="padding:16px;flex:1;display:flex;flex-direction:column;justify-content:space-between;">
            <div>
              <span style="display:inline-block;padding:3px 8px;border-radius:6px;font-size:12px;font-weight:bold;margin-bottom:8px;background:${p.mediaType === 'VIDEO' ? '#e0f2fe;color:#0369a1' : '#fef3c7;color:#b45309'};">
                ${p.mediaType === 'VIDEO' ? '🎬 VIDEO' : '🖼️ IMAGEN'}
              </span>
              <p style="margin:0 0 12px 0;font-size:14px;color:#334155;line-height:1.5;">${(p.caption || '').replace(/\n/g, '<br>')}</p>
            </div>
            <div style="border-top:1px solid #f1f5f9;padding-top:10px;display:flex;justify-content:space-between;align-items:center;font-size:12px;color:#94a3b8;">
              <span>${p.timestamp ? p.timestamp.substring(0, 10) : ''}</span>
              <a href="${p.permalink}" target="_blank" style="color:#2563eb;text-decoration:none;font-weight:600;">Ver en Instagram ↗</a>
            </div>
          </div>
        </div>
      `).join('');

      const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>IFTS N.° 2 - Sincronizador de Feed</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background:#f8fafc; color:#0f172a; margin:0; padding:24px; }
    .container { max-width: 1000px; margin: 0 auto; }
    .header { background:#fff; padding: 24px; border-radius: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); margin-bottom: 24px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px; }
    .btn { background: #2563eb; color: #fff; border:none; padding: 12px 24px; border-radius: 10px; font-size: 15px; font-weight: 600; cursor: pointer; transition: background 0.2s; display:inline-flex; align-items:center; gap:8px; }
    .btn:hover { background: #1d4ed8; }
    .btn:disabled { background: #94a3b8; cursor: not-allowed; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
    .status-badge { background:#dcfce7; color:#15803d; padding:4px 10px; border-radius:20px; font-size:13px; font-weight:bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <h1 style="margin:0 0 6px 0;font-size:22px;">IFTS N.° 2 — Sincronizador de Feed</h1>
        <p style="margin:0;color:#64748b;font-size:14px;">Solo publicaciones que cumplan la regla del hashtag van a la web.</p>
      </div>
      <div>
        <button id="btnSync" class="btn" onclick="triggerSync()">🔄 Sincronizar Ahora (Click)</button>
      </div>
    </div>

    <div style="margin-bottom: 16px; display:flex; justify-content:space-between; align-items:center;">
      <span class="status-badge">Total en la web: ${currentFeed.length} publicación(es)</span>
      <span style="font-size:13px;color:#64748b;">Endpoint disponible: <code>/api/sync</code></span>
    </div>

    <div class="grid">
      ${postsHtml || '<div style="grid-column: 1/-1; background:#fff; padding:40px; border-radius:12px; text-align:center; color:#64748b;">No hay publicaciones con el hashtag requerido aún. Haz clic en "Sincronizar Ahora".</div>'}
    </div>
  </div>

  <script>
    async function triggerSync() {
      const btn = document.getElementById('btnSync');
      btn.disabled = true;
      btn.innerText = '⏳ Sincronizando con Meta...';
      try {
        const res = await fetch('/api/sync', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          window.location.reload();
        } else {
          alert('Error: ' + (data.error || 'No se pudo sincronizar'));
          btn.disabled = false;
          btn.innerText = '🔄 Sincronizar Ahora (Click)';
        }
      } catch (err) {
        alert('Error de conexión: ' + err.message);
        btn.disabled = false;
        btn.innerText = '🔄 Sincronizar Ahora (Click)';
      }
    }
  </script>
</body>
</html>`;

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(html);
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Ruta no encontrada');
  });

  server.listen(port, () => {
    console.log(`\n===============================================================`);
    console.log(`  [🌐] SERVIDOR ACTIVO EN: http://localhost:${port}`);
    console.log(`  [🖱️] Panel con botón web  : http://localhost:${port}/`);
    console.log(`  [⚡] Endpoint de botón/API: POST http://localhost:${port}/api/sync`);
    console.log(`  [📦] Endpoint de datos JSON: GET http://localhost:${port}/api/feed`);
    console.log(`===============================================================\n`);
  });

  return server;
}

// -----------------------------------------------------------------------------
// Punto de Entrada Principal
// -----------------------------------------------------------------------------
const isRefreshCommand = process.argv.includes('--refresh');
const isSyncOnlyCommand = process.argv.includes('--sync-only');
const port = parseInt(process.env.PORT || '3000', 10);
const syncIntervalMinutes = parseInt(process.env.SYNC_INTERVAL_MINUTES || '0', 10);

if (isRefreshCommand) {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!token) {
    console.error('[-] Debes definir INSTAGRAM_ACCESS_TOKEN en el archivo .env para renovarlo.');
    process.exit(1);
  }
  await refreshLongLivedToken(token);
} else if (isSyncOnlyCommand) {
  // Modo CLI directo: solo sincroniza una vez y termina
  await fetchInstagramFeed();
} else {
  // Modo Principal: ejecuta sincronización inicial y levanta el servidor web con botón
  console.log('[*] Iniciando servicio de feed de Instagram...');
  await fetchInstagramFeed();

  // Iniciar servidor local para habilitar el botón y los endpoints
  startHttpServer(port);

  // Iniciar temporizador si se configuró intervalo automático
  if (syncIntervalMinutes > 0) {
    console.log(`[⏱️] Sincronización automática activada: se ejecutará cada ${syncIntervalMinutes} minutos.`);
    setInterval(async () => {
      console.log(`\n[⏱️] Ejecutando sincronización periódica (${new Date().toLocaleTimeString()})...`);
      await fetchInstagramFeed();
    }, syncIntervalMinutes * 60 * 1000);
  }
}
