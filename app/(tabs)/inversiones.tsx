// ============================================================
// INVERSIONES.TSX — Portafolio de Inversiones
// App Financiera Personal
// ============================================================

import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, Alert, RefreshControl,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useInversiones, useMovimientosInversion } from '../../src/hooks/useInversiones';
import { SwipeableRow } from '../../src/components/SwipeableRow';
import {
  formatUSD, formatBS, formatFecha, hoyDB,
  calcularMontoUSD, detectarAlertaTasa, parsearMonto,
} from '../../src/utils/currency';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, TIPOS_INVERSION, METODOS_PAGO } from '../../src/constants';
import type { Inversion, InversionInput, MovimientoInversion, MovimientoInversionInput, TipoMovimientoInversion, Moneda, TipoInversion } from '../../src/types';

// ============================================================
// HELPERS
// ============================================================
function colorTipo(tipo: TipoInversion): string {
  const mapa: Record<TipoInversion, string> = {
    Cripto: COLORS.warning,
    Inventario: COLORS.cobrar,
    Negocio: COLORS.info,
    Bienes: COLORS.income,
  };
  return mapa[tipo] ?? COLORS.accent;
}

function iconoTipo(tipo: TipoInversion): React.ComponentProps<typeof Ionicons>['name'] {
  const mapa: Record<TipoInversion, React.ComponentProps<typeof Ionicons>['name']> = {
    Cripto: 'logo-bitcoin',
    Inventario: 'cube',
    Negocio: 'storefront',
    Bienes: 'home',
  };
  return mapa[tipo] ?? 'trending-up';
}

function labelMovimiento(tipo: TipoMovimientoInversion): string {
  return { APORTE: 'Aporte', RETIRO_CAPITAL: 'Retiro', GANANCIA_RENDIMIENTO: 'Ganancia' }[tipo];
}

function colorMovimiento(tipo: TipoMovimientoInversion): string {
  return { APORTE: COLORS.cobrar, RETIRO_CAPITAL: COLORS.expense, GANANCIA_RENDIMIENTO: COLORS.income }[tipo];
}

