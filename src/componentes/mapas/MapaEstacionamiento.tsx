import { Polygon, Tooltip } from 'react-leaflet';
import type { Coordenada, ZonaEstacionamiento } from '../../api/tipos';
import MapaBase from './MapaBase';
import { COLOR_OCUPACION } from '../../lib/colores';

interface Props {
  zonas: ZonaEstacionamiento[];
  ubicacion: Coordenada | null;
  zonaElegida?: string;
  onElegir: (id: string) => void;
}

export default function MapaEstacionamiento({ zonas, ubicacion, zonaElegida, onElegir }: Props) {
  return (
    <MapaBase etiqueta="Mapa de zonas de estacionamiento medido" zoom={15} centro={{ lat: -31.4290, lng: -62.0850 }} ubicacionUsuario={ubicacion}>
      {zonas.map((z) => (
        <Polygon
          key={z.id}
          positions={z.poligono.map((p) => [p.lat, p.lng])}
          pathOptions={{
            color: zonaElegida === z.id ? '#0b3d91' : COLOR_OCUPACION[z.ocupacion],
            weight: zonaElegida === z.id ? 4 : 1,
            fillColor: COLOR_OCUPACION[z.ocupacion],
            fillOpacity: 0.45,
          }}
          eventHandlers={{ click: () => onElegir(z.id) }}
        >
          <Tooltip sticky>
            {z.nombre} · ocupación {z.ocupacion}
          </Tooltip>
        </Polygon>
      ))}
    </MapaBase>
  );
}
