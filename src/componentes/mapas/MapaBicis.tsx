import { CircleMarker, Popup } from 'react-leaflet';
import type { Coordenada, EstacionBici } from '../../api/tipos';
import MapaBase from './MapaBase';
import { colorDisponibilidad } from '../../lib/colores';

interface Props {
  estaciones: EstacionBici[];
  ubicacion: Coordenada | null;
  enfocar: Coordenada | null;
  onElegir: (e: EstacionBici) => void;
}

export default function MapaBicis({ estaciones, ubicacion, enfocar, onElegir }: Props) {
  return (
    <MapaBase
      etiqueta="Mapa de estaciones de bicicletas"
      zoom={13}
      alto
      ubicacionUsuario={ubicacion}
      enfocar={enfocar}
      encuadrar={estaciones.map((e) => e.ubicacion)}
    >
      {estaciones.map((e) => (
        <CircleMarker
          key={e.id}
          center={[e.ubicacion.lat, e.ubicacion.lng]}
          radius={13}
          pathOptions={{ color: '#fff', weight: 3, fillColor: colorDisponibilidad(e), fillOpacity: 0.95 }}
          eventHandlers={{ click: () => onElegir(e) }}
        >
          <Popup>
            <strong>{e.nombre}</strong>
            <br />
            🚲 {e.bicisDisponibles} bicis · 🅿️ {e.anclajesLibres} anclajes libres
          </Popup>
        </CircleMarker>
      ))}
    </MapaBase>
  );
}
