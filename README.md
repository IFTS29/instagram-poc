# Instagram Graph API — PoC (Proof of Concept)
**Proyecto:** Renovación Web IFTS N.° 2  
**Equipo:** 404-Solutions  
**Tecnología:** Node.js (v18+) nativo con ES Modules. Sin dependencias externas.

---

## 🎯 Regla de Negocio
**Únicamente las publicaciones que contengan un hashtag van a la web.**
* Si defines `INSTAGRAM_HASHTAG=#test`, solo pasan las publicaciones con ese hashtag.
* Si dejas `INSTAGRAM_HASHTAG=` vacío, el filtro exige obligatoriamente la presencia de al menos un `#` en el texto. Cualquier post sin hashtag es descartado.
* Soporte nativo para:
  * **Imágenes (`IMAGE`)**: Descarga el archivo `.jpg`.
  * **Videos (`VIDEO`)**: Descarga el video `.mp4` y su miniatura `_thumb.jpg`.

---

## 🚀 Modos de Ejecución

### 1. Modo Automático y con Botón Web (Recomendado)
Inicia el servicio en segundo plano con panel web y endpoints HTTP:
```bash
npm start
```
* **Panel interactivo con botón:** Abrir en el navegador [http://localhost:3000](http://localhost:3000).  
  Contiene el botón **`[ 🔄 Sincronizar Ahora ]`** para refrescar el feed con un solo clic.
* **Endpoint HTTP para botón o frontend externo:**  
  Cualquier botón en la web o panel de administración puede disparar la sincronización llamando a:
  ```http
  POST http://localhost:3000/api/sync
  ```
* **Consulta de datos en JSON:**  
  ```http
  GET http://localhost:3000/api/feed
  ```
* **Ejecución periódica automática:**  
  Configura `SYNC_INTERVAL_MINUTES=60` en tu archivo `.env` para que el servidor sincronice solo cada 60 minutos.

---

### 2. Modo CLI Directo (Una sola ejecución)
Para ejecutar la sincronización una única vez por terminal sin levantar servidor:
```bash
npm run sync
```

---

### 3. Renovación del Token de 60 días
```bash
npm run refresh-token
```
