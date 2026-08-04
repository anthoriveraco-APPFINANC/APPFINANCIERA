// ============================================================
// DEUDAS.TSX — Gestión de Deudas y Cuentas por Cobrar
// App Financiera Personal
// ============================================================

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Share,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useDeudas, useAbonosDeuda } from '../../src/hooks/useDeudas';
import {
  formatUSD,
  formatBS,
  formatFecha,
  hoyDB,
  calcularMontoUSD,
  detectarAlertaTasa,
  parsearMonto,
  generarComprobanteWhatsApp,
} from '../../src/utils/currency';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../../src/constants';
import type {
  DeudaConPersona,
  AbonoDeuda,
  AbonoInput,
  TipoAbono,
  Moneda,
} from '../../src/types';

type TabActiva = 'POR_COBRAR' | 'POR_PAGAR';

interface EstadoModalAbono {
  visible: boolean;
  deuda: DeudaConPersona | null;
}

interface FormAbono {
  tipoAbono: TipoAbono;
  moneda: Moneda;
  montoOriginal: string;
  tasaCambio: string;
  detalle: string;
  referencia: string;
}

// ============================================================
// COMPONENTE: Chip de Monto
// ============================================================
function ChipMonto({ label, valor, color }: { label: string; valor: number; color: string }) {
  return (
    <View style={[chipS.c, { borderColor: color + '40' }]}>
      <Text style={chipS.l}>{label}</Text>
      <Text style={[chipS.v, { color }]}>{formatUSD(valor)}</Text>
    </View>
  );
}
const chipS = StyleSheet.create({
  c: { borderWidth: 1, borderRadius: RADIUS.sm, paddingHorizontal: SPACING.sm, paddingVertical: 4, alignItems: 'center', minWidth: 76 },
  l: { fontSize: 9, color: COLORS.textMuted, marginBottom: 1 },
  v: { fontSize: TYPOGRAPHY.sm, fontWeight: '700' },
});

