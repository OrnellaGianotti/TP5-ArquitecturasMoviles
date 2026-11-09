import { describe, expect, it } from 'vitest';
import { avisoCorresponde, debeInterrumpir, PREFERENCIAS_POR_DEFECTO } from './avisos';

const pref = (cambios = {}) => ({ ...structuredClone(PREFERENCIAS_POR_DEFECTO), ...cambios });

describe('personalización de avisos', () => {
  it('sin barrios elegidos recibe avisos de toda la ciudad', () => {
    expect(avisoCorresponde({ tipo: 'corte_servicio', barrio: 'Roca' }, pref())).toBe(true);
  });

  it('con barrios elegidos filtra los avisos de otros barrios', () => {
    const p = pref({ barrios: ['Catedral'] });
    expect(avisoCorresponde({ tipo: 'corte_servicio', barrio: 'Roca' }, p)).toBe(false);
    expect(avisoCorresponde({ tipo: 'corte_servicio', barrio: 'Catedral' }, p)).toBe(true);
    expect(avisoCorresponde({ tipo: 'evento' }, p)).toBe(true); // aviso para toda la ciudad
  });

  it('respeta los tipos desactivados', () => {
    const p = pref();
    p.tipos.evento = false;
    expect(avisoCorresponde({ tipo: 'evento' }, p)).toBe(false);
  });

  it('las emergencias llegan siempre', () => {
    const p = pref({ barrios: ['Catedral'] });
    p.tipos.emergencia = false;
    expect(avisoCorresponde({ tipo: 'emergencia', barrio: 'Roca' }, p)).toBe(true);
  });

  it('los avisos personales no dependen del barrio', () => {
    expect(avisoCorresponde({ tipo: 'reclamo', barrio: 'Roca' }, pref({ barrios: ['Catedral'] }))).toBe(true);
  });

  it('con resumen diario solo interrumpen las urgencias', () => {
    const p = pref({ frecuencia: 'resumen_diario' });
    expect(debeInterrumpir({ tipo: 'evento' }, p)).toBe(false);
    expect(debeInterrumpir({ tipo: 'emergencia' }, p)).toBe(true);
    expect(debeInterrumpir({ tipo: 'estacionamiento' }, p)).toBe(true);
  });
});
