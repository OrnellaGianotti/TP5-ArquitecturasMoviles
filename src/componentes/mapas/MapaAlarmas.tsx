import { Circle, CircleMarker, Popup } from 'react-leaflet';
import type { AlarmaComunitaria, Coordenada } from '../../api/tipos';
import MapaBase from './MapaBase';
import { COLOR_ALARMA as COLOR, TEXTO_ALARMA as TEXTO } from '../../lib/colores';

interface Props {
  alarmas: AlarmaComunitaria[];
  ubicacion: Coordenada | null;
  radio: number;
}

export default function MapaAlarmas({ alarmas, ubicacion, radio }: Props) {
  return (
    <MapaBase etiqueta="Mapa de alarmas comunitarias" zoom={14} alto ubicacionUsuario={ubicacion}>
      {ubicacion && (
        <Circle
          center={[ubicacion.lat, ubicacion.lng]}
          radius={radio}
          pathOptions={{ color: '#1a73e8', weight: 1, fillOpacity: 0.06, dashArray: '4 6' }}
        />
      )}
      {alarmas.map((a) => (
        <CircleMarker
          key={a.id}
          center={[a.ubicacion.lat, a.ubicacion.lng]}
          radius={a.estado === 'activada' ? 14 : 9}
          pathOptions={{ color: '#fff', weight: 2, fillColor: COLOR[a.estado], fillOpacity: 0.95 }}
          className={a.estado === 'activada' ? 'sf-alarma-activa' : undefined}
        >
          <Popup>
            <strong>{a.referencia}</strong>
            <br />
            Barrio {a.barrio}
            <br />
            Estado: {TEXTO[a.estado]}
          </Popup>
        </CircleMarker>
      ))}
    </MapaBase>
  );
}
