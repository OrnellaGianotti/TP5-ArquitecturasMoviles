// Canal de tiempo real (publicación/suscripción por canales).
//
// En producción la app abriría un WebSocket (o Server-Sent Events) contra el backend:
//   wss://api.misanfra.example/v1/tiempo-real   ->  mensajes { canal, datos }
// En el prototipo, si no hay VITE_WS_URL, el backend simulado publica directamente
// en este bus. Las pantallas no se enteran de la diferencia: solo usan suscribir().

export type Canal =
  | 'bicis'
  | 'alarmas'
  | 'alarma.activada'
  | 'estacionamiento.zonas'
  | 'reclamos'
  | 'avisos.nuevo'
  | 'tributos';

type Oyente = (datos: unknown) => void;

const oyentes = new Map<Canal, Set<Oyente>>();

export function suscribir<T = unknown>(canal: Canal, fn: (datos: T) => void): () => void {
  if (!oyentes.has(canal)) oyentes.set(canal, new Set());
  const set = oyentes.get(canal)!;
  set.add(fn as Oyente);
  return () => set.delete(fn as Oyente);
}

export function publicar(canal: Canal, datos: unknown): void {
  oyentes.get(canal)?.forEach((fn) => {
    try {
      fn(datos);
    } catch (e) {
      console.error(`Error en un oyente del canal ${canal}`, e);
    }
  });
}

let socket: WebSocket | null = null;

/** Conecta al WebSocket real si está configurado (VITE_WS_URL). */
export function conectarWebSocket(url = import.meta.env.VITE_WS_URL as string | undefined): boolean {
  if (!url || socket) return false;
  socket = new WebSocket(url);
  socket.onmessage = (ev) => {
    try {
      const { canal, datos } = JSON.parse(ev.data);
      publicar(canal, datos);
    } catch {
      /* mensaje inválido: se ignora */
    }
  };
  socket.onclose = () => {
    socket = null;
    setTimeout(() => conectarWebSocket(url), 5000); // reconexión simple
  };
  return true;
}
