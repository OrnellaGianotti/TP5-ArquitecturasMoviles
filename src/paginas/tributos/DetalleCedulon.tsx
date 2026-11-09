import { IonButton, IonContent, IonIcon, IonPage, IonSpinner, IonText } from '@ionic/react';
import { card, print, shareSocial } from 'ionicons/icons';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import Encabezado from '../../componentes/Encabezado';
import PasarelaPago from '../../componentes/PasarelaPago';
import { tributosApi } from '../../api/servicios';
import { useApp } from '../../contexto/AppContexto';
import { useDatos } from '../../hooks/useDatos';
import { compartir } from '../../lib/dispositivo';
import { formatearFecha, formatearPeriodo, formatearPesos } from '../../lib/formato';
import { textoEstado } from './Tributos';

/**
 * Código de barras ilustrativo: cada dígito se dibuja como un patrón de barras anchas y
 * finas (al estilo "2 de 5 intercalado" que usan los cedulones). No es escaneable.
 */
function CodigoBarras({ codigo }: { codigo: string }) {
  const PATRONES = ['00110', '10001', '01001', '11000', '00101', '10100', '01100', '00011', '10010', '01010'];
  const barras: { x: number; w: number }[] = [];
  let x = 4;
  for (const d of codigo) {
    for (const bit of PATRONES[Number(d)]) {
      const w = bit === '1' ? 3 : 1;
      barras.push({ x, w });
      x += w + 1.5;
    }
  }
  return (
    <svg className="sf-codigo-barras" viewBox={`0 0 ${x + 4} 60`} preserveAspectRatio="none" role="img" aria-label={`Código de pago ${codigo}`}>
      {barras.map((b, i) => (
        <rect key={i} x={b.x} y={0} width={b.w} height={60} fill="#111" />
      ))}
    </svg>
  );
}

export default function DetalleCedulon() {
  const { id } = useParams<{ id: string }>();
  const { avisar } = useApp();
  const { datos, cargando, error, recargar } = useDatos(async () => {
    const c = await tributosApi.cedulon(id);
    const obligaciones = await tributosApi.obligaciones();
    return { c, o: obligaciones.find((o) => o.id === c.obligacionId)! };
  }, [id]);
  const [pagando, setPagando] = useState(false);

  async function compartirCodigo() {
    if (!datos) return;
    const texto = `${datos.c.descripcion} – ${formatearPesos(datos.c.importeHoy)} – Código de pago: ${datos.c.codigoPago}`;
    const ok = await compartir({ title: 'Cedulón municipal', text: texto });
    if (!ok) {
      await navigator.clipboard?.writeText(texto).catch(() => undefined);
      avisar('Código de pago copiado al portapapeles.', 'success');
    }
  }

  return (
    <IonPage>
      <Encabezado titulo="Cedulón" atras="/inicio/tributos" />
      <IonContent className="ion-padding">
        <div className="sf-contenido">
          {cargando && !datos && <IonSpinner style={{ display: 'block', margin: '24px auto' }} />}
          {error && <IonText color="danger"><p>{error}</p></IonText>}
          {datos && (
            <>
              <article className="sf-cedulon" aria-label="Cedulón para imprimir">
                <h2>Municipalidad de San Francisco · Dirección General Tributaria</h2>
                <div style={{ fontSize: '0.8rem', marginBottom: 10 }}>Cedulón de pago (simulado)</div>
                <div className="sf-dato"><span>Tasa</span><strong>{datos.o.nombre}</strong></div>
                <div className="sf-dato"><span>Cuenta</span><span>{datos.o.identificador}</span></div>
                <div className="sf-dato"><span>Período</span><span>{formatearPeriodo(datos.c.periodo)}</span></div>
                <div className="sf-dato"><span>1° vencimiento</span><span>{formatearFecha(datos.c.vencimiento1 + 'T12:00:00')} · {formatearPesos(datos.c.importe)}</span></div>
                <div className="sf-dato"><span>2° vencimiento</span><span>{formatearFecha(datos.c.vencimiento2 + 'T12:00:00')} · {formatearPesos(datos.c.importe + datos.c.recargo2)}</span></div>
                <div className="sf-dato">
                  <span>Estado</span>
                  <IonText color={textoEstado(datos.c).color}><strong>{textoEstado(datos.c).texto}</strong></IonText>
                </div>
                <div className="sf-dato"><span>A pagar hoy</span><strong style={{ fontSize: '1.2rem' }}>{formatearPesos(datos.c.importeHoy)}</strong></div>
                <CodigoBarras codigo={datos.c.codigoPago} />
                <div className="sf-codigo-texto">{datos.c.codigoPago}</div>
                <div className="sf-marca-agua">PROTOTIPO ACADÉMICO – SIN VALIDEZ PARA EL PAGO</div>
              </article>

              <div className="no-imprimir" style={{ marginTop: 16 }}>
                {datos.c.estado !== 'pagado' && (
                  <IonButton expand="block" onClick={() => setPagando(true)}>
                    <IonIcon icon={card} slot="start" />
                    Pagar en línea
                  </IonButton>
                )}
                <IonButton expand="block" fill="outline" onClick={() => window.print()}>
                  <IonIcon icon={print} slot="start" />
                  Emitir / imprimir (PDF)
                </IonButton>
                <IonButton expand="block" fill="clear" onClick={compartirCodigo}>
                  <IonIcon icon={shareSocial} slot="start" />
                  Compartir código de pago
                </IonButton>
              </div>

              <PasarelaPago
                abierta={pagando}
                concepto={datos.c.descripcion}
                importe={datos.c.importeHoy}
                onCerrar={() => setPagando(false)}
                onConfirmar={async (medio) => {
                  const [pago] = await tributosApi.pagar([datos.c.id], medio);
                  setPagando(false);
                  avisar(`¡Pago aprobado! Comprobante ${pago.comprobante}.`, 'success');
                  await recargar();
                }}
              />
            </>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
}
