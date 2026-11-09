import { beforeEach, describe, expect, it } from 'vitest';
import { manejar } from './servidor';
import { base, reiniciar } from './almacen';
import { pasoReclamos, revisarVencimientos, INTERVALOS } from './motor';
import { suscribir } from '../tiempoReal';
import type { CuentaEstacionamiento, Reclamo } from '../tipos';

// Pruebas de integración del backend simulado: mismos endpoints y códigos que la API real.

beforeEach(() => {
  localStorage.clear();
  reiniciar();
});

describe('API REST simulada', () => {
  it('responde 404 en rutas inexistentes', () => {
    expect(manejar('GET', '/v1/no-existe').status).toBe(404);
  });

  it('lista las 5 estaciones de San Francisco en Bici', () => {
    const r = manejar('GET', '/v1/bicis/estaciones');
    expect(r.status).toBe(200);
    const nombres = (r.cuerpo as { nombre: string }[]).map((e) => e.nombre);
    expect(nombres).toEqual(expect.arrayContaining(['UTN San Francisco', 'Terminal de Ómnibus', 'Plaza General Paz']));
    expect(nombres).toHaveLength(5);
  });

  it('un reporte de bici crea un reclamo en la categoría "Bicis públicas"', () => {
    const r = manejar('POST', '/v1/bicis/reportes', { estacionId: 'est-utn', tipo: 'anclaje_trabado', descripcion: 'El anclaje 3 no libera' });
    expect(r.status).toBe(201);
    expect((r.cuerpo as Reclamo).categoria).toBe('Bicis públicas');
  });

  describe('reclamos', () => {
    const valido = {
      categoria: 'Agua y cloaca',
      motivo: 'Caños de agua rotos',
      descripcion: 'Pierde agua en la vereda desde ayer',
      direccion: 'Bv. 25 de Mayo 1500',
      adjuntos: [],
    };

    it('crea un reclamo con número de la Línea 103', () => {
      const r = manejar('POST', '/v1/reclamos', valido);
      expect(r.status).toBe(201);
      expect((r.cuerpo as Reclamo).numero).toMatch(/^103-\d{4}-\d{6}$/);
      expect((r.cuerpo as Reclamo).estado).toBe('recibido');
    });

    it('rechaza con 422 un motivo que no es de la categoría', () => {
      const r = manejar('POST', '/v1/reclamos', { ...valido, motivo: 'Bache en calzada' });
      expect(r.status).toBe(422);
    });

    it('rechaza más de 5 fotos', () => {
      const fotos = Array.from({ length: 6 }, (_, i) => ({ nombre: `f${i}.jpg`, tipo: 'foto', tamanio: 100 }));
      expect(manejar('POST', '/v1/reclamos', { ...valido, adjuntos: fotos }).status).toBe(422);
    });

    it('busca por texto y filtra por estado', () => {
      manejar('POST', '/v1/reclamos', valido);
      const porTexto = manejar('GET', '/v1/reclamos?q=caños').cuerpo as Reclamo[];
      expect(porTexto).toHaveLength(1);
      const resueltos = manejar('GET', '/v1/reclamos?estado=resuelto').cuerpo as Reclamo[];
      expect(resueltos.every((r) => r.estado === 'resuelto')).toBe(true);
    });

    it('avanza de estado y avisa al vecino', () => {
      const creado = manejar('POST', '/v1/reclamos', valido).cuerpo as Reclamo;
      const avisos: unknown[] = [];
      const desuscribir = suscribir('avisos.nuevo', (a) => avisos.push(a));
      pasoReclamos(Date.now() + INTERVALOS.avanceReclamo + 1);
      desuscribir();
      const actualizado = manejar('GET', `/v1/reclamos/${creado.id}`).cuerpo as Reclamo;
      expect(actualizado.estado).toBe('asignado');
      expect(actualizado.historial).toHaveLength(2);
      expect(avisos).toHaveLength(1);
    });
  });

  describe('tributos', () => {
    it('paga un cedulón y lo registra en el historial', () => {
      const pendiente = base().cedulones.find((c) => c.estado === 'pendiente')!;
      const pagosAntes = base().pagos.length;
      const r = manejar('POST', '/v1/tributos/pagos', { cedulonIds: [pendiente.id], medio: 'Mercado Pago' });
      expect(r.status).toBe(201);
      expect(base().pagos.length).toBe(pagosAntes + 1);
      // No se puede pagar dos veces
      expect(manejar('POST', '/v1/tributos/pagos', { cedulonIds: [pendiente.id], medio: 'Mercado Pago' }).status).toBe(422);
    });

    it('envía recordatorios de vencimiento solo una vez por cedulón', () => {
      const primera = revisarVencimientos();
      expect(primera).toBeGreaterThan(0);
      expect(revisarVencimientos()).toBe(0);
    });

    it('valida el DNI en la búsqueda de multas', () => {
      expect(manejar('GET', '/v1/tributos/multas?dni=123').status).toBe(422);
      expect((manejar('GET', '/v1/tributos/multas?dominio=AA000AA').cuerpo as unknown[]).length).toBe(1);
    });
  });

  describe('estacionamiento', () => {
    it('inicia, extiende y finaliza descontando del saldo', () => {
      let c = manejar('POST', '/v1/estacionamiento/sesiones', { patente: 'AA000AA', zonaId: 'zona-1', minutos: 60 }).cuerpo as CuentaEstacionamiento;
      expect(c.saldo).toBe(2500 - 625);
      expect(c.sesionActiva).not.toBeNull();

      c = manejar('POST', `/v1/estacionamiento/sesiones/${c.sesionActiva!.id}/extender`, { minutos: 30 }).cuerpo as CuentaEstacionamiento;
      expect(c.saldo).toBe(2500 - 625 - 312.5);

      c = manejar('POST', `/v1/estacionamiento/sesiones/${c.sesionActiva!.id}/finalizar`).cuerpo as CuentaEstacionamiento;
      expect(c.sesionActiva).toBeNull();
      expect(c.historial).toHaveLength(1);
    });

    it('no permite estacionar sin saldo suficiente', () => {
      base().cuentaEstacionamiento.saldo = 100;
      const r = manejar('POST', '/v1/estacionamiento/sesiones', { patente: 'AA000AA', zonaId: 'zona-1', minutos: 60 });
      expect(r.status).toBe(422);
    });

    it('rechaza patentes inválidas', () => {
      expect(manejar('POST', '/v1/estacionamiento/vehiculos', { patente: 'XYZ' }).status).toBe(422);
      expect(manejar('POST', '/v1/estacionamiento/vehiculos', { patente: 'AB123CD' }).status).toBe(201);
    });
  });

  describe('avisos', () => {
    it('no se pueden desactivar las emergencias', () => {
      const p = structuredClone(base().preferencias);
      p.tipos.emergencia = false;
      const r = manejar('PUT', '/v1/avisos/preferencias', p);
      expect((r.cuerpo as typeof p).tipos.emergencia).toBe(true);
    });

    it('filtra por barrio según las preferencias guardadas', () => {
      const p = structuredClone(base().preferencias);
      p.barrios = ['Catedral'];
      manejar('PUT', '/v1/avisos/preferencias', p);
      expect(manejar('POST', '/v1/avisos', { tipo: 'corte_servicio', titulo: 'Corte', cuerpo: 'x', barrio: 'Roca' }).cuerpo).toBeNull();
      expect(manejar('POST', '/v1/avisos', { tipo: 'corte_servicio', titulo: 'Corte', cuerpo: 'x', barrio: 'Catedral' }).status).toBe(201);
    });
  });
});
