// Tipos del dominio: son el "contrato" entre la app y la API REST.
// Los usan tanto los servicios de la app como el backend simulado.

export interface Coordenada {
  lat: number;
  lng: number;
}

// ---------- Bicicletas públicas ----------
export interface EstacionBici {
  id: string;
  nombre: string;
  direccion: string;
  ubicacion: Coordenada;
  ubicacionAproximada?: boolean;
  capacidad: number;
  bicisDisponibles: number;
  bicisAdaptadas: number;
  anclajesLibres: number;
  estado: 'operativa' | 'fuera_de_servicio';
  horario: string;
  actualizado: string; // ISO
}

export interface ReporteBici {
  estacionId: string;
  numeroBici?: string;
  tipo: 'bici_danada' | 'anclaje_trabado' | 'estacion_sin_bicis' | 'otro';
  descripcion: string;
}

// ---------- Dirección General Tributaria ----------
export type TipoTributo = 'inmueble' | 'automotor' | 'comercio';

export interface Obligacion {
  id: string;
  tipo: TipoTributo;
  nombre: string; // nombre de la tasa
  identificador: string; // nro de cuenta / dominio / legajo (ficticio)
  descripcion: string; // ej. dirección del inmueble o modelo del auto
  recordatorio: boolean;
}

export interface Cedulon {
  id: string;
  obligacionId: string;
  periodo: string; // ej. "2026-10"
  descripcion: string;
  importe: number;
  vencimiento1: string; // fecha ISO (día)
  vencimiento2: string;
  recargo2: number; // importe adicional al 2do vencimiento
  estado: 'pendiente' | 'pagado' | 'vencido';
  codigoPago: string;
}

export interface Pago {
  id: string;
  cedulonId: string;
  obligacionId: string;
  fecha: string;
  importe: number;
  medio: string;
  comprobante: string;
}

export interface Multa {
  acta: string;
  fecha: string;
  dominio: string;
  motivo: string;
  importe: number;
  vencimiento: string;
  estado: 'pendiente' | 'pagada';
}

// ---------- Centro de reclamos (Línea 103) ----------
export type EstadoReclamo = 'recibido' | 'asignado' | 'en_curso' | 'resuelto';

export interface Adjunto {
  nombre: string;
  tipo: 'foto' | 'documento';
  tamanio: number; // bytes
  miniatura?: string; // data URL comprimida (solo fotos)
}

export interface EventoReclamo {
  estado: EstadoReclamo;
  fecha: string;
  detalle: string;
}

export interface Reclamo {
  id: string;
  numero: string;
  categoria: string;
  motivo: string;
  descripcion: string;
  direccion: string;
  ubicacion?: Coordenada;
  adjuntos: Adjunto[];
  estado: EstadoReclamo;
  historial: EventoReclamo[];
  creado: string;
}

export interface NuevoReclamo {
  categoria: string;
  motivo: string;
  descripcion: string;
  direccion: string;
  ubicacion?: Coordenada;
  adjuntos: Adjunto[];
}

// ---------- Líneas de atención ----------
export interface LineaAtencion {
  id: string;
  area: string;
  descripcion: string;
  telefono?: string;
  email?: string;
  whatsapp?: string;
  horario: string;
  urgencia?: boolean;
  datoReal: boolean; // true = tomado de la web municipal; false = ficticio
}

// ---------- Alarmas comunitarias ----------
export interface AlarmaComunitaria {
  id: string;
  barrio: string;
  referencia: string;
  ubicacion: Coordenada;
  estado: 'activada' | 'desactivada' | 'sin_conexion';
  ultimaActivacion?: string;
  actualizado: string;
}

// ---------- Estacionamiento medido ----------
export interface ZonaEstacionamiento {
  id: string;
  nombre: string;
  calles: string;
  poligono: Coordenada[];
  ocupacion: 'baja' | 'media' | 'alta';
}

export interface InfoEstacionamiento {
  costoHora: number;
  fraccionMinutos: number;
  costoTicket: number;
  horarios: { dias: string; franjas: string[] }[];
}

export interface Vehiculo {
  patente: string;
  alias: string;
}

export interface SesionEstacionamiento {
  id: string;
  patente: string;
  zonaId: string;
  inicio: string;
  fin: string;
  importe: number;
  estado: 'activa' | 'finalizada';
}

export interface CuentaEstacionamiento {
  saldo: number;
  vehiculos: Vehiculo[];
  sesionActiva: SesionEstacionamiento | null;
  historial: SesionEstacionamiento[];
}

// ---------- Notificaciones ----------
export type TipoAviso =
  | 'corte_servicio'
  | 'obra_publica'
  | 'evento'
  | 'emergencia'
  | 'vencimiento'
  | 'alarma'
  | 'reclamo'
  | 'estacionamiento';

export interface Aviso {
  id: string;
  tipo: TipoAviso;
  titulo: string;
  cuerpo: string;
  barrio?: string; // si es null aplica a toda la ciudad
  enlace?: string; // ruta interna o URL con más información
  fecha: string;
  leido: boolean;
}

export interface PreferenciasAvisos {
  tipos: Record<TipoAviso, boolean>;
  frecuencia: 'inmediata' | 'resumen_diario';
  barrios: string[]; // vacío = toda la ciudad
  alarmasCercanas: boolean;
  radioAlarmasMetros: number;
}

// ---------- Vecino ----------
export interface Vecino {
  nombre: string;
  email: string;
  barrio: string;
  ficticio: true;
}
