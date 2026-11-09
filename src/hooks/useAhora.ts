import { useEffect, useState } from 'react';

/** Devuelve Date.now() actualizado cada `intervaloMs` (para relojes y cuentas regresivas). */
export function useAhora(intervaloMs = 1000): number {
  const [ahora, setAhora] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), intervaloMs);
    return () => clearInterval(t);
  }, [intervaloMs]);
  return ahora;
}
