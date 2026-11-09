import type { Coordenada } from '../api/tipos';

// Funciones del dispositivo que son REALES en el prototipo (APIs estándar del navegador).

// ------------------------------------------------------------- Notificaciones

export const notificacionesSoportadas = () => typeof window !== 'undefined' && 'Notification' in window;

export function permisoNotificaciones(): NotificationPermission | 'no_soportado' {
  return notificacionesSoportadas() ? Notification.permission : 'no_soportado';
}

export async function pedirPermisoNotificaciones(): Promise<NotificationPermission | 'no_soportado'> {
  if (!notificacionesSoportadas()) return 'no_soportado';
  if (Notification.permission !== 'default') return Notification.permission;
  return Notification.requestPermission();
}

/**
 * Muestra una notificación del sistema operativo. Usa el service worker cuando está
 * disponible (así funciona también con la PWA instalada y en Android).
 * Devuelve false si no hay permiso: en ese caso la app muestra un aviso interno (toast).
 */
export async function notificarDispositivo(titulo: string, cuerpo: string, url?: string): Promise<boolean> {
  if (permisoNotificaciones() !== 'granted') return false;
  const opciones: NotificationOptions = {
    body: cuerpo,
    icon: '/icono.svg',
    badge: '/icono.svg',
    data: { url },
    tag: `${titulo}-${cuerpo}`.slice(0, 60),
  };
  try {
    const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
    if (reg) {
      await reg.showNotification(titulo, opciones);
    } else {
      new Notification(titulo, opciones);
    }
    return true;
  } catch {
    return false;
  }
}

// ------------------------------------------------------------- Ubicación

export const UBICACION_DE_PRUEBA: Coordenada = { lat: -31.4290, lng: -62.0850 }; // Centro Cívico

export interface ResultadoUbicacion {
  coordenada: Coordenada;
  real: boolean; // false = se usó la ubicación de prueba
  motivo?: string;
}

/** Pide la ubicación al GPS. Si se niega o falla, devuelve una ubicación de prueba. */
export function obtenerUbicacion(timeoutMs = 8000): Promise<ResultadoUbicacion> {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) {
      resolve({ coordenada: UBICACION_DE_PRUEBA, real: false, motivo: 'El navegador no soporta geolocalización.' });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ coordenada: { lat: pos.coords.latitude, lng: pos.coords.longitude }, real: true }),
      (err) =>
        resolve({
          coordenada: UBICACION_DE_PRUEBA,
          real: false,
          motivo: err.code === err.PERMISSION_DENIED ? 'No diste permiso de ubicación.' : 'No se pudo obtener la ubicación.',
        }),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 60_000 },
    );
  });
}

// ------------------------------------------------------------- Dirección (Nominatim, API real)

/**
 * Geocodificación inversa con Nominatim (OpenStreetMap): convierte coordenadas en una
 * dirección legible. Es una API pública real; su política de uso pide como máximo
 * 1 pedido por segundo, por eso solo se llama cuando el vecino toca "Usar mi ubicación".
 */
export async function direccionDesdeCoordenadas(c: Coordenada): Promise<string | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&addressdetails=1&accept-language=es&lat=${c.lat}&lon=${c.lng}`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    const d = await res.json();
    const a = d.address ?? {};
    const calle = a.road ?? a.pedestrian ?? a.footway;
    const numero = a.house_number;
    const barrio = a.suburb ?? a.neighbourhood ?? a.city_district;
    const partes = [calle && (numero ? `${calle} ${numero}` : calle), barrio].filter(Boolean);
    return partes.length ? partes.join(', ') : (d.display_name as string | undefined)?.split(',').slice(0, 2).join(',') ?? null;
  } catch {
    return null;
  }
}

// ------------------------------------------------------------- Fotos

/**
 * Reduce una foto a una miniatura JPEG (lado mayor 640 px). Una foto de celular de 4 MB
 * queda en ~60 KB: se ahorran datos móviles y espacio en el dispositivo.
 */
export function comprimirImagen(archivo: File, ladoMax = 640, calidad = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onerror = () => reject(new Error('No se pudo leer la imagen.'));
    lector.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('El archivo no es una imagen válida.'));
      img.onload = () => {
        const escala = Math.min(1, ladoMax / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * escala);
        canvas.height = Math.round(img.height * escala);
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', calidad));
      };
      img.src = lector.result as string;
    };
    lector.readAsDataURL(archivo);
  });
}

// ------------------------------------------------------------- Compartir

export async function compartir(datos: { title: string; text: string; url?: string }): Promise<boolean> {
  if (navigator.share) {
    try {
      await navigator.share(datos);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}
