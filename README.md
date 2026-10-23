# Instagram Graph API — PoC (Proof of Concept)
**Proyecto:** Renovación Web IFTS N.° 2  
**Equipo:** 404-Solutions  
**Tecnología:** Node.js (v18+) nativo con ES Modules. Sin dependencias externas.

---

## ⚙️ Configuración del Proyecto

### 1. Variables Privadas y Secretos (`.env`)
Copia la plantilla de secretos para crear tu archivo `.env`:
```bash
cp .env.example .env
```
Edita `.env` con las credenciales de Meta (este archivo **nunca** se sube a GitHub):
* `INSTAGRAM_ACCESS_TOKEN`: Token de larga duración generado en Meta for Developers.
* `INSTAGRAM_ACCOUNT_ID`: ID numérico de la cuenta comercial (`17841417122883500`).
* `META_APP_ID` y `META_APP_SECRET`: Para renovación de tokens con `--refresh`.

### 2. Configuración Pública de la Aplicación (`config.js`)
Los parámetros de negocio se versionan en Git dentro de [config.js](file:///c:/Proyectos/IFTS29/instagram-poc/config.js):
* `hashtags`: Lista de hashtags permitidos para mostrar en la web (ej: `['#test']` o `['#novedades', '#eventos']`).
* `limit`: Cantidad máxima de publicaciones activas.
* `port`: Puerto para el servidor local y panel web (`3000`).
* `syncIntervalMinutes`: Intervalo de sincronización automática en minutos (0 = desactivado).

---

## 🚀 Modos de Ejecución

### Modo Automático con Botón Web y API
Inicia el servicio local con panel interactivo:
```bash
npm start
```
* **Panel con botón:** Abre en el navegador [http://localhost:3000](http://localhost:3000).
* **Endpoint de sincronización:** `POST http://localhost:3000/api/sync`
* **Endpoint de datos:** `GET http://localhost:3000/api/feed`

### Modo CLI Directo (Una sola ejecución)
```bash
npm run sync
```

### Renovación de Token
```bash
npm run refresh-token
```
