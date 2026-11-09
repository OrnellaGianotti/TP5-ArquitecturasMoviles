import { IonAvatar, IonButton, IonContent, IonIcon, IonItem, IonLabel, IonList, IonNote, IonPage, IonToggle, useIonAlert } from '@ionic/react';
import { code, documentLock, downloadOutline, location, moon, notifications, options, refresh } from 'ionicons/icons';
import { useEffect, useState } from 'react';
import Encabezado from '../../componentes/Encabezado';
import { demoApi, vecinoApi } from '../../api/servicios';
import { MODO_API } from '../../api/cliente';
import { useApp } from '../../contexto/AppContexto';
import { useDatos } from '../../hooks/useDatos';
import { pedirPermisoNotificaciones, permisoNotificaciones } from '../../lib/dispositivo';

// Evento de instalación de la PWA (Chrome/Android): se guarda para ofrecer "Instalar app".
interface EventoInstalacion extends Event {
  prompt: () => Promise<void>;
}
let eventoInstalacion: EventoInstalacion | null = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  eventoInstalacion = e as EventoInstalacion;
});

export default function Perfil() {
  const { avisar } = useApp();
  const [alerta] = useIonAlert();
  const { datos: vecino } = useDatos(vecinoApi.obtener);
  const [oscuro, setOscuro] = useState(document.documentElement.classList.contains('ion-palette-dark'));
  const [permiso, setPermiso] = useState(permisoNotificaciones());
  const [instalable, setInstalable] = useState(!!eventoInstalacion);

  useEffect(() => {
    const t = setInterval(() => setInstalable(!!eventoInstalacion), 1000);
    return () => clearInterval(t);
  }, []);

  function cambiarTema(valor: boolean) {
    setOscuro(valor);
    document.documentElement.classList.toggle('ion-palette-dark', valor);
    try {
      localStorage.setItem('misanfra.tema', valor ? 'oscuro' : 'claro');
    } catch {
      /* sin almacenamiento */
    }
  }

  return (
    <IonPage>
      <Encabezado titulo="Perfil" />
      <IonContent className="ion-padding">
        <div className="sf-contenido">
          <IonItem lines="none" style={{ marginBottom: 8 }}>
            <IonAvatar slot="start" style={{ background: 'var(--ion-color-primary)', display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 700 }}>
              VD
            </IonAvatar>
            <IonLabel>
              <h2>{vecino?.nombre ?? '…'}</h2>
              <p>{vecino?.email}</p>
              <p>Barrio {vecino?.barrio}</p>
            </IonLabel>
          </IonItem>
          <IonNote style={{ display: 'block', margin: '0 16px 12px' }}>
            Usuario de demostración con datos ficticios. En producción se ingresaría con Ciudadano Digital (CiDi) o una cuenta municipal mediante OpenID Connect.
          </IonNote>

          <h2 className="sf-titulo-seccion">Notificaciones</h2>
          <IonList inset style={{ margin: 0 }}>
            <IonItem button detail routerLink="/perfil/preferencias">
              <IonIcon icon={options} slot="start" aria-hidden="true" />
              <IonLabel>Preferencias de avisos<p>Tipos, frecuencia y zonas de interés</p></IonLabel>
            </IonItem>
            <IonItem>
              <IonIcon icon={notifications} slot="start" aria-hidden="true" />
              <IonLabel>
                Notificaciones del dispositivo
                <p>{{ granted: 'Permitidas', denied: 'Bloqueadas en el navegador', default: 'Sin configurar', no_soportado: 'No soportadas en este navegador' }[permiso]}</p>
              </IonLabel>
              {permiso === 'default' && <IonButton slot="end" onClick={async () => setPermiso(await pedirPermisoNotificaciones())}>Permitir</IonButton>}
            </IonItem>
          </IonList>

          <h2 className="sf-titulo-seccion">Apariencia y app</h2>
          <IonList inset style={{ margin: 0 }}>
            <IonItem>
              <IonIcon icon={moon} slot="start" aria-hidden="true" />
              <IonToggle checked={oscuro} onIonChange={(e) => cambiarTema(e.detail.checked)}>Modo oscuro</IonToggle>
            </IonItem>
            <IonItem
              button
              disabled={!instalable}
              onClick={async () => {
                await eventoInstalacion?.prompt();
                eventoInstalacion = null;
                setInstalable(false);
              }}
            >
              <IonIcon icon={downloadOutline} slot="start" aria-hidden="true" />
              <IonLabel className="ion-text-wrap">
                Instalar Mi Sanfra
                <p>{instalable ? 'Agregala a tu pantalla de inicio: abre sin conexión.' : 'Ya instalada, o usá “Agregar a pantalla de inicio” del navegador.'}</p>
              </IonLabel>
            </IonItem>
          </IonList>

          <h2 className="sf-titulo-seccion">Privacidad</h2>
          <IonList inset style={{ margin: 0 }}>
            <IonItem>
              <IonIcon icon={documentLock} slot="start" aria-hidden="true" />
              <IonLabel className="ion-text-wrap">
                Tus datos personales
                <p>Se tratan según la Ley 25.326 de Protección de Datos Personales: podés acceder, corregir y pedir que se borren.</p>
              </IonLabel>
            </IonItem>
            <IonItem>
              <IonIcon icon={location} slot="start" aria-hidden="true" />
              <IonLabel className="ion-text-wrap">
                Ubicación
                <p>Se pide solo cuando tocás un botón de ubicación. Para las alarmas cercanas, la distancia se calcula en tu celular.</p>
              </IonLabel>
            </IonItem>
          </IonList>

          <h2 className="sf-titulo-seccion">Para la demo</h2>
          <IonList inset style={{ margin: 0 }}>
            <IonItem button detail routerLink="/perfil/registro-api">
              <IonIcon icon={code} slot="start" aria-hidden="true" />
              <IonLabel>Registro de llamadas a la API<p>Modo de API: {MODO_API}</p></IonLabel>
            </IonItem>
            <IonItem
              button
              onClick={() =>
                alerta({
                  header: 'Restablecer datos de demo',
                  message: 'Se borran los reclamos, pagos y avisos creados y se vuelve a los datos iniciales.',
                  buttons: [
                    'Cancelar',
                    {
                      text: 'Restablecer',
                      role: 'destructive',
                      handler: async () => {
                        await demoApi.reiniciar();
                        avisar('Datos de demo restablecidos.', 'success');
                        setTimeout(() => window.location.reload(), 600);
                      },
                    },
                  ],
                })
              }
            >
              <IonIcon icon={refresh} slot="start" color="danger" aria-hidden="true" />
              <IonLabel color="danger">Restablecer datos de demo</IonLabel>
            </IonItem>
          </IonList>
          <p className="sf-nota" style={{ textAlign: 'center' }}>
            Mi Sanfra v1.0 · Prototipo académico – Arquitecturas Móviles, UTN FRSF, 2026.
            <br />
            No es una aplicación oficial de la Municipalidad de San Francisco.
          </p>
        </div>
      </IonContent>
    </IonPage>
  );
}
