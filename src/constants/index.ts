// ============================================================
// CONSTANTES GLOBALES — Cuantos Dolitas
// ============================================================

export const CATEGORIAS_GASTO_PERSONAL = [
  'Mercado / Comida',
  'Vehículo / Transporte',
  'Ropa / Lujos',
  'Colegio / Educación',
  'Salud / Medicamentos',
  'Servicios (Luz, Agua, Internet)',
  'Entretenimiento',
  'Restaurantes / Salidas',
  'Alquiler / Vivienda',
  'Otro Personal',
] as const;

export const CATEGORIAS_GASTO_NEGOCIO = [
  'Insumos Textil',
  'Inventario / Mercancía',
  'Suplementos / Fit 58',
  'Logística / Envíos',
  'Publicidad / Marketing',
  'Equipos / Maquinaria',
  'Servicios Negocio',
  'Mano de Obra',
  'Impuestos / Comisiones',
  'Otro Negocio',
] as const;

export const TODAS_CATEGORIAS_GASTO = [
  ...CATEGORIAS_GASTO_PERSONAL,
  ...CATEGORIAS_GASTO_NEGOCIO,
];

export const CATEGORIAS_INGRESO = [
  'Salario',
  'Venta Tienda',
  'Venta Ropa / Confección',
  'Ingreso Extra',
  'Cobro Deuda',
  'Rendimiento Inversión',
  'Binance P2P',
  'Freelance',
  'Otro Ingreso',
] as const;

export const METODOS_PAGO = [
  'Efectivo USD',
  'Efectivo BS',
  'Pago Móvil',
  'Binance',
  'Zelle',
  'Transferencia BS',
  'Transferencia USD',
  'Tarjeta de Débito',
  'Otro',
] as const;

export const TIPOS_INVERSION = [
  'Cripto',
  'Inventario',
  'Negocio',
  'Bienes',
] as const;

// ============================================================
// TEMA OSCURO
// ============================================================
export const DARK_COLORS = {
  background: '#0A0E1A',
  surface: '#111827',
  surfaceAlt: '#1A2233',
  border: '#1E2D40',
  borderLight: '#2A3A50',
  textPrimary: '#F0F4FF',
  textSecondary: '#8A9BB5',
  textMuted: '#4A5568',
  accent: '#3B82F6',
  accentLight: '#60A5FA',
  accentDim: '#1E3A5F',
  income: '#10B981',
  incomeDim: '#064E3B',
  expense: '#EF4444',
  expenseDim: '#450A0A',
  warning: '#F59E0B',
  warningDim: '#451A03',
  info: '#6366F1',
  infoDim: '#1E1B4B',
  cobrar: '#06B6D4',
  cobrarDim: '#083344',
  success: '#10B981',
  error: '#EF4444',
  disabled: '#374151',
  overlay: 'rgba(0, 0, 0, 0.75)',
  modalBg: '#131C2E',
} as const;

// ============================================================
// TEMA CLARO
// ============================================================
export const LIGHT_COLORS = {
  background: '#F0F4F8',
  surface: '#FFFFFF',
  surfaceAlt: '#E8EDF5',
  border: '#D1DCE8',
  borderLight: '#B8C8D8',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  accent: '#2563EB',
  accentLight: '#3B82F6',
  accentDim: '#DBEAFE',
  income: '#059669',
  incomeDim: '#D1FAE5',
  expense: '#DC2626',
  expenseDim: '#FEE2E2',
  warning: '#D97706',
  warningDim: '#FEF3C7',
  info: '#4F46E5',
  infoDim: '#E0E7FF',
  cobrar: '#0891B2',
  cobrarDim: '#CFFAFE',
  success: '#059669',
  error: '#DC2626',
  disabled: '#CBD5E1',
  overlay: 'rgba(0, 0, 0, 0.5)',
  modalBg: '#F8FAFC',
} as const;

// Default export (dark — se sobreescribe dinámicamente)
export let COLORS = DARK_COLORS;

export const TYPOGRAPHY = {
  xs: 10, sm: 12, base: 14, md: 16, lg: 18,
  xl: 22, '2xl': 26, '3xl': 32, '4xl': 40,
} as const;

export const SPACING = {
  xs: 4, sm: 8, md: 12, base: 16, lg: 20,
  xl: 24, '2xl': 32, '3xl': 48,
} as const;

export const RADIUS = {
  sm: 6, md: 10, lg: 14, xl: 20, full: 999,
} as const;

export const DEFAULT_TASA_BS_USD = 36.50;
export const ALERTA_TASA_DIFERENCIA_PORCENTAJE = 0.02;
export const DB_NAME = 'cuantos_dolitas.db';
export const SEED_KEY = 'seed_v1_completado';

export const FORMATO_FECHA_DISPLAY = 'dd/MM/yyyy';
export const FORMATO_FECHA_DB = 'yyyy-MM-dd';

export const ICONO_CATEGORIA: Record<string, string> = {
  'Mercado / Comida': 'cart',
  'Vehículo / Transporte': 'car',
  'Ropa / Lujos': 'shirt',
  'Colegio / Educación': 'school',
  'Salud / Medicamentos': 'medical',
  'Servicios (Luz, Agua, Internet)': 'flash',
  'Entretenimiento': 'game-controller',
  'Restaurantes / Salidas': 'restaurant',
  'Alquiler / Vivienda': 'home',
  'Insumos Textil': 'cut',
  'Inventario / Mercancía': 'cube',
  'Suplementos / Fit 58': 'fitness',
  'Logística / Envíos': 'send',
  'Publicidad / Marketing': 'megaphone',
  'Equipos / Maquinaria': 'construct',
  'Salario': 'wallet',
  'Venta Tienda': 'storefront',
  'Cobro Deuda': 'cash',
  'Rendimiento Inversión': 'trending-up',
  'Binance P2P': 'logo-bitcoin',
  default: 'ellipse',
};
