// ============================================================
// FLUJO.TSX — Flujo de Caja (Ingresos y Gastos)
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
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useFlujo } from '../../src/hooks/useFlujo';
import {
  formatUSD,
  formatBS,
  formatFecha,
  hoyDB,
  calcularMontoUSD,
  detectarAlertaTasa,
  parsearMonto,
} from '../../src/utils/currency';
import {
  COLORS, TYPOGRAPHY, SPACING, RADIUS,
  CATEGORIAS_GASTO_PERSONAL, CATEGORIAS_GASTO_NEGOCIO,
  CATEGORIAS_INGRESO, METODOS_PAGO, ICONO_CATEGORIA,
} from '../../src/constants';
import type { Gasto, Ingreso, GastoInput, IngresoInput, TipoGasto, Moneda } from '../../src/types';

type TabFlujo = 'TODOS' | 'INGRESOS' | 'GASTOS';
type ModalTipo = 'GASTO' | 'INGRESO' | null;

// ============================================================
// NOMBRES DE MESES
// ============================================================
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

// ============================================================
// COMPONENTE: Selector de Categoría (Picker scroll horizontal)
// ============================================================
function SelectorCategorias({
  opciones,
  seleccionado,
  onSeleccionar,
}: {
  opciones: readonly string[];
  seleccionado: string;
  onSeleccionar: (c: string) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SPACING.sm }}>
      <View style={{ flexDirection: 'row', gap: SPACING.xs, paddingVertical: 4 }}>
        {opciones.map(op => (
          <TouchableOpacity
            key={op}
            style={[
              catS.chip,
              seleccionado === op && catS.chipActivo,
            ]}
            onPress={() => onSeleccionar(op)}
          >
            <Ionicons
              name={(ICONO_CATEGORIA[op] ?? ICONO_CATEGORIA.default) as any}
              size={12}
              color={seleccionado === op ? '#fff' : COLORS.textMuted}
            />
            <Text style={[catS.chipTxt, seleccionado === op && { color: '#fff' }]}>{op}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}
const catS = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: SPACING.sm, paddingVertical: 6, borderRadius: RADIUS.full, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  chipActivo: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  chipTxt: { fontSize: TYPOGRAPHY.xs, fontWeight: '600', color: COLORS.textMuted },
});

// ============================================================
// COMPONENTE: Movimiento individual en la lista
// ============================================================
type MovimientoUnificado =
  | (Gasto & { _tipo: 'gasto' })
  | (Ingreso & { _tipo: 'ingreso' });

