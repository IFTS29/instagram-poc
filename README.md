# Instagram Graph API — PoC (Proof of Concept)
**Proyecto:** Renovación Web IFTS N.° 29  
**Equipo:** 404-Solutions  
**Tecnología:** Node.js (v18+) nativo con ES Modules. Cero dependencias externas.

---

## 🚀 Guía Rápida para Compañeros de Equipo

Esta guía está pensada para que cualquier miembro del equipo pueda clonar el repositorio y visualizar inmediatamente el prototipo de la página web con el feed de Instagram funcionando.

### 1. Clonar el repositorio
```bash
git clone https://github.com/IFTS29/instagram-poc.git
cd instagram-poc
```

### 2. Iniciar el servidor local
```bash
npm start
```
*(No hace falta correr `npm install`, el proyecto no utiliza dependencias externas).*

### 3. Abrir en el navegador
Ingresar a: **[http://localhost:3000](http://localhost:3000)**

---

## 🎯 ¿Qué vas a ver y qué cosas podés probar?

El prototipo levanta la página principal del IFTS N.° 29 con las publicaciones sincronizadas desde Instagram:

1. **Carruseles temáticos independientes:**
   * Las publicaciones se organizan según los hashtags institucionales configurados en `config.js` (ej. `#novedades` y `#eventos`).
2. **Soporte multimedia mixto (Fotos y Videos):**
   * Las fotos se muestran en tarjetas con proporción fija uniforme (`object-fit: cover`) para que el diseño no se deforme.
   * Los **videos (.mp4)** vienen incrustados con miniatura y reproductor nativo con sonido para darles "Play" directamente.
3. **Comportamiento adaptable:**
   * Si una sección tiene **1 o 2 publicaciones**, se muestran centradas como tarjetas fijas destacadas.
   * Si tiene **3 o más**, se habilitan los controles interactivos de deslizamiento del carrusel.
4. **Botón "🔄 Sincronizar Ahora":**
   * En la cabecera hay un botón interactivo que conecta con el endpoint local `POST /api/sync` para refrescar el feed bajo demanda.

---

## ⚙️ Configuración del Proyecto

### 1. Configuración Pública (`config.js`)
Este archivo se versiona en Git y define cómo se comporta la aplicación (cualquiera puede modificarlo para probar):
```javascript
export const CONFIG = {
  // Categorías temáticas para organizar los carruseles de la portada
  categories: {
    novedades: {
      id: 'novedades',
      title: 'Novedades Institucionales',
      subtitle: 'Avisos académicos, inscripciones y comunicados oficiales del IFTS N.° 29',
      badge: 'Novedades',
      hashtags: ['#novedades', '#comunicado', '#institucional', '#inscripciones', '#test']
    },
    eventos: {
      id: 'eventos',
      title: 'Eventos y Vida Estudiantil',
      subtitle: 'Talleres, charlas, hackathons y actividades de la comunidad tecnológica',
      badge: 'Eventos',
      hashtags: ['#eventos', '#talleres', '#hackathon', '#estudiantes', '#comunidad']
    }
  },

  // Hashtags institucionales admitidos
  hashtags: [
    '#test', '#novedades', '#comunicado', '#institucional', '#inscripciones',
    '#eventos', '#talleres', '#hackathon', '#estudiantes', '#comunidad'
  ],

  // Límite de publicaciones para el feed
  limit: 20,

  // Puerto del servidor local
  port: 3000,

  // Sincronización automática periódica (false = solo manual o por botón)
  autoSync: {
    enabled: false,
    intervalMinutes: 60
  }
};
```

### 2. Endpoints de la API Local

| Endpoint | Método | Descripción |
| :--- | :--- | :--- |
| `/` | `GET` | Portada interactiva del IFTS N.° 29 con los carruseles temáticos. |
| `/api/sync` | `POST` / `GET` | Ejecuta la sincronización con Meta bajo demanda (o refresca el feed). |
| `/api/feed` | `GET` | Devuelve la lista completa de publicaciones en JSON. |
| `/api/feed?category=novedades` | `GET` | Filtra las publicaciones por categoría específica (`novedades` o `eventos`). |
| `/api/feed?grouped=true` | `GET` | Devuelve las publicaciones agrupadas por categorías institucionales. |
| `/api/test-post` | `POST` | Permite agregar una publicación de prueba con su caption y tipo de medio. |

### 3. Variables Privadas y Secretos (`.env`)
*(Solo necesario si querés consultar en vivo a los servidores de Meta)*:
* Copiar la plantilla: `cp .env.example .env`
* Completar el `INSTAGRAM_ACCESS_TOKEN` y `INSTAGRAM_ACCOUNT_ID`.
* **Importante:** Este archivo **nunca** se sube a GitHub (está en `.gitignore`).

---

## 📋 Comandos Disponibles

| Comando | Descripción |
| :--- | :--- |
| `npm start` | Inicia el servidor web local en `http://localhost:3000` con la página y el botón de sincronización. |
| `npm run add-post` | Script interactivo para agregar una foto/video de prueba con hashtags y verificar su ubicación. |
| `npm run sync` | Ejecuta la sincronización una sola vez por consola (modo CLI) y finaliza. |
| `npm run refresh-token` | Renueva la vigencia del token de Meta por 60 días adicionales. |

---

## 🏗️ Arquitectura Modular del Proyecto

El código está desacoplado en módulos nativos bajo la carpeta `src/`:
* **`config.js`:** Parámetros públicos, configuración de categorías y hashtags.
* **`src/classifier.js`:** Lógica de clasificación multi-hashtag y resolución de carruseles.
* **`src/feed.js`:** Almacenamiento seguro del feed en JSON y datos de prueba (Mock Mode).
* **`src/meta.js`:** Cliente de conexión con Meta Graph API v26.0 y descarga de multimedia.
* **`src/views/home.js`:** Maquetado y estilos de la portada institucional con soporte de fallbacks.
* **`src/server.js`:** Servidor HTTP nativo y endpoints.
* **`scripts/add-test-post.js`:** Herramienta de testing para simular publicaciones.
