import { describe, expect, it } from 'vitest';
import { distanciaMetros, formatearDistancia, ordenarPorCercania, puntoEnPoligono } from './geo';

describe('geo', () => {
  it('calcula la distancia entre la Terminal y la Tecnoteca (~550 m)', () => {
    const terminal = { lat: -31.42975, lng: -62.09164 };
    const tecnoteca = { lat: -31.43043, lng: -62.08584 };
    const d = distanciaMetros(terminal, tecnoteca);
    expect(d).toBeGreaterThan(500);
    expect(d).toBeLessThan(600);
  });

  it('la distancia de un punto a sí mismo es 0', () => {
    expect(distanciaMetros({ lat: -31.4, lng: -62 }, { lat: -31.4, lng: -62 })).toBe(0);
  });

  it('formatea metros y kilómetros en castellano', () => {
    expect(formatearDistancia(347)).toBe('350 m');
    expect(formatearDistancia(1234)).toBe('1,2 km');
  });

  it('ordena por cercanía', () => {
    const items = [
      { id: 'lejos', ubicacion: { lat: -31.45, lng: -62.08 } },
      { id: 'cerca', ubicacion: { lat: -31.4279, lng: -62.0839 } },
    ];
    const r = ordenarPorCercania(items, { lat: -31.4278, lng: -62.0838 });
    expect(r.map((x) => x.id)).toEqual(['cerca', 'lejos']);
    expect(r[0].distancia).toBeLessThan(r[1].distancia);
  });

  it('detecta si un punto está dentro de una zona', () => {
    const zona = [
      { lat: -31.42, lng: -62.09 }, { lat: -31.42, lng: -62.08 },
      { lat: -31.43, lng: -62.08 }, { lat: -31.43, lng: -62.09 },
    ];
    expect(puntoEnPoligono({ lat: -31.425, lng: -62.085 }, zona)).toBe(true);
    expect(puntoEnPoligono({ lat: -31.44, lng: -62.085 }, zona)).toBe(false);
  });
});
