// ============================================================
// TIPOS GLOBALES — App Financiera Personal
// ============================================================

// ----------------------------
// AJUSTES DEL SISTEMA
// ----------------------------
export interface Ajustes {
  id: 1;
  tasa_global_bs_usd: number;
  modo_oscuro: number; // 1 | 0
  usar_biometria: number; // 1 | 0
  ocultar_saldos: number; // 1 | 0
}

// ----------------------------
// PERSONAS (Acreedores / Deudores)
// ----------------------------
export type TipoPersona = 'DEUDOR' | 'ACREEDOR' | 'AMBOS';

export interface Persona {
  id: number;
  nombre: string;
  tipo: TipoPersona;
  nota?: string;
}

export type PersonaInput = Omit<Persona, 'id'>;

// ----------------------------
// DEUDAS Y COMPROMISOS
// ----------------------------
export type TipoDeuda = 'POR_COBRAR' | 'POR_PAGAR';
export type EstadoDeuda = 'ACTIVA' | 'PAGADA' | 'CANCELADA';

export interface DeudaCompromiso {
  id: number;
  persona_id: number;
  tipo: TipoDeuda;
  monto_capital_usd: number;
  monto_interes_fijo_usd: number;
  dia_vencimiento_mensual?: number;
  es_recurrente: number; // 1 | 0
  estado: EstadoDeuda;
  descripcion?: string;
}

export type DeudaInput = Omit<DeudaCompromiso, 'id'>;

// Deuda enriquecida con datos de persona para UI
export interface DeudaConPersona extends DeudaCompromiso {
  persona_nombre: string;
  persona_tipo: TipoPersona;
  total_abonado_capital_usd: number;
  total_abonado_interes_usd: number;
  saldo_capital_pendiente_usd: number;
}

// ----------------------------
// ABONOS DE DEUDAS
// ----------------------------
export type TipoAbono = 'CAPITAL' | 'INTERES';
export type Moneda = 'USD' | 'BS';

export interface AbonoDeuda {
  id: number;
  deuda_id: number;
  tipo_abono: TipoAbono;
  moneda_original: Moneda;
  monto_original: number;
  tasa_cambio: number;
  monto_usd: number;
  fecha: string; // YYYY-MM-DD
  detalle?: string;
  referencia_pago?: string;
  comprobante_uri?: string;
}

export type AbonoInput = Omit<AbonoDeuda, 'id'>;

// ----------------------------
// GASTOS
// ----------------------------
export type TipoGasto = 'PERSONAL' | 'NEGOCIO_PRODUCCION';

export interface Gasto {
  id: number;
  tipo_gasto: TipoGasto;
  categoria: string;
  descripcion?: string;
  moneda_original: Moneda;
  monto_original: number;
  tasa_cambio: number;
  monto_usd: number;
  fecha: string;
  metodo_pago?: string;
  comprobante_uri?: string;
}

export type GastoInput = Omit<Gasto, 'id'>;

// ----------------------------
// INGRESOS
// ----------------------------
export interface Ingreso {
  id: number;
  categoria: string;
  descripcion?: string;
  moneda_original: Moneda;
  monto_original: number;
  tasa_cambio: number;
  monto_usd: number;
  fecha: string;
  metodo_pago?: string;
  comprobante_uri?: string;
}

export type IngresoInput = Omit<Ingreso, 'id'>;

// ----------------------------
// INVERSIONES
// ----------------------------
export type TipoInversion = 'Cripto' | 'Inventario' | 'Negocio' | 'Bienes';
export type EstadoInversion = 'ACTIVA' | 'LIQUIDADA';

export interface Inversion {
  id: number;
  nombre: string;
  tipo: TipoInversion;
  monto_inicial_usd: number;
  valor_actual_usd: number;
  estado: EstadoInversion;
  fecha_inicio: string;
}

export type InversionInput = Omit<Inversion, 'id'>;

// ----------------------------
// MOVIMIENTOS DE INVERSIÓN
// ----------------------------
export type TipoMovimientoInversion =
  | 'APORTE'
  | 'RETIRO_CAPITAL'
  | 'GANANCIA_RENDIMIENTO';

export interface MovimientoInversion {
  id: number;
  inversion_id: number;
  tipo_movimiento: TipoMovimientoInversion;
  moneda_original: Moneda;
  monto_original: number;
  tasa_cambio: number;
  monto_usd: number;
  fecha: string;
}

export type MovimientoInversionInput = Omit<MovimientoInversion, 'id'>;

// ----------------------------
// DASHBOARD — Resumen consolidado
// ----------------------------
export interface ResumenDashboard {
  ingresos_mes_usd: number;
  gastos_mes_usd: number;
  gastos_personales_mes_usd: number;
  gastos_negocio_mes_usd: number;
  total_por_cobrar_usd: number;
  total_por_pagar_usd: number;
  total_inversiones_activas_usd: number;
  liquidez_neta_usd: number; // ingresos_mes - gastos_mes
  tasa_global: number;
}

// ----------------------------
// FORMULARIOS — Estados de UI
// ----------------------------
export interface FormMoneda {
  moneda: Moneda;
  monto_original: string;
  tasa_cambio: string;
  monto_usd_calculado: number;
  alerta_tasa: boolean; // Diferencia > 2% vs tasa global
}

// ----------------------------
// OCR
// ----------------------------
export interface ResultadoOCR {
  monto_bs?: number;
  referencia?: string;
  fecha?: string;
  texto_completo: string;
}

// ----------------------------
// SIMULADOR DE DESENDEUDAMIENTO
// ----------------------------
export type EstrategiaDeuda = 'BOLA_DE_NIEVE' | 'AVALANCHA';

export interface PasoSimulacion {
  mes: number;
  deuda_id: number;
  deuda_descripcion: string;
  pago_mes: number;
  saldo_restante: number;
  pagada_en_mes: boolean;
}

export interface ResultadoSimulacion {
  estrategia: EstrategiaDeuda;
  meses_totales: number;
  total_pagado_usd: number;
  total_intereses_usd: number;
  pasos: PasoSimulacion[];
}
