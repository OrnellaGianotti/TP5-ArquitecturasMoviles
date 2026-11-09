import { describe, expect, it } from 'vitest';
import { calcularImporte, estadoTemporizador, patenteValida, rigeEstacionamiento } from './estacionamiento';

describe('estacionamiento medido', () => {
  it('cobra $625 la hora, por fracciones de 30 minutos', () => {
    expect(calcularImporte(60)).toBe(625);
    expect(calcularImporte(30)).toBe(312.5);
    expect(calcularImporte(45)).toBe(625); // 2 fracciones
    expect(calcularImporte(120)).toBe(1250);
    expect(calcularImporte(0)).toBe(0);
  });

  it('respeta los horarios reales (L a V 8-12:30 y 15-20, sábados 8-13)', () => {
    // 9/11/2026 es lunes
    expect(rigeEstacionamiento(new Date(2026, 10, 9, 10, 0))).toBe(true);
    expect(rigeEstacionamiento(new Date(2026, 10, 9, 13, 0))).toBe(false); // siesta
    expect(rigeEstacionamiento(new Date(2026, 10, 9, 12, 30))).toBe(false); // límite exclusivo
    expect(rigeEstacionamiento(new Date(2026, 10, 9, 19, 59))).toBe(true);
    expect(rigeEstacionamiento(new Date(2026, 10, 14, 12, 0))).toBe(true); // sábado
    expect(rigeEstacionamiento(new Date(2026, 10, 14, 15, 0))).toBe(false);
    expect(rigeEstacionamiento(new Date(2026, 10, 15, 10, 0))).toBe(false); // domingo
  });

  it('el temporizador avisa 5 minutos antes', () => {
    const ahora = Date.now();
    expect(estadoTemporizador(new Date(ahora + 10 * 60_000).toISOString(), ahora)).toBe('en_curso');
    expect(estadoTemporizador(new Date(ahora + 4 * 60_000).toISOString(), ahora)).toBe('por_vencer');
    expect(estadoTemporizador(new Date(ahora - 1000).toISOString(), ahora)).toBe('vencido');
  });

  it('valida patentes argentinas', () => {
    expect(patenteValida('ABC123')).toBe(true);
    expect(patenteValida('ab 123 cd')).toBe(true);
    expect(patenteValida('A1B2C3')).toBe(false);
    expect(patenteValida('')).toBe(false);
  });
});
