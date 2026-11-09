import {
  IonBadge, IonButton, IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle, IonCheckbox, IonContent, IonIcon,
  IonInput, IonItem, IonLabel, IonList, IonNote, IonPage, IonSegment, IonSegmentButton, IonSelect, IonSelectOption, IonSpinner,
  IonText, IonToggle,
} from '@ionic/react';
import { alarm, chevronForward, receipt, search } from 'ionicons/icons';
import { useMemo, useState } from 'react';
import Encabezado from '../../componentes/Encabezado';
import PasarelaPago from '../../componentes/PasarelaPago';
import { tributosApi, type CedulonConEstado } from '../../api/servicios';
import type { Multa, Obligacion } from '../../api/tipos';
import { useApp } from '../../contexto/AppContexto';
import { useDatos, useTiempoReal } from '../../hooks/useDatos';
import { formatearFecha, formatearFechaHora, formatearPeriodo, formatearPesos } from '../../lib/formato';
import { diasParaVencer, totalAdeudado } from '../../lib/tributos';

type Seccion = 'tasas' | 'historial' | 'multas';

export const textoEstado = (c: CedulonConEstado) => {
  if (c.estado === 'pagado') return { texto: 'Pagado', color: 'success' };
  if (c.estado === 'vencido') return { texto: 'Vencido', color: 'danger' };
  const d = diasParaVencer(c);
  return { texto: d <= 0 ? 'Vence hoy' : `Vence en ${d} día${d === 1 ? '' : 's'}`, color: d <= 3 ? 'warning' : 'medium' };
};

export default function Tributos() {
  const { avisar } = useApp();
  const [seccion, setSeccion] = useState<Seccion>('tasas');
  const datos = useDatos(async () => {
    const [obligaciones, cedulones, pagos] = await Promise.all([tributosApi.obligaciones(), tributosApi.cedulones(), tributosApi.pagos()]);
    return { obligaciones, cedulones, pagos };
  });
  useTiempoReal('tributos', () => void datos.recargar());

  const [seleccion, setSeleccion] = useState<string[]>([]);
  const [pagando, setPagando] = useState(false);

  const impagos = useMemo(() => datos.datos?.cedulones.filter((c) => c.estado !== 'pagado') ?? [], [datos.datos]);
  const totalSeleccion = impagos.filter((c) => seleccion.includes(c.id)).reduce((s, c) => s + c.importeHoy, 0);

  async function cambiarRecordatorio(o: Obligacion, valor: boolean) {
    await tributosApi.cambiarRecordatorio(o.id, valor);
    avisar(valor ? `Te vamos a recordar los vencimientos de ${o.nombre}.` : 'Recordatorio desactivado.', 'success');
    void datos.recargar();
  }

  return (
    <IonPage>
      <Encabezado titulo="Tasas y cedulones" atras="/inicio" />
      <IonContent className="ion-padding">
        <div className="sf-contenido">
          <IonSegment value={seccion} onIonChange={(e) => setSeccion(e.detail.value as Seccion)}>
            <IonSegmentButton value="tasas"><IonLabel>Mis tasas</IonLabel></IonSegmentButton>
            <IonSegmentButton value="historial"><IonLabel>Pagos</IonLabel></IonSegmentButton>
            <IonSegmentButton value="multas"><IonLabel>Multas</IonLabel></IonSegmentButton>
          </IonSegment>

          {datos.cargando && !datos.datos && <IonSpinner style={{ display: 'block', margin: '24px auto' }} />}
          {datos.error && <IonText color="danger"><p>{datos.error}</p></IonText>}

          {seccion === 'tasas' && datos.datos && (
            <>
              <IonCard color="primary" style={{ margin: '16px 0' }}>
                <IonCardContent>
                  <div>Total adeudado</div>
                  <div className="sf-importe">{formatearPesos(totalAdeudado(datos.datos.cedulones))}</div>
                  <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>{impagos.length} cedulones sin pagar</div>
                </IonCardContent>
              </IonCard>

              {datos.datos.obligaciones.map((o) => {
                // Primero el que vence antes: es el que conviene pagar.
                const propios = datos.datos!.cedulones
                  .filter((c) => c.obligacionId === o.id && c.estado !== 'pagado')
                  .sort((a, b) => a.vencimiento1.localeCompare(b.vencimiento1));
                return (
                  <IonCard key={o.id} style={{ margin: '0 0 14px' }}>
                    <IonCardHeader>
                      <IonCardSubtitle>{o.identificador}</IonCardSubtitle>
                      <IonCardTitle style={{ fontSize: '1.05rem' }}>{o.nombre}</IonCardTitle>
                      <IonNote>{o.descripcion}</IonNote>
                    </IonCardHeader>
                    <IonList lines="full">
                      {propios.map((c) => {
                        const est = textoEstado(c);
                        return (
                          <IonItem key={c.id}>
                            <IonCheckbox
                              slot="start"
                              aria-label={`Seleccionar ${formatearPeriodo(c.periodo)}`}
                              checked={seleccion.includes(c.id)}
                              onIonChange={(e) =>
                                setSeleccion((s) => (e.detail.checked ? [...s, c.id] : s.filter((x) => x !== c.id)))
                              }
                            />
                            <IonLabel>
                              <h3>{formatearPeriodo(c.periodo)}</h3>
                              <p>
                                1° venc. {formatearFecha(c.vencimiento1 + 'T12:00:00')} · <IonText color={est.color}>{est.texto}</IonText>
                              </p>
                            </IonLabel>
                            <IonButton slot="end" fill="clear" routerLink={`/inicio/tributos/cedulon/${c.id}`} aria-label="Ver cedulón">
                              {formatearPesos(c.importeHoy)}
                              <IonIcon icon={chevronForward} slot="end" />
                            </IonButton>
                          </IonItem>
                        );
                      })}
                      {propios.length === 0 && (
                        <IonItem lines="none"><IonLabel color="success">Al día ✔</IonLabel></IonItem>
                      )}
                      <IonItem lines="none">
                        <IonIcon icon={alarm} slot="start" color="primary" aria-hidden="true" />
                        <IonToggle checked={o.recordatorio} onIonChange={(e) => cambiarRecordatorio(o, e.detail.checked)}>
                          Recordarme los vencimientos
                        </IonToggle>
                      </IonItem>
                    </IonList>
                  </IonCard>
                );
              })}

              <IonButton expand="block" disabled={!seleccion.length} onClick={() => setPagando(true)}>
                <IonIcon icon={receipt} slot="start" />
                {seleccion.length ? `Pagar ${seleccion.length} cedulón(es) · ${formatearPesos(totalSeleccion)}` : 'Seleccioná cedulones para pagar'}
              </IonButton>
              <p className="sf-nota">
                Nombres de tasas, cuentas e importes ficticios. El 2° vencimiento suma un recargo del 3% (supuesto del prototipo).
              </p>
            </>
          )}

          {seccion === 'historial' && datos.datos && (
            <IonList inset style={{ margin: '16px 0' }}>
              {datos.datos.pagos.map((p) => {
                const ced = datos.datos!.cedulones.find((c) => c.id === p.cedulonId);
                return (
                  <IonItem key={p.id} button detail routerLink={`/inicio/tributos/cedulon/${p.cedulonId}`}>
                    <IonLabel className="ion-text-wrap">
                      <h3>{ced?.descripcion ?? 'Cedulón'}</h3>
                      <p>{formatearFechaHora(p.fecha)} · {p.medio}</p>
                      <p>Comprobante {p.comprobante}</p>
                    </IonLabel>
                    <IonBadge slot="end" color="success">{formatearPesos(p.importe)}</IonBadge>
                  </IonItem>
                );
              })}
              {!datos.datos.pagos.length && <p className="sf-vacio">Todavía no registrás pagos.</p>}
            </IonList>
          )}

          {seccion === 'multas' && <BuscadorMultas />}
        </div>

        <PasarelaPago
          abierta={pagando}
          concepto={`${seleccion.length} cedulón(es) municipales`}
          importe={totalSeleccion}
          onCerrar={() => setPagando(false)}
          onConfirmar={async (medio) => {
            const pagos = await tributosApi.pagar(seleccion, medio);
            setPagando(false);
            setSeleccion([]);
            avisar(`¡Pago aprobado! ${pagos.length} comprobante(s) en el historial.`, 'success');
            await datos.recargar();
          }}
        />
      </IonContent>
    </IonPage>
  );
}

