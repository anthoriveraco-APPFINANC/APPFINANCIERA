// ============================================================
// SEED.TS — Datos de Inicialización
// App Financiera Personal
// ============================================================
// Solo se ejecuta UNA vez gracias al control en tabla _meta.
// Pobla: Personas, Deudas (Por Pagar y Por Cobrar) y Abonos iniciales.
// ============================================================

import * as SQLite from 'expo-sqlite';
import { SEED_KEY } from '../constants';
import {
  getMetaValor,
  setMetaValor,
  insertPersona,
  insertDeuda,
  insertAbono,
} from './database';
import { hoyDB } from '../utils/currency';

// ============================================================
// EJECUTOR PRINCIPAL DEL SEED
// ============================================================

export async function ejecutarSeedSiNecesario(
  db: SQLite.SQLiteDatabase,
): Promise<void> {
  const yaEjecutado = await getMetaValor(db, SEED_KEY);
  if (yaEjecutado === '1') {
    console.log('[SEED] Ya ejecutado, omitiendo.');
    return;
  }

  console.log('[SEED] Ejecutando carga inicial de datos...');

  try {
    await db.withTransactionAsync(async () => {
      await seedPersonasYDeudas(db);
    });

    await setMetaValor(db, SEED_KEY, '1');
    console.log('[SEED] Completado exitosamente.');
  } catch (error) {
    console.error('[SEED] Error durante la carga inicial:', error);
    throw error;
  }
}

// ============================================================
// SEED PRINCIPAL — Personas y Compromisos
// ============================================================

