import { IonButton, IonContent, IonIcon, IonItem, IonLabel, IonList, IonNote, IonPage, IonRefresher, IonRefresherContent, IonSegment, IonSegmentButton } from '@ionic/react';
import { checkmarkDone, megaphone, notificationsOff, options } from 'ionicons/icons';
import { useMemo, useState } from 'react';
import Encabezado from '../../componentes/Encabezado';
import { useApp } from '../../contexto/AppContexto';
import { ETIQUETAS_AVISO } from '../../lib/avisos';
import { tiempoRelativo } from '../../lib/formato';
import { pedirPermisoNotificaciones, permisoNotificaciones } from '../../lib/dispositivo';
import { MODO_API } from '../../api/cliente';
import { COLOR_AVISO, ICONO_AVISO } from './iconos';

type Filtro = 'todos' | 'no_leidos' | 'municipio' | 'personales';
const PERSONALES = ['reclamo', 'vencimiento', 'estacionamiento'];

/** Historial de notificaciones recibidas. */
export default function Avisos() {
  const { avisos, noLeidos, marcarTodos, refrescarAvisos, avisar } = useApp();
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [permiso, setPermiso] = useState(permisoNotificaciones());

  const lista = useMemo(
    () =>
      avisos.filter((a) =>
        filtro === 'no_leidos' ? !a.leido : filtro === 'personales' ? PERSONALES.includes(a.tipo) : filtro === 'municipio' ? !PERSONALES.includes(a.tipo) : true,
      ),
    [avisos, filtro],
  );

  async function simular() {
    const { simularAvisoMunicipal } = await import('../../api/simulado/motor');
    const { enviado, plantilla } = simularAvisoMunicipal();
    if (!enviado) avisar(`El aviso “${plantilla.titulo}” no te llegó por tus preferencias (tipo o barrio).`, 'medium');
  }

  return (
    <IonPage>
      <Encabezado
        titulo="Avisos"
        acciones={
          <IonButton routerLink="/perfil/preferencias" aria-label="Preferencias de avisos" color="light">
            <IonIcon icon={options} slot="icon-only" />
          </IonButton>
        }
      />
      <IonContent className="ion-padding">
        <IonRefresher slot="fixed" onIonRefresh={async (e) => { await refrescarAvisos(); e.detail.complete(); }}>
          <IonRefresherContent />
        </IonRefresher>
        <div className="sf-contenido">
          {permiso !== 'granted' && permiso !== 'no_soportado' && (
            <IonItem color="light" lines="none" style={{ borderRadius: 12, marginBottom: 12 }}>
              <IonIcon icon={notificationsOff} slot="start" aria-hidden="true" />
              <IonLabel className="ion-text-wrap">
                <h3>Activá las notificaciones</h3>
                <p>{permiso === 'denied' ? 'Las bloqueaste: habilitalas desde la configuración del navegador.' : 'Así te avisamos de cortes, alarmas y vencimientos aunque la app esté cerrada.'}</p>
              </IonLabel>
              {permiso === 'default' && (
                <IonButton slot="end" onClick={async () => setPermiso(await pedirPermisoNotificaciones())}>Activar</IonButton>
              )}
            </IonItem>
          )}

          <IonSegment scrollable value={filtro} onIonChange={(e) => setFiltro(e.detail.value as Filtro)}>
            <IonSegmentButton value="todos"><IonLabel>Todos</IonLabel></IonSegmentButton>
            <IonSegmentButton value="no_leidos"><IonLabel>Sin leer ({noLeidos})</IonLabel></IonSegmentButton>
            <IonSegmentButton value="municipio"><IonLabel>Municipio</IonLabel></IonSegmentButton>
            <IonSegmentButton value="personales"><IonLabel>Míos</IonLabel></IonSegmentButton>
          </IonSegment>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <IonButton fill="clear" size="small" disabled={!noLeidos} onClick={marcarTodos}>
              <IonIcon icon={checkmarkDone} slot="start" />
              Marcar todo como leído
            </IonButton>
          </div>

          <IonList inset style={{ margin: 0 }} aria-live="polite">
            {lista.map((a) => (
              <IonItem key={a.id} button detail routerLink={`/avisos/${a.id}`}>
                <IonIcon icon={ICONO_AVISO[a.tipo]} color={COLOR_AVISO[a.tipo]} slot="start" aria-hidden="true" />
                <IonLabel className="ion-text-wrap">
                  <h3 style={{ fontWeight: a.leido ? 400 : 700 }}>
                    {!a.leido && <span aria-label="sin leer" style={{ color: 'var(--ion-color-danger)' }}>● </span>}
                    {a.titulo}
                  </h3>
                  <p>{a.cuerpo}</p>
                  <p>
                    <IonNote>{ETIQUETAS_AVISO[a.tipo]}{a.barrio && ` · ${a.barrio}`} · {tiempoRelativo(a.fecha)}</IonNote>
                  </p>
                </IonLabel>
              </IonItem>
            ))}
          </IonList>
          {!lista.length && <p className="sf-vacio">No hay avisos para mostrar.</p>}

          {MODO_API === 'simulada' && (
            <IonButton expand="block" fill="outline" onClick={simular} style={{ marginTop: 18 }}>
              <IonIcon icon={megaphone} slot="start" />
              Simular aviso municipal (demo)
            </IonButton>
          )}
          <p className="sf-nota">En producción los avisos llegarían como notificaciones push (Web Push / Firebase Cloud Messaging) enviadas por el municipio, filtradas por tus preferencias.</p>
        </div>
      </IonContent>
    </IonPage>
  );
}
