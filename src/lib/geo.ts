import type { Coordenada } from '../api/tipos';

// Centro de San Francisco (Córdoba), según OpenStreetMap (Nominatim).
export const CENTRO_SAN_FRANCISCO: Coordenada = { lat: -31.4278, lng: -62.0838 };

const RADIO_TIERRA_M = 6_371_000;
const rad = (g: number) => (g * Math.PI) / 180;

/** Distancia en metros entre dos puntos (fórmula de haversine). */
export function distanciaMetros(a: Coordenada, b: Coordenada): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * RADIO_TIERRA_M * Math.asin(Math.sqrt(h));
}

/** "350 m" o "1,2 km". */
export function formatearDistancia(metros: number): string {
  if (metros < 1000) return `${Math.round(metros / 10) * 10} m`;
  return `${(metros / 1000).toLocaleString('es-AR', { maximumFractionDigits: 1 })} km`;
}

/** Ordena elementos por cercanía a un punto y les agrega la distancia. */
export function ordenarPorCercania<T extends { ubicacion: Coordenada }>(
  items: T[],
  origen: Coordenada,
): (T & { distancia: number })[] {
  return items
    .map((i) => ({ ...i, distancia: distanciaMetros(origen, i.ubicacion) }))
    .sort((a, b) => a.distancia - b.distancia);
}

/** ¿El punto está dentro del polígono? (algoritmo de ray casting). */
export function puntoEnPoligono(p: Coordenada, poligono: Coordenada[]): boolean {
  let dentro = false;
  for (let i = 0, j = poligono.length - 1; i < poligono.length; j = i++) {
    const a = poligono[i];
    const b = poligono[j];
    const cruza =
      a.lat > p.lat !== b.lat > p.lat &&
      p.lng < ((b.lng - a.lng) * (p.lat - a.lat)) / (b.lat - a.lat) + a.lng;
    if (cruza) dentro = !dentro;
  }
  return dentro;
}
