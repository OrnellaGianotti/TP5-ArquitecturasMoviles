import { useEffect, type ReactNode } from 'react';
import { CircleMarker, MapContainer, TileLayer, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { Coordenada } from '../../api/tipos';
import { CENTRO_SAN_FRANCISCO } from '../../lib/geo';

// Mapa base con mosaicos de OpenStreetMap (gratuitos y sin clave de API).
// Se usan marcadores circulares (CircleMarker) en vez de imágenes: pesan menos y
// se colorean según el estado (disponibilidad, alarma activada, etc.).

/** Ionic monta la pantalla antes de mostrarla: hay que recalcular el tamaño del mapa. */
function AjustarTamanio() {
  const mapa = useMap();
  useEffect(() => {
    const contenedor = mapa.getContainer();
    const obs = new ResizeObserver(() => mapa.invalidateSize());
    obs.observe(contenedor);
    const t = setTimeout(() => mapa.invalidateSize(), 300);
    return () => {
      obs.disconnect();
      clearTimeout(t);
    };
  }, [mapa]);
  return null;
}

function Recentrar({ centro, zoom }: { centro?: Coordenada | null; zoom?: number }) {
  const mapa = useMap();
  useEffect(() => {
    if (centro) mapa.flyTo([centro.lat, centro.lng], zoom ?? mapa.getZoom(), { duration: 0.6 });
  }, [centro?.lat, centro?.lng]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

interface Props {
  children?: ReactNode;
  centro?: Coordenada;
  zoom?: number;
  alto?: boolean;
  ubicacionUsuario?: Coordenada | null;
  enfocar?: Coordenada | null;
  etiqueta: string;
}

export default function MapaBase({ children, centro = CENTRO_SAN_FRANCISCO, zoom = 14, alto, ubicacionUsuario, enfocar, etiqueta }: Props) {
  return (
    <div className={`sf-mapa${alto ? ' alto' : ''}`} role="region" aria-label={etiqueta}>
      <MapContainer center={[centro.lat, centro.lng]} zoom={zoom} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        <AjustarTamanio />
        <Recentrar centro={enfocar} zoom={16} />
        {ubicacionUsuario && (
          <CircleMarker
            center={[ubicacionUsuario.lat, ubicacionUsuario.lng]}
            radius={8}
            pathOptions={{ color: '#fff', weight: 3, fillColor: '#1a73e8', fillOpacity: 1 }}
          >
            <Tooltip>Tu ubicación</Tooltip>
          </CircleMarker>
        )}
        {children}
      </MapContainer>
    </div>
  );
}
