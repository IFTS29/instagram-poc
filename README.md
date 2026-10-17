# Instagram Graph API — PoC (Proof of Concept)
**Proyecto:** Renovación Web IFTS N.° 2  
**Equipo:** 404-Solutions  
**Tecnología:** Node.js (v18+) nativo con ES Modules. Sin dependencias externas.

---

## 🎯 Objetivo de este repositorio
Validar de forma aislada y controlada la conexión con la **Instagram API with Instagram Login** (Graph API oficial de Meta), resolviendo:
1. Conexión con cuenta profesional de Instagram y autenticación OAuth.
2. Obtención del **Long-Lived Access Token** (60 días de vigencia).
3. Consulta de publicaciones recientes vía `GET /me/media`.
4. Filtrado selectivo por hashtag institucional (ej. `#IFTSEventos`).
5. Descarga y persistencia de las imágenes binarias en `./images/` para evitar que los enlaces expiren a las 48-72 hs.
6. Renovación automática periódica del token antes de su caducidad (`GET /refresh_access_token`).

---

## 🚀 Inicio Rápido

### 1. Requisitos
* Node.js v18 o superior instalado (`node -v`).

### 2. Configurar variables de entorno
Copia el archivo de ejemplo y crea tu archivo `.env`:
```bash
cp .env.example .env
```
Edita `.env` y pega tu `INSTAGRAM_ACCESS_TOKEN` obtenido en Meta for Developers.

### 3. Ejecutar la sincronización
```bash
# Ejecutar con el script npm
npm start

# O directamente con Node (nativo con carga de .env)
node --env-file=.env index.js
```

### 4. Probar la renovación del token de 60 días
```bash
npm run refresh-token
```

---

## 📁 Estructura del Proyecto
```
instagram-poc/
├── .env.example        # Plantilla de variables de entorno
├── .gitignore          # Ignora imágenes descargadas y credenciales
├── package.json        # Configuración del proyecto y scripts
├── index.js            # Script principal de consulta, descarga y renovación
├── images/             # Imágenes descargadas localmente (persistentes)
└── data/
    └── instagram-feed.json # Salida estructurada de publicaciones
```

Para el paso a paso detallado sobre cómo dar de alta la App en **Meta for Developers** y generar el token, consulta la guía técnica en la documentación del proyecto.
