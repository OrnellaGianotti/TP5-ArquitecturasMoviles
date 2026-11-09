import type {
  Adjunto,
  Aviso,
  Cedulon,
  NuevoReclamo,
  Pago,
  PreferenciasAvisos,
  Reclamo,
  ReporteBici,
  SesionEstacionamiento,
  TipoAviso,
} from '../tipos';
import { base, guardar, reiniciar, siguienteId } from './almacen';
import { CATEGORIAS_RECLAMO, LINEAS_ATENCION, multasDeEjemplo, VECINO_DEMO } from './datos';
import { publicar } from '../tiempoReal';
import { avisoCorresponde } from '../../lib/avisos';
import { calcularImporte, INFO_ESTACIONAMIENTO, normalizarPatente, patenteValida } from '../../lib/estacionamiento';
import { estadoCedulon, importeAPagar } from '../../lib/tributos';

// =====================================================================================
// Backend simulado: atiende los mismos endpoints REST que tendría la API real
// (base /v1, JSON) y responde con los mismos códigos HTTP (200, 201, 404, 422).
// =====================================================================================

export interface Respuesta {
  status: number;
  cuerpo: unknown;
}

type Manejador = (p: { params: Record<string, string>; query: URLSearchParams; body: any }) => Respuesta;

const ok = (cuerpo: unknown): Respuesta => ({ status: 200, cuerpo });
const creado = (cuerpo: unknown): Respuesta => ({ status: 201, cuerpo });
const noEncontrado = (msg = 'Recurso no encontrado'): Respuesta => ({ status: 404, cuerpo: { error: msg } });
const invalido = (msg: string): Respuesta => ({ status: 422, cuerpo: { error: msg } });

const rutas: { metodo: string; patron: RegExp; claves: string[]; fn: Manejador }[] = [];

function ruta(metodo: string, plantilla: string, fn: Manejador) {
  const claves: string[] = [];
  const patron = new RegExp(
    '^' + plantilla.replace(/:(\w+)/g, (_, k) => (claves.push(k), '([^/]+)')) + '$',
  );
  rutas.push({ metodo, patron, claves, fn });
}

/** Punto de entrada: lo llama el cliente HTTP cuando la API está en modo simulado. */
export function manejar(metodo: string, url: string, body?: unknown): Respuesta {
  const [path, qs = ''] = url.split('?');
  for (const r of rutas) {
    if (r.metodo !== metodo) continue;
    const m = path.match(r.patron);
    if (!m) continue;
    const params = Object.fromEntries(r.claves.map((k, i) => [k, decodeURIComponent(m[i + 1])]));
    const respuesta = r.fn({ params, query: new URLSearchParams(qs), body: body ?? {} });
    if (metodo !== 'GET') guardar();
    return respuesta;
  }
  return noEncontrado(`No existe ${metodo} ${path}`);
}

// ------------------------------------------------------------------ avisos (helper)

/** Crea un aviso si corresponde según las preferencias y lo empuja por tiempo real. */
export function emitirAviso(datos: { tipo: TipoAviso; titulo: string; cuerpo: string; barrio?: string; enlace?: string }): Aviso | null {
  const b = base();
  if (!avisoCorresponde(datos, b.preferencias)) return null;
  const aviso: Aviso = { id: siguienteId('av'), fecha: new Date().toISOString(), leido: false, ...datos };
  if (!aviso.enlace) aviso.enlace = `/avisos/${aviso.id}`;
  b.avisos.unshift(aviso);
  b.avisos = b.avisos.slice(0, 100);
  guardar();
  publicar('avisos.nuevo', aviso);
  return aviso;
}

// ------------------------------------------------------------------ vecino

ruta('GET', '/v1/vecino', () => ok(VECINO_DEMO));

// ------------------------------------------------------------------ bicicletas

ruta('GET', '/v1/bicis/estaciones', () => ok(base().estaciones));

ruta('GET', '/v1/bicis/estaciones/:id', ({ params }) => {
  const e = base().estaciones.find((x) => x.id === params.id);
  return e ? ok(e) : noEncontrado('Estación inexistente');
});

