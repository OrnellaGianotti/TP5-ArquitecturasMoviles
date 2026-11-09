import type { InfoEstacionamiento } from '../api/tipos';

// Reglas del estacionamiento medido. Los valores reales se tomaron de la app municipal
// (pantalla "Información de Estacionamiento"): $625 por hora; lunes a viernes de 08:00 a 12:30
// y de 15:00 a 20:00; sábados de 08:00 a 13:00. La fracción mínima de 30 minutos es un
// supuesto del prototipo.
export const INFO_ESTACIONAMIENTO: InfoEstacionamiento = {
  costoHora: 625,
  fraccionMinutos: 30,
  costoTicket: 6897,
  horarios: [
    { dias: 'Lunes a Viernes', franjas: ['08:00 a 12:30 hs.', '15:00 a 20:00 hs.'] },
    { dias: 'Sábado', franjas: ['08:00 a 13:00 hs.'] },
  ],
};

/** Franjas en minutos desde las 00:00, por día de la semana (0 = domingo). */
const FRANJAS: Record<number, [number, number][]> = {
  0: [],
  1: [[480, 750], [900, 1200]],
  2: [[480, 750], [900, 1200]],
  3: [[480, 750], [900, 1200]],
  4: [[480, 750], [900, 1200]],
  5: [[480, 750], [900, 1200]],
  6: [[480, 780]],
};

/** ¿Rige el estacionamiento medido en este momento? */
export function rigeEstacionamiento(fecha: Date): boolean {
  const minutos = fecha.getHours() * 60 + fecha.getMinutes();
  return FRANJAS[fecha.getDay()].some(([desde, hasta]) => minutos >= desde && minutos < hasta);
}

/**
 * Importe a cobrar por una cantidad de minutos: se cobra por fracciones de 30 minutos,
 * redondeando hacia arriba (45 min = 2 fracciones = 1 hora).
 */
export function calcularImporte(minutos: number, info = INFO_ESTACIONAMIENTO): number {
  if (minutos <= 0) return 0;
  const fracciones = Math.ceil(minutos / info.fraccionMinutos);
  const precioFraccion = (info.costoHora * info.fraccionMinutos) / 60;
  return Math.round(fracciones * precioFraccion * 100) / 100;
}

/** Minutos de aviso antes de que venza el tiempo. */
export const MINUTOS_AVISO_VENCIMIENTO = 5;

export type EstadoTemporizador = 'en_curso' | 'por_vencer' | 'vencido';

export function estadoTemporizador(finIso: string, ahora = Date.now()): EstadoTemporizador {
  const resta = new Date(finIso).getTime() - ahora;
  if (resta <= 0) return 'vencido';
  if (resta <= MINUTOS_AVISO_VENCIMIENTO * 60_000) return 'por_vencer';
  return 'en_curso';
}

/** Patente argentina: formato viejo (ABC123) o Mercosur (AB123CD). */
export function patenteValida(patente: string): boolean {
  const p = patente.replace(/\s|-/g, '').toUpperCase();
  return /^[A-Z]{3}\d{3}$/.test(p) || /^[A-Z]{2}\d{3}[A-Z]{2}$/.test(p);
}

export const normalizarPatente = (p: string) => p.replace(/\s|-/g, '').toUpperCase();