function ItemMovimiento({
  item,
  onEliminar,
}: {
  item: MovimientoUnificado;
  onEliminar: (id: number, tipo: 'gasto' | 'ingreso') => void;
}) {
  const esGasto = item._tipo === 'gasto';
  const color = esGasto ? COLORS.expense : COLORS.income;
  const fondo = esGasto ? COLORS.expenseDim : COLORS.incomeDim;
  const iconoNombre = (ICONO_CATEGORIA[item.categoria] ?? ICONO_CATEGORIA.default) as any;

  return (
    <View style={itemS.row}>
      <View style={[itemS.icono, { backgroundColor: fondo }]}>
        <Ionicons name={iconoNombre} size={16} color={color} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={itemS.categoria} numberOfLines={1}>{item.categoria}</Text>
          <Text style={[itemS.monto, { color }]}>
            {esGasto ? '-' : '+'}{formatUSD(item.monto_usd)}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
          <Text style={itemS.fecha}>{formatFecha(item.fecha)}</Text>
          {esGasto && (item as Gasto).tipo_gasto === 'NEGOCIO_PRODUCCION' && (
            <View style={itemS.negocioBadge}>
              <Text style={itemS.negocioBadgeTxt}>Negocio</Text>
            </View>
          )}
          {item.moneda_original === 'BS' && (
            <Text style={itemS.bs}>{formatBS(item.monto_original)}</Text>
          )}
          {item.metodo_pago ? (
            <Text style={itemS.metodo}>{item.metodo_pago}</Text>
          ) : null}
        </View>
        {item.descripcion ? (
          <Text style={itemS.desc} numberOfLines={1}>{item.descripcion}</Text>
        ) : null}
      </View>
      <TouchableOpacity
        style={itemS.trash}
        onPress={() => onEliminar(item.id, item._tipo)}
      >
        <Ionicons name="trash-outline" size={14} color={COLORS.textMuted} />
      </TouchableOpacity>
    </View>
  );
}
const itemS = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm, paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  icono: { width: 38, height: 38, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  categoria: { fontSize: TYPOGRAPHY.sm, fontWeight: '700', color: COLORS.textPrimary, flex: 1 },
  monto: { fontSize: TYPOGRAPHY.base, fontWeight: '800' },
  fecha: { fontSize: TYPOGRAPHY.xs, color: COLORS.textMuted },
  negocioBadge: { backgroundColor: COLORS.warningDim, paddingHorizontal: 6, paddingVertical: 2, borderRadius: RADIUS.full },
  negocioBadgeTxt: { fontSize: 9, color: COLORS.warning, fontWeight: '700' },
  bs: { fontSize: TYPOGRAPHY.xs, color: COLORS.textMuted },
  metodo: { fontSize: TYPOGRAPHY.xs, color: COLORS.accent },
  desc: { fontSize: TYPOGRAPHY.xs, color: COLORS.textSecondary },
  trash: { padding: SPACING.xs, marginTop: 4 },
});

// ============================================================
// COMPONENTE: Barras de categorías
// ============================================================
function BarrasCategorias({
  categorias,
  total,
}: {
  categorias: { categoria: string; total: number }[];
  total: number;
}) {
  return (
    <View style={barrS.c}>
      <Text style={barrS.titulo}>Gastos por categoría</Text>
      {categorias.slice(0, 5).map(({ categoria, total: t }) => (
        <View key={categoria} style={barrS.fila}>
          <Ionicons
            name={(ICONO_CATEGORIA[categoria] ?? ICONO_CATEGORIA.default) as any}
            size={12}
            color={COLORS.textMuted}
          />
          <Text style={barrS.cat} numberOfLines={1}>{categoria}</Text>
          <View style={barrS.barFondo}>
            <View
              style={[
                barrS.barRelleno,
                { width: `${total > 0 ? (t / total) * 100 : 0}%` as any },
              ]}
            />
          </View>
          <Text style={barrS.val}>{formatUSD(t)}</Text>
        </View>
      ))}
    </View>
  );
}
const barrS = StyleSheet.create({
  c: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.base, marginBottom: SPACING.md, borderWidth: 1, borderColor: COLORS.border, gap: SPACING.sm },
  titulo: { fontSize: TYPOGRAPHY.sm, fontWeight: '700', color: COLORS.textSecondary, marginBottom: SPACING.xs },
  fila: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  cat: { fontSize: TYPOGRAPHY.xs, color: COLORS.textSecondary, width: 110 },
  barFondo: { flex: 1, height: 5, backgroundColor: COLORS.border, borderRadius: RADIUS.full, overflow: 'hidden' },
  barRelleno: { height: '100%', backgroundColor: COLORS.expense, borderRadius: RADIUS.full },
  val: { fontSize: TYPOGRAPHY.xs, fontWeight: '700', color: COLORS.expense, minWidth: 60, textAlign: 'right' },
});

// ============================================================
// MODAL: NUEVO GASTO
// ============================================================
interface FormGasto {
  tipoGasto: TipoGasto;
  categoria: string;
  descripcion: string;
  moneda: Moneda;
  montoOriginal: string;
  tasaCambio: string;
  metodoPago: string;
}

