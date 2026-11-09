import { IonChip, IonContent, IonIcon, IonItem, IonLabel, IonList, IonNote, IonPage, IonRadio, IonRadioGroup, IonRange, IonToggle } from '@ionic/react';
import { checkmarkCircle } from 'ionicons/icons';
import Encabezado from '../../componentes/Encabezado';
import type { PreferenciasAvisos, TipoAviso } from '../../api/tipos';
import { BARRIOS } from '../../api/simulado/datos';
import { useApp } from '../../contexto/AppContexto';
import { ETIQUETAS_AVISO } from '../../lib/avisos';
import { formatearDistancia } from '../../lib/geo';

/** Personalización de avisos: tipo de alerta, frecuencia y zonas de interés. */
export default function Preferencias() {
  const { preferencias: p, guardarPreferencias, avisar } = useApp();

  const guardar = (nuevas: PreferenciasAvisos) => guardarPreferencias(nuevas).catch((e) => avisar((e as Error).message, 'danger'));

  return (
    <IonPage>
      <Encabezado titulo="Preferencias de avisos" atras="/perfil" />
      <IonContent className="ion-padding">
        <div className="sf-contenido">
          <h2 className="sf-titulo-seccion">¿Qué avisos querés recibir?</h2>
          <IonList inset style={{ margin: 0 }}>
            {(Object.keys(ETIQUETAS_AVISO) as TipoAviso[]).map((t) => (
              <IonItem key={t}>
                <IonToggle
                  checked={p.tipos[t]}
                  disabled={t === 'emergencia'}
                  onIonChange={(e) => void guardar({ ...p, tipos: { ...p.tipos, [t]: e.detail.checked } })}
                >
                  <IonLabel>
                    {ETIQUETAS_AVISO[t]}
                    {t === 'emergencia' && <p>Siempre activos, por tu seguridad.</p>}
                  </IonLabel>
                </IonToggle>
              </IonItem>
            ))}
          </IonList>

          <h2 className="sf-titulo-seccion">Frecuencia</h2>
          <IonList inset style={{ margin: 0 }}>
            <IonRadioGroup value={p.frecuencia} onIonChange={(e) => void guardar({ ...p, frecuencia: e.detail.value })}>
              <IonItem>
                <IonRadio value="inmediata" justify="space-between">
                  <IonLabel>Al instante<p>Cada aviso llega como notificación.</p></IonLabel>
                </IonRadio>
              </IonItem>
              <IonItem>
                <IonRadio value="resumen_diario" justify="space-between">
                  <IonLabel className="ion-text-wrap">Resumen diario<p>Solo interrumpen emergencias, alarmas y estacionamiento; el resto queda en el historial.</p></IonLabel>
                </IonRadio>
              </IonItem>
            </IonRadioGroup>
          </IonList>

          <h2 className="sf-titulo-seccion">Zonas de interés</h2>
          <IonNote style={{ display: 'block', margin: '0 4px 8px' }}>
            {p.barrios.length ? 'Recibís avisos de barrio solo de estas zonas:' : 'Sin zonas elegidas: recibís avisos de toda la ciudad.'}
          </IonNote>
          <div>
            {BARRIOS.map((b) => {
              const activo = p.barrios.includes(b.nombre);
              return (
                <IonChip
                  key={b.nombre}
                  color={activo ? 'primary' : 'medium'}
                  outline={!activo}
                  aria-pressed={activo}
                  onClick={() => void guardar({ ...p, barrios: activo ? p.barrios.filter((x) => x !== b.nombre) : [...p.barrios, b.nombre] })}
                >
                  {activo && <IonIcon icon={checkmarkCircle} />}
                  <IonLabel>{b.nombre}</IonLabel>
                </IonChip>
              );
            })}
          </div>

          <h2 className="sf-titulo-seccion">Alarmas cercanas</h2>
          <IonList inset style={{ margin: 0 }}>
            <IonItem>
              <IonToggle checked={p.alarmasCercanas} onIonChange={(e) => void guardar({ ...p, alarmasCercanas: e.detail.checked })}>
                Avisarme por alarmas cerca de mi ubicación
              </IonToggle>
            </IonItem>
            <IonItem>
              <IonRange
                label={`Radio: ${formatearDistancia(p.radioAlarmasMetros)}`}
                labelPlacement="stacked"
                min={300}
                max={2000}
                step={100}
                value={p.radioAlarmasMetros}
                disabled={!p.alarmasCercanas}
                onIonChange={(e) => void guardar({ ...p, radioAlarmasMetros: e.detail.value as number })}
              />
            </IonItem>
          </IonList>
          <p className="sf-nota">Las preferencias se guardan en el servidor (PUT /v1/avisos/preferencias) para que el envío de push respete tu elección.</p>
        </div>
      </IonContent>
    </IonPage>
  );
}
