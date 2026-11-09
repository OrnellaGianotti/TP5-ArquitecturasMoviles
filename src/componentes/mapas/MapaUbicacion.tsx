import { CircleMarker, useMapEvents } from 'react-leaflet';
import type { Coordenada } from '../../api/tipos';
import MapaBase from './MapaBase';

function Clic({ onElegir }: { onElegir: (c: Coordenada) => void }) {
  useMapEvents({ click: (e) => onElegir({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}

interface Props {
  punto: Coordenada | null;
  onElegir: (c: Coordenada) => void;
}

/** Mapa para marcar el lugar de un reclamo tocando sobre él. */
export default function MapaUbicacion({ punto, onElegir }: Props) {
  return (
    <MapaBase etiqueta="Mapa para marcar la ubicación del reclamo" zoom={15} enfocar={punto}>
      <Clic onElegir={onElegir} />
      {punto && (
        <CircleMarker center={[punto.lat, punto.lng]} radius={11} pathOptions={{ color: '#fff', weight: 3, fillColor: '#c62828', fillOpacity: 1 }} />
      )}
    </MapaBase>
  );
}
