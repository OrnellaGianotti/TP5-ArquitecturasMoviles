import { IonButton, IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle, IonContent, IonIcon, IonNote, IonPage, IonSearchbar, IonSpinner } from '@ionic/react';
import { call, logoWhatsapp, mail, shareSocial, time } from 'ionicons/icons';
import { useMemo, useState } from 'react';
import Encabezado from '../componentes/Encabezado';
import { lineasApi } from '../api/servicios';
import { useApp } from '../contexto/AppContexto';
import { useDatos } from '../hooks/useDatos';
import { compartir } from '../lib/dispositivo';

// Comunicación REAL con las apps del teléfono mediante esquemas de URL estándar:
//   tel:     abre el marcador        mailto:  abre el cliente de correo
//   https://wa.me/<número>  abre WhatsApp con el chat
export default function Contacto() {
  const { avisar } = useApp();
  const { datos, cargando } = useDatos(lineasApi.listar);
  const [busqueda, setBusqueda] = useState('');

  const filtradas = useMemo(() => {
    const q = busqueda.toLowerCase();
    return (datos ?? []).filter((l) => !q || `${l.area} ${l.descripcion}`.toLowerCase().includes(q));
  }, [datos, busqueda]);

  const urgencias = filtradas.filter((l) => l.urgencia);
  const areas = filtradas.filter((l) => !l.urgencia);

  return (
    <IonPage>
      <Encabezado titulo="Atención al vecino" atras="/inicio" />
      <IonContent className="ion-padding">
        <div className="sf-contenido">
          <IonSearchbar value={busqueda} onIonInput={(e) => setBusqueda(e.detail.value ?? '')} placeholder="Buscar un área" aria-label="Buscar un área" />
          {cargando && <IonSpinner style={{ display: 'block', margin: '24px auto' }} />}

          {urgencias.length > 0 && (
            <>
              <h2 className="sf-titulo-seccion">Emergencias</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {urgencias.map((l) => (
                  <IonButton key={l.id} color="danger" href={`tel:${l.telefono}`} style={{ height: 72, margin: 0 }} aria-label={`Llamar a ${l.area}, ${l.telefono}`}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <strong style={{ fontSize: '1.4rem' }}>{l.telefono}</strong>
                      <small style={{ textTransform: 'none' }}>{l.area.replace('Emergencias médicas', 'Emergencias')}</small>
                    </div>
                  </IonButton>
                ))}
              </div>
            </>
          )}

          <h2 className="sf-titulo-seccion">Áreas municipales</h2>
          {areas.map((l) => (
            <IonCard key={l.id} style={{ margin: '0 0 12px' }}>
              <IonCardHeader>
                <IonCardSubtitle>
                  <IonIcon icon={time} aria-hidden="true" /> {l.horario}
                </IonCardSubtitle>
                <IonCardTitle style={{ fontSize: '1.05rem' }}>
                  {l.area} {l.telefono && <span style={{ color: 'var(--ion-color-primary)' }}>· {l.telefono}</span>}
                </IonCardTitle>
                <IonNote>{l.descripcion}</IonNote>
              </IonCardHeader>
              <IonCardContent style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {l.telefono && (
                  <IonButton size="small" href={`tel:${l.telefono}`}>
                    <IonIcon icon={call} slot="start" />Llamar
                  </IonButton>
                )}
                {l.whatsapp && (
                  <IonButton size="small" color="success" href={`https://wa.me/${l.whatsapp}?text=${encodeURIComponent('Hola, quería hacer una consulta.')}`} target="_blank" rel="noopener">
                    <IonIcon icon={logoWhatsapp} slot="start" />WhatsApp
                  </IonButton>
                )}
                {l.email && (
                  <IonButton size="small" fill="outline" href={`mailto:${l.email}?subject=${encodeURIComponent(`Consulta – ${l.area}`)}`}>
                    <IonIcon icon={mail} slot="start" />Correo
                  </IonButton>
                )}
                <IonButton
                  size="small"
                  fill="clear"
                  aria-label={`Compartir contacto de ${l.area}`}
                  onClick={async () => {
                    const texto = `${l.area}: ${[l.telefono && `tel. ${l.telefono}`, l.email].filter(Boolean).join(' · ')}`;
                    if (!(await compartir({ title: l.area, text: texto }))) {
                      await navigator.clipboard?.writeText(texto).catch(() => undefined);
                      avisar('Contacto copiado.', 'success');
                    }
                  }}
                >
                  <IonIcon icon={shareSocial} />
                </IonButton>
                {!l.datoReal && <IonNote style={{ width: '100%', fontSize: '0.72rem' }}>Contacto ficticio (a confirmar con el municipio).</IonNote>}
              </IonCardContent>
            </IonCard>
          ))}
          <p className="sf-nota">
            Los números 147, 103, 107, 911 y 100 son los publicados en “Teléfonos útiles” de la web municipal. Los correos y los WhatsApp son de ejemplo.
          </p>
        </div>
      </IonContent>
    </IonPage>
  );
}