/** Tribunal Administrativo de Faltas: búsqueda de multas por DNI o dominio. */
function BuscadorMultas() {
  const [por, setPor] = useState<'dni' | 'dominio'>('dominio');
  const [valor, setValor] = useState('');
  const [resultado, setResultado] = useState<Multa[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [buscando, setBuscando] = useState(false);

  async function buscar() {
    setBuscando(true);
    setError(null);
    try {
      setResultado(await tributosApi.multas({ [por]: valor }));
    } catch (e) {
      setError((e as Error).message);
      setResultado(null);
    } finally {
      setBuscando(false);
    }
  }

  return (
    <>
      <p style={{ marginTop: 16 }}>Consultá si tenés multas del Tribunal Administrativo de Faltas.</p>
      <IonList inset style={{ margin: 0 }}>
        <IonItem>
          <IonSelect label="Buscar por" value={por} onIonChange={(e) => setPor(e.detail.value)}>
            <IonSelectOption value="dominio">Dominio (patente)</IonSelectOption>
            <IonSelectOption value="dni">DNI</IonSelectOption>
          </IonSelect>
        </IonItem>
        <IonItem>
          <IonInput
            label={por === 'dni' ? 'DNI' : 'Dominio'}
            labelPlacement="stacked"
            inputmode={por === 'dni' ? 'numeric' : 'text'}
            placeholder={por === 'dni' ? 'Sin puntos' : 'Ej.: AA000AA'}
            value={valor}
            onIonInput={(e) => setValor(String(e.detail.value ?? ''))}
          />
        </IonItem>
      </IonList>
      <IonButton expand="block" onClick={buscar} disabled={!valor || buscando} style={{ marginTop: 12 }}>
        {buscando ? <IonSpinner name="dots" /> : <><IonIcon icon={search} slot="start" />Buscar</>}
      </IonButton>
      {error && <IonText color="danger" role="alert"><p>{error}</p></IonText>}
      {resultado && (
        <IonList inset style={{ margin: '12px 0' }}>
          {resultado.map((m) => (
            <IonItem key={m.acta}>
              <IonLabel className="ion-text-wrap">
                <h3>Acta {m.acta} · {m.dominio}</h3>
                <p>{m.motivo}</p>
                <p>Vence el {formatearFecha(m.vencimiento + 'T12:00:00')}</p>
              </IonLabel>
              <IonBadge slot="end" color="danger">{formatearPesos(m.importe)}</IonBadge>
            </IonItem>
          ))}
          {!resultado.length && <p className="sf-vacio">No se encontraron multas. 🎉</p>}
        </IonList>
      )}
      <p className="sf-nota">Datos ficticios. Probá con el dominio de ejemplo AA000AA.</p>
    </>
  );
}
