import type {
  AlarmaComunitaria,
  Aviso,
  Cedulon,
  EstacionBici,
  LineaAtencion,
  Multa,
  Obligacion,
  Pago,
  Reclamo,
  Vecino,
  ZonaEstacionamiento,
} from '../tipos';
import { generarCodigoPago } from '../../lib/tributos';

// =====================================================================================
// Datos semilla del backend simulado.
// - Lo marcado como REAL se tomó de fuentes públicas (web y app municipal, OpenStreetMap).
// - Todo lo demás es FICTICIO: no corresponde a ninguna persona ni cuenta real.
// =====================================================================================

export const VECINO_DEMO: Vecino = {
  nombre: 'Vecino Demo',
  email: 'vecino.demo@ejemplo.com',
  barrio: 'Centro Cívico',
  ficticio: true,
};

// Barrios REALES de San Francisco con su centro según OpenStreetMap (Nominatim).
export const BARRIOS: { nombre: string; lat: number; lng: number }[] = [
  { nombre: 'Centro Cívico', lat: -31.4300, lng: -62.0870 },
  { nombre: 'Catedral', lat: -31.4350, lng: -62.0862 },
  { nombre: 'Iturraspe', lat: -31.4293, lng: -62.0793 },
  { nombre: 'Roca', lat: -31.4226, lng: -62.0899 },
  { nombre: 'Consolata', lat: -31.4322, lng: -62.0961 },
  { nombre: 'Sarmiento', lat: -31.4366, lng: -62.0737 },
  { nombre: 'La Milka', lat: -31.4457, lng: -62.0771 },
  { nombre: 'Parque', lat: -31.4231, lng: -62.0677 },
  { nombre: 'Independencia', lat: -31.4249, lng: -62.1031 },
];

// ---------------- Bicicletas públicas: "San Francisco en Bici" ----------------
// REAL: nombres de las 5 estaciones habilitadas (sanfrancisco.gov.ar). Coordenadas de
// OpenStreetMap; el Sport Automóvil Club no figura en OSM y su ubicación es aproximada.
// FICTICIO: capacidad y disponibilidad (en producción vendrían de los anclajes).
const ahoraIso = () => new Date().toISOString();

export function estacionesIniciales(): EstacionBici[] {
  const base = [
    { id: 'est-utn', nombre: 'UTN San Francisco', direccion: 'Av. de la Universidad (Facultad Regional)', lat: -31.42049, lng: -62.11101, cap: 12 },
    { id: 'est-terminal', nombre: 'Terminal de Ómnibus', direccion: 'Bv. 9 de Julio', lat: -31.42975, lng: -62.09164, cap: 14 },
    { id: 'est-tecnoteca', nombre: 'Tecnoteca San Francisco', direccion: 'Pasaje Prof. Cecil Newton, Centro Cívico', lat: -31.43043, lng: -62.08584, cap: 10 },
    { id: 'est-plaza-gral-paz', nombre: 'Plaza General Paz', direccion: 'Barrio Catedral', lat: -31.43511, lng: -62.08626, cap: 10 },
    { id: 'est-sport', nombre: 'Sport Automóvil Club', direccion: 'Ubicación aproximada', lat: -31.4262, lng: -62.0760, cap: 8, aprox: true },
  ];
  const disponibles = [7, 9, 3, 6, 2];
  return base.map((e, i) => ({
    id: e.id,
    nombre: e.nombre,
    direccion: e.direccion,
    ubicacion: { lat: e.lat, lng: e.lng },
    ubicacionAproximada: e.aprox,
    capacidad: e.cap,
    bicisDisponibles: disponibles[i],
    bicisAdaptadas: i === 1 || i === 2 ? 1 : 0,
    anclajesLibres: e.cap - disponibles[i],
    estado: 'operativa',
    horario: 'Lunes a sábado de 8 a 20 h (horario ficticio)',
    actualizado: ahoraIso(),
  }));
}

// ---------------- Dirección General Tributaria ----------------
// FICTICIO: cuentas, montos y nombres genéricos de tasas (el municipio no publica una API).
export function obligacionesIniciales(): Obligacion[] {
  return [
    { id: 'obl-inm', tipo: 'inmueble', nombre: 'Contribución sobre Inmuebles', identificador: 'Cuenta 000000-1', descripcion: 'Inmueble de ejemplo – Barrio Centro Cívico', recordatorio: true },
    { id: 'obl-aut', tipo: 'automotor', nombre: 'Impuesto Automotor', identificador: 'Dominio AA000AA', descripcion: 'Vehículo de ejemplo', recordatorio: true },
    { id: 'obl-com', tipo: 'comercio', nombre: 'Contribución sobre Comercio e Industria', identificador: 'Legajo 0000-00', descripcion: 'Comercio de ejemplo', recordatorio: false },
  ];
}