ruta('POST', '/v1/bicis/reportes', ({ body }) => {
  const r = body as ReporteBici;
  const est = base().estaciones.find((x) => x.id === r.estacionId);
  if (!est) return invalido('Elegí una estación válida.');
  if (!r.descripcion || r.descripcion.trim().length < 5) return invalido('Contanos brevemente qué pasó (mínimo 5 caracteres).');
  const motivos: Record<ReporteBici['tipo'], string> = {
    bici_danada: 'Bicicleta dañada',
    anclaje_trabado: 'Anclaje trabado',
    estacion_sin_bicis: 'Estación sin bicicletas',
    otro: 'Otro problema en la estación',
  };
  // El reporte entra al Centro de reclamos, categoría "Bicis públicas".
  const reclamo = crearReclamo({
    categoria: 'Bicis públicas',
    motivo: motivos[r.tipo],
    descripcion: `${r.numeroBici ? `Bici N° ${r.numeroBici}. ` : ''}${r.descripcion}`,
    direccion: `Estación ${est.nombre}`,
    ubicacion: est.ubicacion,
    adjuntos: [],
  });
  return creado(reclamo);
});

// ------------------------------------------------------------------ tributos

ruta('GET', '/v1/tributos/obligaciones', () => ok(base().obligaciones));

ruta('PATCH', '/v1/tributos/obligaciones/:id', ({ params, body }) => {
  const o = base().obligaciones.find((x) => x.id === params.id);
  if (!o) return noEncontrado();
  if (typeof body.recordatorio === 'boolean') o.recordatorio = body.recordatorio;
  return ok(o);
});

const conEstado = (c: Cedulon) => ({ ...c, estado: estadoCedulon(c), importeHoy: importeAPagar(c) });

ruta('GET', '/v1/tributos/cedulones', ({ query }) => {
  const obl = query.get('obligacion');
  const lista = base().cedulones.filter((c) => !obl || c.obligacionId === obl).map(conEstado);
  return ok(lista.sort((a, b) => b.periodo.localeCompare(a.periodo)));
});

ruta('GET', '/v1/tributos/cedulones/:id', ({ params }) => {
  const c = base().cedulones.find((x) => x.id === params.id);
  return c ? ok(conEstado(c)) : noEncontrado('Cedulón inexistente');
});

ruta('POST', '/v1/tributos/pagos', ({ body }) => {
  const ids: string[] = body.cedulonIds ?? [];
  const medio: string = body.medio;
  if (!ids.length) return invalido('Elegí al menos un cedulón.');
  if (!medio) return invalido('Elegí un medio de pago.');
  const b = base();
  const cedulones = ids.map((id) => b.cedulones.find((c) => c.id === id));
  if (cedulones.some((c) => !c)) return noEncontrado('Algún cedulón no existe.');
  if (cedulones.some((c) => c!.estado === 'pagado')) return invalido('Alguno de los cedulones ya está pagado.');
  const pagos: Pago[] = cedulones.map((c) => {
    const pago: Pago = {
      id: siguienteId('pag'),
      cedulonId: c!.id,
      obligacionId: c!.obligacionId,
      fecha: new Date().toISOString(),
      importe: importeAPagar(c!),
      medio,
      comprobante: `CP-${Date.now().toString(36).toUpperCase()}-${c!.id.slice(-7).replace('-', '')}`,
    };
    c!.estado = 'pagado';
    b.pagos.unshift(pago);
    return pago;
  });
  publicar('tributos', { tipo: 'pago', pagos });
  return creado(pagos);
});

ruta('GET', '/v1/tributos/pagos', () => ok([...base().pagos].sort((a, b) => b.fecha.localeCompare(a.fecha))));

ruta('GET', '/v1/tributos/multas', ({ query }) => {
  const dni = (query.get('dni') ?? '').replace(/\D/g, '');
  const dominio = normalizarPatente(query.get('dominio') ?? '');
  if (!dni && !dominio) return invalido('Ingresá un DNI o un dominio.');
  if (dni && (dni.length < 7 || dni.length > 8)) return invalido('El DNI debe tener 7 u 8 dígitos.');
  // Ficticio: el dominio de ejemplo tiene una multa; cualquier otro dato, ninguna.
  const multas = multasDeEjemplo().filter((m) => m.dominio === dominio || dni === '00000000');
  return ok(multas);
});

// ------------------------------------------------------------------ reclamos

ruta('GET', '/v1/reclamos/categorias', () => ok(CATEGORIAS_RECLAMO));

ruta('GET', '/v1/reclamos', ({ query }) => {
  const q = (query.get('q') ?? '').trim().toLowerCase();
  const estado = query.get('estado');
  const lista = base()
    .reclamos.filter((r) => !estado || r.estado === estado)
    .filter((r) => !q || [r.numero, r.categoria, r.motivo, r.descripcion, r.direccion].some((t) => t.toLowerCase().includes(q)))
    .sort((a, b) => b.creado.localeCompare(a.creado))
    .map(({ simularAvance: _s, ...r }) => r);
  return ok(lista);
});

