/**
 * config.js - Configuración pública del proyecto
 * ==================================================
 * Este archivo se VERSIONA en Git.
 * Define las reglas de negocio y parámetros de la web.
 * (NO contiene secretos, tokens ni contraseñas).
 */

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

  // Hashtags institucionales que deben publicarse en la web
  // (Cualquier publicación que contenga al menos uno de estos hashtags será admitida)
  hashtags: [
    '#test',
    '#novedades',
    '#comunicado',
    '#institucional',
    '#inscripciones',
    '#eventos',
    '#talleres',
    '#hackathon',
    '#estudiantes',
    '#comunidad'
  ],

  // Comportamiento cuando una publicación tiene múltiples hashtags de distintas categorías:
  // - true: la publicación aparece en todos los carruseles coincidentes (ej. Novedades y Eventos).
  // - false: la publicación se ubica exclusivamente en el primer carrusel que coincida.
  allowMultiCategory: true,

  // Límite de publicaciones para el feed de la página
  limit: 20,

  // Filtro de fecha para publicaciones (descarta posts antiguos automáticamente)
  dateFilter: {
    enabled: true,        // true = filtra por fecha (máx 90 días o fecha mínima)
    maxDaysOld: 90,       // Días máximos de antigüedad permitidos (ej. últimos 3 meses)
    sinceDate: null       // O fecha mínima estricta ISO 'YYYY-MM-DD' (ej. inicio de ciclo lectivo)
  },

  // Puerto del servidor local para el botón web y la API
  port: 3000,

  // Sincronización automática periódica
  autoSync: {
    enabled: false,       // true = activado, false = desactivado
    intervalMinutes: 60   // Cada cuántos minutos se ejecuta si está activado
  }
};