const pad = (n: number) => String(n).padStart(2, '0');
const fechaDia = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/**
 * Genera cedulones relativos a la fecha de hoy para que la demo siempre tenga
 * vencimientos próximos: 2 meses pagados, el mes en curso por vencer y el próximo emitido.
 */
export function cedulonesIniciales(hoy = new Date()): { cedulones: Cedulon[]; pagos: Pago[] } {
  const importes: Record<string, number> = { 'obl-inm': 18450.32, 'obl-aut': 26310.0, 'obl-com': 12780.5 };
  const cedulones: Cedulon[] = [];
  const pagos: Pago[] = [];
  const obligaciones = obligacionesIniciales();

  for (const o of obligaciones) {
    for (let delta = -2; delta <= 1; delta++) {
      const mes = new Date(hoy.getFullYear(), hoy.getMonth() + delta, 1);
      const periodo = `${mes.getFullYear()}-${pad(mes.getMonth() + 1)}`;
      // Vencimiento 1: 3 días después de hoy en el mes en curso (para mostrar el recordatorio).
      const v1 =
        delta === 0
          ? new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + (o.tipo === 'comercio' ? 9 : 3))
          : new Date(mes.getFullYear(), mes.getMonth(), 15);
      const v2 = new Date(v1.getFullYear(), v1.getMonth(), v1.getDate() + 10);
      const importe = importes[o.id];
      const id = `ced-${o.id}-${periodo}`;
      const pagado = delta < 0;
      cedulones.push({
        id,
        obligacionId: o.id,
        periodo,
        descripcion: `${o.nombre} – cuota ${mes.getMonth() + 1}/${mes.getFullYear()}`,
        importe,
        vencimiento1: fechaDia(v1),
        vencimiento2: fechaDia(v2),
        recargo2: Math.round(importe * 0.03 * 100) / 100,
        estado: pagado ? 'pagado' : 'pendiente',
        codigoPago: generarCodigoPago(`${o.id.length}${periodo.replace('-', '')}${Math.round(importe)}`),
      });
      if (pagado) {
        const fp = new Date(v1.getFullYear(), v1.getMonth(), v1.getDate() - 2, 10, 30);
        pagos.push({
          id: `pag-${id}`,
          cedulonId: id,
          obligacionId: o.id,
          fecha: fp.toISOString(),
          importe,
          medio: delta === -2 ? 'Tarjeta de débito' : 'Mercado Pago',
          comprobante: `CP-${periodo.replace('-', '')}-${o.id.slice(4).toUpperCase()}`,
        });
      }
    }
  }
  return { cedulones, pagos };
}

// Tribunal Administrativo de Faltas: búsqueda por DNI o dominio (REAL: la web municipal
// permite buscar multas por DNI y vencimiento). Resultados FICTICIOS.
export function multasDeEjemplo(hoy = new Date()): Multa[] {
  const v = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 12);
  return [
    { acta: 'TF-000123', fecha: new Date(hoy.getTime() - 20 * 86_400_000).toISOString(), dominio: 'AA000AA', motivo: 'Estacionar en zona medida sin ticket', importe: 6897, vencimiento: fechaDia(v), estado: 'pendiente' },
  ];
}

