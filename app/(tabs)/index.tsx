// ============================================================
// DASHBOARD — Cuantos Dolitas
// ============================================================
import React, { useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, StatusBar, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../_layout';
import { useDashboard } from '../../src/hooks/useDashboard';
import { formatUSD, formatFecha, nombreMes, hoyDB } from '../../src/utils/currency';
import { TYPOGRAPHY, SPACING, RADIUS } from '../../src/constants';
import type { ResumenDashboard } from '../../src/types';

function TarjetaResumen({ titulo, valor, color, colorFondo, icono, ocultar, negativo }: {
  titulo: string; valor: number; color: string; colorFondo: string;
  icono: React.ComponentProps<typeof Ionicons>['name']; ocultar: boolean; negativo?: boolean;
}) {
  const { colors } = useTheme();
  const esNeg = valor < 0 && negativo;
  return (
    <View style={[s.tarjeta, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={s.tarjetaHeader}>
        <View style={[s.tarjetaIcono, { backgroundColor: colorFondo }]}>
          <Ionicons name={icono} size={18} color={color} />
        </View>
        <Text style={[s.tarjetaTitulo, { color: colors.textSecondary }]} numberOfLines={1}>{titulo}</Text>
      </View>
      <Text style={[s.tarjetaValor, { color: esNeg ? colors.expense : color }]} numberOfLines={1} adjustsFontSizeToFit>
        {ocultar ? '$***.**' : `${esNeg ? '-' : ''}${formatUSD(Math.abs(valor))}`}
      </Text>
      <View style={[s.tarjetaBorde, { backgroundColor: color }]} />
    </View>
  );
}

function AlertaVencimiento({ dia, colors }: { dia: number; colors: any }) {
  const hoy = new Date();
  const diff = dia - hoy.getDate();
  if (diff < 0 || diff > 5) return null;
  const urgente = diff <= 1;
  return (
    <View style={[s.alerta, { backgroundColor: urgente ? colors.expenseDim : colors.warningDim, borderColor: urgente ? colors.expense : colors.warning }]}>
      <Ionicons name="warning" size={16} color={urgente ? colors.expense : colors.warning} />
      <Text style={[s.alertaTxt, { color: urgente ? colors.expense : colors.warning }]}>
        {diff === 0 ? '⚠️ Vence HOY — revisa tus compromisos' : `Vence en ${diff} día${diff > 1 ? 's' : ''}`}
      </Text>
    </View>
  );
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { colors, esOscuro, toggleTema } = useTheme();
  const { resumen, ajustes, cargando, error, ocultarSaldos, toggleOcultarSaldos, refrescar } = useDashboard();

  const tarjetas = resumen ? [
    { titulo: 'Por Cobrar',   valor: resumen.total_por_cobrar_usd,       color: colors.cobrar,  colorFondo: colors.cobrarDim,  icono: 'arrow-down-circle' as const },
    { titulo: 'Por Pagar',    valor: resumen.total_por_pagar_usd,        color: colors.expense, colorFondo: colors.expenseDim, icono: 'arrow-up-circle' as const },
    { titulo: 'Inversiones',  valor: resumen.total_inversiones_activas_usd, color: colors.info, colorFondo: colors.infoDim,    icono: 'trending-up' as const },
    { titulo: 'Liquidez',     valor: resumen.liquidez_neta_usd,          color: resumen.liquidez_neta_usd >= 0 ? colors.income : colors.expense, colorFondo: resumen.liquidez_neta_usd >= 0 ? colors.incomeDim : colors.expenseDim, icono: 'wallet' as const, negativo: true },
  ] : [];

  const acciones = [
    { label: '+ Gasto',   icono: 'remove-circle' as const, color: colors.expense, ruta: '/modals/nuevo-gasto' },
    { label: '+ Ingreso', icono: 'add-circle' as const,    color: colors.income,  ruta: '/modals/nuevo-ingreso' },
    { label: '+ Abono',   icono: 'cash' as const,          color: colors.warning, ruta: '/modals/nuevo-abono' },
    { label: '+ Activo',  icono: 'trending-up' as const,   color: colors.info,    ruta: '/modals/nueva-inversion' },
  ];

  if (error) return (
    <View style={[s.container, s.centrado, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <Text style={{ color: colors.expense }}>{error}</Text>
      <TouchableOpacity style={[s.btnRecargar, { backgroundColor: colors.accent }]} onPress={refrescar}>
        <Text style={{ color: '#fff', fontWeight: '700' }}>Reintentar</Text>
      </TouchableOpacity>
    </View>
  );

  const patrimonio = (resumen?.total_inversiones_activas_usd ?? 0) + (resumen?.total_por_cobrar_usd ?? 0) - (resumen?.total_por_pagar_usd ?? 0);
  const balancePos = (resumen?.liquidez_neta_usd ?? 0) >= 0;
  const pctGasto = resumen?.ingresos_mes_usd ? Math.min(100, (resumen.gastos_mes_usd / resumen.ingresos_mes_usd) * 100) : 0;

  return (
    <View style={[s.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* HEADER */}
      <View style={[s.header, { borderBottomColor: colors.border }]}>
        <View>
          <Text style={[s.headerTitulo, { color: colors.textPrimary }]}>Cuantos Dolitas 💵</Text>
          <Text style={[s.headerSub, { color: colors.textSecondary }]}>
            {formatFecha(hoyDB())} · Bs. {ajustes?.tasa_global_bs_usd.toFixed(2) ?? '—'}/USD
          </Text>
        </View>
        <View style={s.headerBtns}>
          <TouchableOpacity style={[s.headerBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={toggleTema}>
            <Ionicons name={esOscuro ? 'sunny' : 'moon'} size={18} color={esOscuro ? colors.warning : colors.accent} />
          </TouchableOpacity>
          <TouchableOpacity style={[s.headerBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={toggleOcultarSaldos}>
            <Ionicons name={ocultarSaldos ? 'eye-off' : 'eye'} size={18} color={ocultarSaldos ? colors.warning : colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={[s.headerBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => router.push('/settings' as any)}>
            <Ionicons name="settings-outline" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={cargando} onRefresh={refrescar} tintColor={colors.accent} colors={[colors.accent]} progressBackgroundColor={colors.surface} />}>

        {/* Alerta vencimiento */}
        <AlertaVencimiento dia={7} colors={colors} />

        {/* HERO — Patrimonio */}
        <View style={[s.heroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[s.heroLabel, { color: colors.textMuted }]}>PATRIMONIO NETO ESTIMADO</Text>
          <Text style={[s.heroValor, { color: colors.textPrimary }]}>
            {cargando ? '...' : ocultarSaldos ? '$***,***.**' : formatUSD(patrimonio)}
          </Text>
          <Text style={[s.heroSub, { color: colors.textMuted }]}>Activos + Por Cobrar − Deudas</Text>
          <View style={[s.heroStats, { borderTopColor: colors.border }]}>
            {[
              { label: 'A Favor', val: resumen?.total_por_cobrar_usd ?? 0, color: colors.cobrar },
              { label: 'Deudas',  val: resumen?.total_por_pagar_usd ?? 0,  color: colors.expense },
              { label: 'Activos', val: resumen?.total_inversiones_activas_usd ?? 0, color: colors.info },
            ].map((item, i) => (
              <React.Fragment key={item.label}>
                {i > 0 && <View style={[s.heroStatDiv, { backgroundColor: colors.border }]} />}
                <View style={s.heroStat}>
                  <Text style={[s.heroStatLabel, { color: colors.textMuted }]}>{item.label}</Text>
                  <Text style={[s.heroStatVal, { color: item.color }]}>
                    {ocultarSaldos ? '***' : formatUSD(item.val)}
                  </Text>
                </View>
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* GRID TARJETAS */}
        <Text style={[s.secLabel, { color: colors.textMuted }]}>RESUMEN FINANCIERO</Text>
        <View style={s.grid}>
          {tarjetas.map((t, i) => (
            <TarjetaResumen key={i} {...t} ocultar={ocultarSaldos} />
          ))}
        </View>

        {/* FLUJO DEL MES */}
        {resumen && !cargando && (
          <View style={[s.flujoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={s.flujoHeader}>
              <Text style={[s.flujoTitulo, { color: colors.textPrimary }]}>Flujo de {nombreMes(hoyDB())}</Text>
              <View style={[s.balanceBadge, { backgroundColor: balancePos ? colors.incomeDim : colors.expenseDim }]}>
                <Ionicons name={balancePos ? 'trending-up' : 'trending-down'} size={12} color={balancePos ? colors.income : colors.expense} />
                <Text style={[s.balanceTxt, { color: balancePos ? colors.income : colors.expense }]}>
                  {ocultarSaldos ? '***' : (balancePos ? '+' : '') + formatUSD(resumen.liquidez_neta_usd)}
                </Text>
              </View>
            </View>
            <View style={[s.barraFondo, { backgroundColor: colors.border }]}>
              <View style={[s.barraRelleno, { width: `${pctGasto}%` as any, backgroundColor: pctGasto > 90 ? colors.expense : colors.warning }]} />
            </View>
            <Text style={[s.barraTxt, { color: colors.textMuted }]}>{pctGasto.toFixed(0)}% del ingreso gastado</Text>
            {[
              { label: '↑ Ingresos', val: resumen.ingresos_mes_usd, color: colors.income },
              { label: '↓ Gastos',   val: resumen.gastos_mes_usd,   color: colors.expense },
            ].map(item => (
              <View key={item.label} style={s.desgloseFila}>
                <View style={[s.desglosePunto, { backgroundColor: item.color }]} />
                <Text style={[s.desgloseLabel, { color: colors.textSecondary }]}>{item.label}</Text>
                <Text style={[s.desgloseVal, { color: item.color }]}>
                  {ocultarSaldos ? '$***.**' : formatUSD(item.val)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* ACCIONES RÁPIDAS */}
        <Text style={[s.secLabel, { color: colors.textMuted }]}>ACCIONES RÁPIDAS</Text>
        <View style={s.fabGrid}>
          {acciones.map((a, i) => (
            <TouchableOpacity key={i} style={[s.fab, { backgroundColor: a.color + '18', borderColor: colors.border }]}
              onPress={() => router.push(a.ruta as any)} activeOpacity={0.75}>
              <View style={[s.fabIcono, { backgroundColor: a.color }]}>
                <Ionicons name={a.icono} size={18} color="#fff" />
              </View>
              <Text style={[s.fabLabel, { color: colors.textSecondary }]}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  centrado: { alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  headerTitulo: { fontSize: 20, fontWeight: '800' },
  headerSub: { fontSize: 11, marginTop: 2 },
  headerBtns: { flexDirection: 'row', gap: 8 },
  headerBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  scroll: { paddingHorizontal: 16, paddingTop: 16 },
  alerta: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 12 },
  alertaTxt: { fontSize: 13, fontWeight: '600', flex: 1 },
  heroCard: { borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, gap: 4 },
  heroLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  heroValor: { fontSize: 38, fontWeight: '800', letterSpacing: -1 },
  heroSub: { fontSize: 11, marginBottom: 12 },
  heroStats: { flexDirection: 'row', paddingTop: 12, borderTopWidth: 1 },
  heroStat: { flex: 1, alignItems: 'center', gap: 3 },
  heroStatLabel: { fontSize: 10 },
  heroStatVal: { fontSize: 13, fontWeight: '800' },
  heroStatDiv: { width: 1, marginVertical: 4 },
  secLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 10, marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  tarjeta: { borderRadius: 14, padding: 14, borderWidth: 1, width: '48%', minHeight: 95, position: 'relative', overflow: 'hidden' },
  tarjetaHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  tarjetaIcono: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  tarjetaTitulo: { fontSize: 11, fontWeight: '600', flex: 1 },
  tarjetaValor: { fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  tarjetaBorde: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, opacity: 0.7 },
  flujoCard: { borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, gap: 10 },
  flujoHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  flujoTitulo: { fontSize: 15, fontWeight: '700' },
  balanceBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  balanceTxt: { fontSize: 12, fontWeight: '700' },
  barraFondo: { height: 6, borderRadius: 999, overflow: 'hidden' },
  barraRelleno: { height: '100%', borderRadius: 999 },
  barraTxt: { fontSize: 11 },
  desgloseFila: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  desglosePunto: { width: 7, height: 7, borderRadius: 999 },
  desgloseLabel: { flex: 1, fontSize: 13 },
  desgloseVal: { fontSize: 13, fontWeight: '700' },
  fabGrid: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  fab: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center', gap: 6, borderWidth: 1 },
  fabIcono: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  fabLabel: { fontSize: 11, fontWeight: '600', textAlign: 'center' },
  btnRecargar: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10, marginTop: 8 },
});
