import type { AlarmaComunitaria, EstadoReclamo, TipoAviso } from '../tipos';
import { base, guardar } from './almacen';
import { emitirAviso } from './servidor';
import { publicar } from '../tiempoReal';
import { proximosAVencer } from '../../lib/tributos';
import { formatearFecha, formatearPesos } from '../../lib/formato';

// =====================================================================================
// Motor de simulación: reemplaza a los sistemas que en la realidad generan eventos
// (anclajes de bicis, central de alarmas, operadores de la Línea 103, áreas municipales).
// Publica los cambios por el canal de tiempo real, igual que lo haría un WebSocket.
// =====================================================================================

const SEG = 1000;
export const INTERVALOS = {
  bicis: 5 * SEG,
  zonas: 12 * SEG,
  alarmas: 35 * SEG,
  duracionAlarma: 25 * SEG,
  reclamos: 5 * SEG,
  avanceReclamo: 40 * SEG, // en la demo un reclamo cambia de estado cada 40 s
};

const SIGUIENTE: Record<EstadoReclamo, EstadoReclamo | null> = {
  recibido: 'asignado',
  asignado: 'en_curso',
  en_curso: 'resuelto',
  resuelto: null,
};

const DETALLE: Record<EstadoReclamo, string> = {
  recibido: 'Reclamo recibido por la Línea 103.',
  asignado: 'Tu reclamo fue asignado al área responsable.',
  en_curso: 'El personal municipal está trabajando en el lugar.',
  resuelto: 'El reclamo fue resuelto. ¡Gracias por avisar!',
};

const azar = (n: number) => Math.floor(Math.random() * n);

/** Variación de disponibilidad de bicis: alguien retira o devuelve una bici. */
export function pasoBicis(): void {
  const b = base();
  const e = b.estaciones[azar(b.estaciones.length)];
  if (e.estado !== 'operativa') return;
  const retira = Math.random() < 0.5;
  if (retira && e.bicisDisponibles > 0) e.bicisDisponibles -= 1;
  else if (!retira && e.anclajesLibres > 0) e.bicisDisponibles += 1;
  e.anclajesLibres = e.capacidad - e.bicisDisponibles;
  e.actualizado = new Date().toISOString();
  guardar();
  publicar('bicis', b.estaciones);
}

export function pasoZonas(): void {
  const b = base();
  const niveles = ['baja', 'media', 'alta'] as const;
  const z = b.zonas[azar(b.zonas.length)];
  z.ocupacion = niveles[azar(3)];
  guardar();
  publicar('estacionamiento.zonas', b.zonas);
}

/** Activa una alarma (al azar o la indicada) y la desactiva pasado un tiempo. */
export function activarAlarma(id?: string): AlarmaComunitaria | null {
  const b = base();
  const candidatas = b.alarmas.filter((a) => a.estado === 'desactivada');
  const a = id ? b.alarmas.find((x) => x.id === id) : candidatas[azar(candidatas.length)];
  if (!a || a.estado === 'sin_conexion') return null;
  a.estado = 'activada';
  a.ultimaActivacion = a.actualizado = new Date().toISOString();
  guardar();
  publicar('alarmas', b.alarmas);
  publicar('alarma.activada', a);
  // Suscripción por zona: el servidor avisa a quienes siguen ese barrio.
  if (b.preferencias.barrios.includes(a.barrio)) {
    emitirAviso({
      tipo: 'alarma',
      titulo: `Alarma activada en ${a.barrio}`,
      cuerpo: `Se activó la ${a.referencia}. Si es una emergencia llamá al 911.`,
      barrio: a.barrio,
      enlace: '/inicio/alarmas',
    });
  }
  setTimeout(() => {
    a.estado = 'desactivada';
    a.actualizado = new Date().toISOString();
    guardar();
    publicar('alarmas', base().alarmas);
  }, INTERVALOS.duracionAlarma);
  return a;
}

