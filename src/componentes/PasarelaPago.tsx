import { IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonModal, IonRadio, IonRadioGroup, IonSpinner, IonText, IonTitle, IonToolbar } from '@ionic/react';
import { card, cash, lockClosed, phonePortrait, wallet } from 'ionicons/icons';
import { useState } from 'react';
import { formatearPesos } from '../lib/formato';

// Pasarela de pago SIMULADA. En producción se redirigiría al checkout de un proveedor
// habilitado (p. ej. Mercado Pago o la plataforma de cobro del municipio): la app nunca
// ve ni guarda datos de tarjeta, lo que la deja fuera del alcance de PCI DSS.

export const MEDIOS_PAGO = [
  { id: 'Mercado Pago', icono: wallet, detalle: 'Dinero en cuenta o tarjetas guardadas' },
  { id: 'Tarjeta de débito', icono: card, detalle: 'Visa Débito, Maestro, Cabal' },
  { id: 'Tarjeta de crédito', icono: card, detalle: 'Hasta 3 cuotas sin interés' },
  { id: 'Transferencia', icono: phonePortrait, detalle: 'Desde tu home banking' },
  { id: 'Pago en efectivo', icono: cash, detalle: 'Con el código de pago en Rapipago o Pago Fácil' },
];

interface Props {
  abierta: boolean;
  concepto: string;
  importe: number;
  onCerrar: () => void;
  onConfirmar: (medio: string) => Promise<void>;
}

export default function PasarelaPago({ abierta, concepto, importe, onCerrar, onConfirmar }: Props) {
  const [medio, setMedio] = useState('Mercado Pago');
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pagar() {
    setProcesando(true);
    setError(null);
    try {
      await new Promise((r) => setTimeout(r, 1200)); // tiempo de autorización simulado
      await onConfirmar(medio);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setProcesando(false);
    }
  }

  return (
    <IonModal isOpen={abierta} onDidDismiss={onCerrar} initialBreakpoint={0.85} breakpoints={[0, 0.85, 1]}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Pago seguro</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onCerrar} disabled={procesando}>
              Cancelar
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <p style={{ margin: '0 0 4px', color: 'var(--sf-texto-suave)' }}>{concepto}</p>
        <div className="sf-importe">{formatearPesos(importe)}</div>
        <h2 className="sf-titulo-seccion">Medio de pago</h2>
        <IonList inset style={{ margin: 0 }}>
          <IonRadioGroup value={medio} onIonChange={(e) => setMedio(e.detail.value)}>
            {MEDIOS_PAGO.map((m) => (
              <IonItem key={m.id}>
                <IonIcon icon={m.icono} slot="start" color="primary" aria-hidden="true" />
                <IonRadio value={m.id} justify="space-between">
                  <IonLabel className="ion-text-wrap">
                    <h3>{m.id}</h3>
                    <p>{m.detalle}</p>
                  </IonLabel>
                </IonRadio>
              </IonItem>
            ))}
          </IonRadioGroup>
        </IonList>
        {error && (
          <IonText color="danger" role="alert">
            <p>{error}</p>
          </IonText>
        )}
        <IonButton expand="block" onClick={pagar} disabled={procesando} style={{ marginTop: 16 }}>
          {procesando ? <IonSpinner name="dots" /> : <><IonIcon slot="start" icon={lockClosed} />Pagar {formatearPesos(importe)}</>}
        </IonButton>
        <p className="sf-nota">
          <strong>Pago simulado:</strong> no se cobra dinero ni se piden datos de tarjeta. En la versión real se abriría el checkout del proveedor de pagos.
        </p>
      </IonContent>
    </IonModal>
  );
}
