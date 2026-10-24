/**
 * src/server.js
 * ============================================================================
 * Servidor HTTP local nativo con rutas estáticas y endpoints de API.
 */

import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { CONFIG } from '../config.js';
import { loadFeed, saveFeed, addCustomPost, deletePostById, IMAGES_DIR } from './feed.js';
import { fetchInstagramFeed } from './meta.js';
import { getPostCategories } from './classifier.js';
import { renderHomePage } from './views/home.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const PLACEHOLDER_PATH = path.join(ROOT_DIR, 'images', 'placeholder.svg');

export function createServer(port = 3000) {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);

    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      return res.end();
    }

    // 1. Servir archivos estáticos de /public/ (ej. /css/styles.css)
    if (url.pathname.startsWith('/css/') || url.pathname.startsWith('/public/')) {
      const relativePath = url.pathname.startsWith('/public/')
        ? url.pathname.replace(/^\/public\//, '')
        : url.pathname.replace(/^\//, '');
      const filePath = path.join(PUBLIC_DIR, relativePath);

      const mimeTypes = {
        '.css': 'text/css; charset=utf-8',
        '.js': 'application/javascript; charset=utf-8',
        '.svg': 'image/svg+xml',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.ico': 'image/x-icon'
      };

      try {
        await fs.access(filePath);
        const ext = path.extname(filePath).toLowerCase();
        res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
        return createReadStream(filePath).pipe(res);
      } catch {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        return res.end('Archivo no encontrado');
      }
    }

    // 1. Endpoint para sincronizar con Meta (POST /api/sync)
    if (url.pathname === '/api/sync') {
      console.log(`\n[⚡] Sincronización solicitada desde ${req.socket.remoteAddress}`);
      const result = await fetchInstagramFeed();
      res.writeHead(result.success ? 200 : 500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(result));
    }

    // 2. Endpoint para agregar publicación de prueba (POST /api/test-post)
    if (url.pathname === '/api/test-post' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', async () => {
        try {
          const { caption, mediaType, imagePath, fileBase64, fileName } = JSON.parse(body || '{}');
          if (!caption) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ success: false, error: 'Falta el campo caption' }));
          }

          let fileBuffer = null;
          let fileExtension = null;
          if (fileBase64 && fileName) {
            fileBuffer = Buffer.from(fileBase64, 'base64');
            fileExtension = path.extname(fileName).toLowerCase();
          }

          const result = await addCustomPost({
            caption,
            mediaType: mediaType || 'IMAGE',
            sourceImagePath: imagePath,
            fileBuffer,
            fileExtension
          });

          console.log(`[🧪] Nueva publicación de prueba agregada. Categorías: [${result.categories.join(', ')}]`);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ success: true, ...result }));
        } catch (err) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ success: false, error: err.message }));
        }
      });
      return;
    }

    // 3. Endpoint para moderación: descartar/ocultar publicación (POST /api/discard-post o /api/delete-post)
    if ((url.pathname === '/api/discard-post' || url.pathname === '/api/delete-post') && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', async () => {
        try {
          const { id } = JSON.parse(body || '{}');
          if (!id) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ success: false, error: 'Falta el ID de la publicación a descartar' }));
          }

          const result = await deletePostById(id);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify(result));
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ success: false, error: err.message }));
        }
      });
      return;
    }

    // 4. Endpoint para consultar el JSON del feed (GET /api/feed)
    if (url.pathname === '/api/feed') {
      try {
        const posts = await loadFeed();

        // Filtro por categoría ?category=novedades o ?category=eventos
        const requestedCat = url.searchParams.get('category');
        if (requestedCat) {
          const filtered = posts.filter(p => {
            const cats = p.categories || getPostCategories(p.caption);
            return cats.includes(requestedCat);
          });
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          return res.end(JSON.stringify(filtered, null, 2));
        }

        // Agrupación ?grouped=true
        if (url.searchParams.get('grouped') === 'true') {
          const grouped = {};
          for (const catKey of Object.keys(CONFIG.categories || {})) {
            grouped[catKey] = posts.filter(p => {
              const cats = p.categories || getPostCategories(p.caption);
              return cats.includes(catKey);
            });
          }
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          return res.end(JSON.stringify({ categories: CONFIG.categories, grouped }, null, 2));
        }

        // Lista completa
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify(posts, null, 2));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: err.message }));
      }
    }

    // 4. Servir archivos estáticos de /images/ con protección ante archivos faltantes
    if (url.pathname.startsWith('/images/')) {
      const filename = path.basename(url.pathname);
      const filePath = path.join(IMAGES_DIR, filename);

      const mimeTypes = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.mp4': 'video/mp4',
        '.svg': 'image/svg+xml',
        '.webp': 'image/webp'
      };

      try {
        await fs.access(filePath);
        const ext = path.extname(filename).toLowerCase();
        res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
        return createReadStream(filePath).pipe(res);
      } catch {
        // RESILIENCIA: Si el archivo fue borrado o no existe, sirve el placeholder SVG
        // en lugar de romper el diseño con 404
        try {
          await fs.access(PLACEHOLDER_PATH);
          res.writeHead(200, { 'Content-Type': 'image/svg+xml' });
          return createReadStream(PLACEHOLDER_PATH).pipe(res);
        } catch {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          return res.end('Archivo no encontrado');
        }
      }
    }

    // 5. Portada Principal (Home IFTS N.° 29)
    if (url.pathname === '/') {
      const posts = await loadFeed();
      const html = renderHomePage(posts);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(html);
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Ruta no encontrada');
  });

  return server;
}

export function startHttpServer(port = 3000) {
  const server = createServer(port);

  server.listen(port, () => {
    console.log(`\n===============================================================`);
    console.log(`  [🌐] SERVIDOR ACTIVO EN: http://localhost:${port}`);
    console.log(`  [🏛️] Portada Home IFTS29  : http://localhost:${port}/`);
    console.log(`  [🧪] Probar publicación   : Botón en la web o 'npm run add-post'`);
    console.log(`  [⚡] Sincronización botón : POST http://localhost:${port}/api/sync`);
    console.log(`  [📦] Feed JSON Completo   : GET http://localhost:${port}/api/feed`);
    console.log(`  [📁] Feed JSON Agrupado   : GET http://localhost:${port}/api/feed?grouped=true`);
    console.log(`===============================================================\n`);
  });

  return server;
}