/** Avanza el estado de los reclamos creados en la demo y avisa al vecino. */
export function pasoReclamos(ahora = Date.now()): void {
  const b = base();
  let cambio = false;
  for (const r of b.reclamos) {
    if (!r.simularAvance) continue;
    const siguiente = SIGUIENTE[r.estado];
    if (!siguiente) continue;
    const ultimo = new Date(r.historial[r.historial.length - 1].fecha).getTime();
    if (ahora - ultimo < INTERVALOS.avanceReclamo) continue;
    r.estado = siguiente;
    r.historial.push({ estado: siguiente, fecha: new Date(ahora).toISOString(), detalle: DETALLE[siguiente] });
    cambio = true;
    publicar('reclamos', { tipo: 'actualizado', reclamo: r });
    emitirAviso({
      tipo: 'reclamo',
      titulo: `Reclamo ${r.numero}: ${etiquetaEstado(siguiente)}`,
      cuerpo: `${r.motivo} – ${DETALLE[siguiente]}`,
      enlace: `/reclamos/ver/${r.id}`,
    });
  }
  if (cambio) guardar();
}

export const etiquetaEstado = (e: EstadoReclamo) =>
  ({ recibido: 'Recibido', asignado: 'Asignado', en_curso: 'En curso', resuelto: 'Resuelto' })[e];

/** Recordatorios de vencimiento: un aviso por cedulón, solo si la obligación lo tiene activado. */
export function revisarVencimientos(ahora = Date.now()): number {
  const b = base();
  const conRecordatorio = new Set(b.obligaciones.filter((o) => o.recordatorio).map((o) => o.id));
  const proximos = proximosAVencer(b.cedulones, 5, ahora).filter(
    (c) => conRecordatorio.has(c.obligacionId) && !b.vencimientosAvisados.includes(c.id),
  );
  for (const c of proximos) {
    b.vencimientosAvisados.push(c.id);
    emitirAviso({
      tipo: 'vencimiento',
      titulo: 'Se acerca un vencimiento',
      cuerpo: `${c.descripcion}: ${formatearPesos(c.importe)}, vence el ${formatearFecha(c.vencimiento1 + 'T12:00:00')}.`,
      enlace: `/inicio/tributos/cedulon/${c.id}`,
    });
  }
  guardar();
  return proximos.length;
}

// Avisos municipales de ejemplo para la demo ("Simular aviso municipal").
const AVISOS_DEMO: { tipo: TipoAviso; titulo: string; cuerpo: string; barrio?: string }[] = [
  { tipo: 'corte_servicio', titulo: 'Corte de energía programado', cuerpo: 'Hoy de 14 a 16 h por trabajos en la red, en barrio Sarmiento.', barrio: 'Sarmiento' },
  { tipo: 'obra_publica', titulo: 'Desvío de tránsito', cuerpo: 'Por obras de cloacas se desvía el tránsito en barrio Consolata.', barrio: 'Consolata' },
  { tipo: 'evento', titulo: 'Cine al aire libre', cuerpo: 'Este viernes 21 h en el Parque Cincuentenario. Entrada libre.', barrio: 'Parque' },
  { tipo: 'emergencia', titulo: 'Alerta por tormentas fuertes', cuerpo: 'Se esperan ráfagas y granizo. Evitá circular y asegurá objetos sueltos.' },
  { tipo: 'corte_servicio', titulo: 'Corte de agua', cuerpo: 'Mañana de 9 a 12 h en Centro Cívico por conexión de red.', barrio: 'Centro Cívico' },
];
let indiceDemo = 0;

export function simularAvisoMunicipal() {
  const a = AVISOS_DEMO[indiceDemo++ % AVISOS_DEMO.length];
  return { enviado: emitirAviso(a), plantilla: a };
}

let iniciado = false;
const timers: ReturnType<typeof setInterval>[] = [];

/** Arranca la simulación (una sola vez). */
export function iniciarMotor(): void {
  if (iniciado) return;
  iniciado = true;
  timers.push(setInterval(pasoBicis, INTERVALOS.bicis));
  timers.push(setInterval(pasoZonas, INTERVALOS.zonas));
  timers.push(setInterval(() => activarAlarma(), INTERVALOS.alarmas));
  timers.push(setInterval(() => pasoReclamos(), INTERVALOS.reclamos));
  setTimeout(() => revisarVencimientos(), 3 * SEG);
}

export function detenerMotor(): void {
  timers.splice(0).forEach(clearInterval);
  iniciado = false;
}
