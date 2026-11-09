import type { Cedulon } from '../api/tipos';

// Reglas de cálculo de los cedulones (simuladas, el municipio no publica una API).

const DIA_MS = 86_400_000;

/** Día (00:00) de una fecha ISO "AAAA-MM-DD", en hora local. */
function finDelDia(fechaIso: string): number {
  const [a, m, d] = fechaIso.slice(0, 10).split('-').map(Number);
  return new Date(a, m - 1, d, 23, 59, 59).getTime();
}

/** Estado real de un cedulón según la fecha de hoy. */
export function estadoCedulon(c: Cedulon, ahora = Date.now()): Cedulon['estado'] {
  if (c.estado === 'pagado') return 'pagado';
  return ahora > finDelDia(c.vencimiento2) ? 'vencido' : 'pendiente';
}

/** Importe a pagar hoy: después del 1er vencimiento se suma el recargo. */
export function importeAPagar(c: Cedulon, ahora = Date.now()): number {
  if (ahora <= finDelDia(c.vencimiento1)) return c.importe;
  return Math.round((c.importe + c.recargo2) * 100) / 100;
}

/** Días que faltan para el próximo vencimiento aplicable (negativo si ya venció). */
export function diasParaVencer(c: Cedulon, ahora = Date.now()): number {
  const limite = ahora <= finDelDia(c.vencimiento1) ? c.vencimiento1 : c.vencimiento2;
  return Math.floor((finDelDia(limite) - ahora) / DIA_MS);
}

/** Cedulones impagos que vencen dentro de los próximos `dias` días (para recordatorios). */
export function proximosAVencer<T extends Cedulon>(cedulones: T[], dias = 5, ahora = Date.now()): T[] {
  return cedulones
    .filter((c) => estadoCedulon(c, ahora) === 'pendiente')
    .filter((c) => {
      const d = diasParaVencer(c, ahora);
      return d >= 0 && d <= dias;
    })
    .sort((a, b) => diasParaVencer(a, ahora) - diasParaVencer(b, ahora));
}

/** Total adeudado (impagos, con recargo si corresponde). */
export function totalAdeudado(cedulones: Cedulon[], ahora = Date.now()): number {
  const total = cedulones
    .filter((c) => estadoCedulon(c, ahora) !== 'pagado')
    .reduce((s, c) => s + importeAPagar(c, ahora), 0);
  return Math.round(total * 100) / 100;
}

/**
 * Código de pago de 20 dígitos con dígito verificador (módulo 10),
 * al estilo de los códigos de barra de los cedulones. Es ficticio.
 */
export function generarCodigoPago(base: string): string {
  const digitos = base.replace(/\D/g, '').padEnd(19, '0').slice(0, 19);
  const suma = digitos
    .split('')
    .map(Number)
    .reduce((s, n, i) => s + n * (i % 2 === 0 ? 3 : 1), 0);
  const verificador = (10 - (suma % 10)) % 10;
  return digitos + verificador;
}

export function codigoPagoValido(codigo: string): boolean {
  if (!/^\d{20}$/.test(codigo)) return false;
  return generarCodigoPago(codigo.slice(0, 19)) === codigo;
}
