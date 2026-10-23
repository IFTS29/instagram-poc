/**
 * config.js - Configuración pública del proyecto
 * ==================================================
 * Este archivo se VERSIONA en Git.
 * Define las reglas de negocio y parámetros de la web.
 * (NO contiene secretos, tokens ni contraseñas).
 */

export const CONFIG = {
  // Hashtags institucionales que deben publicarse en la web
  // (Cualquier publicación que contenga al menos uno de estos hashtags será admitida)
  hashtags: ['#test'],

  // Límite de publicaciones para el feed de la página
  limit: 12,

  // Puerto del servidor local para el botón web y la API
  port: 3000,

  // Sincronización automática periódica
  autoSync: {
    enabled: false,       // true = activado, false = desactivado
    intervalMinutes: 60   // Cada cuántos minutos se ejecuta si está activado
  }
};
