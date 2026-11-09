import { IonBadge, IonButton, IonCard, IonCardContent, IonContent, IonIcon, IonPage, IonSpinner, IonText } from '@ionic/react';
import { shareSocial } from 'ionicons/icons';
import { useParams } from 'react-router-dom';
import Encabezado from '../../componentes/Encabezado';
import { reclamosApi } from '../../api/servicios';
import type { Reclamo } from '../../api/tipos';
import { useApp } from '../../contexto/AppContexto';
import { useDatos, useTiempoReal } from '../../hooks/useDatos';
import { compartir } from '../../lib/dispositivo';
import { formatearFechaHora } from '../../lib/formato';
import { ESTADOS, infoEstado } from './comun';

export default function DetalleReclamo() {
  const { id } = useParams<{ id: string }>();
  const { avisar } = useApp();
  const { datos: r, setDatos, cargando, error } = useDatos(() => reclamosApi.obtener(id), [id]);

  // El estado se actualiza solo cuando el área municipal lo cambia (tiempo real).
  useTiempoReal<{ reclamo: Reclamo }>('reclamos', ({ reclamo }) => {
    if (reclamo.id === id) setDatos({ ...reclamo });
  });

  return (
    <IonPage>
      <Encabezado titulo="Detalle del reclamo" atras="/reclamos" />
      <IonContent className="ion-padding">
        <div className="sf-contenido">
          {cargando && !r && <IonSpinner style={{ display: 'block', margin: '24px auto' }} />}
          {error && <IonText color="danger"><p>{error}</p></IonText>}
          {r && (
            <>
              <IonCard style={{ margin: '0 0 14px' }}>
                <IonCardContent>
                  <IonBadge color={infoEstado(r.estado).color}>{infoEstado(r.estado).texto}</IonBadge>
                  <h2 style={{ margin: '10px 0 2px', fontWeight: 700 }}>{r.motivo}</h2>
                  <p>{r.categoria}</p>
                  <div style={{ marginTop: 10 }}>
                    <div className="sf-dato"><span>Número</span><strong>{r.numero}</strong></div>
                    <div className="sf-dato"><span>Lugar</span><span>{r.direccion}</span></div>
                    <div className="sf-dato"><span>Fecha</span><span>{formatearFechaHora(r.creado)}</span></div>
                  </div>
                  <p style={{ marginTop: 10 }}>{r.descripcion}</p>
                  {r.adjuntos.some((a) => a.miniatura) && (
                    <div className="sf-fotos" style={{ marginTop: 10 }}>
                      {r.adjuntos.filter((a) => a.miniatura).map((a, i) => (
                        <div className="foto" key={i}><img src={a.miniatura} alt={`Foto ${i + 1} del reclamo`} /></div>
                      ))}
                    </div>
                  )}
                </IonCardContent>
              </IonCard>

              <h2 className="sf-titulo-seccion">Seguimiento</h2>
              <ol className="sf-linea-tiempo" aria-live="polite">
                {ESTADOS.map((e) => {
                  const ev = r.historial.find((h) => h.estado === e.valor);
                  return (
                    <li key={e.valor} className={ev ? '' : 'pendiente'}>
                      <strong>{e.texto}</strong>
                      {ev ? (
                        <>
                          <div>{ev.detalle}</div>
                          <small>{formatearFechaHora(ev.fecha)}</small>
                        </>
                      ) : (
                        <small>Pendiente</small>
                      )}
                    </li>
                  );
                })}
              </ol>
              <p className="sf-nota">En la demo, los reclamos nuevos avanzan de estado cada 40 segundos y te llega un aviso en cada cambio.</p>
              <IonButton
                expand="block"
                fill="clear"
                onClick={async () => {
                  const texto = `Mi reclamo N° ${r.numero} (${r.motivo}) está: ${infoEstado(r.estado).texto}.`;
                  if (!(await compartir({ title: 'Reclamo municipal', text: texto }))) {
                    await navigator.clipboard?.writeText(texto).catch(() => undefined);
                    avisar('Datos del reclamo copiados.', 'success');
                  }
                }}
              >
                <IonIcon icon={shareSocial} slot="start" />
                Compartir número de reclamo
              </IonButton>
            </>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
}