ruta('GET', '/v1/reclamos/:id', ({ params }) => {
  const r = base().reclamos.find((x) => x.id === params.id || x.numero === params.id);
  if (!r) return noEncontrado('Reclamo inexistente');
  const { simularAvance: _s, ...sin } = r;
  return ok(sin);
});

const MAX_FOTOS = 5;
const MAX_DOC_BYTES = 5 * 1024 * 1024;

function validarReclamo(n: NuevoReclamo): string | null {
  const cat = CATEGORIAS_RECLAMO.find((c) => c.nombre === n.categoria);
  if (!cat) return 'Elegí una categoría.';
  if (!cat.motivos.includes(n.motivo)) return 'Elegí un motivo de la lista.';
  if (!n.direccion || n.direccion.trim().length < 4) return 'Indicá la dirección o usá tu ubicación.';
  if (!n.descripcion || n.descripcion.trim().length < 10) return 'Describí el problema (mínimo 10 caracteres).';
  const adj: Adjunto[] = n.adjuntos ?? [];
  if (adj.filter((a) => a.tipo === 'foto').length > MAX_FOTOS) return `Podés subir hasta ${MAX_FOTOS} fotos.`;
  if (adj.some((a) => a.tipo === 'documento' && a.tamanio > MAX_DOC_BYTES)) return 'Cada documento puede pesar hasta 5 MB.';
  return null;
}

function crearReclamo(n: NuevoReclamo): Reclamo {
  const b = base();
  const ahora = new Date().toISOString();
  b.secuencia += 1;
  const reclamo: Reclamo & { simularAvance: boolean } = {
    id: `rec-${b.secuencia}`,
    numero: `103-${new Date().getFullYear()}-${String(b.secuencia).padStart(6, '0')}`,
    categoria: n.categoria,
    motivo: n.motivo,
    descripcion: n.descripcion.trim(),
    direccion: n.direccion.trim(),
    ubicacion: n.ubicacion,
    adjuntos: n.adjuntos ?? [],
    estado: 'recibido',
    historial: [{ estado: 'recibido', fecha: ahora, detalle: 'Reclamo recibido por la Línea 103.' }],
    creado: ahora,
    simularAvance: true,
  };
  b.reclamos.unshift(reclamo);
  guardar();
  publicar('reclamos', { tipo: 'creado', reclamo });
  const { simularAvance: _s, ...sin } = reclamo;
  return sin;
}

ruta('POST', '/v1/reclamos', ({ body }) => {
  const error = validarReclamo(body as NuevoReclamo);
  if (error) return invalido(error);
  return creado(crearReclamo(body as NuevoReclamo));
});

// ------------------------------------------------------------------ líneas de atención

ruta('GET', '/v1/lineas', () => ok(LINEAS_ATENCION));

// ------------------------------------------------------------------ alarmas

ruta('GET', '/v1/alarmas', () => ok(base().alarmas));

// ------------------------------------------------------------------ estacionamiento

ruta('GET', '/v1/estacionamiento/info', () => ok(INFO_ESTACIONAMIENTO));
ruta('GET', '/v1/estacionamiento/zonas', () => ok(base().zonas));
ruta('GET', '/v1/estacionamiento/cuenta', () => ok(base().cuentaEstacionamiento));

ruta('POST', '/v1/estacionamiento/saldo', ({ body }) => {
  const importe = Number(body.importe);
  if (!Number.isFinite(importe) || importe < 500 || importe > 50000) return invalido('La carga debe ser entre $500 y $50.000.');
  if (!body.medio) return invalido('Elegí un medio de pago.');
  const c = base().cuentaEstacionamiento;
  c.saldo = Math.round((c.saldo + importe) * 100) / 100;
  return ok(c);
});

ruta('POST', '/v1/estacionamiento/vehiculos', ({ body }) => {
  const patente = normalizarPatente(String(body.patente ?? ''));
  if (!patenteValida(patente)) return invalido('La patente no es válida (ej.: ABC123 o AB123CD).');
  const c = base().cuentaEstacionamiento;
  if (c.vehiculos.some((v) => v.patente === patente)) return invalido('Esa patente ya está registrada.');
  c.vehiculos.push({ patente, alias: String(body.alias ?? '').trim() || patente });
  return creado(c);
});

