import type {
  AlarmaComunitaria,
  Aviso,
  Cedulon,
  CuentaEstacionamiento,
  EstacionBici,
  Obligacion,
  Pago,
  PreferenciasAvisos,
  Reclamo,
  ZonaEstacionamiento,
} from '../tipos';
import {
  alarmasIniciales,
  avisosIniciales,
  cedulonesIniciales,
  estacionesIniciales,
  obligacionesIniciales,
  reclamosIniciales,
  ZONAS_ESTACIONAMIENTO,
} from './datos';
import { PREFERENCIAS_POR_DEFECTO } from '../../lib/avisos';

// "Base de datos" del backend simulado. Vive en memoria y se persiste en localStorage
// para que los datos sobrevivan a recargas y al modo sin conexión.
// En producción esto sería PostgreSQL detrás de la API REST.

export interface EstadoBase {
  version: number;
  estaciones: EstacionBici[];
  obligaciones: Obligacion[];
  cedulones: Cedulon[];
  pagos: Pago[];
  reclamos: (Reclamo & { simularAvance?: boolean })[];
  alarmas: AlarmaComunitaria[];
  zonas: ZonaEstacionamiento[];
  cuentaEstacionamiento: CuentaEstacionamiento;
  avisos: Aviso[];
  preferencias: PreferenciasAvisos;
  vencimientosAvisados: string[];
  secuencia: number;
}

const CLAVE = 'misanfra.base.v1';
const VERSION = 1;

export function estadoInicial(hoy = new Date()): EstadoBase {
  const { cedulones, pagos } = cedulonesIniciales(hoy);
  return {
    version: VERSION,
    estaciones: estacionesIniciales(),
    obligaciones: obligacionesIniciales(),
    cedulones,
    pagos,
    reclamos: reclamosIniciales(hoy),
    alarmas: alarmasIniciales(),
    zonas: structuredClone(ZONAS_ESTACIONAMIENTO),
    cuentaEstacionamiento: {
      saldo: 2500,
      vehiculos: [{ patente: 'AA000AA', alias: 'Mi auto (ejemplo)' }],
      sesionActiva: null,
      historial: [],
    },
    avisos: avisosIniciales(hoy),
    preferencias: structuredClone(PREFERENCIAS_POR_DEFECTO),
    vencimientosAvisados: [],
    secuencia: 5200,
  };
}

let estado: EstadoBase | null = null;

function leerDeDisco(): EstadoBase | null {
  try {
    const texto = localStorage.getItem(CLAVE);
    if (!texto) return null;
    const datos = JSON.parse(texto) as EstadoBase;
    return datos.version === VERSION ? datos : null;
  } catch {
    return null;
  }
}

export function base(): EstadoBase {
  if (!estado) estado = leerDeDisco() ?? estadoInicial();
  return estado;
}

export function guardar(): void {
  if (!estado) return;
  try {
    localStorage.setItem(CLAVE, JSON.stringify(estado));
  } catch {
    // Sin espacio o almacenamiento bloqueado: la demo sigue funcionando en memoria.
  }
}

export function reiniciar(hoy = new Date()): EstadoBase {
  estado = estadoInicial(hoy);
  guardar();
  return estado;
}

/** Genera un id correlativo. */
export function siguienteId(prefijo: string): string {
  const b = base();
  b.secuencia += 1;
  return `${prefijo}-${b.secuencia}`;
}
