import { IonButton, IonContent, IonInput, IonItem, IonList, IonPage, IonSelect, IonSelectOption, IonSpinner, IonText, IonTextarea } from '@ionic/react';
import { useState } from 'react';
import { useHistory } from 'react-router-dom';
import Encabezado from '../../componentes/Encabezado';
import { bicisApi } from '../../api/servicios';
import type { ReporteBici } from '../../api/tipos';
import { useApp } from '../../contexto/AppContexto';
import { useDatos } from '../../hooks/useDatos';

const TIPOS: { valor: ReporteBici['tipo']; texto: string }[] = [
  { valor: 'bici_danada', texto: 'Bicicleta dañada (frenos, cadena, rueda…)' },
  { valor: 'anclaje_trabado', texto: 'Anclaje trabado' },
  { valor: 'estacion_sin_bicis', texto: 'Estación sin bicicletas' },
  { valor: 'otro', texto: 'Otro problema' },
];

export default function ReportarBici() {
  const history = useHistory();
  const { avisar } = useApp();
  const { datos: estaciones } = useDatos(bicisApi.estaciones);
  const [reporte, setReporte] = useState<ReporteBici>({ estacionId: '', tipo: 'bici_danada', descripcion: '', numeroBici: '' });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enviar() {
    setEnviando(true);
    setError(null);
    try {
      const reclamo = await bicisApi.reportar(reporte);
      avisar(`Reporte enviado. Número de reclamo ${reclamo.numero}.`, 'success');
      history.replace(`/reclamos/ver/${reclamo.id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <IonPage>
      <Encabezado titulo="Reportar un problema" atras="/inicio/bicis" />
      <IonContent className="ion-padding">
        <div className="sf-contenido">
          <p>El reporte se carga como un reclamo de la categoría “Bicis públicas” y lo podés seguir desde Reclamos.</p>
          <IonList inset style={{ margin: 0 }}>
            <IonItem>
              <IonSelect
                label="Estación"
                labelPlacement="stacked"
                placeholder="Elegí la estación"
                value={reporte.estacionId}
                onIonChange={(e) => setReporte({ ...reporte, estacionId: e.detail.value })}
                interface="action-sheet"
              >
                {estaciones?.map((e) => (
                  <IonSelectOption key={e.id} value={e.id}>
                    {e.nombre}
                  </IonSelectOption>
                ))}
              </IonSelect>
            </IonItem>
            <IonItem>
              <IonSelect
                label="¿Qué pasó?"
                labelPlacement="stacked"
                value={reporte.tipo}
                onIonChange={(e) => setReporte({ ...reporte, tipo: e.detail.value })}
                interface="action-sheet"
              >
                {TIPOS.map((t) => (
                  <IonSelectOption key={t.valor} value={t.valor}>
                    {t.texto}
                  </IonSelectOption>
                ))}
              </IonSelect>
            </IonItem>
            <IonItem>
              <IonInput
                label="Número de bici (opcional)"
                labelPlacement="stacked"
                inputmode="numeric"
                maxlength={6}
                value={reporte.numeroBici}
                onIonInput={(e) => setReporte({ ...reporte, numeroBici: String(e.detail.value ?? '') })}
                placeholder="Figura en el cuadro de la bici"
              />
            </IonItem>
            <IonItem>
              <IonTextarea
                label="Descripción"
                labelPlacement="stacked"
                autoGrow
                rows={3}
                maxlength={400}
                counter
                value={reporte.descripcion}
                onIonInput={(e) => setReporte({ ...reporte, descripcion: e.detail.value ?? '' })}
                placeholder="Ej.: la bici tiene la cadena salida"
              />
            </IonItem>
          </IonList>
          {error && (
            <IonText color="danger" role="alert">
              <p>{error}</p>
            </IonText>
          )}
          <IonButton expand="block" onClick={enviar} disabled={enviando || !reporte.estacionId} style={{ marginTop: 16 }}>
            {enviando ? <IonSpinner name="dots" /> : 'Enviar reporte'}
          </IonButton>
        </div>
      </IonContent>
    </IonPage>
  );
}