ruta('DELETE', '/v1/estacionamiento/vehiculos/:patente', ({ params }) => {
  const c = base().cuentaEstacionamiento;
  if (c.sesionActiva?.patente === params.patente) return invalido('No podés eliminar un vehículo con estacionamiento activo.');
  c.vehiculos = c.vehiculos.filter((v) => v.patente !== params.patente);
  return ok(c);
});

function cerrarSiVencio() {
  const c = base().cuentaEstacionamiento;
  if (c.sesionActiva && new Date(c.sesionActiva.fin).getTime() <= Date.now()) {
    c.sesionActiva.estado = 'finalizada';
    c.historial.unshift(c.sesionActiva);
    c.sesionActiva = null;
  }
}

ruta('POST', '/v1/estacionamiento/sesiones', ({ body }) => {
  cerrarSiVencio();
  const c = base().cuentaEstacionamiento;
  const minutos = Number(body.minutos);
  if (c.sesionActiva) return invalido('Ya tenés un estacionamiento activo.');
  if (!c.vehiculos.some((v) => v.patente === body.patente)) return invalido('Elegí uno de tus vehículos.');
  if (!base().zonas.some((z) => z.id === body.zonaId)) return invalido('Elegí una zona.');
  if (![15, 30, 60, 90, 120, 180].includes(minutos)) return invalido('Duración inválida.');
  const importe = calcularImporte(minutos);
  if (c.saldo < importe) return invalido('Saldo insuficiente. Cargá saldo para estacionar.');
  const inicio = new Date();
  const sesion: SesionEstacionamiento = {
    id: siguienteId('est'),
    patente: body.patente,
    zonaId: body.zonaId,
    inicio: inicio.toISOString(),
    fin: new Date(inicio.getTime() + minutos * 60_000).toISOString(),
    importe,
    estado: 'activa',
  };
  c.saldo = Math.round((c.saldo - importe) * 100) / 100;
  c.sesionActiva = sesion;
  return creado(c);
});

ruta('POST', '/v1/estacionamiento/sesiones/:id/extender', ({ params, body }) => {
  cerrarSiVencio();
  const c = base().cuentaEstacionamiento;
  const s = c.sesionActiva;
  if (!s || s.id !== params.id) return invalido('El estacionamiento ya finalizó.');
  const minutos = Number(body.minutos);
  if (![15, 30, 60].includes(minutos)) return invalido('Podés extender 15, 30 o 60 minutos.');
  const importe = calcularImporte(minutos);
  if (c.saldo < importe) return invalido('Saldo insuficiente para extender.');
  c.saldo = Math.round((c.saldo - importe) * 100) / 100;
  s.fin = new Date(new Date(s.fin).getTime() + minutos * 60_000).toISOString();
  s.importe = Math.round((s.importe + importe) * 100) / 100;
  return ok(c);
});

ruta('POST', '/v1/estacionamiento/sesiones/:id/finalizar', ({ params }) => {
  const c = base().cuentaEstacionamiento;
  const s = c.sesionActiva;
  if (!s || s.id !== params.id) return invalido('No hay un estacionamiento activo con ese id.');
  s.estado = 'finalizada';
  s.fin = new Date().toISOString();
  c.historial.unshift(s);
  c.sesionActiva = null;
  return ok(c);
});

// ------------------------------------------------------------------ avisos

ruta('GET', '/v1/avisos', () => ok(base().avisos));

ruta('POST', '/v1/avisos', ({ body }) => {
  if (!body.tipo || !body.titulo) return invalido('Faltan datos del aviso.');
  const aviso = emitirAviso(body);
  return aviso ? creado(aviso) : ok(null);
});

ruta('POST', '/v1/avisos/:id/leido', ({ params }) => {
  const a = base().avisos.find((x) => x.id === params.id);
  if (!a) return noEncontrado();
  a.leido = true;
  return ok(a);
});

ruta('POST', '/v1/avisos/leer-todos', () => {
  base().avisos.forEach((a) => (a.leido = true));
  return ok(base().avisos);
});

ruta('GET', '/v1/avisos/preferencias', () => ok(base().preferencias));

ruta('PUT', '/v1/avisos/preferencias', ({ body }) => {
  const p = body as PreferenciasAvisos;
  if (!p?.tipos || !['inmediata', 'resumen_diario'].includes(p.frecuencia)) return invalido('Preferencias inválidas.');
  p.tipos.emergencia = true; // las emergencias no se pueden desactivar
  base().preferencias = p;
  return ok(p);
});

// ------------------------------------------------------------------ demo

ruta('POST', '/v1/demo/reiniciar', () => {
  reiniciar();
  return ok({ reiniciado: true });
});
