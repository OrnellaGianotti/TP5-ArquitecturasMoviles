import { api } from './cliente';
import type {
  AlarmaComunitaria,
  Aviso,
  Cedulon,
  CuentaEstacionamiento,
  EstacionBici,
  InfoEstacionamiento,
  LineaAtencion,
  Multa,
  NuevoReclamo,
  Obligacion,
  Pago,
  PreferenciasAvisos,
  Reclamo,
  ReporteBici,
  TipoAviso,
  Vecino,
  ZonaEstacionamiento,
} from './tipos';

// Un servicio por módulo. Cada función es un endpoint de la API REST (base /v1).
// Las pantallas importan solo de acá: nunca hacen fetch por su cuenta.

export type CedulonConEstado = Cedulon & { importeHoy: number };
export type CategoriaReclamo = { nombre: string; icono: string; motivos: string[]; motivosReales?: boolean };

export const vecinoApi = {
  obtener: () => api.get<Vecino>('/v1/vecino'),
};

export const bicisApi = {
  estaciones: () => api.get<EstacionBici[]>('/v1/bicis/estaciones'),
  reportar: (r: ReporteBici) => api.post<Reclamo>('/v1/bicis/reportes', r),
};

export const tributosApi = {
  obligaciones: () => api.get<Obligacion[]>('/v1/tributos/obligaciones'),
  cambiarRecordatorio: (id: string, recordatorio: boolean) =>
    api.patch<Obligacion>(`/v1/tributos/obligaciones/${id}`, { recordatorio }),
  cedulones: (obligacionId?: string) =>
    api.get<CedulonConEstado[]>(`/v1/tributos/cedulones${obligacionId ? `?obligacion=${encodeURIComponent(obligacionId)}` : ''}`),
  cedulon: (id: string) => api.get<CedulonConEstado>(`/v1/tributos/cedulones/${id}`),
  pagar: (cedulonIds: string[], medio: string) => api.post<Pago[]>('/v1/tributos/pagos', { cedulonIds, medio }),
  pagos: () => api.get<Pago[]>('/v1/tributos/pagos'),
  multas: (filtro: { dni?: string; dominio?: string }) => {
    const qs = new URLSearchParams(Object.entries(filtro).filter(([, v]) => v) as [string, string][]);
    return api.get<Multa[]>(`/v1/tributos/multas?${qs}`);
  },
};

export const reclamosApi = {
  categorias: () => api.get<CategoriaReclamo[]>('/v1/reclamos/categorias'),
  listar: (q = '', estado = '') => {
    const qs = new URLSearchParams();
    if (q) qs.set('q', q);
    if (estado) qs.set('estado', estado);
    return api.get<Reclamo[]>(`/v1/reclamos${qs.size ? `?${qs}` : ''}`);
  },
  obtener: (id: string) => api.get<Reclamo>(`/v1/reclamos/${encodeURIComponent(id)}`),
  crear: (r: NuevoReclamo) => api.post<Reclamo>('/v1/reclamos', r),
};

export const lineasApi = {
  listar: () => api.get<LineaAtencion[]>('/v1/lineas'),
};

export const alarmasApi = {
  listar: () => api.get<AlarmaComunitaria[]>('/v1/alarmas'),
};

export const estacionamientoApi = {
  info: () => api.get<InfoEstacionamiento>('/v1/estacionamiento/info'),
  zonas: () => api.get<ZonaEstacionamiento[]>('/v1/estacionamiento/zonas'),
  cuenta: () => api.get<CuentaEstacionamiento>('/v1/estacionamiento/cuenta'),
  cargarSaldo: (importe: number, medio: string) =>
    api.post<CuentaEstacionamiento>('/v1/estacionamiento/saldo', { importe, medio }),
  agregarVehiculo: (patente: string, alias: string) =>
    api.post<CuentaEstacionamiento>('/v1/estacionamiento/vehiculos', { patente, alias }),
  eliminarVehiculo: (patente: string) => api.delete<CuentaEstacionamiento>(`/v1/estacionamiento/vehiculos/${patente}`),
  iniciar: (patente: string, zonaId: string, minutos: number) =>
    api.post<CuentaEstacionamiento>('/v1/estacionamiento/sesiones', { patente, zonaId, minutos }),
  extender: (id: string, minutos: number) =>
    api.post<CuentaEstacionamiento>(`/v1/estacionamiento/sesiones/${id}/extender`, { minutos }),
  finalizar: (id: string) => api.post<CuentaEstacionamiento>(`/v1/estacionamiento/sesiones/${id}/finalizar`),
};

export const avisosApi = {
  listar: () => api.get<Aviso[]>('/v1/avisos'),
  crear: (a: { tipo: TipoAviso; titulo: string; cuerpo: string; barrio?: string; enlace?: string }) =>
    api.post<Aviso | null>('/v1/avisos', a),
  marcarLeido: (id: string) => api.post<Aviso>(`/v1/avisos/${id}/leido`),
  marcarTodos: () => api.post<Aviso[]>('/v1/avisos/leer-todos'),
  preferencias: () => api.get<PreferenciasAvisos>('/v1/avisos/preferencias'),
  guardarPreferencias: (p: PreferenciasAvisos) => api.put<PreferenciasAvisos>('/v1/avisos/preferencias', p),
};

export const demoApi = {
  reiniciar: () => api.post<{ reiniciado: boolean }>('/v1/demo/reiniciar'),
};
