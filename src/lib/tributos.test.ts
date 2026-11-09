import { describe, expect, it } from 'vitest';
import type { Cedulon } from '../api/tipos';
import { codigoPagoValido, diasParaVencer, estadoCedulon, generarCodigoPago, importeAPagar, proximosAVencer, totalAdeudado } from './tributos';

const hoy = new Date(2026, 10, 9, 10, 0).getTime(); // 9/11/2026

const ced = (p: Partial<Cedulon>): Cedulon => ({
  id: 'c1',
  obligacionId: 'o1',
  periodo: '2026-11',
  descripcion: 'Tasa',
  importe: 1000,
  vencimiento1: '2026-11-12',
  vencimiento2: '2026-11-22',
  recargo2: 30,
  estado: 'pendiente',
  codigoPago: '',
  ...p,
});

describe('tributos', () => {
  it('antes del 1er vencimiento se paga el importe original', () => {
    expect(importeAPagar(ced({}), hoy)).toBe(1000);
    expect(diasParaVencer(ced({}), hoy)).toBe(3);
  });

  it('después del 1er vencimiento se suma el recargo', () => {
    const c = ced({ vencimiento1: '2026-11-05', vencimiento2: '2026-11-15' });
    expect(importeAPagar(c, hoy)).toBe(1030);
    expect(estadoCedulon(c, hoy)).toBe('pendiente');
  });

  it('pasado el 2do vencimiento queda vencido', () => {
    expect(estadoCedulon(ced({ vencimiento1: '2026-10-01', vencimiento2: '2026-10-11' }), hoy)).toBe('vencido');
  });

  it('un cedulón pagado no suma deuda ni recordatorio', () => {
    const lista = [ced({ id: 'a' }), ced({ id: 'b', estado: 'pagado' })];
    expect(totalAdeudado(lista, hoy)).toBe(1000);
    expect(proximosAVencer(lista, 5, hoy).map((c) => c.id)).toEqual(['a']);
  });

  it('solo recuerda los que vencen dentro del plazo', () => {
    const lejos = ced({ id: 'lejos', vencimiento1: '2026-12-20', vencimiento2: '2026-12-30' });
    expect(proximosAVencer([lejos], 5, hoy)).toHaveLength(0);
  });

  it('el código de pago tiene 20 dígitos y dígito verificador', () => {
    const codigo = generarCodigoPago('123');
    expect(codigo).toMatch(/^\d{20}$/);
    expect(codigoPagoValido(codigo)).toBe(true);
    const alterado = codigo.slice(0, 19) + ((Number(codigo[19]) + 1) % 10);
    expect(codigoPagoValido(alterado)).toBe(false);
  });
});
