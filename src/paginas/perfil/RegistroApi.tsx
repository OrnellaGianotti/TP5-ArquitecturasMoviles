import { IonBadge, IonContent, IonItem, IonLabel, IonList, IonNote, IonPage } from '@ionic/react';
import { useEffect, useState } from 'react';
import Encabezado from '../../componentes/Encabezado';
import { MODO_API, obtenerRegistro, suscribirRegistro } from '../../api/cliente';
import { formatearHora } from '../../lib/formato';

/** Muestra en vivo cada pedido REST que hace la app (método, ruta, código y demora). */
export default function RegistroApi() {
  const [, forzar] = useState(0);
  useEffect(() => {
    const desuscribir = suscribirRegistro(() => forzar((n) => n + 1));
    return () => {
      desuscribir();
    };
  }, []);
  const registro = obtenerRegistro();

  return (
    <IonPage>
      <Encabezado titulo="Registro de API" atras="/perfil" />
      <IonContent className="ion-padding">
        <div className="sf-contenido">
          <p>
            Modo <strong>{MODO_API}</strong>. Cada pantalla habla con el backend solo a través de la API REST (<code>/v1/…</code>). En modo simulado el backend corre en el navegador con la misma interfaz.
          </p>
          <IonList inset style={{ margin: 0 }}>
            {registro.map((r, i) => (
              <IonItem key={i}>
                <IonBadge slot="start" color={r.metodo === 'GET' ? 'secondary' : r.metodo === 'DELETE' ? 'danger' : 'primary'} style={{ minWidth: 58, textAlign: 'center' }}>
                  {r.metodo}
                </IonBadge>
                <IonLabel className="ion-text-wrap">
                  <h3 style={{ fontFamily: 'ui-monospace, Consolas, monospace', fontSize: '0.85rem' }}>{r.ruta}</h3>
                  <IonNote>{formatearHora(r.fecha)} · {r.ms} ms</IonNote>
                </IonLabel>
                <IonBadge slot="end" color={r.status >= 400 || r.status === 0 ? 'danger' : 'success'}>{r.status || 'sin red'}</IonBadge>
              </IonItem>
            ))}
          </IonList>
          {!registro.length && <p className="sf-vacio">Todavía no hubo llamadas.</p>}
        </div>
      </IonContent>
    </IonPage>
  );
}