// ============================================================
// COMPONENTE: Tarjeta de Inversión
// ============================================================
function TarjetaInversion({
  inv, onMovimiento, onActualizar, onVerHistorial, onCerrar,
}: {
  inv: Inversion;
  onMovimiento: (i: Inversion) => void;
  onActualizar: (i: Inversion) => void;
  onVerHistorial: (i: Inversion) => void;
  onCerrar: (i: Inversion) => void;
}) {
  const color = colorTipo(inv.tipo as TipoInversion);
  const ganancia = inv.valor_actual_usd - inv.monto_inicial_usd;
  const rentPct = inv.monto_inicial_usd > 0 ? (ganancia / inv.monto_inicial_usd) * 100 : 0;
  const esPositiva = ganancia >= 0;
  const liquidada = inv.estado === 'LIQUIDADA';

  return (
    <View style={[tarjS.card, liquidada && tarjS.cardLiquidada]}>
      {/* Header */}
      <View style={tarjS.header}>
        <View style={[tarjS.icono, { backgroundColor: color + '20' }]}>
          <Ionicons name={iconoTipo(inv.tipo as TipoInversion)} size={20} color={color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={tarjS.nombre} numberOfLines={1}>{inv.nombre}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginTop: 2 }}>
            <View style={[tarjS.tipoBadge, { backgroundColor: color + '20' }]}>
              <Text style={[tarjS.tipoBadgeTxt, { color }]}>{inv.tipo}</Text>
            </View>
            {liquidada && (
              <View style={tarjS.liquidadaBadge}>
                <Text style={tarjS.liquidadaTxt}>Liquidada</Text>
              </View>
            )}
            <Text style={tarjS.fecha}>{formatFecha(inv.fecha_inicio)}</Text>
          </View>
        </View>
        {/* ROI badge */}
        <View style={[tarjS.roiBadge, { backgroundColor: esPositiva ? COLORS.incomeDim : COLORS.expenseDim }]}>
          <Ionicons name={esPositiva ? 'trending-up' : 'trending-down'} size={12} color={esPositiva ? COLORS.income : COLORS.expense} />
          <Text style={[tarjS.roiTxt, { color: esPositiva ? COLORS.income : COLORS.expense }]}>
            {esPositiva ? '+' : ''}{rentPct.toFixed(1)}%
          </Text>
        </View>
      </View>

      {/* Montos */}
      <View style={tarjS.montos}>
        <View style={tarjS.montoItem}>
          <Text style={tarjS.montoLabel}>Invertido</Text>
          <Text style={tarjS.montoVal}>{formatUSD(inv.monto_inicial_usd)}</Text>
        </View>
        <View style={tarjS.montoDivider} />
        <View style={tarjS.montoItem}>
          <Text style={tarjS.montoLabel}>Valor Actual</Text>
          <Text style={[tarjS.montoVal, { color }]}>{formatUSD(inv.valor_actual_usd)}</Text>
        </View>
        <View style={tarjS.montoDivider} />
        <View style={tarjS.montoItem}>
          <Text style={tarjS.montoLabel}>{esPositiva ? 'Ganancia' : 'Pérdida'}</Text>
          <Text style={[tarjS.montoVal, { color: esPositiva ? COLORS.income : COLORS.expense }]}>
            {esPositiva ? '+' : ''}{formatUSD(ganancia)}
          </Text>
        </View>
      </View>

      {/* Barra de valor vs inversión */}
      {!liquidada && (
        <View style={tarjS.barraRow}>
          <View style={tarjS.barraFondo}>
            <View style={[tarjS.barraRelleno, {
              width: `${Math.min(100, (inv.valor_actual_usd / Math.max(inv.monto_inicial_usd, inv.valor_actual_usd)) * 100)}%` as any,
              backgroundColor: color,
            }]} />
          </View>
        </View>
      )}

      {/* Acciones */}
      {!liquidada && (
        <View style={tarjS.acciones}>
          <TouchableOpacity style={tarjS.btnPrimario} onPress={() => onMovimiento(inv)}>
            <Ionicons name="swap-horizontal" size={14} color="#fff" />
            <Text style={tarjS.btnPrimarioTxt}>Movimiento</Text>
          </TouchableOpacity>
          <TouchableOpacity style={tarjS.btnSecundario} onPress={() => onActualizar(inv)}>
            <Ionicons name="refresh" size={16} color={COLORS.accent} />
          </TouchableOpacity>
          <TouchableOpacity style={tarjS.btnSecundario} onPress={() => onVerHistorial(inv)}>
            <Ionicons name="time" size={16} color={COLORS.cobrar} />
          </TouchableOpacity>
          <TouchableOpacity style={tarjS.btnSecundario} onPress={() => onCerrar(inv)}>
            <Ionicons name="lock-closed" size={16} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const tarjS = StyleSheet.create({
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.base, marginBottom: SPACING.md, borderWidth: 1, borderColor: COLORS.border, gap: SPACING.sm },
  cardLiquidada: { opacity: 0.6 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm },
  icono: { width: 44, height: 44, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  nombre: { fontSize: TYPOGRAPHY.base, fontWeight: '700', color: COLORS.textPrimary },
  tipoBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: RADIUS.full },
  tipoBadgeTxt: { fontSize: 10, fontWeight: '700' },
  liquidadaBadge: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 8, paddingVertical: 2, borderRadius: RADIUS.full },
  liquidadaTxt: { fontSize: 10, color: COLORS.textMuted },
  fecha: { fontSize: TYPOGRAPHY.xs, color: COLORS.textMuted },
  roiBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: RADIUS.full },
  roiTxt: { fontSize: TYPOGRAPHY.xs, fontWeight: '800' },
  montos: { flexDirection: 'row', backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.md, padding: SPACING.md },
  montoItem: { flex: 1, alignItems: 'center', gap: 3 },
  montoLabel: { fontSize: TYPOGRAPHY.xs, color: COLORS.textMuted },
  montoVal: { fontSize: TYPOGRAPHY.sm, fontWeight: '800', color: COLORS.textPrimary },
  montoDivider: { width: 1, backgroundColor: COLORS.border, marginVertical: 4 },
  barraRow: { paddingHorizontal: 2 },
  barraFondo: { height: 4, backgroundColor: COLORS.border, borderRadius: RADIUS.full, overflow: 'hidden' },
  barraRelleno: { height: '100%', borderRadius: RADIUS.full },
  acciones: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingTop: SPACING.xs, borderTopWidth: 1, borderTopColor: COLORS.border },
  btnPrimario: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: SPACING.sm, borderRadius: RADIUS.sm, backgroundColor: COLORS.accent },
  btnPrimarioTxt: { fontSize: TYPOGRAPHY.xs, fontWeight: '700', color: '#fff' },
  btnSecundario: { width: 36, height: 36, borderRadius: RADIUS.sm, backgroundColor: COLORS.surfaceAlt, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
});

