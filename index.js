/**
 * index.js - PoC de integración con Instagram Graph API
 * ======================================================
 * Proyecto: IFTS N.° 29 - Renovación Web
 * Equipo: 404-Solutions
 *
 * Arquitectura modular desacoplada:
 *  - src/classifier.js : Clasificación multi-hashtag y reglas de negocio.
 *  - src/feed.js       : Persistencia JSON, mock mode y gestión de publicaciones.
 *  - src/meta.js       : Cliente de Meta Graph API v26.0 y descargas.
 *  - src/views/home.js : Plantilla de portada institucional y carruseles.
 *  - src/server.js     : Servidor HTTP nativo y endpoints.
 */

import fs from 'node:fs';
import { CONFIG } from './config.js';
import { loadFeed } from './src/feed.js';
import { fetchInstagramFeed, refreshLongLivedToken } from './src/meta.js';
import { startHttpServer } from './src/server.js';

// Carga condicional y segura de variables de entorno (.env) si el archivo existe
try {
  if (typeof process.loadEnvFile === 'function') {
    process.loadEnvFile();
  } else if (fs.existsSync('.env')) {
    const envContent = fs.readFileSync('.env', 'utf-8');
    for (const line of envContent.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) process.env[key] = val;
      }
    }
  }
} catch {
  // Ignorar si .env no existe (permite ejecución limpia en modo local/mock)
}

const isRefreshCommand = process.argv.includes('--refresh');
const isSyncOnlyCommand = process.argv.includes('--sync-only');
const port = parseInt(process.env.PORT || CONFIG.port || '3000', 10);

if (isRefreshCommand) {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!token) {
    console.error('[-] Debes definir INSTAGRAM_ACCESS_TOKEN en el archivo .env para renovarlo.');
    process.exit(1);
  }
  await refreshLongLivedToken(token);
} else if (isSyncOnlyCommand) {
  // Modo CLI directo: sincroniza una vez y termina
  await fetchInstagramFeed();
} else {
  // Modo Principal: verifica si existe data local, sino ejecuta sincronización inicial
  await loadFeed();

  // Iniciar servidor local
  startHttpServer(port);

  // Sincronización periódica si está activada en config.js
  if (CONFIG.autoSync?.enabled) {
    const intervalMinutes = CONFIG.autoSync.intervalMinutes || 60;
    console.log(`[⏱️] Sincronización automática activada cada ${intervalMinutes} minutos.`);
    setInterval(async () => {
      console.log(`\n[⏱️] Ejecutando sincronización periódica (${new Date().toLocaleTimeString()})...`);
      await fetchInstagramFeed();
    }, intervalMinutes * 60 * 1000);
  }
}