// ---------------- Centro de reclamos (Línea 103) ----------------
// REAL: las 12 categorías y los motivos de "Agua y cloaca" son los de la app municipal.
// Los motivos del resto de las categorías son ejemplos representativos.
export const CATEGORIAS_RECLAMO: { nombre: string; icono: string; motivos: string[]; motivosReales?: boolean }[] = [
  {
    nombre: 'Agua y cloaca',
    icono: 'water',
    motivosReales: true,
    motivos: [
      'Arreglo rotura de AMOS',
      'Bocas de registros tapadas',
      'Caños de agua rotos',
      'Colectoras tapadas',
      'Controles en conexiones de cloacas',
      'Desborde de líquidos cloacales',
      'Medidores de agua rotos',
    ],
  },
  { nombre: 'Alumbrado público', icono: 'bulb', motivos: ['Luminaria apagada', 'Luminaria encendida de día', 'Poste dañado', 'Cables sueltos'] },
  { nombre: 'Ambiente', icono: 'leaf', motivos: ['Microbasural', 'Quema de residuos', 'Poda o extracción de árbol', 'Ruidos molestos'] },
  { nombre: 'Bacheo', icono: 'construct', motivos: ['Bache en calzada', 'Hundimiento de pavimento', 'Calle de tierra en mal estado'] },
  { nombre: 'Bicis públicas', icono: 'bicycle', motivos: ['Bicicleta dañada', 'Anclaje trabado', 'Estación sin bicicletas', 'Otro problema en la estación'] },
  { nombre: 'Bromatología', icono: 'restaurant', motivos: ['Comercio con falta de higiene', 'Alimento en mal estado', 'Venta ambulante sin habilitación'] },
  { nombre: 'Estacionamiento medido', icono: 'car', motivos: ['Problema con el pago', 'Cartelería de zona faltante', 'Reclamo por ticket'] },
  { nombre: 'Infraestructura', icono: 'business', motivos: ['Vereda rota', 'Desagüe pluvial tapado', 'Edificio público dañado'] },
  { nombre: 'Señalización', icono: 'navigate', motivos: ['Cartel caído o faltante', 'Semáforo sin funcionar', 'Falta de demarcación'] },
  { nombre: 'Servicios públicos', icono: 'trash', motivos: ['Recolección de residuos no pasó', 'Contenedor dañado', 'Limpieza de espacio verde'] },
  { nombre: 'Tránsito', icono: 'warning', motivos: ['Vehículo abandonado', 'Estacionamiento indebido', 'Pedido de reductor de velocidad'] },
  { nombre: 'Zoonosis', icono: 'paw', motivos: ['Animal suelto', 'Pedido de castración', 'Animal herido en la vía pública'] },
];

export function reclamosIniciales(hoy = new Date()): Reclamo[] {
  const hace = (dias: number, horas = 0) => new Date(hoy.getTime() - dias * 86_400_000 - horas * 3_600_000).toISOString();
  return [
    {
      id: 'rec-1',
      numero: `103-${hoy.getFullYear()}-004812`,
      categoria: 'Alumbrado público',
      motivo: 'Luminaria apagada',
      descripcion: 'La luminaria de la esquina está apagada hace varias noches.',
      direccion: 'Bv. 25 de Mayo y Pasaje de ejemplo',
      ubicacion: { lat: -31.4301, lng: -62.0836 },
      adjuntos: [],
      estado: 'resuelto',
      creado: hace(12),
      historial: [
        { estado: 'recibido', fecha: hace(12), detalle: 'Reclamo recibido por la Línea 103.' },
        { estado: 'asignado', fecha: hace(11), detalle: 'Asignado a la cuadrilla de alumbrado.' },
        { estado: 'en_curso', fecha: hace(9), detalle: 'La cuadrilla está trabajando en el lugar.' },
        { estado: 'resuelto', fecha: hace(9, -4), detalle: 'Se reemplazó la lámpara. ¡Gracias por avisar!' },
      ],
    },
    {
      id: 'rec-2',
      numero: `103-${hoy.getFullYear()}-005107`,
      categoria: 'Bacheo',
      motivo: 'Bache en calzada',
      descripcion: 'Bache profundo frente al número 1200, peligroso para motos.',
      direccion: 'Calle de ejemplo 1200',
      ubicacion: { lat: -31.4262, lng: -62.0905 },
      adjuntos: [],
      estado: 'asignado',
      creado: hace(2),
      historial: [
        { estado: 'recibido', fecha: hace(2), detalle: 'Reclamo recibido por la Línea 103.' },
        { estado: 'asignado', fecha: hace(1), detalle: 'Asignado al área de Bacheo.' },
      ],
    },
  ];
}

// ---------------- Líneas de atención ----------------
// REAL: los números cortos (147, 107, 911, 100 y 103) figuran en "Teléfonos útiles" de la web
// municipal. Los mails y el WhatsApp son FICTICIOS (dominio de ejemplo) hasta confirmarlos.
export const LINEAS_ATENCION: LineaAtencion[] = [
  { id: 'lin-147', area: 'Municipio', descripcion: 'Atención general al vecino', telefono: '147', horario: 'Lunes a viernes', datoReal: true },
  { id: 'lin-103', area: 'Reclamos (Línea 103)', descripcion: 'Reclamos y solicitudes de servicios', telefono: '103', whatsapp: '5493564000103', email: 'reclamos@municipio.ejemplo', horario: 'Todos los días', datoReal: true },
  { id: 'lin-107', area: 'Emergencias médicas', descripcion: 'Servicio de emergencias', telefono: '107', horario: '24 h', urgencia: true, datoReal: true },
  { id: 'lin-911', area: 'Policía', descripcion: 'Emergencias policiales', telefono: '911', horario: '24 h', urgencia: true, datoReal: true },
  { id: 'lin-100', area: 'Bomberos', descripcion: 'Incendios y rescates', telefono: '100', horario: '24 h', urgencia: true, datoReal: true },
  { id: 'lin-dgt', area: 'Dirección General Tributaria', descripcion: 'Tasas, cedulones y planes de pago', email: 'tributos@municipio.ejemplo', whatsapp: '5493564000200', horario: 'Lunes a viernes de 7 a 13 h', datoReal: false },
  { id: 'lin-transito', area: 'Tránsito y estacionamiento', descripcion: 'Estacionamiento medido, licencias y multas', email: 'transito@municipio.ejemplo', horario: 'Lunes a viernes de 7 a 13 h', datoReal: false },
  { id: 'lin-bici', area: 'San Francisco en Bici', descripcion: 'Registro, préstamos y problemas con las bicis', email: 'bicis@municipio.ejemplo', whatsapp: '5493564000300', horario: 'Lunes a sábado', datoReal: false },
];