// ============================================================
// MODAL: HISTORIAL DE MOVIMIENTOS
// ============================================================
function ModalHistorial({ inv, onCerrar }: { inv: Inversion | null; onCerrar: () => void }) {
  const { movimientos, totalAportes, totalGanancias, totalRetiros, cargando } = useMovimientosInversion(inv?.id ?? null);
  if (!inv) return null;

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet">
      <View style={histS.c}>
        <View style={histS.header}>
          <View>
            <Text style={histS.titulo}>Historial</Text>
            <Text style={histS.sub}>{inv.nombre}</Text>
          </View>
          <TouchableOpacity onPress={onCerrar} style={histS.closeBtn}>
            <Ionicons name="close" size={22} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>

        <View style={histS.resumen}>
          {[
            { label: 'Aportes', val: totalAportes, color: COLORS.cobrar },
            { label: 'Ganancias', val: totalGanancias, color: COLORS.income },
            { label: 'Retiros', val: totalRetiros, color: COLORS.expense },
          ].map(({ label, val, color }) => (
            <View key={label} style={histS.resItem}>
              <Text style={histS.resLabel}>{label}</Text>
              <Text style={[histS.resVal, { color }]}>{formatUSD(val)}</Text>
            </View>
          ))}
        </View>

        {cargando ? (
          <ActivityIndicator color={COLORS.accent} style={{ marginTop: SPACING.xl }} />
        ) : movimientos.length === 0 ? (
          <View style={histS.vacio}>
            <Ionicons name="receipt-outline" size={40} color={COLORS.textMuted} />
            <Text style={histS.vacioTxt}>Sin movimientos registrados</Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            {movimientos.map(m => {
              const color = colorMovimiento(m.tipo_movimiento);
              return (
                <SwipeableRow
                  key={m.id}
                  onEliminar={() => Alert.alert('Eliminar movimiento', '¿Eliminar este movimiento?', [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Eliminar', style: 'destructive', onPress: async () => {
                      await inv?.id && db?.runAsync?.('DELETE FROM movimientos_inversion WHERE id = ?', [m.id]);
                    }},
                  ])}
                  labelEliminar="Borrar"
                >
                  <View style={histS.row}>
                    <View style={[histS.rowIcono, { backgroundColor: color + '20' }]}>
                      <Ionicons
                        name={m.tipo_movimiento === 'APORTE' ? 'add' : m.tipo_movimiento === 'RETIRO_CAPITAL' ? 'remove' : 'trending-up'}
                        size={14} color={color}
                      />
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={histS.rowTipo}>{labelMovimiento(m.tipo_movimiento)}</Text>
                        <Text style={[histS.rowMonto, { color }]}>{formatUSD(m.monto_usd)}</Text>
                      </View>
                      <Text style={histS.rowFecha}>
                        {formatFecha(m.fecha)}
                        {m.moneda_original === 'BS' ? ` · ${formatBS(m.monto_original)} @ ${m.tasa_cambio}` : ''}
                      </Text>
                    </View>
                  </View>
                </SwipeableRow>
              );
            })}
            <View style={{ height: 60 }} />
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const histS = StyleSheet.create({
  c: { flex: 1, backgroundColor: COLORS.modalBg, padding: SPACING.base, paddingTop: SPACING['2xl'] },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.base },
  titulo: { fontSize: TYPOGRAPHY.xl, fontWeight: '800', color: COLORS.textPrimary },
  sub: { fontSize: TYPOGRAPHY.sm, color: COLORS.textSecondary, marginTop: 2 },
  closeBtn: { padding: SPACING.xs, backgroundColor: COLORS.surface, borderRadius: RADIUS.sm },
  resumen: { flexDirection: 'row', backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.base, borderWidth: 1, borderColor: COLORS.border },
  resItem: { flex: 1, alignItems: 'center', gap: 3 },
  resLabel: { fontSize: TYPOGRAPHY.xs, color: COLORS.textMuted },
  resVal: { fontSize: TYPOGRAPHY.sm, fontWeight: '800' },
  vacio: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, paddingTop: SPACING['3xl'] },
  vacioTxt: { fontSize: TYPOGRAPHY.base, color: COLORS.textMuted },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm, paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  rowIcono: { width: 32, height: 32, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  rowTipo: { fontSize: TYPOGRAPHY.sm, fontWeight: '700', color: COLORS.textPrimary },
  rowMonto: { fontSize: TYPOGRAPHY.base, fontWeight: '800' },
  rowFecha: { fontSize: TYPOGRAPHY.xs, color: COLORS.textMuted },
});