// ============================================================
// COMPONENTE: Tarjeta de Deuda
// ============================================================
function TarjetaDeuda({
  deuda, onAbono, onVerHistorial, onCompartir, onCerrar,
}: {
  deuda: DeudaConPersona;
  onAbono: (d: DeudaConPersona) => void;
  onVerHistorial: (d: DeudaConPersona) => void;
  onCompartir: (d: DeudaConPersona) => void;
  onCerrar: (d: DeudaConPersona) => void;
}) {
  const esCobrar = deuda.tipo === 'POR_COBRAR';
  const colorPrincipal = esCobrar ? COLORS.cobrar : COLORS.expense;
  const colorFondo = esCobrar ? COLORS.cobrarDim : COLORS.expenseDim;
  const porcentajePagado = deuda.monto_capital_usd > 0
    ? Math.min(100, (deuda.total_abonado_capital_usd / deuda.monto_capital_usd) * 100)
    : 0;
  const saldoInteres = deuda.tipo === 'POR_PAGAR'
    ? Math.max(0, deuda.monto_interes_fijo_usd - deuda.total_abonado_interes_usd)
    : 0;

  return (
    <View style={tarjS.card}>
      {/* Header */}
      <View style={tarjS.header}>
        <View style={[tarjS.avatar, { backgroundColor: colorFondo }]}>
          <Text style={[tarjS.avatarTxt, { color: colorPrincipal }]}>
            {deuda.persona_nombre.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={tarjS.nombre} numberOfLines={1}>{deuda.persona_nombre}</Text>
          {deuda.descripcion ? (
            <Text style={tarjS.desc} numberOfLines={1}>{deuda.descripcion}</Text>
          ) : null}
        </View>
        <View style={tarjS.badges}>
          {deuda.es_recurrente === 1 && (
            <View style={[tarjS.badge, { backgroundColor: COLORS.warningDim }]}>
              <Ionicons name="repeat" size={9} color={COLORS.warning} />
              <Text style={[tarjS.badgeTxt, { color: COLORS.warning }]}>Recurrente</Text>
            </View>
          )}
          {deuda.dia_vencimiento_mensual ? (
            <View style={[tarjS.badge, { backgroundColor: COLORS.expenseDim }]}>
              <Ionicons name="calendar" size={9} color={COLORS.expense} />
              <Text style={[tarjS.badgeTxt, { color: COLORS.expense }]}>
                Día {deuda.dia_vencimiento_mensual}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Montos */}
      <View style={tarjS.montos}>
        <ChipMonto label="Capital" valor={deuda.monto_capital_usd} color={COLORS.textSecondary} />
        <ChipMonto label="Pagado" valor={deuda.total_abonado_capital_usd} color={COLORS.income} />
        <ChipMonto label="Saldo" valor={deuda.saldo_capital_pendiente_usd} color={colorPrincipal} />
      </View>

      {/* Interés (solo POR_PAGAR) */}
      {deuda.tipo === 'POR_PAGAR' && deuda.monto_interes_fijo_usd > 0 && (
        <View style={tarjS.interesRow}>
          <Ionicons name="trending-up" size={12} color={COLORS.warning} />
          <Text style={tarjS.interesLabel}>
            Interés mensual: {formatUSD(deuda.monto_interes_fijo_usd)}
          </Text>
          {saldoInteres > 0 && (
            <View style={tarjS.interesBadge}>
              <Text style={tarjS.interesBadgeTxt}>Pendiente: {formatUSD(saldoInteres)}</Text>
            </View>
          )}
        </View>
      )}

      {/* Barra */}
      <View style={tarjS.barraRow}>
        <View style={tarjS.barraFondo}>
          <View style={[tarjS.barraRelleno, { width: `${porcentajePagado}%` as any, backgroundColor: colorPrincipal }]} />
        </View>
        <Text style={tarjS.barraPct}>{porcentajePagado.toFixed(0)}%</Text>
      </View>

      {/* Acciones */}
      <View style={tarjS.acciones}>
        <TouchableOpacity style={tarjS.btnPrimario} onPress={() => onAbono(deuda)}>
          <Ionicons name="cash" size={14} color="#fff" />
          <Text style={tarjS.btnPrimarioTxt}>Registrar Abono</Text>
        </TouchableOpacity>
        <TouchableOpacity style={tarjS.btnIcono} onPress={() => onVerHistorial(deuda)}>
          <Ionicons name="time" size={18} color={COLORS.accent} />
        </TouchableOpacity>
        <TouchableOpacity style={tarjS.btnIcono} onPress={() => onCompartir(deuda)}>
          <Ionicons name="logo-whatsapp" size={18} color={COLORS.income} />
        </TouchableOpacity>
        <TouchableOpacity style={tarjS.btnIcono} onPress={() => onCerrar(deuda)}>
          <Ionicons name="checkmark-circle" size={18} color={COLORS.textMuted} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const tarjS = StyleSheet.create({
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.base, marginBottom: SPACING.md, borderWidth: 1, borderColor: COLORS.border, gap: SPACING.sm },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { fontSize: TYPOGRAPHY.lg, fontWeight: '800' },
  nombre: { fontSize: TYPOGRAPHY.base, fontWeight: '700', color: COLORS.textPrimary },
  desc: { fontSize: TYPOGRAPHY.xs, color: COLORS.textMuted, marginTop: 2 },
  badges: { gap: 4 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 3, borderRadius: RADIUS.full },
  badgeTxt: { fontSize: 9, fontWeight: '700' },
  montos: { flexDirection: 'row', gap: SPACING.sm, flexWrap: 'wrap' },
  interesRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, backgroundColor: COLORS.warningDim, borderRadius: RADIUS.sm, paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs },
  interesLabel: { fontSize: TYPOGRAPHY.xs, color: COLORS.warning, flex: 1 },
  interesBadge: { backgroundColor: COLORS.expense + '30', paddingHorizontal: SPACING.sm, paddingVertical: 2, borderRadius: RADIUS.full },
  interesBadgeTxt: { fontSize: 9, fontWeight: '700', color: COLORS.expense },
  barraRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  barraFondo: { flex: 1, height: 5, backgroundColor: COLORS.border, borderRadius: RADIUS.full, overflow: 'hidden' },
  barraRelleno: { height: '100%', borderRadius: RADIUS.full },
  barraPct: { fontSize: TYPOGRAPHY.xs, color: COLORS.textMuted, minWidth: 28, textAlign: 'right' },
  acciones: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingTop: SPACING.xs, borderTopWidth: 1, borderTopColor: COLORS.border },
  btnPrimario: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: SPACING.sm, borderRadius: RADIUS.sm, backgroundColor: COLORS.accent },
  btnPrimarioTxt: { fontSize: TYPOGRAPHY.xs, fontWeight: '700', color: '#fff' },
  btnIcono: { width: 36, height: 36, borderRadius: RADIUS.sm, backgroundColor: COLORS.surfaceAlt, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
});

// ============================================================
// COMPONENTE: Item de Abono en Historial
// ============================================================
function ItemAbono({ abono, onEliminar }: { abono: AbonoDeuda; onEliminar: (id: number) => void }) {
  const esCapital = abono.tipo_abono === 'CAPITAL';
  const color = esCapital ? COLORS.cobrar : COLORS.warning;
  const fondo = esCapital ? COLORS.cobrarDim : COLORS.warningDim;
  return (
    <View style={aboS.row}>
      <View style={[aboS.icono, { backgroundColor: fondo }]}>
        <Ionicons name={esCapital ? 'wallet' : 'trending-up'} size={14} color={color} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={aboS.tipo}>{esCapital ? 'Capital' : 'Interés'}</Text>
          <Text style={[aboS.monto, { color }]}>{formatUSD(abono.monto_usd)}</Text>
        </View>
        <Text style={aboS.fecha}>
          {formatFecha(abono.fecha)}
          {abono.moneda_original === 'BS' ? ` · ${formatBS(abono.monto_original)} @ Bs.${abono.tasa_cambio}/USD` : ''}
        </Text>
        {abono.detalle ? <Text style={aboS.detalle}>{abono.detalle}</Text> : null}
        {abono.referencia_pago ? <Text style={aboS.ref}>Ref: {abono.referencia_pago}</Text> : null}
      </View>
      <TouchableOpacity onPress={() => onEliminar(abono.id)} style={{ padding: SPACING.xs }}>
        <Ionicons name="trash-outline" size={14} color={COLORS.expense} />
      </TouchableOpacity>
    </View>
  );
}
const aboS = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm, paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  icono: { width: 32, height: 32, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  tipo: { fontSize: TYPOGRAPHY.sm, fontWeight: '700', color: COLORS.textPrimary },
  monto: { fontSize: TYPOGRAPHY.base, fontWeight: '800' },
  fecha: { fontSize: TYPOGRAPHY.xs, color: COLORS.textMuted },
  detalle: { fontSize: TYPOGRAPHY.xs, color: COLORS.textSecondary },
  ref: { fontSize: TYPOGRAPHY.xs, color: COLORS.accent },
});

