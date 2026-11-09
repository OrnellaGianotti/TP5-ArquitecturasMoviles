import { Redirect, Route } from 'react-router-dom';
import { IonApp, IonBadge, IonIcon, IonLabel, IonRouterOutlet, IonTabBar, IonTabButton, IonTabs, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { chatbubbleEllipses, home, notifications, person } from 'ionicons/icons';

/* CSS base de Ionic */
import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';
import '@ionic/react/css/padding.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';
/* Paleta oscura oficial de Ionic: se activa con la clase .ion-palette-dark en <html> */
import '@ionic/react/css/palettes/dark.class.css';
import './tema/variables.css';
import './tema/app.css';

import { ProveedorApp, useApp } from './contexto/AppContexto';
import Inicio from './paginas/Inicio';
import Bicis from './paginas/bicis/Bicis';
import ReportarBici from './paginas/bicis/ReportarBici';
import Tributos from './paginas/tributos/Tributos';
import DetalleCedulon from './paginas/tributos/DetalleCedulon';
import Reclamos from './paginas/reclamos/Reclamos';
import NuevoReclamo from './paginas/reclamos/NuevoReclamo';
import DetalleReclamo from './paginas/reclamos/DetalleReclamo';
import Contacto from './paginas/Contacto';
import Alarmas from './paginas/Alarmas';
import Estacionamiento from './paginas/Estacionamiento';
import Avisos from './paginas/avisos/Avisos';
import DetalleAviso from './paginas/avisos/DetalleAviso';
import Perfil from './paginas/perfil/Perfil';
import Preferencias from './paginas/perfil/Preferencias';
import RegistroApi from './paginas/perfil/RegistroApi';

setupIonicReact({ mode: 'md' });

// Navegación: barra de pestañas inferior (patrón móvil) con 4 secciones.
// Los 7 servicios cuelgan de "Inicio" para que la pestaña quede marcada al entrar a ellos.
function Pestanias() {
  const { noLeidos } = useApp();
  return (
    <IonTabs>
      <IonRouterOutlet>
        <Route exact path="/inicio" component={Inicio} />
        <Route exact path="/inicio/bicis" component={Bicis} />
        <Route exact path="/inicio/bicis/reportar" component={ReportarBici} />
        <Route exact path="/inicio/tributos" component={Tributos} />
        <Route exact path="/inicio/tributos/cedulon/:id" component={DetalleCedulon} />
        <Route exact path="/inicio/contacto" component={Contacto} />
        <Route exact path="/inicio/alarmas" component={Alarmas} />
        <Route exact path="/inicio/estacionamiento" component={Estacionamiento} />
        <Route exact path="/reclamos" component={Reclamos} />
        <Route exact path="/reclamos/nuevo" component={NuevoReclamo} />
        <Route exact path="/reclamos/ver/:id" component={DetalleReclamo} />
        <Route exact path="/avisos" component={Avisos} />
        <Route exact path="/avisos/:id" component={DetalleAviso} />
        <Route exact path="/perfil" component={Perfil} />
        <Route exact path="/perfil/preferencias" component={Preferencias} />
        <Route exact path="/perfil/registro-api" component={RegistroApi} />
        <Route exact path="/">
          <Redirect to="/inicio" />
        </Route>
      </IonRouterOutlet>
      <IonTabBar slot="bottom">
        <IonTabButton tab="inicio" href="/inicio">
          <IonIcon aria-hidden="true" icon={home} />
          <IonLabel>Inicio</IonLabel>
        </IonTabButton>
        <IonTabButton tab="reclamos" href="/reclamos">
          <IonIcon aria-hidden="true" icon={chatbubbleEllipses} />
          <IonLabel>Reclamos</IonLabel>
        </IonTabButton>
        <IonTabButton tab="avisos" href="/avisos">
          <IonIcon aria-hidden="true" icon={notifications} />
          <IonLabel>Avisos</IonLabel>
          {noLeidos > 0 && (
            <IonBadge color="danger" aria-label={`${noLeidos} avisos sin leer`}>
              {noLeidos}
            </IonBadge>
          )}
        </IonTabButton>
        <IonTabButton tab="perfil" href="/perfil">
          <IonIcon aria-hidden="true" icon={person} />
          <IonLabel>Perfil</IonLabel>
        </IonTabButton>
      </IonTabBar>
    </IonTabs>
  );
}

export default function App() {
  return (
    <IonApp>
      <IonReactRouter>
        <ProveedorApp>
          <Pestanias />
        </ProveedorApp>
      </IonReactRouter>
    </IonApp>
  );
}