function ModalNuevoGasto({
  visible,
  tasaGlobal,
  onCerrar,
  onGuardar,
}: {
  visible: boolean;
  tasaGlobal: number;
  onCerrar: () => void;
  onGuardar: (datos: GastoInput) => Promise<boolean>;
}) {
  const [form, setForm] = useState<FormGasto>({
    tipoGasto: 'PERSONAL',
    categoria: CATEGORIAS_GASTO_PERSONAL[0],
    descripcion: '',
    moneda: 'USD',
    montoOriginal: '',
    tasaCambio: tasaGlobal.toString(),
    metodoPago: METODOS_PAGO[0],
  });
  const [guardando, setGuardando] = useState(false);

  const categorias = form.tipoGasto === 'PERSONAL' ? CATEGORIAS_GASTO_PERSONAL : CATEGORIAS_GASTO_NEGOCIO;
  const montoNum = parsearMonto(form.montoOriginal);
  const tasaNum = parsearMonto(form.tasaCambio);
  const montoUSD = calcularMontoUSD(montoNum, form.moneda, tasaNum);
  const alertaTasa = form.moneda === 'BS' && detectarAlertaTasa(tasaNum, tasaGlobal);

  const reset = () => setForm({
    tipoGasto: 'PERSONAL',
    categoria: CATEGORIAS_GASTO_PERSONAL[0],
    descripcion: '',
    moneda: 'USD',
    montoOriginal: '',
    tasaCambio: tasaGlobal.toString(),
    metodoPago: METODOS_PAGO[0],
  });

  const handleGuardar = async () => {
    if (montoNum <= 0) { Alert.alert('Error', 'Monto inválido.'); return; }
    setGuardando(true);
    const ok = await onGuardar({
      tipo_gasto: form.tipoGasto,
      categoria: form.categoria,
      descripcion: form.descripcion || undefined,
      moneda_original: form.moneda,
      monto_original: montoNum,
      tasa_cambio: form.moneda === 'BS' ? tasaNum : 1.0,
      monto_usd: montoUSD,
      fecha: hoyDB(),
      metodo_pago: form.metodoPago || undefined,
    });
    setGuardando(false);
    if (ok) { reset(); onCerrar(); }
    else Alert.alert('Error', 'No se pudo registrar el gasto.');
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={mGS.c} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={mGS.header}>
            <Text style={mGS.titulo}>Nuevo Gasto</Text>
            <TouchableOpacity onPress={onCerrar} style={mGS.closeBtn}>
              <Ionicons name="close" size={22} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Tipo de gasto */}
          <Text style={mGS.label}>Tipo</Text>
          <View style={mGS.seg}>
            {(['PERSONAL', 'NEGOCIO_PRODUCCION'] as TipoGasto[]).map(t => (
              <TouchableOpacity
                key={t}
                style={[mGS.segItem, form.tipoGasto === t && mGS.segActivo]}
                onPress={() => setForm(f => ({
                  ...f,
                  tipoGasto: t,
                  categoria: t === 'PERSONAL' ? CATEGORIAS_GASTO_PERSONAL[0] : CATEGORIAS_GASTO_NEGOCIO[0],
                }))}
              >
                <Text style={[mGS.segTxt, form.tipoGasto === t && { color: '#fff' }]}>
                  {t === 'PERSONAL' ? '🏠 Personal' : '🏭 Negocio'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Categoría */}
          <Text style={mGS.label}>Categoría</Text>
          <SelectorCategorias
            opciones={categorias}
            seleccionado={form.categoria}
            onSeleccionar={c => setForm(f => ({ ...f, categoria: c }))}
          />

          {/* Moneda */}
          <Text style={mGS.label}>Moneda</Text>
          <View style={mGS.seg}>
            {(['USD', 'BS'] as Moneda[]).map(m => (
              <TouchableOpacity
                key={m}
                style={[mGS.segItem, form.moneda === m && mGS.segActivo]}
                onPress={() => setForm(f => ({ ...f, moneda: m }))}
              >
                <Text style={[mGS.segTxt, form.moneda === m && { color: '#fff' }]}>
                  {m === 'USD' ? '🇺🇸 USD' : '🇻🇪 BS'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Monto */}
          <Text style={mGS.label}>Monto</Text>
          <TextInput
            style={mGS.input}
            placeholder="0.00"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="decimal-pad"
            value={form.montoOriginal}
            onChangeText={v => setForm(f => ({ ...f, montoOriginal: v }))}
          />

          {/* Tasa BS */}
          {form.moneda === 'BS' && (
            <>
              <Text style={mGS.label}>
                Tasa Bs/USD{alertaTasa ? <Text style={{ color: COLORS.warning }}> ⚠️ &gt;2% diferencia</Text> : null}
              </Text>
              <TextInput
                style={[mGS.input, alertaTasa && { borderColor: COLORS.warning }]}
                placeholder={tasaGlobal.toString()}
                placeholderTextColor={COLORS.textMuted}
                keyboardType="decimal-pad"
                value={form.tasaCambio}
                onChangeText={v => setForm(f => ({ ...f, tasaCambio: v }))}
              />
              <View style={mGS.preview}>
                <Text style={mGS.previewTxt}>≈ {formatUSD(montoUSD)}</Text>
              </View>
            </>
          )}

          {/* Método de pago */}
          <Text style={mGS.label}>Método de pago</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SPACING.sm }}>
            <View style={{ flexDirection: 'row', gap: SPACING.xs, paddingVertical: 4 }}>
              {METODOS_PAGO.map(m => (
                <TouchableOpacity
                  key={m}
                  style={[catS.chip, form.metodoPago === m && catS.chipActivo]}
                  onPress={() => setForm(f => ({ ...f, metodoPago: m }))}
                >
                  <Text style={[catS.chipTxt, form.metodoPago === m && { color: '#fff' }]}>{m}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Descripción */}
          <Text style={mGS.label}>Descripción (opcional)</Text>
          <TextInput
            style={[mGS.input, { minHeight: 60, textAlignVertical: 'top' }]}
            placeholder="Detalle adicional..."
            placeholderTextColor={COLORS.textMuted}
            multiline
            value={form.descripcion}
            onChangeText={v => setForm(f => ({ ...f, descripcion: v }))}
          />

          {/* Botón */}
          <TouchableOpacity
            style={[mGS.btn, { backgroundColor: COLORS.expense }, guardando && { opacity: 0.6 }]}
            onPress={handleGuardar}
            disabled={guardando}
          >
            {guardando
              ? <ActivityIndicator color="#fff" size="small" />
              : <><Ionicons name="remove-circle" size={18} color="#fff" /><Text style={mGS.btnTxt}>Registrar Gasto</Text></>
            }
          </TouchableOpacity>
          <View style={{ height: 60 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const mGS = StyleSheet.create({
  c: { flex: 1, backgroundColor: COLORS.modalBg, padding: SPACING.base, paddingTop: SPACING['2xl'] },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.base },
  titulo: { fontSize: TYPOGRAPHY.xl, fontWeight: '800', color: COLORS.textPrimary },
  closeBtn: { padding: SPACING.xs, backgroundColor: COLORS.surface, borderRadius: RADIUS.sm },
  label: { fontSize: TYPOGRAPHY.sm, fontWeight: '700', color: COLORS.textSecondary, marginBottom: SPACING.xs, marginTop: SPACING.md },
  seg: { flexDirection: 'row', backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: 4, gap: 4, borderWidth: 1, borderColor: COLORS.border },
  segItem: { flex: 1, paddingVertical: SPACING.sm, alignItems: 'center', borderRadius: RADIUS.sm - 2 },
  segActivo: { backgroundColor: COLORS.accent },
  segTxt: { fontSize: TYPOGRAPHY.sm, fontWeight: '600', color: COLORS.textMuted },
  input: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: SPACING.md, color: COLORS.textPrimary, fontSize: TYPOGRAPHY.base },
  preview: { backgroundColor: COLORS.incomeDim, borderRadius: RADIUS.sm, padding: SPACING.sm, marginTop: SPACING.xs },
  previewTxt: { fontSize: TYPOGRAPHY.base, fontWeight: '700', color: COLORS.income },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, borderRadius: RADIUS.md, padding: SPACING.base, marginTop: SPACING.xl },
  btnTxt: { fontSize: TYPOGRAPHY.base, fontWeight: '800', color: '#fff' },
});

// ============================================================
// MODAL: NUEVO INGRESO
// ============================================================
interface FormIngreso {
  categoria: string;
  descripcion: string;
  moneda: Moneda;
  montoOriginal: string;
  tasaCambio: string;
  metodoPago: string;
}

function ModalNuevoIngreso({
  visible, tasaGlobal, onCerrar, onGuardar,
}: {
  visible: boolean;
  tasaGlobal: number;
  onCerrar: () => void;
  onGuardar: (datos: IngresoInput) => Promise<boolean>;
}) {
  const [form, setForm] = useState<FormIngreso>({
    categoria: CATEGORIAS_INGRESO[0],
    descripcion: '',
    moneda: 'USD',
    montoOriginal: '',
    tasaCambio: tasaGlobal.toString(),
    metodoPago: METODOS_PAGO[0],
  });
  const [guardando, setGuardando] = useState(false);

  const montoNum = parsearMonto(form.montoOriginal);
  const tasaNum = parsearMonto(form.tasaCambio);
  const montoUSD = calcularMontoUSD(montoNum, form.moneda, tasaNum);
  const alertaTasa = form.moneda === 'BS' && detectarAlertaTasa(tasaNum, tasaGlobal);

  const reset = () => setForm({
    categoria: CATEGORIAS_INGRESO[0],
    descripcion: '',
    moneda: 'USD',
    montoOriginal: '',
    tasaCambio: tasaGlobal.toString(),
    metodoPago: METODOS_PAGO[0],
  });

  const handleGuardar = async () => {
    if (montoNum <= 0) { Alert.alert('Error', 'Monto inválido.'); return; }
    setGuardando(true);
    const ok = await onGuardar({
      categoria: form.categoria,
      descripcion: form.descripcion || undefined,
      moneda_original: form.moneda,
      monto_original: montoNum,
      tasa_cambio: form.moneda === 'BS' ? tasaNum : 1.0,
      monto_usd: montoUSD,
      fecha: hoyDB(),
      metodo_pago: form.metodoPago || undefined,
    });
    setGuardando(false);
    if (ok) { reset(); onCerrar(); }
    else Alert.alert('Error', 'No se pudo registrar el ingreso.');
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={mGS.c} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={mGS.header}>
            <Text style={mGS.titulo}>Nuevo Ingreso</Text>
            <TouchableOpacity onPress={onCerrar} style={mGS.closeBtn}>
              <Ionicons name="close" size={22} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>

          <Text style={mGS.label}>Categoría</Text>
          <SelectorCategorias
            opciones={CATEGORIAS_INGRESO}
            seleccionado={form.categoria}
            onSeleccionar={c => setForm(f => ({ ...f, categoria: c }))}
          />

          <Text style={mGS.label}>Moneda</Text>
          <View style={mGS.seg}>
            {(['USD', 'BS'] as Moneda[]).map(m => (
              <TouchableOpacity
                key={m}
                style={[mGS.segItem, form.moneda === m && mGS.segActivo]}
                onPress={() => setForm(f => ({ ...f, moneda: m }))}
              >
                <Text style={[mGS.segTxt, form.moneda === m && { color: '#fff' }]}>
                  {m === 'USD' ? '🇺🇸 USD' : '🇻🇪 BS'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={mGS.label}>Monto</Text>
          <TextInput
            style={mGS.input}
            placeholder="0.00"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="decimal-pad"
            value={form.montoOriginal}
            onChangeText={v => setForm(f => ({ ...f, montoOriginal: v }))}
          />

          {form.moneda === 'BS' && (
            <>
              <Text style={mGS.label}>
                Tasa Bs/USD{alertaTasa ? <Text style={{ color: COLORS.warning }}> ⚠️ &gt;2% diferencia</Text> : null}
              </Text>
              <TextInput
                style={[mGS.input, alertaTasa && { borderColor: COLORS.warning }]}
                placeholder={tasaGlobal.toString()}
                placeholderTextColor={COLORS.textMuted}
                keyboardType="decimal-pad"
                value={form.tasaCambio}
                onChangeText={v => setForm(f => ({ ...f, tasaCambio: v }))}
              />
              <View style={mGS.preview}>
                <Text style={mGS.previewTxt}>≈ {formatUSD(montoUSD)}</Text>
              </View>
            </>
          )}

          <Text style={mGS.label}>Método de pago</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SPACING.sm }}>
            <View style={{ flexDirection: 'row', gap: SPACING.xs, paddingVertical: 4 }}>
              {METODOS_PAGO.map(m => (
                <TouchableOpacity
                  key={m}
                  style={[catS.chip, form.metodoPago === m && catS.chipActivo]}
                  onPress={() => setForm(f => ({ ...f, metodoPago: m }))}
                >
                  <Text style={[catS.chipTxt, form.metodoPago === m && { color: '#fff' }]}>{m}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <Text style={mGS.label}>Descripción (opcional)</Text>
          <TextInput
            style={[mGS.input, { minHeight: 60, textAlignVertical: 'top' }]}
            placeholder="Detalle adicional..."
            placeholderTextColor={COLORS.textMuted}
            multiline
            value={form.descripcion}
            onChangeText={v => setForm(f => ({ ...f, descripcion: v }))}
          />

          <TouchableOpacity
            style={[mGS.btn, { backgroundColor: COLORS.income }, guardando && { opacity: 0.6 }]}
            onPress={handleGuardar}
            disabled={guardando}
          >
            {guardando
              ? <ActivityIndicator color="#fff" size="small" />
              : <><Ionicons name="add-circle" size={18} color="#fff" /><Text style={mGS.btnTxt}>Registrar Ingreso</Text></>
            }
          </TouchableOpacity>
          <View style={{ height: 60 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ============================================================
// PANTALLA PRINCIPAL — FLUJO DE CAJA
// ============================================================
export default function FlujoScreen() {
  const insets = useSafeAreaInsets();
  const {
    movimientos, totalIngresos, totalGastos,
    totalGastosPersonales, totalGastosNegocio, balance,
    resumenCategorias, filtroMes, filtroTipoGasto,
    tasaGlobal, cargando, error,
    setFiltroTipoGasto, mesSiguiente, mesAnterior, esHoy,
    agregarGasto, agregarIngreso, eliminarGasto, eliminarIngreso, refrescar,
  } = useFlujo();

  const [tabActiva, setTabActiva] = useState<TabFlujo>('TODOS');
  const [modalTipo, setModalTipo] = useState<ModalTipo>(null);

  const movimientosFiltrados = movimientos.filter(m => {
    if (tabActiva === 'INGRESOS') return m._tipo === 'ingreso';
    if (tabActiva === 'GASTOS') return m._tipo === 'gasto';
    return true;
  });

  const handleEliminar = useCallback((id: number, tipo: 'gasto' | 'ingreso') => {
    Alert.alert(
      'Eliminar registro',
      '¿Eliminar este movimiento? Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => tipo === 'gasto' ? eliminarGasto(id) : eliminarIngreso(id),
        },
      ],
    );
  }, [eliminarGasto, eliminarIngreso]);

  const esPositivo = balance >= 0;

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.titulo}>Flujo de Caja</Text>
        {/* Selector de mes */}
        <View style={s.mesSelector}>
          <TouchableOpacity onPress={mesAnterior} style={s.mesBtn}>
            <Ionicons name="chevron-back" size={18} color={COLORS.textSecondary} />
          </TouchableOpacity>
          <Text style={s.mesTxt}>
            {MESES[filtroMes.mes - 1]} {filtroMes.anio}
          </Text>
          <TouchableOpacity onPress={mesSiguiente} style={s.mesBtn} disabled={esHoy}>
            <Ionicons name="chevron-forward" size={18} color={esHoy ? COLORS.textMuted : COLORS.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={cargando} onRefresh={refrescar} tintColor={COLORS.accent} colors={[COLORS.accent]} progressBackgroundColor={COLORS.surface} />
        }
      >
        {/* Resumen del mes */}
        <View style={s.resumen}>
          <View style={s.resumenItem}>
            <Ionicons name="arrow-up-circle" size={16} color={COLORS.income} />
            <Text style={s.resumenLabel}>Ingresos</Text>
            <Text style={[s.resumenVal, { color: COLORS.income }]}>{formatUSD(totalIngresos)}</Text>
          </View>
          <View style={s.resumenDiv} />
          <View style={s.resumenItem}>
            <Ionicons name="arrow-down-circle" size={16} color={COLORS.expense} />
            <Text style={s.resumenLabel}>Gastos</Text>
            <Text style={[s.resumenVal, { color: COLORS.expense }]}>{formatUSD(totalGastos)}</Text>
          </View>
          <View style={s.resumenDiv} />
          <View style={s.resumenItem}>
            <Ionicons name={esPositivo ? 'trending-up' : 'trending-down'} size={16} color={esPositivo ? COLORS.income : COLORS.expense} />
            <Text style={s.resumenLabel}>Balance</Text>
            <Text style={[s.resumenVal, { color: esPositivo ? COLORS.income : COLORS.expense }]}>
              {esPositivo ? '+' : ''}{formatUSD(balance)}
            </Text>
          </View>
        </View>

        {/* Desglose Personal vs Negocio */}
        {(totalGastosPersonales > 0 || totalGastosNegocio > 0) && (
          <View style={s.desglose}>
            <View style={s.desgloseItem}>
              <View style={[s.desglosePunto, { backgroundColor: COLORS.expense }]} />
              <Text style={s.desgloseLabel}>Personal</Text>
              <Text style={[s.desgloseVal, { color: COLORS.expense }]}>{formatUSD(totalGastosPersonales)}</Text>
            </View>
            <View style={s.desgloseItem}>
              <View style={[s.desglosePunto, { backgroundColor: COLORS.warning }]} />
              <Text style={s.desgloseLabel}>Negocio / Producción</Text>
              <Text style={[s.desgloseVal, { color: COLORS.warning }]}>{formatUSD(totalGastosNegocio)}</Text>
            </View>
          </View>
        )}

        {/* Barras de categorías */}
        {resumenCategorias.length > 0 && (
          <View style={{ paddingHorizontal: SPACING.base }}>
            <BarrasCategorias categorias={resumenCategorias} total={totalGastos} />
          </View>
        )}

        {/* Tabs filtro */}
        <View style={s.tabs}>
          {([['TODOS', 'reorder-four', 'Todos'], ['INGRESOS', 'add-circle', 'Ingresos'], ['GASTOS', 'remove-circle', 'Gastos']] as const).map(
            ([tab, icon, label]) => (
              <TouchableOpacity
                key={tab}
                style={[s.tab, tabActiva === tab && s.tabActivo]}
                onPress={() => setTabActiva(tab)}
              >
                <Ionicons
                  name={icon}
                  size={14}
                  color={tabActiva === tab ? COLORS.accent : COLORS.textMuted}
                />
                <Text style={[s.tabTxt, tabActiva === tab && { color: COLORS.accent }]}>{label}</Text>
              </TouchableOpacity>
            )
          )}
        </View>

        {/* Lista de movimientos */}
        <View style={s.lista}>
          {movimientosFiltrados.length === 0 && !cargando ? (
            <View style={s.vacio}>
              <Ionicons name="receipt-outline" size={40} color={COLORS.textMuted} />
              <Text style={s.vacioTxt}>Sin movimientos en este período</Text>
            </View>
          ) : (
            movimientosFiltrados.map(item => (
              <ItemMovimiento
                key={`${item._tipo}-${item.id}`}
                item={item}
                onEliminar={handleEliminar}
              />
            ))
          )}
          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* FABs flotantes */}
      <View style={[s.fabsRow, { bottom: 16 + insets.bottom }]}>
        <TouchableOpacity
          style={[s.fab, { backgroundColor: COLORS.expense }]}
          onPress={() => setModalTipo('GASTO')}
        >
          <Ionicons name="remove" size={20} color="#fff" />
          <Text style={s.fabTxt}>Gasto</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.fab, { backgroundColor: COLORS.income }]}
          onPress={() => setModalTipo('INGRESO')}
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={s.fabTxt}>Ingreso</Text>
        </TouchableOpacity>
      </View>

      {/* Modales */}
      <ModalNuevoGasto
        visible={modalTipo === 'GASTO'}
        tasaGlobal={tasaGlobal}
        onCerrar={() => setModalTipo(null)}
        onGuardar={agregarGasto}
      />
      <ModalNuevoIngreso
        visible={modalTipo === 'INGRESO'}
        tasaGlobal={tasaGlobal}
        onCerrar={() => setModalTipo(null)}
        onGuardar={agregarIngreso}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: SPACING.base, paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: SPACING.sm },
  titulo: { fontSize: TYPOGRAPHY['2xl'], fontWeight: '800', color: COLORS.textPrimary },
  mesSelector: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, alignSelf: 'flex-start' },
  mesBtn: { padding: SPACING.xs, backgroundColor: COLORS.surface, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.border },
  mesTxt: { fontSize: TYPOGRAPHY.base, fontWeight: '700', color: COLORS.textPrimary, minWidth: 130, textAlign: 'center' },
  resumen: { flexDirection: 'row', backgroundColor: COLORS.surface, margin: SPACING.base, borderRadius: RADIUS.lg, padding: SPACING.base, borderWidth: 1, borderColor: COLORS.border },
  resumenItem: { flex: 1, alignItems: 'center', gap: 3 },
  resumenLabel: { fontSize: TYPOGRAPHY.xs, color: COLORS.textMuted },
  resumenVal: { fontSize: TYPOGRAPHY.sm, fontWeight: '800' },
  resumenDiv: { width: 1, backgroundColor: COLORS.border, marginVertical: 4 },
  desglose: { flexDirection: 'row', gap: SPACING.sm, paddingHorizontal: SPACING.base, marginBottom: SPACING.sm },
  desgloseItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, backgroundColor: COLORS.surface, borderRadius: RADIUS.sm, padding: SPACING.sm, borderWidth: 1, borderColor: COLORS.border },
  desglosePunto: { width: 8, height: 8, borderRadius: 4 },
  desgloseLabel: { flex: 1, fontSize: TYPOGRAPHY.xs, color: COLORS.textSecondary },
  desgloseVal: { fontSize: TYPOGRAPHY.xs, fontWeight: '700' },
  tabs: { flexDirection: 'row', marginHorizontal: SPACING.base, backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: 4, gap: 4, borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.sm },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: SPACING.sm, borderRadius: RADIUS.sm - 2 },
  tabActivo: { backgroundColor: COLORS.accentDim },
  tabTxt: { fontSize: TYPOGRAPHY.xs, fontWeight: '600', color: COLORS.textMuted },
  lista: { paddingHorizontal: SPACING.base },
  vacio: { alignItems: 'center', paddingTop: SPACING['3xl'], gap: SPACING.sm },
  vacioTxt: { fontSize: TYPOGRAPHY.base, color: COLORS.textMuted },
  fabsRow: { position: 'absolute', left: SPACING.base, right: SPACING.base, flexDirection: 'row', gap: SPACING.sm },
  fab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, paddingVertical: SPACING.md, borderRadius: RADIUS.lg, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  fabTxt: { fontSize: TYPOGRAPHY.base, fontWeight: '800', color: '#fff' },
});