// ============================================================
// MODAL: HISTORIAL DE ABONOS
// ============================================================
function ModalHistorial({
  deuda, onCerrar, onEliminar,
}: {
  deuda: DeudaConPersona | null;
  onCerrar: () => void;
  onEliminar: (id: number) => void;
}) {
  const { abonos, cargando, refrescar } = useAbonosDeuda(deuda?.id ?? null);
  if (!deuda) return null;

  const totalCapital = abonos.filter(a => a.tipo_abono === 'CAPITAL').reduce((s, a) => s + a.monto_usd, 0);
  const totalInteres = abonos.filter(a => a.tipo_abono === 'INTERES').reduce((s, a) => s + a.monto_usd, 0);

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet">
      <View style={histS.c}>
        <View style={histS.header}>
          <View>
            <Text style={histS.titulo}>Historial de Abonos</Text>
            <Text style={histS.sub}>{deuda.persona_nombre}</Text>
          </View>
          <TouchableOpacity onPress={onCerrar} style={histS.closeBtn}>
            <Ionicons name="close" size={22} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>

        <View style={histS.resumen}>
          <View style={histS.resItem}>
            <Text style={histS.resLabel}>Capital abonado</Text>
            <Text style={[histS.resVal, { color: COLORS.cobrar }]}>{formatUSD(totalCapital)}</Text>
          </View>
          {deuda.monto_interes_fijo_usd > 0 && (
            <View style={histS.resItem}>
              <Text style={histS.resLabel}>Interés abonado</Text>
              <Text style={[histS.resVal, { color: COLORS.warning }]}>{formatUSD(totalInteres)}</Text>
            </View>
          )}
          <View style={histS.resItem}>
            <Text style={histS.resLabel}>Saldo pendiente</Text>
            <Text style={[histS.resVal, { color: COLORS.expense }]}>{formatUSD(deuda.saldo_capital_pendiente_usd)}</Text>
          </View>
        </View>

        {cargando ? (
          <ActivityIndicator color={COLORS.accent} style={{ marginTop: SPACING.xl }} />
        ) : abonos.length === 0 ? (
          <View style={histS.vacio}>
            <Ionicons name="receipt-outline" size={40} color={COLORS.textMuted} />
            <Text style={histS.vacioTxt}>Sin abonos registrados</Text>
          </View>
        ) : (
          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            {abonos.map(a => (
              <ItemAbono
                key={a.id}
                abono={a}
                onEliminar={(id) => {
                  Alert.alert('Eliminar abono', '¿Eliminar este abono?', [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Eliminar', style: 'destructive', onPress: async () => { await onEliminar(id); refrescar(); } },
                  ]);
                }}
              />
            ))}
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
  resumen: { flexDirection: 'row', backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.base, borderWidth: 1, borderColor: COLORS.border, gap: SPACING.sm },
  resItem: { flex: 1, alignItems: 'center', gap: 3 },
  resLabel: { fontSize: TYPOGRAPHY.xs, color: COLORS.textMuted, textAlign: 'center' },
  resVal: { fontSize: TYPOGRAPHY.sm, fontWeight: '800' },
  vacio: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, paddingTop: SPACING['3xl'] },
  vacioTxt: { fontSize: TYPOGRAPHY.base, color: COLORS.textMuted },
});

