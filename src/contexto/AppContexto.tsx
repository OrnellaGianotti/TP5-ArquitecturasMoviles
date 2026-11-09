import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useIonToast } from '@ionic/react';
import type { AlarmaComunitaria, Aviso, Coordenada, PreferenciasAvisos, SesionEstacionamiento } from '../api/tipos';
import { avisosApi, estacionamientoApi } from '../api/servicios';
import { suscribir } from '../api/tiempoReal';
import { debeInterrumpir, PREFERENCIAS_POR_DEFECTO } from '../lib/avisos';
import { distanciaMetros, formatearDistancia } from '../lib/geo';
import { notificarDispositivo } from '../lib/dispositivo';
import { MINUTOS_AVISO_VENCIMIENTO } from '../lib/estacionamiento';

// Estado global de la app: avisos, preferencias, ubicación conocida y estacionamiento activo.
// Además centraliza la llegada de notificaciones (toast dentro de la app + notificación del
// dispositivo), para que cualquier pantalla las reciba aunque el vecino esté en otro módulo.

interface ValorContexto {
  avisos: Aviso[];
  noLeidos: number;
  refrescarAvisos: () => Promise<void>;
  marcarLeido: (id: string) => Promise<void>;
  marcarTodos: () => Promise<void>;
  preferencias: PreferenciasAvisos;
  guardarPreferencias: (p: PreferenciasAvisos) => Promise<void>;
  ubicacion: Coordenada | null;
  setUbicacion: (c: Coordenada | null) => void;
  sesionEstacionamiento: SesionEstacionamiento | null;
  setSesionEstacionamiento: (s: SesionEstacionamiento | null) => void;
  avisar: (mensaje: string, color?: 'success' | 'danger' | 'warning' | 'primary' | 'medium') => void;
}

const Contexto = createContext<ValorContexto | null>(null);

export function useApp(): ValorContexto {
  const v = useContext(Contexto);
  if (!v) throw new Error('useApp debe usarse dentro de <ProveedorApp>');
  return v;
}

