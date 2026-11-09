import { IonCard, IonCardContent, IonContent, IonIcon, IonItem, IonLabel, IonList, IonNote, IonPage, IonRefresher, IonRefresherContent, IonSearchbar } from '@ionic/react';
import { bicycle, call, car, chatbubbleEllipses, chevronForward, notifications, receipt, shieldCheckmark, time } from 'ionicons/icons';
import { useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import Encabezado from '../componentes/Encabezado';
import { useApp } from '../contexto/AppContexto';
import { reclamosApi, tributosApi } from '../api/servicios';
import { useDatos } from '../hooks/useDatos';
import { formatearCuentaRegresiva, formatearFecha, formatearPesos } from '../lib/formato';
import { proximosAVencer } from '../lib/tributos';
import { useAhora } from '../hooks/useAhora';

export const SERVICIOS = [
  { ruta: '/inicio/bicis', titulo: 'Bicis públicas', detalle: 'Estaciones y disponibilidad', icono: bicycle, color: '#1f8a4c', claves: 'bicicleta estacion san francisco en bici' },
  { ruta: '/inicio/tributos', titulo: 'Tasas y cedulones', detalle: 'Consultá, imprimí y pagá', icono: receipt, color: '#0b3d91', claves: 'tributaria impuestos tasas pagar cedulon multas' },
  { ruta: '/reclamos', titulo: 'Reclamos (103)', detalle: 'Hacé y seguí tus reclamos', icono: chatbubbleEllipses, color: '#d35400', claves: 'reclamo 103 bache luz agua solicitud' },
  { ruta: '/inicio/contacto', titulo: 'Atención al vecino', detalle: 'Teléfonos y canales', icono: call, color: '#7b3fa0', claves: 'telefono contacto llamar whatsapp mail emergencias' },
  { ruta: '/inicio/alarmas', titulo: 'Alarmas comunitarias', detalle: 'Estado en tiempo real', icono: shieldCheckmark, color: '#c62828', claves: 'alarma seguridad barrio' },
  { ruta: '/inicio/estacionamiento', titulo: 'Estacionamiento', detalle: 'Zonas, tarifas y pago', icono: car, color: '#1a8fd6', claves: 'estacionar medido patente auto' },
  { ruta: '/avisos', titulo: 'Avisos al vecino', detalle: 'Cortes, obras y eventos', icono: notifications, color: '#e8a317', claves: 'notificaciones avisos corte obra evento' },
];

export default function Inicio() {
  const history = useHistory();
  const { noLeidos, sesionEstacionamiento } = useApp();
  const [busqueda, setBusqueda] = useState('');
  const ahora = useAhora(1000);

  const resumen = useDatos(async () => {
    const [cedulones, reclamos] = await Promise.all([tributosApi.cedulones(), reclamosApi.listar()]);
    return {
      proximo: proximosAVencer(cedulones, 30)[0] ?? null,
      reclamosAbiertos: reclamos.filter((r) => r.estado !== 'resuelto').length,
    };
  });

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return SERVICIOS;
    return SERVICIOS.filter((s) => `${s.titulo} ${s.detalle} ${s.claves}`.toLowerCase().includes(q));
  }, [busqueda]);

  const hora = new Date().getHours();
  const saludo = hora < 12 ? '¡Buen día!' : hora < 20 ? '¡Buenas tardes!' : '¡Buenas noches!';

  return (
    <IonPage>
      <Encabezado titulo="Mi Sanfra" />
      <IonContent className="ion-padding">
        <IonRefresher slot="fixed" onIonRefresh={async (e) => { await resumen.recargar(); e.detail.complete(); }}>
          <IonRefresherContent />
        </IonRefresher>
        <div className="sf-contenido">
          <div className="sf-saludo">
            <h1>{saludo}</h1>
            <p>Los servicios de la Municipalidad de San Francisco, en tu celular.</p>
          </div>

          <IonSearchbar
            value={busqueda}
            onIonInput={(e) => setBusqueda(e.detail.value ?? '')}
            placeholder="Buscar un servicio (ej.: bache, patente)"
            aria-label="Buscar un servicio"
            style={{ padding: '12px 0 4px' }}
          />

          {/* Resumen personal: lo que el vecino tiene pendiente */}
          {sesionEstacionamiento && (
            <IonCard button routerLink="/inicio/estacionamiento" color="secondary">
              <IonCardContent style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <IonIcon icon={time} style={{ fontSize: 28 }} />
                <div>
                  <strong>Estacionamiento activo · {sesionEstacionamiento.patente}</strong>
                  <div>Quedan {formatearCuentaRegresiva(new Date(sesionEstacionamiento.fin).getTime() - ahora)}</div>
                </div>
              </IonCardContent>
            </IonCard>
          )}

          <IonList inset style={{ margin: '8px 0' }} aria-label="Resumen personal">
            <IonItem button detail routerLink={resumen.datos?.proximo ? `/inicio/tributos/cedulon/${resumen.datos.proximo.id}` : '/inicio/tributos'}>
              <IonIcon slot="start" icon={receipt} color="primary" aria-hidden="true" />
              <IonLabel>
                <h3>Próximo vencimiento</h3>
                <p>
                  {resumen.cargando
                    ? 'Cargando…'
                    : resumen.datos?.proximo
                      ? `${resumen.datos.proximo.descripcion} · ${formatearPesos(resumen.datos.proximo.importeHoy)} · ${formatearFecha(resumen.datos.proximo.vencimiento1 + 'T12:00:00')}`
                      : 'No tenés vencimientos próximos'}
                </p>
              </IonLabel>
            </IonItem>
            <IonItem button detail routerLink="/reclamos">
              <IonIcon slot="start" icon={chatbubbleEllipses} color="primary" aria-hidden="true" />
              <IonLabel>
                <h3>Reclamos en curso</h3>
                <p>
                  {resumen.datos
                    ? resumen.datos.reclamosAbiertos === 0
                      ? 'Ninguno abierto'
                      : `${resumen.datos.reclamosAbiertos} abierto${resumen.datos.reclamosAbiertos === 1 ? '' : 's'}`
                    : '—'}
                </p>
              </IonLabel>
            </IonItem>
            <IonItem button detail routerLink="/avisos">
              <IonIcon slot="start" icon={notifications} color="primary" aria-hidden="true" />
              <IonLabel>
                <h3>Avisos</h3>
                <p>{noLeidos ? `${noLeidos} sin leer` : 'Estás al día'}</p>
              </IonLabel>
            </IonItem>
          </IonList>

          <h2 className="sf-titulo-seccion">Servicios</h2>
          <nav className="sf-grilla" aria-label="Servicios municipales">
            {filtrados.map((s) => (
              <a
                key={s.ruta}
                className="sf-tarjeta-servicio"
                href={s.ruta}
                onClick={(e) => {
                  e.preventDefault();
                  history.push(s.ruta);
                }}
              >
                <span className="sf-icono" style={{ background: s.color }}>
                  <IonIcon icon={s.icono} aria-hidden="true" />
                </span>
                <strong>{s.titulo}</strong>
                <small>{s.detalle}</small>
              </a>
            ))}
          </nav>
          {filtrados.length === 0 && (
            <p className="sf-vacio">
              No encontramos servicios para “{busqueda}”.{' '}
              <IonNote>Si es un problema en la vía pública, hacé un reclamo.</IonNote>
            </p>
          )}

          <IonItem lines="none" button routerLink="/reclamos/nuevo" style={{ marginTop: 18 }} detail={false}>
            <IonLabel color="primary">
              <strong>¿Viste un problema en tu barrio? Hacé un reclamo</strong>
            </IonLabel>
            <IonIcon slot="end" icon={chevronForward} color="primary" />
          </IonItem>
        </div>
      </IonContent>
    </IonPage>
  );
}
