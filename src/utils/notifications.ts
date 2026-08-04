// ============================================================
// NOTIFICACIONES — Cuantos Dolitas
// Alertas de vencimiento de deudas e intereses
// ============================================================

import * as Notifications from 'expo-notifications';
import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

// ---- Configuración global ----
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// ---- Solicitar permisos ----
export async function solicitarPermisosNotificaciones(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

// ---- Cancelar todas las notificaciones programadas ----
export async function cancelarTodasNotificaciones(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// ---- Programar notificación para un vencimiento ----
async function programarNotificacionVencimiento(params: {
  titulo: string;
  cuerpo: string;
  fecha: Date;
  identificador: string;
}): Promise<void> {
  const ahora = new Date();
  if (params.fecha <= ahora) return; // No programar si ya pasó

  try {
    await Notifications.scheduleNotificationAsync({
      identifier: params.identificador,
      content: {
        title: params.titulo,
        body: params.cuerpo,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        vibrate: [0, 250, 250, 250],
        color: '#10B981',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: params.fecha,
      },
    });
  } catch (e) {
    console.warn('[Notifications] Error programando:', params.identificador, e);
  }
}

// ---- Notificación inmediata (para pruebas o alertas urgentes) ----
export async function notificacionInmediata(titulo: string, cuerpo: string): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: titulo,
      body: cuerpo,
      sound: true,
      priority: Notifications.AndroidNotificationPriority.HIGH,
      color: '#F59E0B',
    },
    trigger: null, // Inmediata
  });
}

// ---- Programar todas las notificaciones de deudas ----
export async function programarNotificacionesDeudas(
  db: SQLite.SQLiteDatabase,
  diasPrevioAviso: number = 3,
): Promise<void> {
  const permiso = await solicitarPermisosNotificaciones();
  if (!permiso) return;

  // Cancelar todas las existentes primero
  await cancelarTodasNotificaciones();

  // Obtener deudas activas con día de vencimiento
  const deudas = await db.getAllAsync<{
    id: number;
    persona_nombre: string;
    tipo: string;
    monto_capital_usd: number;
    monto_interes_fijo_usd: number;
    dia_vencimiento_mensual: number | null;
    descripcion: string | null;
  }>(`
    SELECT dc.id, p.nombre AS persona_nombre, dc.tipo,
           dc.monto_capital_usd, dc.monto_interes_fijo_usd,
           dc.dia_vencimiento_mensual, dc.descripcion
    FROM deudas_compromisos dc
    JOIN personas p ON p.id = dc.persona_id
    WHERE dc.estado = 'ACTIVA' AND dc.dia_vencimiento_mensual IS NOT NULL
  `);

  const ahora = new Date();
  const anio = ahora.getFullYear();
  const mes = ahora.getMonth(); // 0-indexed

  for (const deuda of deudas) {
    const dia = deuda.dia_vencimiento_mensual!;
    const nombre = deuda.persona_nombre;
    const esInteres = deuda.monto_interes_fijo_usd > 0;
    const monto = esInteres
      ? `$${deuda.monto_interes_fijo_usd.toFixed(2)}`
      : `$${deuda.monto_capital_usd.toFixed(2)}`;

    // Calcular fecha de vencimiento este mes y el próximo
    for (let offset = 0; offset <= 1; offset++) {
      const fechaMes = mes + offset;
      const fechaAnio = fechaMes > 11 ? anio + 1 : anio;
      const fechaMesNorm = fechaMes > 11 ? fechaMes - 12 : fechaMes;

      // Fecha exacta de vencimiento
      const fechaVence = new Date(fechaAnio, fechaMesNorm, dia, 9, 0, 0);

      // Notificación el día del vencimiento (9:00 AM)
      await programarNotificacionVencimiento({
        titulo: `⚠️ Vence hoy — ${nombre}`,
        cuerpo: esInteres
          ? `El interés de ${monto} con ${nombre} vence hoy. ¡No olvides pagarlo!`
          : `La cuota de ${monto} con ${nombre} vence hoy.`,
        fecha: fechaVence,
        identificador: `vence_${deuda.id}_${fechaAnio}_${fechaMesNorm}`,
      });

      // Notificación X días antes (8:00 AM)
      const fechaAviso = new Date(fechaAnio, fechaMesNorm, dia - diasPrevioAviso, 8, 0, 0);
      await programarNotificacionVencimiento({
        titulo: `📅 Vence en ${diasPrevioAviso} días — ${nombre}`,
        cuerpo: esInteres
          ? `El interés de ${monto} con ${nombre} vence el día ${dia}.`
          : `La cuota de ${monto} con ${nombre} vence el día ${dia}.`,
        fecha: fechaAviso,
        identificador: `aviso_${deuda.id}_${fechaAnio}_${fechaMesNorm}`,
      });

      // Notificación 1 día antes (8:00 AM)
      if (diasPrevioAviso > 1) {
        const fechaManana = new Date(fechaAnio, fechaMesNorm, dia - 1, 8, 0, 0);
        await programarNotificacionVencimiento({
          titulo: `🔔 Mañana vence — ${nombre}`,
          cuerpo: esInteres
            ? `Mañana vence el interés de ${monto} con ${nombre}.`
            : `Mañana vence la cuota de ${monto} con ${nombre}.`,
          fecha: fechaManana,
          identificador: `manana_${deuda.id}_${fechaAnio}_${fechaMesNorm}`,
        });
      }
    }
  }

  console.log(`[Notifications] ${deudas.length} deudas programadas con notificaciones`);
}
