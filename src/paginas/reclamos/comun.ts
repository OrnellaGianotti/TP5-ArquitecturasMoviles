import { bicycle, bulb, business, car, construct, leaf, navigate, paw, restaurant, trash, warning, water } from 'ionicons/icons';
import type { EstadoReclamo } from '../../api/tipos';

export const ICONOS_CATEGORIA: Record<string, string> = { water, bulb, leaf, construct, bicycle, restaurant, car, business, navigate, trash, warning, paw };

export const ESTADOS: { valor: EstadoReclamo; texto: string; color: string }[] = [
  { valor: 'recibido', texto: 'Recibido', color: 'medium' },
  { valor: 'asignado', texto: 'Asignado', color: 'secondary' },
  { valor: 'en_curso', texto: 'En curso', color: 'warning' },
  { valor: 'resuelto', texto: 'Resuelto', color: 'success' },
];

export const infoEstado = (e: EstadoReclamo) => ESTADOS.find((x) => x.valor === e)!;
