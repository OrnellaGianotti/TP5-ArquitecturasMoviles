import { IonBackButton, IonButtons, IonHeader, IonTitle, IonToolbar } from '@ionic/react';
import type { ReactNode } from 'react';
import { MODO_API } from '../api/cliente';

interface Props {
  titulo: string;
  atras?: string; // ruta a la que vuelve si no hay historial
  acciones?: ReactNode;
}

/** Barra superior común a todas las pantallas. */
export default function Encabezado({ titulo, atras, acciones }: Props) {
  return (
    <IonHeader>
      <IonToolbar className="sf-barra">
        {atras && (
          <IonButtons slot="start">
            <IonBackButton defaultHref={atras} text="" aria-label="Volver" color="light" />
          </IonButtons>
        )}
        <IonTitle>{titulo}</IonTitle>
        {acciones && <IonButtons slot="end">{acciones}</IonButtons>}
      </IonToolbar>
      {MODO_API === 'simulada' && (
        <div className="sf-banner-demo" role="note">
          Prototipo académico · datos simulados · no es una app oficial
        </div>
      )}
    </IonHeader>
  );
}
