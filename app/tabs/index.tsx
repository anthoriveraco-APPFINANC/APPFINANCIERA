// ============================================================
// DASHBOARD — Pantalla Principal
// App Financiera Personal
// ============================================================

import React, { useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  Animated,
  Platform,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useDashboard } from '../../src/hooks/useDashboard';
import { formatUSD, formatFecha, nombreMes, hoyDB } from '../../src/utils/currency';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../../src/constants';
import type { ResumenDashboard } from '../../src/types';

// ============================================================
// TIPOS INTERNOS
// ============================================================
interface TarjetaConfig {
  titulo: string;
  valor: number;
  color: string;
  colorFondo: string;
  icono: React.ComponentProps<typeof Ionicons>['name'];
  sufijo?: string;
  prefijo?: string;
  negativo?: boolean;
}

interface AccionRapida {
  label: string;
  icono: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  ruta: string;
}

// ============================================================
// COMPONENTE: Tarjeta de Resumen
// ============================================================
function TarjetaResumen({
  config,
  ocultar,
  ancho = '48%',
}: {
  config: TarjetaConfig;
  ocultar: boolean;
  ancho?: string;
}) {
  const valorFormateado = ocultar
    ? '$***.**'
    : formatUSD(Math.abs(config.valor));

  const esNegativo = config.valor < 0;

  return (
    <View
      style={[
        styles.tarjeta,
        { width: ancho as any, backgroundColor: COLORS.surface },
      ]}
    >
      {/* Header de la tarjeta */}
      <View style={styles.tarjetaHeader}>
        <View
          style={[
            styles.tarjetaIcono,
            { backgroundColor: config.colorFondo },
          ]}
        >
          <Ionicons name={config.icono} size={18} color={config.color} />
        </View>
        <Text style={styles.tarjetaTitulo} numberOfLines={1}>
          {config.titulo}
        </Text>
      </View>

      {/* Valor principal */}
      <Text
        style={[
          styles.tarjetaValor,
          {
            color: esNegativo && config.negativo
              ? COLORS.expense
              : config.color,
          },
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {esNegativo && config.negativo ? '-' : ''}
        {valorFormateado}
      </Text>

      {/* Indicador de color en borde inferior */}
      <View
        style={[styles.tarjetaBorde, { backgroundColor: config.color }]}
      />
    </View>
  );
}

// ============================================================
// COMPONENTE: Fila de Desglose
// ============================================================
function FilaDesglose({
  label,
  valor,
  color,
  ocultar,
}: {
  label: string;
  valor: number;
  color: string;
  ocultar: boolean;
}) {
  return (
    <View style={styles.desgloseFila}>
      <View style={[styles.desglosePunto, { backgroundColor: color }]} />
      <Text style={styles.desgloseLabel}>{label}</Text>
      <Text style={[styles.desgloseValor, { color }]}>
        {ocultar ? '$***.**' : formatUSD(valor)}
      </Text>
    </View>
  );
}

// ============================================================
// COMPONENTE: Sección de Flujo del Mes
// ============================================================
function SeccionFlujoMes({
  resumen,
  ocultar,
}: {
  resumen: ResumenDashboard;
  ocultar: boolean;
}) {
  const balance = resumen.ingresos_mes_usd - resumen.gastos_mes_usd;
  const esPositivo = balance >= 0;
  const porcentajeGasto =
    resumen.ingresos_mes_usd > 0
      ? Math.min(
          100,
          (resumen.gastos_mes_usd / resumen.ingresos_mes_usd) * 100,
        )
      : 0;

  const hoy = hoyDB();
  const mesActual = nombreMes(hoy);

  return (
    <View style={styles.seccionFlujo}>
      {/* Header */}
      <View style={styles.seccionHeader}>
        <Text style={styles.seccionTitulo}>Flujo de {mesActual}</Text>
        <View
          style={[
            styles.balanceBadge,
            {
              backgroundColor: esPositivo ? COLORS.incomeDim : COLORS.expenseDim,
            },
          ]}
        >
          <Ionicons
            name={esPositivo ? 'trending-up' : 'trending-down'}
            size={12}
            color={esPositivo ? COLORS.income : COLORS.expense}
          />
          <Text
            style={[
              styles.balanceTexto,
              { color: esPositivo ? COLORS.income : COLORS.expense },
            ]}
          >
            {ocultar ? '***' : (esPositivo ? '+' : '') + formatUSD(balance)}
          </Text>
        </View>
      </View>

      {/* Barra de progreso Ingresos vs Gastos */}
      <View style={styles.barraContainer}>
        <View style={styles.barraFondo}>
          <View
            style={[
              styles.barraProgreso,
              {
                width: `${porcentajeGasto}%` as any,
                backgroundColor:
                  porcentajeGasto > 90 ? COLORS.expense : COLORS.warning,
              },
            ]}
          />
        </View>
        <Text style={styles.barraTexto}>
          {ocultar ? '**%' : `${porcentajeGasto.toFixed(0)}% del ingreso gastado`}
        </Text>
      </View>

      {/* Desglose */}
      <FilaDesglose
        label="↑ Ingresos del mes"
        valor={resumen.ingresos_mes_usd}
        color={COLORS.income}
        ocultar={ocultar}
      />
      <FilaDesglose
        label="↓ Gastos del mes"
        valor={resumen.gastos_mes_usd}
        color={COLORS.expense}
        ocultar={ocultar}
      />
      {resumen.gastos_negocio_mes_usd > 0 && (
        <>
          <View style={styles.desgloseIndentado}>
            <FilaDesglose
              label="  · Personal"
              valor={resumen.gastos_personales_mes_usd}
              color={COLORS.textSecondary}
              ocultar={ocultar}
            />
            <FilaDesglose
              label="  · Negocio / Producción"
              valor={resumen.gastos_negocio_mes_usd}
              color={COLORS.warning}
              ocultar={ocultar}
            />
          </View>
        </>
      )}
    </View>
  );
}

// ============================================================
// COMPONENTE: Botón de Acción Rápida (FAB)
// ============================================================
function BotonAccion({ accion }: { accion: AccionRapida }) {
  return (
    <TouchableOpacity
      style={[styles.fab, { backgroundColor: accion.color + '22' }]}
      onPress={() => router.push(accion.ruta as any)}
      activeOpacity={0.75}
    >
      <View style={[styles.fabIcono, { backgroundColor: accion.color }]}>
        <Ionicons name={accion.icono} size={18} color="#fff" />
      </View>
      <Text style={styles.fabLabel}>{accion.label}</Text>
    </TouchableOpacity>
  );
}

// ============================================================
// COMPONENTE: Alerta de Vencimiento
// ============================================================
function AlertaVencimiento({ dia }: { dia: number }) {
  const hoy = new Date();
  const diaActual = hoy.getDate();
  const diasRestantes = dia - diaActual;

  if (diasRestantes < 0 || diasRestantes > 5) return null;

  const urgente = diasRestantes <= 1;

  return (
    <View
      style={[
        styles.alerta,
        {
          backgroundColor: urgente ? COLORS.expenseDim : COLORS.warningDim,
          borderColor: urgente ? COLORS.expense : COLORS.warning,
        },
      ]}
    >
      <Ionicons
        name="warning"
        size={16}
        color={urgente ? COLORS.expense : COLORS.warning}
      />
      <Text
        style={[
          styles.alertaTexto,
          { color: urgente ? COLORS.expense : COLORS.warning },
        ]}
      >
        {diasRestantes === 0
          ? '⚠️ Vence HOY: Interés Gregory ($52.50 restantes)'
          : `Vence en ${diasRestantes} día${diasRestantes > 1 ? 's' : ''}: Interés Gregory`}
      </Text>
    </View>
  );
}

// ============================================================
// DASHBOARD PRINCIPAL
// ============================================================
export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const {
    resumen,
    ajustes,
    cargando,
    error,
    ocultarSaldos,
    toggleOcultarSaldos,
    refrescar,
  } = useDashboard();

  const scrollY = useRef(new Animated.Value(0)).current;

  // Tarjetas principales del grid
  const tarjetas: TarjetaConfig[] = resumen
    ? [
        {
          titulo: 'Por Cobrar',
          valor: resumen.total_por_cobrar_usd,
          color: COLORS.cobrar,
          colorFondo: COLORS.cobrarDim,
          icono: 'arrow-down-circle',
        },
        {
          titulo: 'Por Pagar',
          valor: resumen.total_por_pagar_usd,
          color: COLORS.expense,
          colorFondo: COLORS.expenseDim,
          icono: 'arrow-up-circle',
        },
        {
          titulo: 'Inversiones',
          valor: resumen.total_inversiones_activas_usd,
          color: COLORS.info,
          colorFondo: COLORS.infoDim,
          icono: 'trending-up',
        },
        {
          titulo: 'Liquidez Neta',
          valor: resumen.liquidez_neta_usd,
          color:
            resumen.liquidez_neta_usd >= 0 ? COLORS.income : COLORS.expense,
          colorFondo:
            resumen.liquidez_neta_usd >= 0
              ? COLORS.incomeDim
              : COLORS.expenseDim,
          icono: 'wallet',
          negativo: true,
        },
      ]
    : [];

  // Acciones rápidas
  const acciones: AccionRapida[] = [
    {
      label: '+ Gasto',
      icono: 'remove-circle',
      color: COLORS.expense,
      ruta: '/modals/nuevo-gasto',
    },
    {
      label: '+ Ingreso',
      icono: 'add-circle',
      color: COLORS.income,
      ruta: '/modals/nuevo-ingreso',
    },
    {
      label: '+ Abono',
      icono: 'cash',
      color: COLORS.warning,
      ruta: '/modals/nuevo-abono',
    },
    {
      label: '+ Activo',
      icono: 'trending-up',
      color: COLORS.info,
      ruta: '/modals/nueva-inversion',
    },
  ];

  // ---- RENDER ----

  if (error) {
    return (
      <View style={[styles.container, styles.centrado]}>
        <Ionicons name="warning" size={48} color={COLORS.expense} />
        <Text style={styles.errorTexto}>{error}</Text>
        <TouchableOpacity style={styles.btnRecargar} onPress={refrescar}>
          <Text style={styles.btnRecargarTexto}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* ── HEADER ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSaludo}>Buenos días 👋</Text>
          <Text style={styles.headerFecha}>
            {formatFecha(hoyDB())} · Bs. {ajustes?.tasa_global_bs_usd.toFixed(2) ?? '—'}/USD
          </Text>
        </View>
        <View style={styles.headerAcciones}>
          {/* Botón Modo Privacidad */}
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={toggleOcultarSaldos}
            activeOpacity={0.7}
          >
            <Ionicons
              name={ocultarSaldos ? 'eye-off' : 'eye'}
              size={20}
              color={ocultarSaldos ? COLORS.warning : COLORS.textSecondary}
            />
          </TouchableOpacity>
          {/* Ajustes */}
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => router.push('/settings' as any)}
            activeOpacity={0.7}
          >
            <Ionicons name="settings-outline" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={cargando}
            onRefresh={refrescar}
            tintColor={COLORS.accent}
            colors={[COLORS.accent]}
            progressBackgroundColor={COLORS.surface}
          />
        }
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false },
        )}
        scrollEventThrottle={16}
      >

        {/* ── ALERTA DE VENCIMIENTO ── */}
        {resumen && <AlertaVencimiento dia={7} />}

        {/* ── TARJETA HÉROE — Patrimonio Neto ── */}
        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>PATRIMONIO NETO ESTIMADO</Text>
          <Text style={styles.heroValor}>
            {cargando
              ? '...'
              : ocultarSaldos
              ? '$***,***.**'
              : formatUSD(
                  (resumen?.total_inversiones_activas_usd ?? 0) +
                  (resumen?.total_por_cobrar_usd ?? 0) -
                  (resumen?.total_por_pagar_usd ?? 0),
                )}
          </Text>
          <Text style={styles.heroSub}>
            Activos + Por Cobrar − Deudas
          </Text>

          {/* Mini stats horizontales */}
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Ionicons name="arrow-up" size={12} color={COLORS.cobrar} />
              <Text style={styles.heroStatLabel}>A Favor</Text>
              <Text style={[styles.heroStatVal, { color: COLORS.cobrar }]}>
                {ocultarSaldos
                  ? '***'
                  : formatUSD(resumen?.total_por_cobrar_usd ?? 0)}
              </Text>
            </View>
            <View style={styles.heroStatDiv} />
            <View style={styles.heroStat}>
              <Ionicons name="arrow-down" size={12} color={COLORS.expense} />
              <Text style={styles.heroStatLabel}>Deudas</Text>
              <Text style={[styles.heroStatVal, { color: COLORS.expense }]}>
                {ocultarSaldos
                  ? '***'
                  : formatUSD(resumen?.total_por_pagar_usd ?? 0)}
              </Text>
            </View>
            <View style={styles.heroStatDiv} />
            <View style={styles.heroStat}>
              <Ionicons name="trending-up" size={12} color={COLORS.info} />
              <Text style={styles.heroStatLabel}>Activos</Text>
              <Text style={[styles.heroStatVal, { color: COLORS.info }]}>
                {ocultarSaldos
                  ? '***'
                  : formatUSD(resumen?.total_inversiones_activas_usd ?? 0)}
              </Text>
            </View>
          </View>
        </View>

        {/* ── GRID DE TARJETAS ── */}
        <Text style={styles.seccionLabel}>RESUMEN FINANCIERO</Text>
        {cargando ? (
          <View style={styles.skeletonGrid}>
            {[0, 1, 2, 3].map((i) => (
              <View key={i} style={styles.skeletonCard} />
            ))}
          </View>
        ) : (
          <View style={styles.grid}>
            {tarjetas.map((t, i) => (
              <TarjetaResumen
                key={i}
                config={t}
                ocultar={ocultarSaldos}
              />
            ))}
          </View>
        )}

        {/* ── FLUJO DEL MES ── */}
        {resumen && !cargando && (
          <SeccionFlujoMes resumen={resumen} ocultar={ocultarSaldos} />
        )}

        {/* ── ACCIONES RÁPIDAS ── */}
        <Text style={styles.seccionLabel}>ACCIONES RÁPIDAS</Text>
        <View style={styles.fabGrid}>
          {acciones.map((a, i) => (
            <BotonAccion key={i} accion={a} />
          ))}
        </View>

        {/* ── ACCESOS DIRECTOS ── */}
        <Text style={styles.seccionLabel}>ACCESOS</Text>
        <View style={styles.accesosGrid}>
          <TouchableOpacity
            style={styles.accesoBtn}
            onPress={() => router.push('/tabs/deudas' as any)}
          >
            <Ionicons name="people" size={20} color={COLORS.cobrar} />
            <Text style={styles.accesoBtnTexto}>Gestionar{'\n'}Deudas</Text>
            <Ionicons name="chevron-forward" size={14} color={COLORS.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.accesoBtn}
            onPress={() => router.push('/tabs/flujo' as any)}
          >
            <Ionicons name="swap-vertical" size={20} color={COLORS.income} />
            <Text style={styles.accesoBtnTexto}>Flujo{'\n'}de Caja</Text>
            <Ionicons name="chevron-forward" size={14} color={COLORS.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.accesoBtn}
            onPress={() => router.push('/tabs/herramientas' as any)}
          >
            <Ionicons name="calculator" size={20} color={COLORS.warning} />
            <Text style={styles.accesoBtnTexto}>Simulador{'\n'}Deudas</Text>
            <Ionicons name="chevron-forward" size={14} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Espacio inferior para tabs */}
        <View style={{ height: SPACING['2xl'] }} />
      </ScrollView>
    </View>
  );
}

