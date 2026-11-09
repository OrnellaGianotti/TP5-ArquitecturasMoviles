import { IonButton, IonContent, IonFooter, IonIcon, IonInput, IonItem, IonLabel, IonList, IonNote, IonPage, IonSearchbar, IonSpinner, IonText, IonTextarea, IonToolbar } from '@ionic/react';
import { attach, camera, caretForward, chevronBack, chevronForward, close, document as iconoDoc, locate } from 'ionicons/icons';
import { useMemo, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import Encabezado from '../../componentes/Encabezado';
import { MapaUbicacion } from '../../componentes/mapas';
import { reclamosApi } from '../../api/servicios';
import type { Adjunto, Coordenada } from '../../api/tipos';
import { useApp } from '../../contexto/AppContexto';
import { useDatos } from '../../hooks/useDatos';
import { comprimirImagen, direccionDesdeCoordenadas, obtenerUbicacion } from '../../lib/dispositivo';
import { ICONOS_CATEGORIA } from './comun';

const PASOS = ['Categoría', 'Motivo', 'Ubicación', 'Fotos', 'Descripción'];
const MAX_FOTOS = 5;

export default function NuevoReclamo() {
  const history = useHistory();
  const { avisar, setUbicacion } = useApp();
  const { datos: categorias } = useDatos(reclamosApi.categorias);

  const [paso, setPaso] = useState(0);
  const [busqueda, setBusqueda] = useState('');
  const [categoria, setCategoria] = useState('');
  const [motivo, setMotivo] = useState('');
  const [direccion, setDireccion] = useState('');
  const [punto, setPunto] = useState<Coordenada | null>(null);
  const [buscandoDir, setBuscandoDir] = useState(false);
  const [adjuntos, setAdjuntos] = useState<Adjunto[]>([]);
  const [descripcion, setDescripcion] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputFoto = useRef<HTMLInputElement>(null);
  const inputDoc = useRef<HTMLInputElement>(null);

  // Búsqueda de motivos en todas las categorías ("Buscar un motivo…", como en la app municipal).
  const coincidencias = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q || !categorias) return [];
    return categorias.flatMap((c) => c.motivos.filter((m) => m.toLowerCase().includes(q)).map((m) => ({ categoria: c.nombre, motivo: m })));
  }, [busqueda, categorias]);

  const fotos = adjuntos.filter((a) => a.tipo === 'foto');
  const cat = categorias?.find((c) => c.nombre === categoria);

  const puedeSeguir = [!!categoria, !!motivo, direccion.trim().length >= 4, true, descripcion.trim().length >= 10][paso];

  async function usarMiUbicacion() {
    setBuscandoDir(true);
    const r = await obtenerUbicacion();
    setPunto(r.coordenada);
    setUbicacion(r.coordenada);
    if (!r.real) avisar(`${r.motivo} Marcá el lugar en el mapa.`, 'warning');
    const dir = await direccionDesdeCoordenadas(r.coordenada);
    setBuscandoDir(false);
    if (dir) setDireccion(dir);
    else avisar('No pudimos obtener la dirección: escribila a mano.', 'warning');
  }

  async function elegirEnMapa(c: Coordenada) {
    setPunto(c);
    setBuscandoDir(true);
    const dir = await direccionDesdeCoordenadas(c);
    setBuscandoDir(false);
    if (dir) setDireccion(dir);
  }

  async function agregarFotos(archivos: FileList | null) {
    if (!archivos) return;
    const libres = MAX_FOTOS - fotos.length;
    if (archivos.length > libres) avisar(`Podés subir hasta ${MAX_FOTOS} fotos.`, 'warning');
    const nuevas: Adjunto[] = [];
    for (const f of Array.from(archivos).slice(0, libres)) {
      try {
        const miniatura = await comprimirImagen(f);
        nuevas.push({ nombre: f.name, tipo: 'foto', tamanio: Math.round((miniatura.length * 3) / 4), miniatura });
      } catch (e) {
        avisar((e as Error).message, 'danger');
      }
    }
    setAdjuntos((a) => [...a, ...nuevas]);
  }

  function agregarDocumentos(archivos: FileList | null) {
    if (!archivos) return;
    const docs: Adjunto[] = [];
    for (const f of Array.from(archivos)) {
      if (f.size > 5 * 1024 * 1024) {
        avisar(`“${f.name}” supera los 5 MB.`, 'warning');
        continue;
      }
      docs.push({ nombre: f.name, tipo: 'documento', tamanio: f.size });
    }
    setAdjuntos((a) => [...a, ...docs]);
  }

  async function enviar() {
    setEnviando(true);
    setError(null);
    try {
      const r = await reclamosApi.crear({ categoria, motivo, descripcion, direccion, ubicacion: punto ?? undefined, adjuntos });
      avisar(`Reclamo enviado. Tu número es ${r.numero}.`, 'success');
      history.replace(`/reclamos/ver/${r.id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <IonPage>
      <Encabezado titulo="Nuevo reclamo" atras="/reclamos" />
      <IonContent className="ion-padding">
        <div className="sf-contenido">
          <div className="sf-pasos" role="progressbar" aria-valuemin={1} aria-valuemax={PASOS.length} aria-valuenow={paso + 1} aria-label={`Paso ${paso + 1} de ${PASOS.length}: ${PASOS[paso]}`}>
            {PASOS.map((p, i) => <span key={p} className={i <= paso ? 'hecho' : ''} />)}
          </div>
          <h1 style={{ margin: '0 0 4px', fontSize: '1.5rem' }}>Contanos sobre tu reclamo.</h1>
          <IonNote>Paso {paso + 1} de {PASOS.length}: {PASOS[paso]}</IonNote>

          {/* Paso 1: categoría */}
          {paso === 0 && (
            <>
              <IonSearchbar value={busqueda} onIonInput={(e) => setBusqueda(e.detail.value ?? '')} placeholder="Buscar un motivo…" aria-label="Buscar un motivo" style={{ padding: '12px 0' }} />
              {busqueda ? (
                <IonList inset style={{ margin: 0 }}>
                  {coincidencias.map((c) => (
                    <IonItem key={c.categoria + c.motivo} button onClick={() => { setCategoria(c.categoria); setMotivo(c.motivo); setBusqueda(''); setPaso(2); }}>
                      <IonLabel>
                        <h3>{c.motivo}</h3>
                        <p>{c.categoria}</p>
                      </IonLabel>
                    </IonItem>
                  ))}
                  {!coincidencias.length && <p className="sf-vacio">Sin coincidencias.</p>}
                </IonList>
              ) : (
                <div className="sf-categorias">
                  {categorias?.map((c) => (
                    <button
                      key={c.nombre}
                      type="button"
                      className={`sf-categoria${categoria === c.nombre ? ' activa' : ''}`}
                      aria-pressed={categoria === c.nombre}
                      onClick={() => { if (categoria !== c.nombre) setMotivo(''); setCategoria(c.nombre); setPaso(1); }}
                    >
                      <IonIcon icon={ICONOS_CATEGORIA[c.icono]} aria-hidden="true" />
                      {c.nombre}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Paso 2: motivo */}
          {paso === 1 && cat && (
            <>
              <h2 className="sf-titulo-seccion">{cat.nombre} · Seleccioná un motivo</h2>
              <IonList inset style={{ margin: 0 }}>
                {cat.motivos.map((m) => (
                  <IonItem key={m} button detail={false} color={motivo === m ? 'light' : undefined} onClick={() => { setMotivo(m); setPaso(2); }}>
                    <IonLabel>{m}</IonLabel>
                    <IonIcon icon={caretForward} slot="end" aria-hidden="true" />
                  </IonItem>
                ))}
              </IonList>
            </>
          )}

          {/* Paso 3: ubicación */}
          {paso === 2 && (
            <>
              <IonButton expand="block" fill="outline" onClick={usarMiUbicacion} disabled={buscandoDir} style={{ marginTop: 14 }}>
                {buscandoDir ? <IonSpinner name="dots" /> : <IonIcon slot="start" icon={locate} />}
                Usar mi ubicación
              </IonButton>
              <IonList inset style={{ margin: '12px 0' }}>
                <IonItem>
                  <IonInput
                    label="Dirección o referencia *"
                    labelPlacement="stacked"
                    value={direccion}
                    onIonInput={(e) => setDireccion(String(e.detail.value ?? ''))}
                    placeholder="Ej.: Bv. 25 de Mayo 1500"
                    autocomplete="street-address"
                  />
                </IonItem>
              </IonList>
              <IonNote style={{ display: 'block', margin: '0 4px 8px' }}>O tocá el mapa para marcar el lugar exacto.</IonNote>
              <MapaUbicacion punto={punto} onElegir={elegirEnMapa} />
              <p className="sf-nota">La dirección se obtiene con Nominatim (OpenStreetMap), una API pública real.</p>
            </>
          )}

          {/* Paso 4: fotos y documentos */}
          {paso === 3 && (
            <>
              <h2 className="sf-titulo-seccion">Fotos (hasta {MAX_FOTOS})</h2>
              <div className="sf-fotos">
                {fotos.map((f) => (
                  <div className="foto" key={f.nombre + f.miniatura?.length}>
                    <img src={f.miniatura} alt={`Foto adjunta ${f.nombre}`} />
                    <button type="button" className="quitar" onClick={() => setAdjuntos((a) => a.filter((x) => x !== f))} aria-label={`Quitar ${f.nombre}`}>
                      <IonIcon icon={close} aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
              <input ref={inputFoto} type="file" accept="image/*" capture="environment" multiple hidden onChange={(e) => { void agregarFotos(e.target.files); e.target.value = ''; }} />
              <IonButton expand="block" fill="outline" onClick={() => inputFoto.current?.click()} disabled={fotos.length >= MAX_FOTOS} style={{ marginTop: 10 }}>
                <IonIcon slot="start" icon={camera} />
                Subir imagen
              </IonButton>
              <IonNote style={{ display: 'block', margin: '6px 4px' }}>Asegurate de que el objeto del reclamo se vea bien dentro de la foto. Las fotos se comprimen para ahorrar datos.</IonNote>

              <h2 className="sf-titulo-seccion">Documentos (opcional)</h2>
              <IonList inset style={{ margin: 0 }}>
                {adjuntos.filter((a) => a.tipo === 'documento').map((d) => (
                  <IonItem key={d.nombre}>
                    <IonIcon icon={iconoDoc} slot="start" aria-hidden="true" />
                    <IonLabel>{d.nombre}<p>{(d.tamanio / 1024).toFixed(0)} KB</p></IonLabel>
                    <IonButton slot="end" fill="clear" onClick={() => setAdjuntos((a) => a.filter((x) => x !== d))} aria-label={`Quitar ${d.nombre}`}>
                      <IonIcon icon={close} />
                    </IonButton>
                  </IonItem>
                ))}
              </IonList>
              <input ref={inputDoc} type="file" accept=".pdf,.doc,.docx,image/*" multiple hidden onChange={(e) => { agregarDocumentos(e.target.files); e.target.value = ''; }} />
              <IonButton expand="block" fill="clear" onClick={() => inputDoc.current?.click()}>
                <IonIcon slot="start" icon={attach} />
                Adjuntar documento (PDF, Word; máx. 5 MB)
              </IonButton>
            </>
          )}

          {/* Paso 5: descripción y confirmación */}
          {paso === 4 && (
            <>
              <IonList inset style={{ margin: '14px 0' }}>
                <IonItem>
                  <IonTextarea
                    label="Descripción *"
                    labelPlacement="stacked"
                    autoGrow
                    rows={4}
                    maxlength={600}
                    counter
                    value={descripcion}
                    onIonInput={(e) => setDescripcion(e.detail.value ?? '')}
                    placeholder="Contanos qué pasa, desde cuándo y cualquier dato que ayude a resolverlo."
                  />
                </IonItem>
              </IonList>
              <h2 className="sf-titulo-seccion">Resumen</h2>
              <div style={{ padding: '0 4px' }}>
                <div className="sf-dato"><span>Categoría</span><span>{categoria}</span></div>
                <div className="sf-dato"><span>Motivo</span><span>{motivo}</span></div>
                <div className="sf-dato"><span>Lugar</span><span>{direccion}</span></div>
                <div className="sf-dato"><span>Adjuntos</span><span>{fotos.length} foto(s), {adjuntos.length - fotos.length} documento(s)</span></div>
              </div>
              {error && <IonText color="danger" role="alert"><p>{error}</p></IonText>}
            </>
          )}
        </div>
      </IonContent>
      <IonFooter>
        <IonToolbar>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 8px' }}>
            <IonButton color="dark" shape="round" disabled={paso === 0 || enviando} onClick={() => setPaso((p) => p - 1)}>
              <IonIcon slot="start" icon={chevronBack} />
              Anterior
            </IonButton>
            {paso < PASOS.length - 1 ? (
              <IonButton shape="round" disabled={!puedeSeguir} onClick={() => setPaso((p) => p + 1)}>
                Siguiente
                <IonIcon slot="end" icon={chevronForward} />
              </IonButton>
            ) : (
              <IonButton shape="round" color="success" disabled={!puedeSeguir || enviando} onClick={enviar}>
                {enviando ? <IonSpinner name="dots" /> : 'Enviar reclamo'}
              </IonButton>
            )}
          </div>
        </IonToolbar>
      </IonFooter>
    </IonPage>
  );
}