// ---------------- Alarmas comunitarias ----------------
// FICTICIO: ubicación y estado. Se distribuyen en barrios reales.
export function alarmasIniciales(): AlarmaComunitaria[] {
  const offsets = [
    [0.0021, -0.0015], [-0.0018, 0.0022],
  ];
  const alarmas: AlarmaComunitaria[] = [];
  BARRIOS.forEach((b, i) => {
    offsets.forEach(([dLat, dLng], j) => {
      alarmas.push({
        id: `alm-${i}-${j}`,
        barrio: b.nombre,
        referencia: `Alarma ${b.nombre} ${j + 1}`,
        ubicacion: { lat: b.lat + dLat * (j ? 1 : -1), lng: b.lng + dLng },
        estado: i === 4 && j === 1 ? 'sin_conexion' : 'desactivada',
        actualizado: ahoraIso(),
      });
    });
  });
  return alarmas;
}

// ---------------- Estacionamiento medido ----------------
// Trazado APROXIMADO a partir del mapa "Nivel de ocupación" de la app municipal:
// la zona regulada sigue el Bv. 25 de Mayo y el microcentro. Ocupación FICTICIA.
export const ZONAS_ESTACIONAMIENTO: ZonaEstacionamiento[] = [
  {
    id: 'zona-1',
    nombre: 'Zona 1 – Bv. 25 de Mayo (oeste)',
    calles: 'Bv. 25 de Mayo entre Bv. 9 de Julio y el Centro Cívico',
    ocupacion: 'media',
    poligono: [
      { lat: -31.4289, lng: -62.0912 }, { lat: -31.4289, lng: -62.0858 },
      { lat: -31.4312, lng: -62.0858 }, { lat: -31.4312, lng: -62.0912 },
    ],
  },
  {
    id: 'zona-2',
    nombre: 'Zona 2 – Microcentro',
    calles: 'Manzanas al norte del Bv. 25 de Mayo',
    ocupacion: 'alta',
    poligono: [
      { lat: -31.4256, lng: -62.0872 }, { lat: -31.4256, lng: -62.0805 },
      { lat: -31.4289, lng: -62.0805 }, { lat: -31.4289, lng: -62.0872 },
    ],
  },
  {
    id: 'zona-3',
    nombre: 'Zona 3 – Bv. 25 de Mayo (este)',
    calles: 'Bv. 25 de Mayo hacia el este del Centro Cívico',
    ocupacion: 'baja',
    poligono: [
      { lat: -31.4289, lng: -62.0858 }, { lat: -31.4289, lng: -62.0790 },
      { lat: -31.4312, lng: -62.0790 }, { lat: -31.4312, lng: -62.0858 },
    ],
  },
];

// ---------------- Avisos ----------------
// FICTICIOS, redactados al estilo de las comunicaciones municipales.
export function avisosIniciales(hoy = new Date()): Aviso[] {
  const hace = (h: number) => new Date(hoy.getTime() - h * 3_600_000).toISOString();
  return [
    { id: 'av-1', tipo: 'corte_servicio', titulo: 'Corte de agua programado', cuerpo: 'Mañana de 8 a 13 h habrá corte de agua en barrio Roca por recambio de cañerías.', barrio: 'Roca', enlace: '/avisos/av-1', fecha: hace(3), leido: false },
    { id: 'av-2', tipo: 'obra_publica', titulo: 'Obra de pavimento en Bv. 25 de Mayo', cuerpo: 'Desde el lunes se trabajará media calzada. Circulá con precaución.', barrio: 'Centro Cívico', enlace: '/avisos/av-2', fecha: hace(20), leido: false },
    { id: 'av-3', tipo: 'evento', titulo: 'Feria de emprendedores en la Plaza', cuerpo: 'Este sábado de 17 a 22 h, con música en vivo y patio de comidas.', barrio: 'Catedral', enlace: '/avisos/av-3', fecha: hace(30), leido: true },
  ];
}
