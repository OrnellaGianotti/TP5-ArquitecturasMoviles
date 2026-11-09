import { IonButton, IonCard, IonCardContent, IonContent, IonIcon, IonNote, IonPage } from '@ionic/react';
import { arrowForward, shareSocial } from 'ionicons/icons';
import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Encabezado from '../../componentes/Encabezado';
import { useApp } from '../../contexto/AppContexto';
import { ETIQUETAS_AVISO } from '../../lib/avisos';
import { compartir } from '../../lib/dispositivo';
import { formatearFechaHora } from '../../lib/formato';
import { COLOR_AVISO, ICONO_AVISO } from './iconos';

export default function DetalleAviso() {
  const { id } = useParams<{ id: string }>();
  const { avisos, marcarLeido, avisar } = useApp();
  const a = avisos.find((x) => x.id === id);

  useEffect(() => {
    if (a && !a.leido) void marcarLeido(a.id);
  }, [a, marcarLeido]);

  // Enlace "más información": si apunta a otra pantalla de la app, se ofrece ir a ella.
  const enlaceInterno = a?.enlace && !a.enlace.startsWith(`/avisos/`) ? a.enlace : null;

  return (
    <IonPage>
      <Encabezado titulo="Aviso" atras="/avisos" />
      <IonContent className="ion-padding">
        <div className="sf-contenido">
          {!a && <p className="sf-vacio">El aviso no existe o fue eliminado.</p>}
          {a && (
            <IonCard style={{ margin: 0 }}>
              <IonCardContent>
                <IonNote color={COLOR_AVISO[a.tipo]}>
                  <IonIcon icon={ICONO_AVISO[a.tipo]} aria-hidden="true" /> {ETIQUETAS_AVISO[a.tipo]}
                  {a.barrio && ` · Barrio ${a.barrio}`}
                </IonNote>
                <h1 style={{ fontSize: '1.3rem', fontWeight: 700, margin: '10px 0 6px' }}>{a.titulo}</h1>
                <IonNote>{formatearFechaHora(a.fecha)}</IonNote>
                <p style={{ fontSize: '1rem', marginTop: 14 }}>{a.cuerpo}</p>
                {!enlaceInterno && (
                  <p className="sf-nota">Más información: en producción este aviso enlazaría a la noticia publicada en la web municipal.</p>
                )}
                {enlaceInterno && (
                  <IonButton expand="block" routerLink={enlaceInterno} style={{ marginTop: 14 }}>
                    Ver más información
                    <IonIcon icon={arrowForward} slot="end" />
                  </IonButton>
                )}
                <IonButton
                  expand="block"
                  fill="clear"
                  onClick={async () => {
                    const texto = `${a.titulo}: ${a.cuerpo}`;
                    if (!(await compartir({ title: a.titulo, text: texto }))) {
                      await navigator.clipboard?.writeText(texto).catch(() => undefined);
                      avisar('Aviso copiado para compartir.', 'success');
                    }
                  }}
                >
                  <IonIcon icon={shareSocial} slot="start" />
                  Compartir con vecinos
                </IonButton>
              </IonCardContent>
            </IonCard>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
}
