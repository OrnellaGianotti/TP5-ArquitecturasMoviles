import { calendar, car, chatbubbleEllipses, construct, receipt, shieldCheckmark, warning, water } from 'ionicons/icons';
import type { TipoAviso } from '../../api/tipos';

export const ICONO_AVISO: Record<TipoAviso, string> = {
  corte_servicio: water,
  obra_publica: construct,
  evento: calendar,
  emergencia: warning,
  vencimiento: receipt,
  alarma: shieldCheckmark,
  reclamo: chatbubbleEllipses,
  estacionamiento: car,
};

export const COLOR_AVISO: Record<TipoAviso, string> = {
  corte_servicio: 'secondary',
  obra_publica: 'warning',
  evento: 'success',
  emergencia: 'danger',
  vencimiento: 'primary',
  alarma: 'danger',
  reclamo: 'tertiary',
  estacionamiento: 'secondary',
};
