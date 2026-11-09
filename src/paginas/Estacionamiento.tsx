import {
  IonButton, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonContent, IonIcon, IonInput, IonItem, IonLabel, IonList,
  IonNote, IonPage, IonProgressBar, IonSegment, IonSegmentButton, IonSelect, IonSelectOption, IonSpinner, IonText, useIonAlert,
} from '@ionic/react';
import { add, car, information, stopCircle, time, trash, wallet } from 'ionicons/icons';
import { useState } from 'react';
import Encabezado from '../componentes/Encabezado';
import PasarelaPago from '../componentes/PasarelaPago';
import { MapaEstacionamiento } from '../componentes/mapas';
import { estacionamientoApi } from '../api/servicios';
import type { CuentaEstacionamiento, ZonaEstacionamiento } from '../api/tipos';
import { useApp } from '../contexto/AppContexto';
import { useDatos, useTiempoReal } from '../hooks/useDatos';
import { useAhora } from '../hooks/useAhora';
import { calcularImporte, estadoTemporizador, INFO_ESTACIONAMIENTO, patenteValida, rigeEstacionamiento } from '../lib/estacionamiento';
import { COLOR_OCUPACION } from '../lib/colores';
import { formatearCuentaRegresiva, formatearFechaHora, formatearHora, formatearPesos } from '../lib/formato';
import { pedirPermisoNotificaciones } from '../lib/dispositivo';

const DURACIONES = [30, 60, 90, 120, 180];

