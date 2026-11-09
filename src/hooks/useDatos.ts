import { useCallback, useEffect, useRef, useState } from 'react';
import { suscribir, type Canal } from '../api/tiempoReal';

/** Carga datos de la API con estados de carga y error, y permite recargar. */
export function useDatos<T>(cargar: () => Promise<T>, deps: unknown[] = []) {
  const [datos, setDatos] = useState<T | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cargarRef = useRef(cargar);
  cargarRef.current = cargar;

  const recargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setDatos(await cargarRef.current());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ocurrió un error.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void recargar();
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  return { datos, setDatos, cargando, error, recargar };
}

/** Se suscribe a un canal de tiempo real mientras el componente está montado. */
export function useTiempoReal<T>(canal: Canal, fn: (datos: T) => void) {
  const fnRef = useRef(fn);
  fnRef.current = fn;
  useEffect(() => suscribir<T>(canal, (d) => fnRef.current(d)), [canal]);
}