export function ProveedorApp({ children }: { children: ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [preferencias, setPreferencias] = useState<PreferenciasAvisos>(PREFERENCIAS_POR_DEFECTO);
  const [ubicacion, setUbicacion] = useState<Coordenada | null>(null);
  const [sesionEstacionamiento, setSesionEstacionamiento] = useState<SesionEstacionamiento | null>(null);
  const [mostrarToast] = useIonToast();

  // Refs para leer el valor actual dentro de los oyentes de tiempo real.
  const prefRef = useRef(preferencias);
  prefRef.current = preferencias;
  const ubicRef = useRef(ubicacion);
  ubicRef.current = ubicacion;

  const avisar = useCallback<ValorContexto['avisar']>(
    (mensaje, color = 'primary') => {
      void mostrarToast({ message: mensaje, duration: 3500, position: 'top', color, buttons: [{ text: 'OK', role: 'cancel' }] });
    },
    [mostrarToast],
  );

  const refrescarAvisos = useCallback(async () => {
    try {
      setAvisos(await avisosApi.listar());
    } catch {
      /* sin conexión: se conserva la lista */
    }
  }, []);

  // Carga inicial
  useEffect(() => {
    void refrescarAvisos();
    avisosApi.preferencias().then(setPreferencias).catch(() => undefined);
    estacionamientoApi
      .cuenta()
      .then((c) => setSesionEstacionamiento(c.sesionActiva))
      .catch(() => undefined);
  }, [refrescarAvisos]);

  // Llegada de avisos por tiempo real ("push")
  useEffect(
    () =>
      suscribir<Aviso>('avisos.nuevo', (aviso) => {
        setAvisos((prev) => [aviso, ...prev.filter((a) => a.id !== aviso.id)]);
        if (debeInterrumpir(aviso, prefRef.current)) {
          avisar(`${aviso.titulo}: ${aviso.cuerpo}`, aviso.tipo === 'emergencia' || aviso.tipo === 'alarma' ? 'danger' : 'primary');
          void notificarDispositivo(aviso.titulo, aviso.cuerpo, aviso.enlace);
        }
      }),
    [avisar],
  );

  // Alarmas cercanas: la cercanía se calcula EN EL DISPOSITIVO; la ubicación del vecino
  // no se envía al servidor (privacidad por diseño).
  useEffect(
    () =>
      suscribir<AlarmaComunitaria>('alarma.activada', (alarma) => {
        const pref = prefRef.current;
        const pos = ubicRef.current;
        if (!pref.alarmasCercanas || !pos) return;
        if (pref.barrios.includes(alarma.barrio)) return; // ya lo avisa la suscripción por zona
        const d = distanciaMetros(pos, alarma.ubicacion);
        if (d > pref.radioAlarmasMetros) return;
        void avisosApi.crear({
          tipo: 'alarma',
          titulo: `Alarma activada a ${formatearDistancia(d)}`,
          cuerpo: `Se activó la ${alarma.referencia} (${alarma.barrio}). Si es una emergencia llamá al 911.`,
          enlace: '/inicio/alarmas',
        });
      }),
    [],
  );

  // Temporizador del estacionamiento: avisa 5 minutos antes y al vencer.
  const avisadoRef = useRef<{ id: string; previo: boolean; fin: boolean; finIso: string } | null>(null);
  useEffect(() => {
    const s = sesionEstacionamiento;
    if (!s) return;
    if (!avisadoRef.current || avisadoRef.current.id !== s.id || avisadoRef.current.finIso !== s.fin) {
      avisadoRef.current = { id: s.id, previo: false, fin: false, finIso: s.fin };
    }
    const revisar = () => {
      const flags = avisadoRef.current!;
      const resta = new Date(s.fin).getTime() - Date.now();
      if (!flags.previo && resta > 0 && resta <= MINUTOS_AVISO_VENCIMIENTO * 60_000) {
        flags.previo = true;
        void avisosApi.crear({
          tipo: 'estacionamiento',
          titulo: 'Tu estacionamiento está por vencer',
          cuerpo: `Al vehículo ${s.patente} le quedan menos de ${MINUTOS_AVISO_VENCIMIENTO} minutos. Podés extenderlo desde la app.`,
          enlace: '/inicio/estacionamiento',
        });
      }
      if (!flags.fin && resta <= 0) {
        flags.fin = true;
        void avisosApi.crear({
          tipo: 'estacionamiento',
          titulo: 'Terminó tu estacionamiento',
          cuerpo: `El tiempo del vehículo ${s.patente} venció. Extendelo o retirá el vehículo para evitar una multa.`,
          enlace: '/inicio/estacionamiento',
        });
      }
    };
    revisar();
    const t = setInterval(revisar, 5000);
    return () => clearInterval(t);
  }, [sesionEstacionamiento]);

  const marcarLeido = useCallback(async (id: string) => {
    setAvisos((prev) => prev.map((a) => (a.id === id ? { ...a, leido: true } : a)));
    await avisosApi.marcarLeido(id).catch(() => undefined);
  }, []);

  const marcarTodos = useCallback(async () => {
    setAvisos((prev) => prev.map((a) => ({ ...a, leido: true })));
    await avisosApi.marcarTodos().catch(() => undefined);
  }, []);

  const guardarPreferencias = useCallback(async (p: PreferenciasAvisos) => {
    setPreferencias(await avisosApi.guardarPreferencias(p));
  }, []);

  const valor = useMemo<ValorContexto>(
    () => ({
      avisos,
      noLeidos: avisos.filter((a) => !a.leido).length,
      refrescarAvisos,
      marcarLeido,
      marcarTodos,
      preferencias,
      guardarPreferencias,
      ubicacion,
      setUbicacion,
      sesionEstacionamiento,
      setSesionEstacionamiento,
      avisar,
    }),
    [avisos, refrescarAvisos, marcarLeido, marcarTodos, preferencias, guardarPreferencias, ubicacion, sesionEstacionamiento, avisar],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}
