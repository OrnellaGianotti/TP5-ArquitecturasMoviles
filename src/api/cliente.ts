// Cliente HTTP de la app. Es el ÚNICO punto por donde las pantallas hablan con el backend.
//
// - Si existe la variable VITE_API_URL, hace fetch() real contra esa API REST.
// - Si no, deriva el pedido al backend simulado (mismos endpoints, mismos códigos HTTP),
//   agregando una latencia de red artificial para que la demo se comporte como la real.
//
// Así, pasar del prototipo a producción es configurar una URL, sin tocar las pantallas.

export class ErrorApi extends Error {
  constructor(
    public status: number,
    mensaje: string,
  ) {
    super(mensaje);
    this.name = 'ErrorApi';
  }
}

export interface RegistroLlamada {
  fecha: string;
  metodo: string;
  ruta: string;
  status: number;
  ms: number;
  origen: 'simulada' | 'real';
}

const URL_API = import.meta.env.VITE_API_URL as string | undefined;
export const MODO_API: 'simulada' | 'real' = URL_API ? 'real' : 'simulada';

// Registro de llamadas (se ve en Perfil > Registro de API): sirve para la demo en clase.
const registro: RegistroLlamada[] = [];
const oyentesRegistro = new Set<() => void>();
export const obtenerRegistro = () => registro;
export function suscribirRegistro(fn: () => void) {
  oyentesRegistro.add(fn);
  return () => oyentesRegistro.delete(fn);
}
function anotar(r: RegistroLlamada) {
  registro.unshift(r);
  registro.splice(80);
  oyentesRegistro.forEach((f) => f());
}

export let latenciaSimulada = { min: 120, max: 380 };
export function configurarLatencia(min: number, max: number) {
  latenciaSimulada = { min, max };
}
const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function pedidoSimulado(metodo: string, ruta: string, body?: unknown) {
  const { manejar } = await import('./simulado/servidor');
  const { min, max } = latenciaSimulada;
  if (max > 0) await esperar(min + Math.random() * (max - min));
  // Se clona el cuerpo como si viajara serializado por la red.
  const r = manejar(metodo, ruta, body === undefined ? undefined : JSON.parse(JSON.stringify(body)));
  return { status: r.status, cuerpo: JSON.parse(JSON.stringify(r.cuerpo ?? null)) };
}

async function pedidoReal(metodo: string, ruta: string, body?: unknown) {
  const res = await fetch(`${URL_API}${ruta}`, {
    method: metodo,
    headers: {
      'Content-Type': 'application/json',
      // En producción: Authorization: Bearer <token de Ciudadano Digital / OpenID Connect>.
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const texto = await res.text();
  return { status: res.status, cuerpo: texto ? JSON.parse(texto) : null };
}

export async function pedir<T>(metodo: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', ruta: string, body?: unknown): Promise<T> {
  const inicio = performance.now();
  let status = 0;
  try {
    const r = MODO_API === 'real' ? await pedidoReal(metodo, ruta, body) : await pedidoSimulado(metodo, ruta, body);
    status = r.status;
    if (status >= 400) {
      const msg = (r.cuerpo as { error?: string } | null)?.error ?? `Error ${status}`;
      throw new ErrorApi(status, msg);
    }
    return r.cuerpo as T;
  } catch (e) {
    if (e instanceof ErrorApi) throw e;
    status = 0;
    throw new ErrorApi(0, 'No hay conexión con el servidor. Probá de nuevo en un rato.');
  } finally {
    anotar({
      fecha: new Date().toISOString(),
      metodo,
      ruta,
      status,
      ms: Math.round(performance.now() - inicio),
      origen: MODO_API,
    });
  }
}

export const api = {
  get: <T>(ruta: string) => pedir<T>('GET', ruta),
  post: <T>(ruta: string, body?: unknown) => pedir<T>('POST', ruta, body ?? {}),
  put: <T>(ruta: string, body: unknown) => pedir<T>('PUT', ruta, body),
  patch: <T>(ruta: string, body: unknown) => pedir<T>('PATCH', ruta, body),
  delete: <T>(ruta: string) => pedir<T>('DELETE', ruta),
};