// ============================================================
// ESTILOS
// ============================================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centrado: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.base,
    padding: SPACING.xl,
  },

  // ── HEADER ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerSaludo: {
    fontSize: TYPOGRAPHY.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  headerFecha: {
    fontSize: TYPOGRAPHY.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
    letterSpacing: 0.3,
  },
  headerAcciones: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  // ── SCROLL ──
  scroll: {
    paddingHorizontal: SPACING.base,
    paddingTop: SPACING.base,
  },

  // ── ALERTA ──
  alerta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.md,
  },
  alertaTexto: {
    fontSize: TYPOGRAPHY.sm,
    fontWeight: '600',
    flex: 1,
  },

  // ── HERO CARD ──
  heroCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    position: 'relative',
    overflow: 'hidden',
  },
  heroLabel: {
    fontSize: TYPOGRAPHY.xs,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 1.5,
    marginBottom: SPACING.sm,
  },
  heroValor: {
    fontSize: TYPOGRAPHY['4xl'],
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -1,
    marginBottom: SPACING.xs,
  },
  heroSub: {
    fontSize: TYPOGRAPHY.xs,
    color: COLORS.textMuted,
    marginBottom: SPACING.lg,
  },
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  heroStat: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  heroStatLabel: {
    fontSize: TYPOGRAPHY.xs,
    color: COLORS.textMuted,
  },
  heroStatVal: {
    fontSize: TYPOGRAPHY.sm,
    fontWeight: '700',
  },
  heroStatDiv: {
    width: 1,
    height: 32,
    backgroundColor: COLORS.border,
  },

  // ── SECCIÓN LABEL ──
  seccionLabel: {
    fontSize: TYPOGRAPHY.xs,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 1.5,
    marginBottom: SPACING.sm,
    marginTop: SPACING.sm,
  },

  // ── GRID TARJETAS ──
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  tarjeta: {
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    width: '48%',
    position: 'relative',
    overflow: 'hidden',
    minHeight: 100,
  },
  tarjetaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  tarjetaIcono: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tarjetaTitulo: {
    fontSize: TYPOGRAPHY.xs,
    color: COLORS.textSecondary,
    fontWeight: '600',
    flex: 1,
  },
  tarjetaValor: {
    fontSize: TYPOGRAPHY.xl,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginTop: SPACING.xs,
  },
  tarjetaBorde: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    opacity: 0.7,
  },

  // ── SKELETON ──
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  skeletonCard: {
    width: '48%',
    height: 100,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    opacity: 0.5,
  },

  // ── FLUJO DEL MES ──
  seccionFlujo: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.sm,
  },
  seccionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  seccionTitulo: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  balanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  balanceTexto: {
    fontSize: TYPOGRAPHY.xs,
    fontWeight: '700',
  },
  barraContainer: {
    gap: 4,
    marginBottom: SPACING.xs,
  },
  barraFondo: {
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  barraProgreso: {
    height: '100%',
    borderRadius: RADIUS.full,
  },
  barraTexto: {
    fontSize: TYPOGRAPHY.xs,
    color: COLORS.textMuted,
  },
  desgloseFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  desglosePunto: {
    width: 7,
    height: 7,
    borderRadius: RADIUS.full,
  },
  desgloseLabel: {
    fontSize: TYPOGRAPHY.sm,
    color: COLORS.textSecondary,
    flex: 1,
  },
  desgloseValor: {
    fontSize: TYPOGRAPHY.sm,
    fontWeight: '700',
  },
  desgloseIndentado: {
    paddingLeft: SPACING.base,
    gap: SPACING.xs,
    borderLeftWidth: 1,
    borderLeftColor: COLORS.border,
    marginLeft: SPACING.xs,
  },

  // ── FABS ──
  fabGrid: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  fab: {
    flex: 1,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    gap: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  fabIcono: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabLabel: {
    fontSize: TYPOGRAPHY.xs,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textAlign: 'center',
  },

  // ── ACCESOS ──
  accesosGrid: {
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  accesoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  accesoBtnTexto: {
    flex: 1,
    fontSize: TYPOGRAPHY.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
    lineHeight: 18,
  },

  // ── ERROR ──
  errorTexto: {
    fontSize: TYPOGRAPHY.base,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  btnRecargar: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    marginTop: SPACING.sm,
  },
  btnRecargarTexto: {
    color: COLORS.textPrimary,
    fontWeight: '700',
    fontSize: TYPOGRAPHY.base,
  },
});
