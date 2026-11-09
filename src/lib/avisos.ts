import type { Aviso, PreferenciasAvisos, TipoAviso } from '../api/tipos';

export const ETIQUETAS_AVISO: Record<TipoAviso, string> = {
  corte_servicio: 'Cortes de servicio',
  obra_publica: 'Obras públicas',
  evento: 'Eventos',
  emergencia: 'Emergencias',
  vencimiento: 'Vencimientos de tasas',
  alarma: 'Alarmas comunitarias',
  reclamo: 'Mis reclamos',
  estacionamiento: 'Estacionamiento',
};

export const PREFERENCIAS_POR_DEFECTO: PreferenciasAvisos = {
  tipos: {
    corte_servicio: true,
    obra_publica: true,
    evento: true,
    emergencia: true,
    vencimiento: true,
    alarma: true,
    reclamo: true,
    estacionamiento: true,
  },
  frecuencia: 'inmediata',
  barrios: [],
  alarmasCercanas: true,
  radioAlarmasMetros: 800,
};

/**
 * Decide si un aviso le corresponde al vecino según sus preferencias.
 * Las emergencias se envían siempre: no se pueden desactivar.
 */
export function avisoCorresponde(aviso: Pick<Aviso, 'tipo' | 'barrio'>, pref: PreferenciasAvisos): boolean {
  if (aviso.tipo === 'emergencia') return true;
  if (!pref.tipos[aviso.tipo]) return false;
  // Avisos personales (reclamos, vencimientos, estacionamiento) no dependen del barrio.
  if (['reclamo', 'vencimiento', 'estacionamiento'].includes(aviso.tipo)) return true;
  if (!aviso.barrio || pref.barrios.length === 0) return true;
  return pref.barrios.includes(aviso.barrio);
}

/**
 * ¿Hay que mostrarlo como notificación del dispositivo en este momento?
 * Con "resumen diario" solo las emergencias y los avisos personales urgentes interrumpen;
 * el resto queda en el historial.
 */
export function debeInterrumpir(aviso: Pick<Aviso, 'tipo'>, pref: PreferenciasAvisos): boolean {
  if (pref.frecuencia === 'inmediata') return true;
  return ['emergencia', 'alarma', 'estacionamiento'].includes(aviso.tipo);
}
