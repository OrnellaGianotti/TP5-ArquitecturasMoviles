import { IonBadge, IonButton, IonCard, IonCardContent, IonChip, IonContent, IonIcon, IonItem, IonLabel, IonList, IonNote, IonPage, IonSpinner, IonToggle } from '@ionic/react';
import { checkmarkCircle, locate, notifications, shieldCheckmark } from 'ionicons/icons';
import { useMemo, useState } from 'react';
import Encabezado from '../componentes/Encabezado';
import { MapaAlarmas } from '../componentes/mapas';
import { alarmasApi } from '../api/servicios';
import type { AlarmaComunitaria } from '../api/tipos';
import { BARRIOS } from '../api/simulado/datos';
import { useApp } from '../contexto/AppContexto';
import { useDatos, useTiempoReal } from '../hooks/useDatos';
import { obtenerUbicacion, pedirPermisoNotificaciones } from '../lib/dispositivo';
import { COLOR_ALARMA, TEXTO_ALARMA } from '../lib/colores';
import { formatearDistancia, ordenarPorCercania } from '../lib/geo';
import { tiempoRelativo } from '../lib/formato';
import { MODO_API } from '../api/cliente';

export default function Alarmas() {
  const { ubicacion, setUbicacion, preferencias, guardarPreferencias, avisar } = useApp();
  const { datos: alarmas, setDatos, cargando } = useDatos(alarmasApi.listar);
  const [localizando, setLocalizando] = useState(false);

  useTiempoReal<AlarmaComunitaria[]>('alarmas', (lista) => setDatos(lista.map((a) => ({ ...a }))));

  const activas = alarmas?.filter((a) => a.estado === 'activada') ?? [];
  const cercanas = useMemo(
    () => (alarmas && ubicacion ? ordenarPorCercania(alarmas, ubicacion).filter((a) => a.distancia <= preferencias.radioAlarmasMetros) : []),
    [alarmas, ubicacion, preferencias.radioAlarmasMetros],
  );

  async function ubicarme() {
    setLocalizando(true);
    const r = await obtenerUbicacion();
    setLocalizando(false);
    setUbicacion(r.coordenada);
    if (!r.real) avisar(`${r.motivo} Usamos una ubicación de prueba.`, 'warning');
    await pedirPermisoNotificaciones();
  }

  async function alternarBarrio(barrio: string) {
    const barrios = preferencias.barrios.includes(barrio)
      ? preferencias.barrios.filter((b) => b !== barrio)
      : [...preferencias.barrios, barrio];
    await guardarPreferencias({ ...preferencias, barrios });
    await pedirPermisoNotificaciones();
  }

  async function simularActivacion() {
    const { activarAlarma } = await import('../api/simulado/motor');
    // Para la demo se activa la alarma más cercana al vecino (o una al azar).
    const objetivo = cercanas.find((a) => a.estado === 'desactivada')?.id;
    const a = activarAlarma(objetivo);
    if (!a) avisar('No hay alarmas disponibles para simular ahora.', 'warning');
  }

  return (
    <IonPage>
      <Encabezado titulo="Alarmas comunitarias" atras="/inicio" />
      <IonContent className="ion-padding">
        <div className="sf-contenido">
          <IonCard color={activas.length ? 'danger' : 'success'} style={{ margin: '0 0 12px' }} aria-live="assertive">
            <IonCardContent style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <IonIcon icon={activas.length ? notifications : shieldCheckmark} style={{ fontSize: 30 }} aria-hidden="true" />
              <div>
                <strong>{activas.length ? `${activas.length} alarma(s) activada(s)` : 'Sin alarmas activadas'}</strong>
                <div style={{ fontSize: '0.85rem' }}>
                  {activas.length ? activas.map((a) => a.barrio).join(', ') : 'Se actualiza en tiempo real.'}
                </div>
              </div>
            </IonCardContent>
          </IonCard>

          <IonButton expand="block" fill="outline" onClick={ubicarme} disabled={localizando}>
            {localizando ? <IonSpinner name="dots" /> : <IonIcon slot="start" icon={locate} />}
            Ver alarmas cerca mío
          </IonButton>

          {cargando && !alarmas && <IonSpinner style={{ display: 'block', margin: '24px auto' }} />}
          {alarmas && <MapaAlarmas alarmas={alarmas} ubicacion={ubicacion} radio={preferencias.radioAlarmasMetros} />}
          <div className="sf-leyenda" aria-hidden="true">
            <span style={{ ['--c' as string]: COLOR_ALARMA.activada }}>Activada</span>
            <span style={{ ['--c' as string]: COLOR_ALARMA.desactivada }}>Desactivada</span>
            <span style={{ ['--c' as string]: COLOR_ALARMA.sin_conexion }}>Sin conexión</span>
          </div>

          {ubicacion && (
            <>
              <h2 className="sf-titulo-seccion">A menos de {formatearDistancia(preferencias.radioAlarmasMetros)}</h2>
              <IonList inset style={{ margin: 0 }}>
                {cercanas.map((a) => (
                  <IonItem key={a.id}>
                    <IonLabel>
                      <h3>{a.referencia}</h3>
                      <p>{formatearDistancia(a.distancia)}{a.ultimaActivacion && ` · última activación ${tiempoRelativo(a.ultimaActivacion)}`}</p>
                    </IonLabel>
                    <IonBadge slot="end" style={{ background: COLOR_ALARMA[a.estado] }}>{TEXTO_ALARMA[a.estado]}</IonBadge>
                  </IonItem>
                ))}
                {!cercanas.length && <p className="sf-vacio">No hay alarmas comunitarias en ese radio.</p>}
              </IonList>
            </>
          )}

          <h2 className="sf-titulo-seccion">Alertas</h2>
          <IonList inset style={{ margin: 0 }}>
            <IonItem>
              <IonToggle
                checked={preferencias.alarmasCercanas}
                onIonChange={(e) => void guardarPreferencias({ ...preferencias, alarmasCercanas: e.detail.checked })}
              >
                <IonLabel className="ion-text-wrap">
                  Avisarme si se activa una alarma cerca mío
                  <p>Tu ubicación se usa solo en tu celular; no se envía al municipio.</p>
                </IonLabel>
              </IonToggle>
            </IonItem>
          </IonList>
          <IonNote style={{ display: 'block', margin: '14px 4px 6px' }}>Suscribite a barrios para recibir sus alertas aunque no estés ahí:</IonNote>
          <div>
            {BARRIOS.map((b) => {
              const activo = preferencias.barrios.includes(b.nombre);
              return (
                <IonChip key={b.nombre} color={activo ? 'primary' : 'medium'} outline={!activo} onClick={() => alternarBarrio(b.nombre)} aria-pressed={activo}>
                  {activo && <IonIcon icon={checkmarkCircle} />}
                  <IonLabel>{b.nombre}</IonLabel>
                </IonChip>
              );
            })}
          </div>

          {MODO_API === 'simulada' && (
            <IonButton expand="block" color="danger" fill="outline" onClick={simularActivacion} style={{ marginTop: 18 }}>
              Simular activación de una alarma (demo)
            </IonButton>
          )}
          <p className="sf-nota">Ubicación y estado de las alarmas ficticios, en barrios reales. En producción la central de alarmas publicaría los cambios y la app los recibiría por WebSocket y notificaciones push.</p>
        </div>
      </IonContent>
    </IonPage>
  );
}
