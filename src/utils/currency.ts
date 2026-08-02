// ============================================================
// UTILIDADES DE MONEDA Y FORMATO — App Financiera Personal
// ============================================================

import { ALERTA_TASA_DIFERENCIA_PORCENTAJE } from '../constants';
import type { Moneda, FormMoneda } from '../types';

// ----------------------------
// CONVERSIÓN BS → USD
// ----------------------------
export function calcularMontoUSD(
  montoOriginal: number,
  moneda: Moneda,
  tasaCambio: number,
): number {
  if (moneda === 'USD') return montoOriginal;
  if (tasaCambio <= 0) return 0;
  return montoOriginal / tasaCambio;
}

// ----------------------------
// ALERTA DE TASA CAMBIARIA
// Retorna true si la tasa introducida difiere más del 2% de la tasa global
// ----------------------------
export function detectarAlertaTasa(
  tasaIntroducida: number,
  tasaGlobal: number,
): boolean {
  if (tasaGlobal <= 0) return false;
  const diferencia = Math.abs(tasaIntroducida - tasaGlobal) / tasaGlobal;
  return diferencia > ALERTA_TASA_DIFERENCIA_PORCENTAJE;
}

// ----------------------------
// PORCENTAJE DE DIFERENCIA DE TASA (para mostrar en UI)
// ----------------------------
export function porcentajeDiferenciaTasa(
  tasaIntroducida: number,
  tasaGlobal: number,
): number {
  if (tasaGlobal <= 0) return 0;
  return ((tasaIntroducida - tasaGlobal) / tasaGlobal) * 100;
}

// ----------------------------
// FORMATEO DE MONTOS
// ----------------------------

/**
 * Formatea un número como moneda USD
 * Ej: 1234.5 → "$1.234,50"
 */
export function formatUSD(
  monto: number,
  ocultar = false,
  decimales = 2,
): string {
  if (ocultar) return '$***.**';
  return new Intl.NumberFormat('es-VE', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(monto);
}

/**
 * Formatea un número como Bolívares
 * Ej: 45000 → "Bs. 45.000,00"
 */
export function formatBS(monto: number, ocultar = false): string {
  if (ocultar) return 'Bs. ***.**';
  return (
    'Bs. ' +
    new Intl.NumberFormat('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(monto)
  );
}

/**
 * Formatea según la moneda original
 */
export function formatMoneda(
  monto: number,
  moneda: Moneda,
  ocultar = false,
): string {
  return moneda === 'USD' ? formatUSD(monto, ocultar) : formatBS(monto, ocultar);
}

/**
 * Formatea un número compacto para tarjetas del dashboard
 * Ej: 1234.56 → "$1.23K"
 */
export function formatUSDCompacto(monto: number, ocultar = false): string {
  if (ocultar) return '$***';
  if (Math.abs(monto) >= 1000) {
    return '$' + (monto / 1000).toFixed(2) + 'K';
  }
  return formatUSD(monto);
}

/**
 * Parsea un string a número seguro (reemplaza , por .)
 */
export function parsearMonto(texto: string): number {
  const limpio = texto.replace(',', '.').replace(/[^0-9.]/g, '');
  const valor = parseFloat(limpio);
  return isNaN(valor) ? 0 : valor;
}

// ----------------------------
// ESTADO INICIAL DE FORMULARIO MULTIMONEDA
// ----------------------------
export function crearFormMoneda(tasaGlobal: number): FormMoneda {
  return {
    moneda: 'USD',
    monto_original: '',
    tasa_cambio: tasaGlobal.toString(),
    monto_usd_calculado: 0,
    alerta_tasa: false,
  };
}

/**
 * Actualiza el estado del form multimoneda al cambiar cualquier campo
 */
export function actualizarFormMoneda(
  form: FormMoneda,
  campo: Partial<Pick<FormMoneda, 'moneda' | 'monto_original' | 'tasa_cambio'>>,
  tasaGlobal: number,
): FormMoneda {
  const nuevo = { ...form, ...campo };
  const monto = parsearMonto(nuevo.monto_original);
  const tasa = parsearMonto(nuevo.tasa_cambio);
  const monto_usd_calculado = calcularMontoUSD(monto, nuevo.moneda, tasa);
  const alerta_tasa =
    nuevo.moneda === 'BS' ? detectarAlertaTasa(tasa, tasaGlobal) : false;

  return { ...nuevo, monto_usd_calculado, alerta_tasa };
}

// ----------------------------
// FECHAS
// ----------------------------

/**
 * Retorna la fecha de hoy en formato YYYY-MM-DD (para SQLite)
 */
export function hoyDB(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Retorna el primer día del mes actual en formato YYYY-MM-DD
 */
export function primerDiaMesDB(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

/**
 * Convierte fecha YYYY-MM-DD a formato display dd/MM/yyyy
 */
export function formatFecha(fechaDB: string): string {
  if (!fechaDB) return '';
  const [y, m, d] = fechaDB.split('-');
  return `${d}/${m}/${y}`;
}

/**
 * Nombre del mes en español
 */
export function nombreMes(fechaDB: string): string {
  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ];
  const [, m] = fechaDB.split('-');
  return meses[parseInt(m, 10) - 1] ?? '';
}

// ----------------------------
// COMPROBANTE DE PAGO — Texto para WhatsApp
// ----------------------------
export function generarComprobanteWhatsApp(params: {
  persona: string;
  tipo: 'Abono a Capital' | 'Abono a Interés' | 'Pago Total';
  monto_usd: number;
  monto_original: number;
  moneda: Moneda;
  tasa: number;
  referencia?: string;
  fecha: string;
  descripcion?: string;
}): string {
  const lineas = [
    '🏦 *COMPROBANTE DE PAGO*',
    '─────────────────────',
    `👤 *Persona:* ${params.persona}`,
    `📋 *Concepto:* ${params.tipo}`,
    `📅 *Fecha:* ${formatFecha(params.fecha)}`,
    '─────────────────────',
    `💵 *Monto USD:* ${formatUSD(params.monto_usd)}`,
  ];

  if (params.moneda === 'BS') {
    lineas.push(`💱 *Monto BS:* ${formatBS(params.monto_original)}`);
    lineas.push(`📊 *Tasa:* Bs. ${params.tasa.toFixed(2)}/USD`);
  }

  if (params.referencia) {
    lineas.push(`🔢 *Referencia:* ${params.referencia}`);
  }

  if (params.descripcion) {
    lineas.push(`📝 *Nota:* ${params.descripcion}`);
  }

  lineas.push('─────────────────────');
  lineas.push('_App Financiera Personal_ ✅');

  return lineas.join('\n');
}

// ----------------------------
// SIMULADOR — Ordenamiento de deudas
// ----------------------------
export function ordenarDeudasBolaNieve<
  T extends { saldo_capital_pendiente_usd: number },
>(deudas: T[]): T[] {
  return [...deudas].sort(
    (a, b) =>
      a.saldo_capital_pendiente_usd - b.saldo_capital_pendiente_usd,
  );
}

export function ordenarDeudasAvalanche<
  T extends {
    saldo_capital_pendiente_usd: number;
    monto_interes_fijo_usd: number;
  },
>(deudas: T[]): T[] {
  return [...deudas].sort(
    (a, b) =>
      b.monto_interes_fijo_usd - a.monto_interes_fijo_usd,
  );
}
