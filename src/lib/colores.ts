import type { EstacionBici } from '../api/tipos';

// Colores por estado, compartidos entre mapas y listas.
export const colorDisponibilidad = (e: EstacionBici) =>
  e.estado !== 'operativa' ? '#8a8f99' : e.bicisDisponibles === 0 ? '#c62828' : e.bicisDisponibles <= 2 ? '#e8a317' : '#1f8a4c';

// Mismos colores que el mapa "Nivel de ocupación" de la app municipal.
export const COLOR_OCUPACION = { baja: '#7ed957', media: '#f2d50f', alta: '#e53935' } as const;

export const COLOR_ALARMA = { activada: '#c62828', desactivada: '#1f8a4c', sin_conexion: '#8a8f99' } as const;
export const TEXTO_ALARMA = { activada: 'Activada', desactivada: 'Desactivada', sin_conexion: 'Sin conexión' } as const;