// ============================================================
// MODAL: REGISTRAR MOVIMIENTO (Aporte / Retiro / Ganancia)
// ============================================================
function ModalMovimiento({
  inv, tasaGlobal, onCerrar, onGuardar,
}: {
  inv: Inversion | null;
  tasaGlobal: number;
  onCerrar: () => void;
  onGuardar: (datos: MovimientoInversionInput) => Promise<boolean>;
}) {
  const [tipoMov, setTipoMov] = useState<TipoMovimientoInversion>('APORTE');
  const [moneda, setMoneda] = useState<Moneda>('USD');
  const [montoOriginal, setMontoOriginal] = useState('');
  const [tasaCambio, setTasaCambio] = useState(tasaGlobal.toString());
  const [guardando, setGuardando] = useState(false);

  if (!inv) return null;

  const montoNum = parsearMonto(montoOriginal);
  const tasaNum = parsearMonto(tasaCambio);
  const montoUSD = calcularMontoUSD(montoNum, moneda, tasaNum);
  const alertaTasa = moneda === 'BS' && detectarAlertaTasa(tasaNum, tasaGlobal);

  const TIPOS: { key: TipoMovimientoInversion; label: string; color: string }[] = [
    { key: 'APORTE', label: '↑ Aporte', color: COLORS.cobrar },
    { key: 'RETIRO_CAPITAL', label: '↓ Retiro', color: COLORS.expense },
    { key: 'GANANCIA_RENDIMIENTO', label: '📈 Ganancia', color: COLORS.income },
  ];

  const handleGuardar = async () => {
    if (montoNum <= 0) { Alert.alert('Error', 'Monto inválido.'); return; }
    setGuardando(true);
    const ok = await onGuardar({
      inversion_id: inv.id,
      tipo_movimiento: tipoMov,
      moneda_original: moneda,
      monto_original: montoNum,
      tasa_cambio: moneda === 'BS' ? tasaNum : 1.0,
      monto_usd: montoUSD,
      fecha: hoyDB(),
    });
    setGuardando(false);
    if (ok) { setMontoOriginal(''); onCerrar(); }
    else Alert.alert('Error', 'No se pudo registrar el movimiento.');
  };

  const tipoActual = TIPOS.find(t => t.key === tipoMov)!;

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={movS.c} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={movS.header}>
            <View style={{ flex: 1 }}>
              <Text style={movS.titulo}>Nuevo Movimiento</Text>
              <Text style={movS.sub}>{inv.nombre}</Text>
            </View>
            <TouchableOpacity onPress={onCerrar} style={movS.closeBtn}>
              <Ionicons name="close" size={22} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Tipo */}
          <Text style={movS.label}>Tipo de movimiento</Text>
          <View style={{ gap: SPACING.xs }}>
            {TIPOS.map(t => (
              <TouchableOpacity
                key={t.key}
                style={[movS.tipoItem, tipoMov === t.key && { backgroundColor: t.color + '20', borderColor: t.color }]}
                onPress={() => setTipoMov(t.key)}
              >
                <View style={[movS.tipoRadio, tipoMov === t.key && { backgroundColor: t.color, borderColor: t.color }]}>
                  {tipoMov === t.key && <View style={movS.tipoRadioInner} />}
                </View>
                <Text style={[movS.tipoLabel, tipoMov === t.key && { color: t.color }]}>{t.label}</Text>
                {tipoMov === 'GANANCIA_RENDIMIENTO' && t.key === 'GANANCIA_RENDIMIENTO' && (
                  <Text style={movS.tipoHint}>Se registra como ingreso automáticamente</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Moneda */}
          <Text style={movS.label}>Moneda</Text>
          <View style={movS.seg}>
            {(['USD', 'BS'] as Moneda[]).map(m => (
              <TouchableOpacity key={m} style={[movS.segItem, moneda === m && movS.segActivo]} onPress={() => setMoneda(m)}>
                <Text style={[movS.segTxt, moneda === m && { color: '#fff' }]}>{m === 'USD' ? '🇺🇸 USD' : '🇻🇪 BS'}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Monto */}
          <Text style={movS.label}>Monto</Text>
          <TextInput
            style={movS.input}
            placeholder="0.00"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="decimal-pad"
            value={montoOriginal}
            onChangeText={setMontoOriginal}
          />

          {/* Tasa BS */}
          {moneda === 'BS' && (
            <>
              <Text style={movS.label}>
                Tasa Bs/USD{alertaTasa ? <Text style={{ color: COLORS.warning }}> ⚠️ &gt;2% diferencia</Text> : null}
              </Text>
              <TextInput
                style={[movS.input, alertaTasa && { borderColor: COLORS.warning }]}
                placeholder={tasaGlobal.toString()}
                placeholderTextColor={COLORS.textMuted}
                keyboardType="decimal-pad"
                value={tasaCambio}
                onChangeText={setTasaCambio}
              />
            </>
          )}

          {montoNum > 0 && (
            <View style={[movS.preview, { backgroundColor: tipoActual.color + '15' }]}>
              <Text style={[movS.previewTxt, { color: tipoActual.color }]}>
                {tipoMov === 'RETIRO_CAPITAL' ? '-' : '+'}{formatUSD(montoUSD)}
              </Text>
              {moneda === 'BS' && <Text style={movS.previewSub}>{formatBS(montoNum)} ÷ {tasaNum} = {formatUSD(montoUSD)}</Text>}
            </View>
          )}

          <TouchableOpacity
            style={[movS.btn, { backgroundColor: tipoActual.color }, guardando && { opacity: 0.6 }]}
            onPress={handleGuardar}
            disabled={guardando}
          >
            {guardando
              ? <ActivityIndicator color="#fff" size="small" />
              : <><Ionicons name="checkmark" size={18} color="#fff" /><Text style={movS.btnTxt}>Confirmar Movimiento</Text></>
            }
          </TouchableOpacity>
          <View style={{ height: 60 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const movS = StyleSheet.create({
  c: { flex: 1, backgroundColor: COLORS.modalBg, padding: SPACING.base, paddingTop: SPACING['2xl'] },
  header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: SPACING.base, gap: SPACING.sm },
  titulo: { fontSize: TYPOGRAPHY.xl, fontWeight: '800', color: COLORS.textPrimary },
  sub: { fontSize: TYPOGRAPHY.xs, color: COLORS.textSecondary, marginTop: 3 },
  closeBtn: { padding: SPACING.xs, backgroundColor: COLORS.surface, borderRadius: RADIUS.sm },
  label: { fontSize: TYPOGRAPHY.sm, fontWeight: '700', color: COLORS.textSecondary, marginBottom: SPACING.xs, marginTop: SPACING.md },
  tipoItem: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, padding: SPACING.md, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  tipoRadio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: COLORS.textMuted, alignItems: 'center', justifyContent: 'center' },
  tipoRadioInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' },
  tipoLabel: { fontSize: TYPOGRAPHY.base, fontWeight: '700', color: COLORS.textPrimary, flex: 1 },
  tipoHint: { fontSize: TYPOGRAPHY.xs, color: COLORS.textMuted },
  seg: { flexDirection: 'row', backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: 4, gap: 4, borderWidth: 1, borderColor: COLORS.border },
  segItem: { flex: 1, paddingVertical: SPACING.sm, alignItems: 'center', borderRadius: RADIUS.sm - 2 },
  segActivo: { backgroundColor: COLORS.accent },
  segTxt: { fontSize: TYPOGRAPHY.sm, fontWeight: '600', color: COLORS.textMuted },
  input: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: SPACING.md, color: COLORS.textPrimary, fontSize: TYPOGRAPHY.base },
  preview: { borderRadius: RADIUS.md, padding: SPACING.md, marginTop: SPACING.sm, alignItems: 'center', gap: 4 },
  previewTxt: { fontSize: TYPOGRAPHY['2xl'], fontWeight: '800' },
  previewSub: { fontSize: TYPOGRAPHY.xs, color: COLORS.textMuted },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, borderRadius: RADIUS.md, padding: SPACING.base, marginTop: SPACING.xl },
  btnTxt: { fontSize: TYPOGRAPHY.base, fontWeight: '800', color: '#fff' },
});

// ============================================================
// MODAL: NUEVA INVERSIÓN
// ============================================================
function ModalNuevaInversion({
  visible, tasaGlobal, onCerrar, onGuardar,
}: {
  visible: boolean;
  tasaGlobal: number;
  onCerrar: () => void;
  onGuardar: (datos: InversionInput) => Promise<boolean>;
}) {
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState<TipoInversion>('Inventario');
  const [montoInicial, setMontoInicial] = useState('');
  const [guardando, setGuardando] = useState(false);

  const handleGuardar = async () => {
    const monto = parsearMonto(montoInicial);
    if (!nombre.trim()) { Alert.alert('Error', 'Ingresa el nombre de la inversión.'); return; }
    if (monto <= 0) { Alert.alert('Error', 'Monto inválido.'); return; }
    setGuardando(true);
    const ok = await onGuardar({
      nombre: nombre.trim(),
      tipo,
      monto_inicial_usd: monto,
      valor_actual_usd: monto,
      estado: 'ACTIVA',
      fecha_inicio: hoyDB(),
    });
    setGuardando(false);
    if (ok) { setNombre(''); setMontoInicial(''); onCerrar(); }
    else Alert.alert('Error', 'No se pudo crear la inversión.');
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={movS.c} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={movS.header}>
            <Text style={movS.titulo}>Nueva Inversión / Activo</Text>
            <TouchableOpacity onPress={onCerrar} style={movS.closeBtn}>
              <Ionicons name="close" size={22} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>

          <Text style={movS.label}>Nombre</Text>
          <TextInput
            style={movS.input}
            placeholder="Ej: Inventario Fit 58, Binance Earn..."
            placeholderTextColor={COLORS.textMuted}
            value={nombre}
            onChangeText={setNombre}
          />

          <Text style={movS.label}>Tipo de activo</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm }}>
            {TIPOS_INVERSION.map(t => {
              const col = colorTipo(t as TipoInversion);
              return (
                <TouchableOpacity
                  key={t}
                  style={[movS.segItem, { flex: 0, paddingHorizontal: SPACING.md, borderWidth: 1, borderColor: tipo === t ? col : COLORS.border, backgroundColor: tipo === t ? col + '20' : COLORS.surface, borderRadius: RADIUS.md }]}
                  onPress={() => setTipo(t as TipoInversion)}
                >
                  <Ionicons name={iconoTipo(t as TipoInversion)} size={14} color={tipo === t ? col : COLORS.textMuted} />
                  <Text style={[movS.segTxt, tipo === t && { color: col }]}>{t}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={movS.label}>Monto inicial (USD)</Text>
          <TextInput
            style={movS.input}
            placeholder="0.00"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="decimal-pad"
            value={montoInicial}
            onChangeText={setMontoInicial}
          />

          <TouchableOpacity
            style={[movS.btn, { backgroundColor: COLORS.info }, guardando && { opacity: 0.6 }]}
            onPress={handleGuardar}
            disabled={guardando}
          >
            {guardando
              ? <ActivityIndicator color="#fff" size="small" />
              : <><Ionicons name="add" size={18} color="#fff" /><Text style={movS.btnTxt}>Crear Inversión</Text></>
            }
          </TouchableOpacity>
          <View style={{ height: 60 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ============================================================
// MODAL: ACTUALIZAR VALOR
// ============================================================
function ModalActualizarValor({
  inv, onCerrar, onGuardar,
}: {
  inv: Inversion | null;
  onCerrar: () => void;
  onGuardar: (id: number, valor: number) => Promise<boolean>;
}) {
  const [nuevoValor, setNuevoValor] = useState(inv?.valor_actual_usd.toString() ?? '');
  const [guardando, setGuardando] = useState(false);
  if (!inv) return null;

  const valorNum = parsearMonto(nuevoValor);
  const diferencia = valorNum - inv.valor_actual_usd;
  const esPositiva = diferencia >= 0;

  const handleGuardar = async () => {
    if (valorNum <= 0) { Alert.alert('Error', 'Valor inválido.'); return; }
    setGuardando(true);
    const ok = await onGuardar(inv.id, valorNum);
    setGuardando(false);
    if (ok) onCerrar();
    else Alert.alert('Error', 'No se pudo actualizar.');
  };

  return (
    <Modal visible animationType="fade" transparent>
      <View style={actS.overlay}>
        <View style={actS.card}>
          <Text style={actS.titulo}>Actualizar Valor</Text>
          <Text style={actS.sub}>{inv.nombre}</Text>
          <Text style={actS.actual}>Valor actual: {formatUSD(inv.valor_actual_usd)}</Text>

          <TextInput
            style={actS.input}
            placeholder="Nuevo valor en USD"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="decimal-pad"
            value={nuevoValor}
            onChangeText={setNuevoValor}
            autoFocus
          />

          {valorNum > 0 && diferencia !== 0 && (
            <Text style={[actS.diff, { color: esPositiva ? COLORS.income : COLORS.expense }]}>
              {esPositiva ? '+' : ''}{formatUSD(diferencia)} ({esPositiva ? '+' : ''}{inv.valor_actual_usd > 0 ? ((diferencia / inv.valor_actual_usd) * 100).toFixed(1) : '0'}%)
            </Text>
          )}

          <View style={actS.btns}>
            <TouchableOpacity style={actS.btnCancel} onPress={onCerrar}>
              <Text style={actS.btnCancelTxt}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[actS.btnOk, guardando && { opacity: 0.6 }]} onPress={handleGuardar} disabled={guardando}>
              {guardando
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={actS.btnOkTxt}>Actualizar</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const actS = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: COLORS.overlay, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl },
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.xl, width: '100%', gap: SPACING.sm, borderWidth: 1, borderColor: COLORS.border },
  titulo: { fontSize: TYPOGRAPHY.lg, fontWeight: '800', color: COLORS.textPrimary },
  sub: { fontSize: TYPOGRAPHY.xs, color: COLORS.textMuted },
  actual: { fontSize: TYPOGRAPHY.sm, color: COLORS.textSecondary },
  input: { backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: SPACING.md, color: COLORS.textPrimary, fontSize: TYPOGRAPHY.xl, fontWeight: '700', marginTop: SPACING.sm },
  diff: { fontSize: TYPOGRAPHY.base, fontWeight: '700', textAlign: 'center' },
  btns: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm },
  btnCancel: { flex: 1, padding: SPACING.md, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  btnCancelTxt: { fontSize: TYPOGRAPHY.base, fontWeight: '600', color: COLORS.textSecondary },
  btnOk: { flex: 1, padding: SPACING.md, borderRadius: RADIUS.md, backgroundColor: COLORS.accent, alignItems: 'center' },
  btnOkTxt: { fontSize: TYPOGRAPHY.base, fontWeight: '700', color: '#fff' },
});

// ============================================================
// PANTALLA PRINCIPAL
// ============================================================
export default function InversionesScreen() {
  const insets = useSafeAreaInsets();
  const {
    inversiones, totalValorActual, totalInvertido, gananciaTotal, rentabilidadPct,
    tasaGlobal, cargando, refrescar,
    agregarInversion, registrarMovimiento, actualizarValor, cerrarInversion,
  } = useInversiones();

  const [modalNueva, setModalNueva] = useState(false);
  const [invMovimiento, setInvMovimiento] = useState<Inversion | null>(null);
  const [invHistorial, setInvHistorial] = useState<Inversion | null>(null);
  const [invActualizar, setInvActualizar] = useState<Inversion | null>(null);
  const [mostrarLiquidadas, setMostrarLiquidadas] = useState(false);

  const activas = inversiones.filter(i => i.estado === 'ACTIVA');
  const liquidadas = inversiones.filter(i => i.estado === 'LIQUIDADA');
  const esPositiva = gananciaTotal >= 0;

  const handleCerrar = useCallback((inv: Inversion) => {
    Alert.alert('Liquidar inversión', `¿Marcar "${inv.nombre}" como liquidada?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Liquidar', style: 'destructive', onPress: () => cerrarInversion(inv.id) },
    ]);
  }, [cerrarInversion]);

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.titulo}>Portafolio</Text>
        <TouchableOpacity style={s.btnNuevo} onPress={() => setModalNueva(true)}>
          <Ionicons name="add" size={18} color={COLORS.textPrimary} />
          <Text style={s.btnNuevoTxt}>Nueva</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={cargando} onRefresh={refrescar} tintColor={COLORS.accent} colors={[COLORS.accent]} progressBackgroundColor={COLORS.surface} />}
      >
        {/* Resumen portafolio */}
        <View style={s.heroCard}>
          <Text style={s.heroLabel}>VALOR DEL PORTAFOLIO</Text>
          <Text style={s.heroVal}>{formatUSD(totalValorActual)}</Text>
          <View style={s.heroStats}>
            <View style={s.heroStat}>
              <Text style={s.heroStatLabel}>Invertido</Text>
              <Text style={s.heroStatVal}>{formatUSD(totalInvertido)}</Text>
            </View>
            <View style={s.heroStatDiv} />
            <View style={s.heroStat}>
              <Text style={s.heroStatLabel}>{esPositiva ? 'Ganancia' : 'Pérdida'}</Text>
              <Text style={[s.heroStatVal, { color: esPositiva ? COLORS.income : COLORS.expense }]}>
                {esPositiva ? '+' : ''}{formatUSD(gananciaTotal)}
              </Text>
            </View>
            <View style={s.heroStatDiv} />
            <View style={s.heroStat}>
              <Text style={s.heroStatLabel}>ROI</Text>
              <Text style={[s.heroStatVal, { color: esPositiva ? COLORS.income : COLORS.expense }]}>
                {esPositiva ? '+' : ''}{rentabilidadPct.toFixed(1)}%
              </Text>
            </View>
          </View>
        </View>

        {/* Lista activas */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>ACTIVAS ({activas.length})</Text>
          {activas.length === 0 ? (
            <View style={s.vacio}>
              <Ionicons name="trending-up-outline" size={40} color={COLORS.textMuted} />
              <Text style={s.vacioTxt}>Sin inversiones activas</Text>
              <TouchableOpacity style={s.vacioBtn} onPress={() => setModalNueva(true)}>
                <Text style={s.vacioBtnTxt}>+ Agregar inversión</Text>
              </TouchableOpacity>
            </View>
          ) : (
            activas.map(inv => (
              <SwipeableRow
                key={inv.id}
                onEliminar={() => handleCerrar(inv)}
                labelEliminar="Liquidar"
              >
                <TarjetaInversion
                  inv={inv}
                  onMovimiento={setInvMovimiento}
                  onActualizar={setInvActualizar}
                  onVerHistorial={setInvHistorial}
                  onCerrar={handleCerrar}
                />
              </SwipeableRow>
            ))
          )}
        </View>

        {/* Lista liquidadas */}
        {liquidadas.length > 0 && (
          <View style={s.section}>
            <TouchableOpacity style={s.sectionHeader} onPress={() => setMostrarLiquidadas(v => !v)}>
              <Text style={s.sectionLabel}>LIQUIDADAS ({liquidadas.length})</Text>
              <Ionicons name={mostrarLiquidadas ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
            {mostrarLiquidadas && liquidadas.map(inv => (
              <TarjetaInversion
                key={inv.id} inv={inv}
                onMovimiento={() => {}} onActualizar={() => {}}
                onVerHistorial={setInvHistorial} onCerrar={() => {}}
              />
            ))}
          </View>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* Modales */}
      <ModalNuevaInversion
        visible={modalNueva}
        tasaGlobal={tasaGlobal}
        onCerrar={() => setModalNueva(false)}
        onGuardar={agregarInversion}
      />
      {invMovimiento && (
        <ModalMovimiento
          inv={invMovimiento}
          tasaGlobal={tasaGlobal}
          onCerrar={() => setInvMovimiento(null)}
          onGuardar={registrarMovimiento}
        />
      )}
      {invHistorial && (
        <ModalHistorial inv={invHistorial} onCerrar={() => setInvHistorial(null)} />
      )}
      {invActualizar && (
        <ModalActualizarValor
          inv={invActualizar}
          onCerrar={() => setInvActualizar(null)}
          onGuardar={actualizarValor}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.base, paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  titulo: { fontSize: TYPOGRAPHY['2xl'], fontWeight: '800', color: COLORS.textPrimary },
  btnNuevo: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, backgroundColor: COLORS.info, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: RADIUS.md },
  btnNuevoTxt: { fontSize: TYPOGRAPHY.sm, fontWeight: '700', color: '#fff' },
  heroCard: { backgroundColor: COLORS.surface, margin: SPACING.base, borderRadius: RADIUS.xl, padding: SPACING.xl, borderWidth: 1, borderColor: COLORS.border, gap: SPACING.sm },
  heroLabel: { fontSize: TYPOGRAPHY.xs, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 1.5 },
  heroVal: { fontSize: TYPOGRAPHY['3xl'], fontWeight: '800', color: COLORS.textPrimary, letterSpacing: -1 },
  heroStats: { flexDirection: 'row', paddingTop: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.border },
  heroStat: { flex: 1, alignItems: 'center', gap: 3 },
  heroStatLabel: { fontSize: TYPOGRAPHY.xs, color: COLORS.textMuted },
  heroStatVal: { fontSize: TYPOGRAPHY.sm, fontWeight: '800', color: COLORS.textPrimary },
  heroStatDiv: { width: 1, backgroundColor: COLORS.border, marginVertical: 4 },
  section: { paddingHorizontal: SPACING.base, marginBottom: SPACING.sm },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.sm },
  sectionLabel: { fontSize: TYPOGRAPHY.xs, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 1.5, marginBottom: SPACING.sm },
  vacio: { alignItems: 'center', paddingVertical: SPACING['2xl'], gap: SPACING.sm },
  vacioTxt: { fontSize: TYPOGRAPHY.base, color: COLORS.textMuted },
  vacioBtn: { backgroundColor: COLORS.accentDim, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, borderRadius: RADIUS.md },
  vacioBtnTxt: { fontSize: TYPOGRAPHY.sm, fontWeight: '700', color: COLORS.accent },
});