// ============================================================
// MODAL: REGISTRAR ABONO
// ============================================================
function ModalAbono({
  estado, tasaGlobal, onCerrar, onGuardar,
}: {
  estado: EstadoModalAbono;
  tasaGlobal: number;
  onCerrar: () => void;
  onGuardar: (datos: AbonoInput) => Promise<boolean>;
}) {
  const [form, setForm] = useState<FormAbono>({
    tipoAbono: 'CAPITAL',
    moneda: 'USD',
    montoOriginal: '',
    tasaCambio: tasaGlobal.toString(),
    detalle: '',
    referencia: '',
  });
  const [guardando, setGuardando] = useState(false);
  const deuda = estado.deuda;
  if (!deuda) return null;

  const montoNum = parsearMonto(form.montoOriginal);
  const tasaNum = parsearMonto(form.tasaCambio);
  const montoUSD = calcularMontoUSD(montoNum, form.moneda, tasaNum);
  const alertaTasa = form.moneda === 'BS' && detectarAlertaTasa(tasaNum, tasaGlobal);
  const saldoDisponible = form.tipoAbono === 'CAPITAL'
    ? deuda.saldo_capital_pendiente_usd
    : Math.max(0, deuda.monto_interes_fijo_usd - deuda.total_abonado_interes_usd);

  const handleGuardar = async () => {
    if (montoNum <= 0) { Alert.alert('Error', 'Ingresa un monto válido.'); return; }
    setGuardando(true);
    const ok = await onGuardar({
      deuda_id: deuda.id,
      tipo_abono: form.tipoAbono,
      moneda_original: form.moneda,
      monto_original: montoNum,
      tasa_cambio: form.moneda === 'BS' ? tasaNum : 1.0,
      monto_usd: montoUSD,
      fecha: hoyDB(),
      detalle: form.detalle || undefined,
      referencia_pago: form.referencia || undefined,
    });
    setGuardando(false);
    if (ok) { onCerrar(); } else { Alert.alert('Error', 'No se pudo registrar el abono.'); }
  };

  return (
    <Modal visible={estado.visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={mAboS.c} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={mAboS.header}>
            <View style={{ flex: 1 }}>
              <Text style={mAboS.titulo}>Registrar Abono</Text>
              <Text style={mAboS.sub}>{deuda.persona_nombre} · Saldo: {formatUSD(deuda.saldo_capital_pendiente_usd)}</Text>
            </View>
            <TouchableOpacity onPress={onCerrar} style={mAboS.closeBtn}>
              <Ionicons name="close" size={22} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Tipo abono */}
          <Text style={mAboS.label}>Tipo de abono</Text>
          <View style={mAboS.seg}>
            {(['CAPITAL', 'INTERES'] as TipoAbono[]).map(t => (
              <TouchableOpacity
                key={t}
                style={[mAboS.segItem, form.tipoAbono === t && mAboS.segActivo]}
                onPress={() => setForm(f => ({ ...f, tipoAbono: t }))}
              >
                <Text style={[mAboS.segTxt, form.tipoAbono === t && { color: '#fff' }]}>
                  {t === 'CAPITAL' ? '💵 Capital' : '📈 Interés'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={mAboS.infoBox}>
            <Ionicons name="information-circle" size={14} color={COLORS.accent} />
            <Text style={mAboS.infoTxt}>
              {form.tipoAbono === 'CAPITAL'
                ? `Saldo capital: ${formatUSD(saldoDisponible)}`
                : `Interés mensual: ${formatUSD(deuda.monto_interes_fijo_usd)} · Pendiente: ${formatUSD(saldoDisponible)}`}
            </Text>
          </View>

          {/* Moneda */}
          <Text style={mAboS.label}>Moneda</Text>
          <View style={mAboS.seg}>
            {(['USD', 'BS'] as Moneda[]).map(m => (
              <TouchableOpacity
                key={m}
                style={[mAboS.segItem, form.moneda === m && mAboS.segActivo]}
                onPress={() => setForm(f => ({ ...f, moneda: m }))}
              >
                <Text style={[mAboS.segTxt, form.moneda === m && { color: '#fff' }]}>
                  {m === 'USD' ? '🇺🇸 USD' : '🇻🇪 Bolívares'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Monto */}
          <Text style={mAboS.label}>Monto ({form.moneda === 'USD' ? 'USD' : 'Bs.'})</Text>
          <TextInput
            style={mAboS.input}
            placeholder="0.00"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="decimal-pad"
            value={form.montoOriginal}
            onChangeText={v => setForm(f => ({ ...f, montoOriginal: v }))}
          />

          {/* Tasa (solo BS) */}
          {form.moneda === 'BS' && (
            <>
              <Text style={mAboS.label}>
                Tasa Bs/USD{alertaTasa ? <Text style={{ color: COLORS.warning }}> ⚠️ Difiere &gt;2% de la global</Text> : null}
              </Text>
              <TextInput
                style={[mAboS.input, alertaTasa && { borderColor: COLORS.warning }]}
                placeholder={tasaGlobal.toString()}
                placeholderTextColor={COLORS.textMuted}
                keyboardType="decimal-pad"
                value={form.tasaCambio}
                onChangeText={v => setForm(f => ({ ...f, tasaCambio: v }))}
              />
              <View style={mAboS.preview}>
                <Text style={mAboS.previewTxt}>≈ {formatUSD(montoUSD)}</Text>
              </View>
            </>
          )}

          {/* Referencia */}
          <Text style={mAboS.label}>Referencia (opcional)</Text>
          <TextInput
            style={mAboS.input}
            placeholder="Número de comprobante o referencia"
            placeholderTextColor={COLORS.textMuted}
            value={form.referencia}
            onChangeText={v => setForm(f => ({ ...f, referencia: v }))}
          />

          {/* Nota */}
          <Text style={mAboS.label}>Nota (opcional)</Text>
          <TextInput
            style={[mAboS.input, { minHeight: 70, textAlignVertical: 'top' }]}
            placeholder="Descripción adicional..."
            placeholderTextColor={COLORS.textMuted}
            multiline
            value={form.detalle}
            onChangeText={v => setForm(f => ({ ...f, detalle: v }))}
          />

          {/* Preview USD */}
          {form.moneda === 'USD' && montoNum > 0 && (
            <View style={mAboS.preview}>
              <Ionicons name="checkmark-circle" size={16} color={COLORS.income} />
              <Text style={mAboS.previewTxt}>Se registrará: {formatUSD(montoUSD)}</Text>
            </View>
          )}

          {/* Botón */}
          <TouchableOpacity
            style={[mAboS.btn, guardando && { opacity: 0.6 }]}
            onPress={handleGuardar}
            disabled={guardando}
          >
            {guardando
              ? <ActivityIndicator color="#fff" size="small" />
              : <><Ionicons name="checkmark" size={18} color="#fff" /><Text style={mAboS.btnTxt}>Registrar Abono</Text></>
            }
          </TouchableOpacity>

          <View style={{ height: 60 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const mAboS = StyleSheet.create({
  c: { flex: 1, backgroundColor: COLORS.modalBg, padding: SPACING.base, paddingTop: SPACING['2xl'] },
  header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: SPACING.base, gap: SPACING.sm },
  titulo: { fontSize: TYPOGRAPHY.xl, fontWeight: '800', color: COLORS.textPrimary },
  sub: { fontSize: TYPOGRAPHY.xs, color: COLORS.textSecondary, marginTop: 3 },
  closeBtn: { padding: SPACING.xs, backgroundColor: COLORS.surface, borderRadius: RADIUS.sm },
  label: { fontSize: TYPOGRAPHY.sm, fontWeight: '700', color: COLORS.textSecondary, marginBottom: SPACING.xs, marginTop: SPACING.md },
  seg: { flexDirection: 'row', backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: 4, gap: 4, borderWidth: 1, borderColor: COLORS.border },
  segItem: { flex: 1, paddingVertical: SPACING.sm, alignItems: 'center', borderRadius: RADIUS.sm - 2 },
  segActivo: { backgroundColor: COLORS.accent },
  segTxt: { fontSize: TYPOGRAPHY.sm, fontWeight: '600', color: COLORS.textMuted },
  infoBox: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, backgroundColor: COLORS.accentDim, borderRadius: RADIUS.sm, padding: SPACING.sm, marginTop: SPACING.sm },
  infoTxt: { fontSize: TYPOGRAPHY.xs, color: COLORS.accentLight, flex: 1 },
  input: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: SPACING.md, color: COLORS.textPrimary, fontSize: TYPOGRAPHY.base },
  preview: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, backgroundColor: COLORS.incomeDim, borderRadius: RADIUS.sm, padding: SPACING.sm, marginTop: SPACING.xs },
  previewTxt: { fontSize: TYPOGRAPHY.base, fontWeight: '700', color: COLORS.income },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, backgroundColor: COLORS.accent, borderRadius: RADIUS.md, padding: SPACING.base, marginTop: SPACING.xl },
  btnTxt: { fontSize: TYPOGRAPHY.base, fontWeight: '800', color: '#fff' },
});

// ============================================================
// PANTALLA PRINCIPAL
// ============================================================
export default function DeudasScreen() {
  const insets = useSafeAreaInsets();
  const {
    porCobrar, porPagar,
    totalPorCobrar, totalPorPagar, totalInteresesPendientes,
    tasaGlobal, cargando, refrescar,
    registrarAbono, eliminarAbono, cerrarDeuda,
  } = useDeudas();

  const [tabActiva, setTabActiva] = useState<TabActiva>('POR_PAGAR');
  const [modalAbono, setModalAbono] = useState<EstadoModalAbono>({ visible: false, deuda: null });
  const [deudaHistorial, setDeudaHistorial] = useState<DeudaConPersona | null>(null);

  const listaMostrada = tabActiva === 'POR_COBRAR' ? porCobrar : porPagar;

  const compartirWhatsApp = useCallback(async (deuda: DeudaConPersona) => {
    const texto = generarComprobanteWhatsApp({
      persona: deuda.persona_nombre,
      tipo: 'Abono a Capital',
      monto_usd: deuda.total_abonado_capital_usd,
      monto_original: deuda.total_abonado_capital_usd,
      moneda: 'USD',
      tasa: 1,
      fecha: hoyDB(),
      descripcion: deuda.descripcion,
    });
    await Share.share({ message: texto });
  }, []);

  const handleCerrar = useCallback((deuda: DeudaConPersona) => {
    Alert.alert(
      'Marcar como pagada',
      `¿Marcar la deuda de ${deuda.persona_nombre} como pagada?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Confirmar', onPress: () => cerrarDeuda(deuda.id) },
      ],
    );
  }, [cerrarDeuda]);

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.titulo}>Deudas & Cobros</Text>
        {totalInteresesPendientes > 0 && (
          <View style={s.interesAlerta}>
            <Ionicons name="warning" size={12} color={COLORS.warning} />
            <Text style={s.interesAlertaTxt}>{formatUSD(totalInteresesPendientes)} en intereses pendientes</Text>
          </View>
        )}
      </View>

      {/* Tabs */}
      <View style={s.tabs}>
        {([['POR_PAGAR', 'arrow-up-circle', COLORS.expense, totalPorPagar, 'Por Pagar'],
           ['POR_COBRAR', 'arrow-down-circle', COLORS.cobrar, totalPorCobrar, 'Por Cobrar']] as const).map(
          ([tab, icon, color, total, label]) => (
            <TouchableOpacity
              key={tab}
              style={[s.tab, tabActiva === tab && s.tabActivo]}
              onPress={() => setTabActiva(tab)}
            >
              <Ionicons name={icon} size={16} color={tabActiva === tab ? color : COLORS.textMuted} />
              <Text style={[s.tabTxt, tabActiva === tab && { color }]}>{label}</Text>
              <View style={[s.tabBadge, { backgroundColor: color + '20' }]}>
                <Text style={[s.tabBadgeTxt, { color }]}>{formatUSD(total)}</Text>
              </View>
            </TouchableOpacity>
          )
        )}
      </View>

      {/* Lista */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.listaPad}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={cargando} onRefresh={refrescar} tintColor={COLORS.accent} colors={[COLORS.accent]} progressBackgroundColor={COLORS.surface} />
        }
      >
        {listaMostrada.length === 0 && !cargando ? (
          <View style={s.vacio}>
            <Ionicons name="checkmark-circle" size={48} color={COLORS.income} />
            <Text style={s.vacioTitulo}>¡Sin deudas pendientes!</Text>
            <Text style={s.vacioSub}>
              {tabActiva === 'POR_COBRAR' ? 'No tienes cuentas por cobrar.' : 'No tienes compromisos de pago.'}
            </Text>
          </View>
        ) : (
          listaMostrada.map(deuda => (
            <TarjetaDeuda
              key={deuda.id}
              deuda={deuda}
              onAbono={d => setModalAbono({ visible: true, deuda: d })}
              onVerHistorial={d => setDeudaHistorial(d)}
              onCompartir={compartirWhatsApp}
              onCerrar={handleCerrar}
            />
          ))
        )}
        <View style={{ height: 60 }} />
      </ScrollView>

      {/* Modales */}
      <ModalAbono
        estado={modalAbono}
        tasaGlobal={tasaGlobal}
        onCerrar={() => setModalAbono({ visible: false, deuda: null })}
        onGuardar={registrarAbono}
      />
      {deudaHistorial && (
        <ModalHistorial
          deuda={deudaHistorial}
          onCerrar={() => setDeudaHistorial(null)}
          onEliminar={eliminarAbono}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: SPACING.base, paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: SPACING.xs },
  titulo: { fontSize: TYPOGRAPHY['2xl'], fontWeight: '800', color: COLORS.textPrimary },
  interesAlerta: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.warningDim, paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: RADIUS.full, alignSelf: 'flex-start' },
  interesAlertaTxt: { fontSize: TYPOGRAPHY.xs, color: COLORS.warning, fontWeight: '600' },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.xs, paddingVertical: SPACING.md, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActivo: { borderBottomColor: COLORS.accent },
  tabTxt: { fontSize: TYPOGRAPHY.sm, fontWeight: '700', color: COLORS.textMuted },
  tabBadge: { paddingHorizontal: SPACING.sm, paddingVertical: 2, borderRadius: RADIUS.full },
  tabBadgeTxt: { fontSize: TYPOGRAPHY.xs, fontWeight: '800' },
  listaPad: { padding: SPACING.base },
  vacio: { alignItems: 'center', justifyContent: 'center', paddingTop: SPACING['3xl'], gap: SPACING.sm },
  vacioTitulo: { fontSize: TYPOGRAPHY.lg, fontWeight: '700', color: COLORS.textPrimary },
  vacioSub: { fontSize: TYPOGRAPHY.sm, color: COLORS.textMuted, textAlign: 'center' },
});
