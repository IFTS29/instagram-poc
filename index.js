/**
 * index.js - PoC de integración con Instagram Graph API
 * ======================================================
 * Proyecto: IFTS N.° 2 - Renovación Web
 * Equipo: 404-Solutions
 *
 * Utiliza Node.js 18+ nativo (fetch, fs/promises, --env-file).
 * Cero dependencias externas requeridas.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const IMAGES_DIR = path.join(__dirname, 'images');
const DATA_FILE = path.join(__dirname, 'data', 'instagram-feed.json');

// -----------------------------------------------------------------------------
// Función para renovar token de 60 días
// -----------------------------------------------------------------------------
async function refreshLongLivedToken(token) {
  console.log('\n[🔄] Solicitando renovación del Long-Lived Token a Meta...');
  const refreshUrl = `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${token}`;

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
// Función para descargar imagen binaria (neutraliza caducidad de 48-72hs)
// -----------------------------------------------------------------------------
async function downloadMediaImage(mediaUrl, filename) {
  const filePath = path.join(IMAGES_DIR, filename);
  try {
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
    console.warn(`[!] Advertencia: No se pudo descargar la imagen ${filename}: ${err.message}`);
    return null;
  }
}

// -----------------------------------------------------------------------------
// Función principal de sincronización
// -----------------------------------------------------------------------------
async function fetchInstagramFeed() {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  const targetHashtag = (process.env.INSTAGRAM_HASHTAG || '').trim().toLowerCase();
  const limit = parseInt(process.env.INSTAGRAM_LIMIT || '12', 10);

  // Verificación de token
  if (!token || token === 'tu_token_de_larga_duracion_aqui') {
    console.warn('\n===============================================================');
    console.warn('[!] AVISO: No se encontró INSTAGRAM_ACCESS_TOKEN en el archivo .env');
    console.warn('    Para conectar con la API real, sigue la guía paso a paso y');
    console.warn('    configura tu token en .env (copiando desde .env.example).');
    console.warn('===============================================================\n');
    console.log('[*] Ejecutando simulación (Mock Mode) para validar flujo de datos...\n');
    return runMockMode();
  }

  console.log('\n===============================================================');
  console.log('  SINCRONIZANDO CON INSTAGRAM GRAPH API');
  console.log(`  Hashtag filtro : ${targetHashtag || '(Ninguno, trae todos)'}`);
  console.log(`  Límite pedido  : ${limit} posts`);
  console.log('===============================================================\n');

  const fields = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp';
  const apiUrl = `https://graph.instagram.com/me/media?fields=${fields}&limit=${limit}&access_token=${token}`;

  try {
    const res = await fetch(apiUrl);
    const result = await res.json();

    if (!res.ok || result.error) {
      console.error('[❌] Error devuelto por la API de Meta:');
      console.error(`     Código: ${result.error?.code}`);
      console.error(`     Mensaje: ${result.error?.message}`);
      console.error(`     Tipo: ${result.error?.type}\n`);

      if (result.error?.code === 190) {
        console.error('💡 TIP: El token ha expirado o es inválido. Genera uno nuevo o renuévalo con:');
        console.error('        npm run refresh-token\n');
      }
      return;
    }

    const posts = result.data || [];
    console.log(`[+] Posts recuperados desde la cuenta: ${posts.length}`);

    // Filtrar por hashtag si está configurado
    const filteredPosts = targetHashtag
      ? posts.filter(p => (p.caption || '').toLowerCase().includes(targetHashtag))
      : posts;

    console.log(`[+] Posts coincidentes con el filtro: ${filteredPosts.length}`);

    // Asegurar directorios
    await fs.mkdir(IMAGES_DIR, { recursive: true });
    await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });

    const feedResults = [];

    for (const post of filteredPosts) {
      const imageUrl = post.media_type === 'VIDEO' ? post.thumbnail_url : post.media_url;
      let localImagePath = null;

      if (imageUrl) {
        console.log(`  ⬇️ Descargando medio del post ID: ${post.id}...`);
        localImagePath = await downloadMediaImage(imageUrl, `${post.id}.jpg`);
      }

      feedResults.push({
        id: post.id,
        caption: post.caption || '',
        mediaType: post.media_type,
        permalink: post.permalink,
        timestamp: post.timestamp,
        localImage: localImagePath,
        externalMediaUrl: imageUrl // Nota: expira a las 48-72hs
      });
    }

    // Guardar en feed.json
    await fs.writeFile(DATA_FILE, JSON.stringify(feedResults, null, 2), 'utf-8');
    console.log(`\n[✅] Feed guardado exitosamente en: ${path.relative(__dirname, DATA_FILE)}`);
    console.log(`[✅] Imágenes descargadas en: ${path.relative(__dirname, IMAGES_DIR)}/\n`);

    // Mostrar tabla resumen
    console.table(
      feedResults.map(p => ({
        ID: p.id,
        Tipo: p.mediaType,
        Fecha: p.timestamp ? p.timestamp.substring(0, 10) : 'N/A',
        ImagenLocal: p.localImage ? 'Guardada' : 'No',
        Texto: (p.caption || '').substring(0, 35) + '...'
      }))
    );
  } catch (err) {
    console.error('[-] Error crítico al consultar la API de Instagram:', err.message);
  }
}

// -----------------------------------------------------------------------------
// Modo Simulación (Mock) cuando no hay token cargado
// -----------------------------------------------------------------------------
async function runMockMode() {
  const mockData = [
    {
      id: 'mock_179001',
      caption: 'Clase especial de enología y maridaje con estudiantes de 2do año. #IFTSEventos #emprendimientos',
      mediaType: 'IMAGE',
      permalink: 'https://instagram.com/p/mock1',
      timestamp: new Date().toISOString(),
      localImage: 'images/mock_sample.jpg'
    },
    {
      id: 'mock_179002',
      caption: 'Taller de costos gastronómicos y gestión para futuros microempresarios. #IFTSEventos',
      mediaType: 'IMAGE',
      permalink: 'https://instagram.com/p/mock2',
      timestamp: new Date().toISOString(),
      localImage: 'images/mock_sample.jpg'
    }
  ];

  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(mockData, null, 2), 'utf-8');
  console.log(`[✅] Feed simulado generado en: ${path.relative(__dirname, DATA_FILE)}`);
  console.table(mockData.map(m => ({ ID: m.id, Caption: m.caption.substring(0, 45) + '...' })));
  console.log('\n👉 Cuando configures tu INSTAGRAM_ACCESS_TOKEN en .env, este script consultará tu cuenta real.');
}

// -----------------------------------------------------------------------------
// Entrada principal
// -----------------------------------------------------------------------------
const isRefreshCommand = process.argv.includes('--refresh');

if (isRefreshCommand) {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!token) {
    console.error('[-] Debes definir INSTAGRAM_ACCESS_TOKEN en el archivo .env para renovarlo.');
    process.exit(1);
  }
  refreshLongLivedToken(token);
} else {
  fetchInstagramFeed();
}
