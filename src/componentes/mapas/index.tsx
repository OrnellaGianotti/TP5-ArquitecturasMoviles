import { lazy, Suspense, type ComponentProps, type ComponentType } from 'react';
import { IonSpinner } from '@ionic/react';

// Carga diferida (lazy loading) de los mapas: Leaflet solo se descarga cuando el vecino
// abre una pantalla con mapa. Así el inicio de la app carga más rápido.

function diferido<T extends ComponentType<any>>(cargar: () => Promise<{ default: T }>) {
  const Componente = lazy(cargar);
  return function MapaDiferido(props: ComponentProps<T>) {
    return (
      <Suspense
        fallback={
          <div className="sf-mapa" style={{ display: 'grid', placeItems: 'center' }}>
            <IonSpinner name="crescent" aria-label="Cargando mapa" />
          </div>
        }
      >
        <Componente {...props} />
      </Suspense>
    );
  };
}

export const MapaBicis = diferido(() => import('./MapaBicis'));
export const MapaAlarmas = diferido(() => import('./MapaAlarmas'));
export const MapaEstacionamiento = diferido(() => import('./MapaEstacionamiento'));
export const MapaUbicacion = diferido(() => import('./MapaUbicacion'));
