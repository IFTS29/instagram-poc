/**
 * scripts/add-test-post.js
 * ============================================================================
 * Herramienta de Testing para verificar la clasificación y ubicación de medios.
 *
 * Uso directo por argumentos:
 *   node scripts/add-test-post.js --caption "Taller de robótica #talleres" --image "foto.jpg"
 *
 * Uso interactivo (te va preguntando paso a paso):
 *   npm run add-post
 */

import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import path from 'node:path';
import { addCustomPost } from '../src/feed.js';
import { CONFIG } from '../config.js';

// Parsear argumentos si se pasaron por CLI
const args = process.argv.slice(2);
function getArg(flag) {
  const idx = args.indexOf(flag);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : null;
}

const argCaption = getArg('--caption') || getArg('-c');
const argImage = getArg('--image') || getArg('-i');
const argType = (getArg('--type') || getArg('-t') || 'IMAGE').toUpperCase();

async function run() {
  console.log('\n===============================================================');
  console.log('  🧪 HERRAMIENTA DE PRUEBA: AGREGAR PUBLICACIÓN Y VALIDAR UBICACIÓN');
  console.log('===============================================================\n');

  let caption = argCaption;
  let imagePath = argImage;
  let mediaType = argType;

  // Si no se pasaron argumentos por consola, pedir interactivamente
  if (!caption) {
    const rl = readline.createInterface({ input, output });

    console.log('Hashtags configurados en config.js:');
    for (const [key, cat] of Object.entries(CONFIG.categories || {})) {
      console.log(` • [${key.toUpperCase()}] (${cat.title}): ${cat.hashtags.join(', ')}`);
    }
    console.log('');

    caption = await rl.question('1. Escribí el texto de la publicación con hashtag(s):\n> ');
    if (!caption.trim()) {
      console.error('\n[-] El caption no puede estar vacío.');
      rl.close();
      process.exit(1);
    }

    const imgInput = await rl.question('\n2. Ruta del archivo de imagen o video local (dejar vacío para usar placeholder):\n> ');
    imagePath = imgInput.trim() || null;

    const typeInput = await rl.question('\n3. Tipo de medio [IMAGE / VIDEO] (por defecto IMAGE):\n> ');
    mediaType = (typeInput.trim() || 'IMAGE').toUpperCase();

    rl.close();
  }

  try {
    const result = await addCustomPost({
      caption,
      mediaType,
      sourceImagePath: imagePath
    });

    console.log('\n---------------------------------------------------------------');
    console.log('[✅] ¡PUBLICACIÓN CREADA Y UBICADA EXITOSAMENTE!');
    console.log('---------------------------------------------------------------');
    console.log(`ID asignado         : ${result.post.id}`);
    console.log(`Tipo de medio       : ${result.post.mediaType}`);
    console.log(`Archivo asignado    : ${result.post.localImage || result.post.localVideo}`);
    console.log(`Categoría(s)        : [${result.categories.join(', ')}]`);

    console.log('\n📍 Ubicación en la Web:');
    result.categories.forEach(cat => {
      const info = CONFIG.categories[cat];
      console.log(` 👉 Carrusel: "${info ? info.title : cat}" (#${cat})`);
    });

    console.log(`\nTotal en el feed    : ${result.total} publicaciones`);
    console.log(`Podés verla en vivo : http://localhost:3000/#${result.categories[0] || ''}\n`);

  } catch (err) {
    console.error('\n[❌] Error al ubicar la publicación:');
    console.error(`     ${err.message}\n`);
    process.exit(1);
  }
}

run();
