import { IonBadge, IonButton, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonContent, IonIcon, IonItem, IonLabel, IonList, IonNote, IonPage, IonSpinner, IonText } from '@ionic/react';
import { alertCircle, bicycle, idCard, locate, navigate, time } from 'ionicons/icons';
import { useMemo, useState } from 'react';
import Encabezado from '../../componentes/Encabezado';
import { MapaBicis } from '../../componentes/mapas';
import { bicisApi } from '../../api/servicios';
import type { Coordenada, EstacionBici } from '../../api/tipos';
import { useApp } from '../../contexto/AppContexto';
import { useDatos, useTiempoReal } from '../../hooks/useDatos';
import { obtenerUbicacion } from '../../lib/dispositivo';
import { formatearDistancia, ordenarPorCercania } from '../../lib/geo';
import { colorDisponibilidad } from '../../lib/colores';
import { tiempoRelativo } from '../../lib/formato';

export default function Bicis() {
  const { ubicacion, setUbicacion, avisar } = useApp();
  const { datos: estaciones, setDatos, cargando, error, recargar } = useDatos(bicisApi.estaciones);
  const [buscandoUbicacion, setBuscandoUbicacion] = useState(false);
  const [enfocar, setEnfocar] = useState<Coordenada | null>(null);
  const [elegida, setElegida] = useState<string | null>(null);

  // Disponibilidad en tiempo real: llega por el canal "bicis" (WebSocket en producción).
  useTiempoReal<EstacionBici[]>('bicis', (lista) => setDatos(lista));

  const lista = useMemo(() => {
    if (!estaciones) return [];
    return ubicacion ? ordenarPorCercania(estaciones, ubicacion) : estaciones.map((e) => ({ ...e, distancia: NaN }));
  }, [estaciones, ubicacion]);

  async function buscarCercanas() {
    setBuscandoUbicacion(true);
    const r = await obtenerUbicacion();
    setBuscandoUbicacion(false);
    setUbicacion(r.coordenada);
    if (!r.real) avisar(`${r.motivo} Usamos una ubicación de prueba en el Centro Cívico.`, 'warning');
    const cercana = estaciones ? ordenarPorCercania(estaciones, r.coordenada)[0] : null;
    if (cercana) {
      setEnfocar(cercana.ubicacion);
      setElegida(cercana.id);
    }
  }

  return (
    <IonPage>
      <Encabezado titulo="Bicis públicas" atras="/inicio" />
      <IonContent className="ion-padding">
        <div className="sf-contenido">
          <IonCard style={{ margin: '0 0 12px' }}>
            <IonCardHeader>
              <IonCardTitle style={{ fontSize: '1.1rem' }}>San Francisco en Bici</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <IonItem lines="none">
                <IonIcon icon={idCard} slot="start" color="primary" aria-hidden="true" />
                <IonLabel className="ion-text-wrap">Gratis. Registrate una única vez presentando tu DNI en la estación más cercana.</IonLabel>
              </IonItem>
              <IonItem lines="none">
                <IonIcon icon={time} slot="start" color="primary" aria-hidden="true" />
                <IonLabel className="ion-text-wrap">Podés usar la bici hasta 60 minutos. Te entregan casco y cinta refractiva.</IonLabel>
              </IonItem>
            </IonCardContent>
          </IonCard>

          <IonButton expand="block" onClick={buscarCercanas} disabled={buscandoUbicacion || !estaciones}>
            {buscandoUbicacion ? <IonSpinner name="dots" /> : <IonIcon slot="start" icon={locate} />}
            Buscar estaciones cerca mío
          </IonButton>

          {cargando && !estaciones && <IonSpinner style={{ display: 'block', margin: '24px auto' }} />}
          {error && (
            <IonText color="danger">
              <p>
                {error} <IonButton size="small" fill="clear" onClick={recargar}>Reintentar</IonButton>
              </p>
            </IonText>
          )}

          {estaciones && (
            <>
              <MapaBicis
                estaciones={estaciones}
                ubicacion={ubicacion}
                enfocar={enfocar}
                onElegir={(e) => setElegida(e.id)}
              />
              <div className="sf-leyenda" aria-hidden="true">
                <span style={{ ['--c' as string]: '#1f8a4c' }}>3 o más bicis</span>
                <span style={{ ['--c' as string]: '#e8a317' }}>1 o 2</span>
                <span style={{ ['--c' as string]: '#c62828' }}>Sin bicis</span>
                <span style={{ ['--c' as string]: '#1a73e8' }}>Vos</span>
              </div>

              <h2 className="sf-titulo-seccion">{ubicacion ? 'Estaciones más cercanas' : 'Estaciones'}</h2>
              <IonList inset style={{ margin: 0 }} aria-live="polite">
                {lista.map((e) => (
                  <IonItem
                    key={e.id}
                    button
                    detail={false}
                    color={elegida === e.id ? 'light' : undefined}
                    onClick={() => {
                      setElegida(e.id);
                      setEnfocar(e.ubicacion);
                    }}
                  >
                    <IonIcon icon={bicycle} slot="start" style={{ color: colorDisponibilidad(e) }} aria-hidden="true" />
                    <IonLabel className="ion-text-wrap">
                      <h3>{e.nombre}</h3>
                      <p>{e.direccion}</p>
                      <p>
                        <IonNote>Actualizado {tiempoRelativo(e.actualizado)}</IonNote>
                      </p>
                    </IonLabel>
                    <div slot="end" style={{ textAlign: 'right' }}>
                      <IonBadge style={{ background: colorDisponibilidad(e) }} aria-label={`${e.bicisDisponibles} bicis disponibles`}>
                        {e.bicisDisponibles} bicis
                      </IonBadge>
                      <div style={{ fontSize: '0.75rem', marginTop: 4 }}>{e.anclajesLibres} anclajes libres</div>
                      {!Number.isNaN(e.distancia) && (
                        <div style={{ fontSize: '0.75rem' }}>
                          <IonIcon icon={navigate} aria-hidden="true" /> {formatearDistancia(e.distancia)}
                        </div>
                      )}
                    </div>
                  </IonItem>
                ))}
              </IonList>
              <IonButton expand="block" fill="outline" color="danger" routerLink="/inicio/bicis/reportar" style={{ marginTop: 16 }}>
                <IonIcon slot="start" icon={alertCircle} />
                Reportar un problema con una bici o estación
              </IonButton>
              <p className="sf-nota">
                Nombres de estaciones reales; disponibilidad simulada. En producción los anclajes enviarían su estado al servidor y la app lo recibiría por WebSocket.
              </p>
            </>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
}
