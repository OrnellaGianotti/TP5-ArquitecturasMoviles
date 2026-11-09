import { IonBadge, IonButton, IonContent, IonFab, IonFabButton, IonIcon, IonItem, IonLabel, IonList, IonPage, IonRefresher, IonRefresherContent, IonSearchbar, IonSegment, IonSegmentButton, IonSpinner } from '@ionic/react';
import { add, chatbubbleEllipses } from 'ionicons/icons';
import { useState } from 'react';
import Encabezado from '../../componentes/Encabezado';
import { reclamosApi } from '../../api/servicios';
import { useDatos, useTiempoReal } from '../../hooks/useDatos';
import { tiempoRelativo } from '../../lib/formato';
import { ESTADOS, infoEstado } from './comun';

/** "Consulta": búsqueda y seguimiento de los reclamos del vecino. */
export default function Reclamos() {
  const [busqueda, setBusqueda] = useState('');
  const [estado, setEstado] = useState('');
  const { datos, cargando, recargar } = useDatos(() => reclamosApi.listar(busqueda, estado), [busqueda, estado]);
  useTiempoReal('reclamos', () => void recargar());

  return (
    <IonPage>
      <Encabezado titulo="Reclamos · Línea 103" />
      <IonContent className="ion-padding">
        <IonRefresher slot="fixed" onIonRefresh={async (e) => { await recargar(); e.detail.complete(); }}>
          <IonRefresherContent />
        </IonRefresher>
        <div className="sf-contenido">
          <IonButton expand="block" routerLink="/reclamos/nuevo">
            <IonIcon icon={add} slot="start" />
            Nuevo reclamo
          </IonButton>
          <IonSearchbar
            debounce={300}
            value={busqueda}
            onIonInput={(e) => setBusqueda(e.detail.value ?? '')}
            placeholder="Buscar por número, motivo o dirección"
            aria-label="Buscar reclamos"
          />
          <IonSegment scrollable value={estado} onIonChange={(e) => setEstado(String(e.detail.value))}>
            <IonSegmentButton value=""><IonLabel>Todos</IonLabel></IonSegmentButton>
            {ESTADOS.map((e) => (
              <IonSegmentButton key={e.valor} value={e.valor}><IonLabel>{e.texto}</IonLabel></IonSegmentButton>
            ))}
          </IonSegment>

          {cargando && !datos && <IonSpinner style={{ display: 'block', margin: '24px auto' }} />}
          <IonList inset style={{ margin: '12px 0' }} aria-live="polite">
            {datos?.map((r) => {
              const e = infoEstado(r.estado);
              return (
                <IonItem key={r.id} button detail routerLink={`/reclamos/ver/${r.id}`}>
                  <IonLabel className="ion-text-wrap">
                    <h3>{r.motivo}</h3>
                    <p>{r.categoria} · N° {r.numero}</p>
                    <p>{r.direccion} · {tiempoRelativo(r.creado)}</p>
                  </IonLabel>
                  <IonBadge slot="end" color={e.color}>{e.texto}</IonBadge>
                </IonItem>
              );
            })}
          </IonList>
          {datos && datos.length === 0 && (
            <div className="sf-vacio">
              <IonIcon icon={chatbubbleEllipses} />
              <p>{busqueda || estado ? 'No hay reclamos que coincidan con la búsqueda.' : 'Todavía no hiciste reclamos.'}</p>
            </div>
          )}
        </div>
        <IonFab slot="fixed" vertical="bottom" horizontal="end">
          <IonFabButton routerLink="/reclamos/nuevo" aria-label="Nuevo reclamo">
            <IonIcon icon={add} />
          </IonFabButton>
        </IonFab>
      </IonContent>
    </IonPage>
  );
}
