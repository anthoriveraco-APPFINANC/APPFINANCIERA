// ============================================================
// CONSTANTES GLOBALES — App Financiera Personal
// ============================================================

// ----------------------------
// CATEGORÍAS DE GASTOS
// ----------------------------
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

// ----------------------------
// CATEGORÍAS DE INGRESOS
// ----------------------------
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

// ----------------------------
// MÉTODOS DE PAGO
// ----------------------------
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

// ----------------------------
// TIPOS DE INVERSIÓN
// ----------------------------
export const TIPOS_INVERSION = [
  'Cripto',
  'Inventario',
  'Negocio',
  'Bienes',
] as const;

// ----------------------------
// PALETA DE COLORES — Dark mode financiero
// ----------------------------
export const COLORS = {
  // Fondos
  background: '#0A0E1A',       // Fondo principal profundo
  surface: '#111827',           // Cards y superficies
  surfaceAlt: '#1A2233',        // Cards secundarias / hover
  border: '#1E2D40',            // Bordes sutiles
  borderLight: '#2A3A50',       // Bordes más visibles

  // Texto
  textPrimary: '#F0F4FF',       // Texto principal
  textSecondary: '#8A9BB5',     // Texto secundario / labels
  textMuted: '#4A5568',         // Texto muy tenue

  // Acento principal
  accent: '#3B82F6',            // Azul eléctrico — acción principal
  accentLight: '#60A5FA',       // Azul claro
  accentDim: '#1E3A5F',         // Azul oscuro / fondo de chips

  // Semáforo financiero
  income: '#10B981',            // Verde — ingresos
  incomeDim: '#064E3B',         // Verde oscuro — fondo
  expense: '#EF4444',           // Rojo — gastos / deudas por pagar
  expenseDim: '#450A0A',        // Rojo oscuro — fondo
  warning: '#F59E0B',           // Amarillo — alertas / vencimientos
  warningDim: '#451A03',        // Amarillo oscuro — fondo
  info: '#6366F1',              // Índigo — inversiones
  infoDim: '#1E1B4B',           // Índigo oscuro — fondo
  cobrar: '#06B6D4',            // Cyan — cuentas por cobrar
  cobrarDim: '#083344',         // Cyan oscuro — fondo

  // Estados
  success: '#10B981',
  error: '#EF4444',
  disabled: '#374151',

  // Overlay y modales
  overlay: 'rgba(0, 0, 0, 0.75)',
  modalBg: '#131C2E',
} as const;

// ----------------------------
// TIPOGRAFÍA — Escalas
// ----------------------------
export const TYPOGRAPHY = {
  xs: 10,
  sm: 12,
  base: 14,
  md: 16,
  lg: 18,
  xl: 22,
  '2xl': 26,
  '3xl': 32,
  '4xl': 40,
} as const;

// ----------------------------
// ESPACIADO
// ----------------------------
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
} as const;

// ----------------------------
// BORDES
// ----------------------------
export const RADIUS = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 999,
} as const;

// ----------------------------
// CONFIGURACIÓN POR DEFECTO
// ----------------------------
export const DEFAULT_TASA_BS_USD = 36.50;
export const ALERTA_TASA_DIFERENCIA_PORCENTAJE = 0.02; // 2%
export const DB_NAME = 'finanzas_personal.db';
export const SEED_KEY = 'seed_v1_completado'; // Para no re-ejecutar el seed

// ----------------------------
// FORMATOS DE FECHA
// ----------------------------
export const FORMATO_FECHA_DISPLAY = 'dd/MM/yyyy';
export const FORMATO_FECHA_DB = 'yyyy-MM-dd';

// ----------------------------
// ÍCONOS DE CATEGORÍAS (Expo Vector Icons - Ionicons)
// ----------------------------
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