async function seedPersonasYDeudas(db: SQLite.SQLiteDatabase): Promise<void> {
  const hoy = hoyDB();

  // ============================================================
  // A) DEUDAS POR PAGAR — Total: $2,742.50
  // ============================================================

  // ────────────────────────────────────────────
  // 1. GREGORY — Capital $1,250 | Interés $312.50/mes (vence día 7)
  // Abono registrado: $260.00 a intereses → Saldo interés: $52.50
  // ────────────────────────────────────────────
  const idGregory = await insertPersona(db, {
    nombre: 'Gregory',
    tipo: 'ACREEDOR',
    nota: 'Préstamo con interés mensual. Vencimiento el día 7 de cada mes.',
  });

  const idDeudaGregory = await insertDeuda(db, {
    persona_id: idGregory,
    tipo: 'POR_PAGAR',
    monto_capital_usd: 1250.00,
    monto_interes_fijo_usd: 312.50,
    dia_vencimiento_mensual: 7,
    es_recurrente: 1,
    estado: 'ACTIVA',
    descripcion: 'Préstamo Gregory. Interés fijo mensual 25% ($312.50). Vence los 7 de cada mes.',
  });

  // Registrar el abono de $260 a intereses ya pagado
  await insertAbono(db, {
    deuda_id: idDeudaGregory,
    tipo_abono: 'INTERES',
    moneda_original: 'USD',
    monto_original: 260.00,
    tasa_cambio: 1.0,
    monto_usd: 260.00,
    fecha: hoy,
    detalle: 'Abono parcial a intereses del mes. Saldo restante: $52.50',
    referencia_pago: undefined,
    comprobante_uri: undefined,
  });

  // ────────────────────────────────────────────
  // 2. GUILLERMO — $620.00
  // ────────────────────────────────────────────
  const idGuillermo = await insertPersona(db, {
    nombre: 'Guillermo',
    tipo: 'ACREEDOR',
    nota: undefined,
  });

  await insertDeuda(db, {
    persona_id: idGuillermo,
    tipo: 'POR_PAGAR',
    monto_capital_usd: 620.00,
    monto_interes_fijo_usd: 0,
    dia_vencimiento_mensual: undefined,
    es_recurrente: 0,
    estado: 'ACTIVA',
    descripcion: 'Deuda con Guillermo.',
  });

  // ────────────────────────────────────────────
  // 3. COLEGIO DE VALENTINA — $570.00
  // ────────────────────────────────────────────
  const idColegioPersona = await insertPersona(db, {
    nombre: 'Colegio de Valentina',
    tipo: 'ACREEDOR',
    nota: 'Inscripción + mensualidades pendientes.',
  });

  await insertDeuda(db, {
    persona_id: idColegioPersona,
    tipo: 'POR_PAGAR',
    monto_capital_usd: 570.00,
    monto_interes_fijo_usd: 0,
    dia_vencimiento_mensual: undefined,
    es_recurrente: 1,
    estado: 'ACTIVA',
    descripcion: 'Deuda Colegio Valentina. Incluye inscripción y mensualidades acumuladas.',
  });

  // ────────────────────────────────────────────
  // 4. JHOAN — $250.00
  // ────────────────────────────────────────────
  const idJhoan = await insertPersona(db, {
    nombre: 'Jhoan',
    tipo: 'ACREEDOR',
    nota: undefined,
  });

  await insertDeuda(db, {
    persona_id: idJhoan,
    tipo: 'POR_PAGAR',
    monto_capital_usd: 250.00,
    monto_interes_fijo_usd: 0,
    dia_vencimiento_mensual: undefined,
    es_recurrente: 0,
    estado: 'ACTIVA',
    descripcion: 'Deuda con Jhoan.',
  });

  // ============================================================
  // B) CUENTAS POR COBRAR — Total: $1,477.36
  // ============================================================

  // ────────────────────────────────────────────
  // 1. LEONARDO DOS SANTOS — $520.00
  // ────────────────────────────────────────────
  const idLeonardo = await insertPersona(db, {
    nombre: 'Leonardo dos Santos',
    tipo: 'DEUDOR',
    nota: 'Fondos guardados.',
  });

  await insertDeuda(db, {
    persona_id: idLeonardo,
    tipo: 'POR_COBRAR',
    monto_capital_usd: 520.00,
    monto_interes_fijo_usd: 0,
    dia_vencimiento_mensual: undefined,
    es_recurrente: 0,
    estado: 'ACTIVA',
    descripcion: 'Fondos guardados con Leonardo dos Santos.',
  });

  // ────────────────────────────────────────────
  // 2. JAVIER Y EL CLUB — $247.36
  // ────────────────────────────────────────────
  const idJavierClub = await insertPersona(db, {
    nombre: 'Javier y el Club',
    tipo: 'DEUDOR',
    nota: undefined,
  });

  await insertDeuda(db, {
    persona_id: idJavierClub,
    tipo: 'POR_COBRAR',
    monto_capital_usd: 247.36,
    monto_interes_fijo_usd: 0,
    dia_vencimiento_mensual: undefined,
    es_recurrente: 0,
    estado: 'ACTIVA',
    descripcion: 'Cuenta por cobrar a Javier y el Club.',
  });

  // ────────────────────────────────────────────
  // 3. RICARDO — $200.00
  // ────────────────────────────────────────────
  const idRicardo = await insertPersona(db, {
    nombre: 'Ricardo',
    tipo: 'DEUDOR',
    nota: undefined,
  });

  await insertDeuda(db, {
    persona_id: idRicardo,
    tipo: 'POR_COBRAR',
    monto_capital_usd: 200.00,
    monto_interes_fijo_usd: 0,
    dia_vencimiento_mensual: undefined,
    es_recurrente: 0,
    estado: 'ACTIVA',
    descripcion: 'Cuenta por cobrar a Ricardo.',
  });

  // ────────────────────────────────────────────
  // 4. RENATO — $200.00
  // ────────────────────────────────────────────
  const idRenato = await insertPersona(db, {
    nombre: 'Renato',
    tipo: 'DEUDOR',
    nota: undefined,
  });

  await insertDeuda(db, {
    persona_id: idRenato,
    tipo: 'POR_COBRAR',
    monto_capital_usd: 200.00,
    monto_interes_fijo_usd: 0,
    dia_vencimiento_mensual: undefined,
    es_recurrente: 0,
    estado: 'ACTIVA',
    descripcion: 'Cuenta por cobrar a Renato.',
  });

  // ────────────────────────────────────────────
  // 5. JOSÉ — $100.00
  // ────────────────────────────────────────────
  const idJose = await insertPersona(db, {
    nombre: 'José',
    tipo: 'DEUDOR',
    nota: undefined,
  });

  await insertDeuda(db, {
    persona_id: idJose,
    tipo: 'POR_COBRAR',
    monto_capital_usd: 100.00,
    monto_interes_fijo_usd: 0,
    dia_vencimiento_mensual: undefined,
    es_recurrente: 0,
    estado: 'ACTIVA',
    descripcion: 'Cuenta por cobrar a José.',
  });

  // ────────────────────────────────────────────
  // 6. TÍO JULIO — $100.00
  // ────────────────────────────────────────────
  const idTioJulio = await insertPersona(db, {
    nombre: 'Tío Julio',
    tipo: 'DEUDOR',
    nota: undefined,
  });

  await insertDeuda(db, {
    persona_id: idTioJulio,
    tipo: 'POR_COBRAR',
    monto_capital_usd: 100.00,
    monto_interes_fijo_usd: 0,
    dia_vencimiento_mensual: undefined,
    es_recurrente: 0,
    estado: 'ACTIVA',
    descripcion: 'Cuenta por cobrar a Tío Julio.',
  });

  // ────────────────────────────────────────────
  // 7. AILYN — $50.00
  // ────────────────────────────────────────────
  const idAilyn = await insertPersona(db, {
    nombre: 'Ailyn',
    tipo: 'DEUDOR',
    nota: undefined,
  });

  await insertDeuda(db, {
    persona_id: idAilyn,
    tipo: 'POR_COBRAR',
    monto_capital_usd: 50.00,
    monto_interes_fijo_usd: 0,
    dia_vencimiento_mensual: undefined,
    es_recurrente: 0,
    estado: 'ACTIVA',
    descripcion: 'Cuenta por cobrar a Ailyn.',
  });

  // ────────────────────────────────────────────
  // 8. JAVIER (BINANCE) — $40.00
  // ────────────────────────────────────────────
  const idJavierBinance = await insertPersona(db, {
    nombre: 'Javier (Binance)',
    tipo: 'DEUDOR',
    nota: 'Fondos en Binance.',
  });

  await insertDeuda(db, {
    persona_id: idJavierBinance,
    tipo: 'POR_COBRAR',
    monto_capital_usd: 40.00,
    monto_interes_fijo_usd: 0,
    dia_vencimiento_mensual: undefined,
    es_recurrente: 0,
    estado: 'ACTIVA',
    descripcion: 'Fondos en Binance a nombre de Javier.',
  });

  // ────────────────────────────────────────────
  // 9. CIELO — $20.00
  // ────────────────────────────────────────────
  const idCielo = await insertPersona(db, {
    nombre: 'Cielo',
    tipo: 'DEUDOR',
    nota: undefined,
  });

  await insertDeuda(db, {
    persona_id: idCielo,
    tipo: 'POR_COBRAR',
    monto_capital_usd: 20.00,
    monto_interes_fijo_usd: 0,
    dia_vencimiento_mensual: undefined,
    es_recurrente: 0,
    estado: 'ACTIVA',
    descripcion: 'Cuenta por cobrar a Cielo.',
  });
}