export default function Estacionamiento() {
  const { setSesionEstacionamiento, avisar, ubicacion } = useApp();
  const ahora = useAhora(1000);
  const [alerta] = useIonAlert();
  const datos = useDatos(async () => {
    const [cuenta, zonas, info] = await Promise.all([estacionamientoApi.cuenta(), estacionamientoApi.zonas(), estacionamientoApi.info()]);
    return { cuenta, zonas, info };
  });
  useTiempoReal<ZonaEstacionamiento[]>('estacionamiento.zonas', (zonas) => datos.setDatos((d) => (d ? { ...d, zonas: zonas.map((z) => ({ ...z })) } : d)));

  const [vista, setVista] = useState<'estacionar' | 'mapa' | 'info'>('estacionar');
  const [patente, setPatente] = useState('');
  const [zonaId, setZonaId] = useState('');
  const [minutos, setMinutos] = useState(60);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cargandoSaldo, setCargandoSaldo] = useState(false);
  const [importeCarga, setImporteCarga] = useState(2000);
  const [nuevaPatente, setNuevaPatente] = useState('');

  const cuenta = datos.datos?.cuenta;
  const sesion = cuenta?.sesionActiva ?? null;
  const zonas = datos.datos?.zonas ?? [];
  const rige = rigeEstacionamiento(new Date(ahora));

  function actualizarCuenta(c: CuentaEstacionamiento) {
    datos.setDatos((d) => (d ? { ...d, cuenta: c } : d));
    setSesionEstacionamiento(c.sesionActiva);
  }

  async function ejecutar(accion: () => Promise<CuentaEstacionamiento>, ok: string) {
    setProcesando(true);
    setError(null);
    try {
      actualizarCuenta(await accion());
      avisar(ok, 'success');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setProcesando(false);
    }
  }

  const iniciar = () =>
    ejecutar(async () => {
      await pedirPermisoNotificaciones(); // para poder avisar antes de que venza
      return estacionamientoApi.iniciar(patente || cuenta!.vehiculos[0]?.patente, zonaId, minutos);
    }, 'Estacionamiento iniciado. Te avisamos 5 minutos antes de que termine.');

  const restante = sesion ? new Date(sesion.fin).getTime() - ahora : 0;
  const total = sesion ? new Date(sesion.fin).getTime() - new Date(sesion.inicio).getTime() : 1;
  const estadoT = sesion ? estadoTemporizador(sesion.fin, ahora) : 'en_curso';

  return (
    <IonPage>
      <Encabezado titulo="Estacionamiento" atras="/inicio" />
      <IonContent className="ion-padding">
        <div className="sf-contenido">
          {datos.cargando && !datos.datos && <IonSpinner style={{ display: 'block', margin: '24px auto' }} />}
          {cuenta && (
            <>
              {/* Cuenta y saldo, como en la app municipal */}
              <IonCard style={{ margin: '0 0 12px' }}>
                <IonCardContent>
                  <IonNote>Saldo de la cuenta</IonNote>
                  <div className="sf-importe" style={{ color: cuenta.saldo < 0 ? 'var(--ion-color-danger)' : undefined }}>
                    <IonIcon icon={wallet} aria-hidden="true" /> {formatearPesos(cuenta.saldo)}
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center', marginTop: 8 }} role="group" aria-label="Importe a cargar">
                    {[1000, 2000, 5000, 10000].map((m) => (
                      <IonButton key={m} size="small" fill={importeCarga === m ? 'solid' : 'outline'} color="secondary" onClick={() => setImporteCarga(m)} aria-pressed={importeCarga === m}>
                        {formatearPesos(m).replace(',00', '')}
                      </IonButton>
                    ))}
                  </div>
                  <IonButton expand="block" onClick={() => setCargandoSaldo(true)} style={{ marginTop: 8 }}>
                    Cargar {formatearPesos(importeCarga)} · Pago en línea
                  </IonButton>
                </IonCardContent>
              </IonCard>

              {/* Estacionamiento activo con temporizador */}
              {sesion && (
                <IonCard color={estadoT === 'vencido' ? 'danger' : undefined} style={{ margin: '0 0 12px' }}>
                  <IonCardHeader>
                    <IonCardTitle style={{ fontSize: '1rem' }}>
                      <IonIcon icon={car} /> {sesion.patente} · {zonas.find((z) => z.id === sesion.zonaId)?.nombre}
                    </IonCardTitle>
                  </IonCardHeader>
                  <IonCardContent>
                    <div className={`sf-temporizador ${estadoT}`} role="timer" aria-live="off">
                      <div className="reloj">{formatearCuentaRegresiva(restante)}</div>
                      <div>{estadoT === 'vencido' ? 'Tiempo vencido' : `Hasta las ${formatearHora(sesion.fin)} · pagaste ${formatearPesos(sesion.importe)}`}</div>
                    </div>
                    <IonProgressBar value={Math.max(0, restante / total)} color={estadoT === 'en_curso' ? 'primary' : 'warning'} style={{ margin: '10px 0' }} />
                    {/* Se extiende de a fracciones completas (30 min): 15 min costaría lo mismo que 30. */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      {[30, 60].map((m) => (
                        <IonButton key={m} size="small" style={{ margin: 0 }} disabled={procesando} onClick={() => ejecutar(() => estacionamientoApi.extender(sesion.id, m), `Extendiste ${m} minutos.`)}>
                          <IonIcon icon={add} slot="start" />
                          {m} min · {formatearPesos(calcularImporte(m))}
                        </IonButton>
                      ))}
                    </div>
                    <IonButton
                      expand="block"
                      fill="clear"
                      color={estadoT === 'vencido' ? 'light' : 'danger'}
                      disabled={procesando}
                      onClick={() =>
                        alerta({
                          header: 'Finalizar estacionamiento',
                          message: '¿Ya retiraste el vehículo? El tiempo no usado no se reintegra.',
                          buttons: ['Cancelar', { text: 'Finalizar', handler: () => void ejecutar(() => estacionamientoApi.finalizar(sesion.id), 'Estacionamiento finalizado.') }],
                        })
                      }
                    >
                      <IonIcon icon={stopCircle} slot="start" />
                      Finalizar
                    </IonButton>
                  </IonCardContent>
                </IonCard>
              )}

              <IonSegment value={vista} onIonChange={(e) => setVista(e.detail.value as typeof vista)}>
                <IonSegmentButton value="estacionar"><IonLabel>Estacionar</IonLabel></IonSegmentButton>
                <IonSegmentButton value="mapa"><IonLabel>Ocupación</IonLabel></IonSegmentButton>
                <IonSegmentButton value="info"><IonLabel>Tarifas</IonLabel></IonSegmentButton>
              </IonSegment>

              {vista === 'estacionar' && (
                <>
                  {!rige && (
                    <IonText color="medium">
                      <p className="sf-nota"><IonIcon icon={information} /> Ahora no rige el estacionamiento medido: podés estacionar sin pagar. (Igual podés probar la función.)</p>
                    </IonText>
                  )}
                  <IonList inset style={{ margin: '12px 0' }}>
                    <IonItem>
                      <IonSelect label="Vehículo" labelPlacement="stacked" value={patente || cuenta.vehiculos[0]?.patente} onIonChange={(e) => setPatente(e.detail.value)} disabled={!!sesion}>
                        {cuenta.vehiculos.map((v) => <IonSelectOption key={v.patente} value={v.patente}>{v.patente} · {v.alias}</IonSelectOption>)}
                      </IonSelect>
                    </IonItem>
                    <IonItem>
                      <IonSelect label="Zona" labelPlacement="stacked" placeholder="Elegí la zona (o tocála en el mapa)" value={zonaId} onIonChange={(e) => setZonaId(e.detail.value)} disabled={!!sesion} interface="action-sheet">
                        {zonas.map((z) => <IonSelectOption key={z.id} value={z.id}>{z.nombre}</IonSelectOption>)}
                      </IonSelect>
                    </IonItem>
                    <IonItem>
                      <IonSelect label="Tiempo" labelPlacement="stacked" value={minutos} onIonChange={(e) => setMinutos(e.detail.value)} disabled={!!sesion}>
                        {DURACIONES.map((m) => <IonSelectOption key={m} value={m}>{m >= 60 ? `${m / 60} h` : `${m} min`} · {formatearPesos(calcularImporte(m))}</IonSelectOption>)}
                      </IonSelect>
                    </IonItem>
                  </IonList>
                  {error && <IonText color="danger" role="alert"><p>{error}</p></IonText>}
                  <IonButton expand="block" disabled={!!sesion || !zonaId || !cuenta.vehiculos.length || procesando} onClick={iniciar}>
                    {procesando ? <IonSpinner name="dots" /> : <><IonIcon icon={time} slot="start" />Estacionar · {formatearPesos(calcularImporte(minutos))}</>}
                  </IonButton>
                  {sesion && <IonNote style={{ display: 'block', margin: 8 }}>Ya tenés un estacionamiento activo: podés extenderlo arriba.</IonNote>}

                  <h2 className="sf-titulo-seccion">Vehículos registrados</h2>
                  <IonList inset style={{ margin: 0 }}>
                    {cuenta.vehiculos.map((v) => (
                      <IonItem key={v.patente}>
                        <IonIcon icon={car} slot="start" aria-hidden="true" />
                        <IonLabel><h3>{v.patente}</h3><p>{v.alias}</p></IonLabel>
                        <IonButton slot="end" fill="clear" color="danger" aria-label={`Eliminar patente ${v.patente}`} onClick={() => ejecutar(() => estacionamientoApi.eliminarVehiculo(v.patente), 'Patente eliminada.')}>
                          <IonIcon icon={trash} />
                        </IonButton>
                      </IonItem>
                    ))}
                    <IonItem>
                      <IonInput label="Nueva patente" labelPlacement="stacked" placeholder="ABC123 o AB123CD" maxlength={9} value={nuevaPatente} onIonInput={(e) => setNuevaPatente(String(e.detail.value ?? '').toUpperCase())} />
                      <IonButton
                        slot="end"
                        disabled={!patenteValida(nuevaPatente) || procesando}
                        onClick={async () => {
                          await ejecutar(() => estacionamientoApi.agregarVehiculo(nuevaPatente, ''), 'Vehículo agregado.');
                          setNuevaPatente('');
                        }}
                      >
                        Agregar
                      </IonButton>
                    </IonItem>
                  </IonList>

                  {cuenta.historial.length > 0 && (
                    <>
                      <h2 className="sf-titulo-seccion">Últimos estacionamientos</h2>
                      <IonList inset style={{ margin: 0 }}>
                        {cuenta.historial.slice(0, 5).map((s) => (
                          <IonItem key={s.id}>
                            <IonLabel><h3>{s.patente} · {zonas.find((z) => z.id === s.zonaId)?.nombre}</h3><p>{formatearFechaHora(s.inicio)} a {formatearHora(s.fin)}</p></IonLabel>
                            <IonNote slot="end">{formatearPesos(s.importe)}</IonNote>
                          </IonItem>
                        ))}
                      </IonList>
                    </>
                  )}
                </>
              )}

              {vista === 'mapa' && (
                <div style={{ marginTop: 12 }}>
                  <MapaEstacionamiento zonas={zonas} ubicacion={ubicacion} zonaElegida={zonaId} onElegir={(id) => { setZonaId(id); avisar(`Elegiste ${zonas.find((z) => z.id === id)?.nombre}.`); }} />
                  <div className="sf-leyenda" aria-hidden="true">
                    <span style={{ ['--c' as string]: COLOR_OCUPACION.baja }}>Baja</span>
                    <span style={{ ['--c' as string]: COLOR_OCUPACION.media }}>Media</span>
                    <span style={{ ['--c' as string]: COLOR_OCUPACION.alta }}>Alta</span>
                  </div>
                  <IonList inset style={{ margin: '12px 0' }}>
                    {zonas.map((z) => (
                      <IonItem key={z.id} button detail={false} onClick={() => { setZonaId(z.id); setVista('estacionar'); }}>
                        <span slot="start" style={{ width: 14, height: 14, borderRadius: 4, background: COLOR_OCUPACION[z.ocupacion] }} />
                        <IonLabel className="ion-text-wrap"><h3>{z.nombre}</h3><p>{z.calles}</p></IonLabel>
                        <IonNote slot="end">Ocupación {z.ocupacion}</IonNote>
                      </IonItem>
                    ))}
                  </IonList>
                  <p className="sf-nota">Trazado aproximado a partir del mapa de ocupación de la app municipal. Ocupación simulada en tiempo real.</p>
                </div>
              )}

              {vista === 'info' && (
                <IonCard style={{ margin: '12px 0' }}>
                  <IonCardHeader><IonCardTitle style={{ fontSize: '1.05rem' }}>Información de estacionamiento</IonCardTitle></IonCardHeader>
                  <IonCardContent>
                    <div className="sf-dato"><span>Costo por hora</span><strong>{formatearPesos(INFO_ESTACIONAMIENTO.costoHora)}</strong></div>
                    {INFO_ESTACIONAMIENTO.horarios.map((h) => (
                      <div className="sf-dato" key={h.dias}><span>{h.dias}</span><span>{h.franjas.join(' · ')}</span></div>
                    ))}
                    <div className="sf-dato"><span>Costo del ticket</span><strong>{formatearPesos(INFO_ESTACIONAMIENTO.costoTicket)}</strong></div>
                    <div className="sf-dato"><span>Ahora</span><IonText color={rige ? 'warning' : 'success'}>{rige ? 'Rige el estacionamiento medido' : 'Sin cobro'}</IonText></div>
                    <p className="sf-nota">Tarifa, horarios y costo del ticket tomados de la app municipal. El cobro por fracción de 30 minutos es un supuesto del prototipo.</p>
                  </IonCardContent>
                </IonCard>
              )}
            </>
          )}
        </div>

        <PasarelaPago
          abierta={cargandoSaldo}
          concepto="Carga de saldo de estacionamiento"
          importe={importeCarga}
          onCerrar={() => setCargandoSaldo(false)}
          onConfirmar={async (medio) => {
            const c = await estacionamientoApi.cargarSaldo(importeCarga, medio);
            actualizarCuenta(c);
            setCargandoSaldo(false);
            avisar(`Cargaste ${formatearPesos(importeCarga)}.`, 'success');
          }}
        />
      </IonContent>
    </IonPage>
  );
}
