// ============================================================
// HERRAMIENTAS.TSX — Simulador + OCR
// App Financiera Personal
// ============================================================

import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, Alert, ActivityIndicator, TextInput, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useDeudas } from '../../src/hooks/useDeudas';
import { formatUSD, formatFecha, hoyDB } from '../../src/utils/currency';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../../src/constants';
import type { DeudaConPersona, EstrategiaDeuda, ResultadoSimulacion, PasoSimulacion } from '../../src/types';

// ============================================================
// LÓGICA DEL SIMULADOR
// ============================================================
function simularDesendeudamiento(
  deudas: DeudaConPersona[],
  presupuestoMensual: number,
  estrategia: EstrategiaDeuda,
): ResultadoSimulacion {
  // Ordenar según estrategia
  const ordenadas = [...deudas]
    .filter(d => d.saldo_capital_pendiente_usd > 0)
    .sort((a, b) =>
      estrategia === 'BOLA_DE_NIEVE'
        ? a.saldo_capital_pendiente_usd - b.saldo_capital_pendiente_usd
        : b.monto_interes_fijo_usd - a.monto_interes_fijo_usd,
    );

  if (ordenadas.length === 0 || presupuestoMensual <= 0) {
    return { estrategia, meses_totales: 0, total_pagado_usd: 0, total_intereses_usd: 0, pasos: [] };
  }

  // Estado mutable de cada deuda
  const estado = ordenadas.map(d => ({
    id: d.id,
    nombre: d.persona_nombre,
    saldo: d.saldo_capital_pendiente_usd,
    interesMensual: d.monto_interes_fijo_usd,
    pagadaEnMes: 0,
  }));

  const pasos: PasoSimulacion[] = [];
  let mes = 0;
  let totalPagado = 0;
  let totalIntereses = 0;

  while (estado.some(d => d.saldo > 0) && mes < 120) {
    mes++;
    let presupuestoRestante = presupuestoMensual;

    // Primero pagar intereses de todas las deudas pendientes
    for (const d of estado) {
      if (d.saldo <= 0) continue;
      const interes = d.interesMensual;
      if (interes > 0 && presupuestoRestante > 0) {
        const pagoInteres = Math.min(interes, presupuestoRestante);
        presupuestoRestante -= pagoInteres;
        totalIntereses += pagoInteres;
        totalPagado += pagoInteres;
      }
    }

    // Luego abonar a capital según estrategia (foco en la primera deuda no pagada)
    for (const d of estado) {
      if (d.saldo <= 0 || presupuestoRestante <= 0) continue;
      const pagoCapital = Math.min(d.saldo, presupuestoRestante);
      d.saldo = Math.max(0, d.saldo - pagoCapital);
      presupuestoRestante -= pagoCapital;
      totalPagado += pagoCapital;

      if (d.saldo <= 0.01 && d.pagadaEnMes === 0) {
        d.pagadaEnMes = mes;
      }

      pasos.push({
        mes,
        deuda_id: d.id,
        deuda_descripcion: d.nombre,
        pago_mes: pagoCapital,
        saldo_restante: d.saldo,
        pagada_en_mes: d.saldo <= 0.01,
      });

      // En Bola de Nieve / Avalanche, foco en una sola deuda a la vez
      break;
    }
  }

  return {
    estrategia,
    meses_totales: mes,
    total_pagado_usd: totalPagado,
    total_intereses_usd: totalIntereses,
    pasos,
  };
}

// ============================================================
// COMPONENTE: Fila del plan de pagos por mes
// ============================================================
function FilaPlan({ paso, esNueva }: { paso: PasoSimulacion; esNueva: boolean }) {
  return (
    <View style={[planS.row, esNueva && planS.rowNueva]}>
      <View style={[planS.mesBadge, esNueva && { backgroundColor: COLORS.accentDim }]}>
        <Text style={[planS.mesTxt, esNueva && { color: COLORS.accent }]}>M{paso.mes}</Text>
      </View>
      <Text style={planS.nombre} numberOfLines={1}>{paso.deuda_descripcion}</Text>
      <Text style={planS.pago}>{formatUSD(paso.pago_mes)}</Text>
      <Text style={[planS.saldo, { color: paso.pagada_en_mes ? COLORS.income : COLORS.textSecondary }]}>
        {paso.pagada_en_mes ? '✅ Pagada' : formatUSD(paso.saldo_restante)}
      </Text>
    </View>
  );
}
const planS = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  rowNueva: { backgroundColor: COLORS.accentDim + '30' },
  mesBadge: { width: 36, height: 22, borderRadius: RADIUS.sm, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
  mesTxt: { fontSize: 10, fontWeight: '700', color: COLORS.textMuted },
  nombre: { flex: 1, fontSize: TYPOGRAPHY.xs, color: COLORS.textPrimary },
  pago: { fontSize: TYPOGRAPHY.xs, fontWeight: '700', color: COLORS.accent, width: 68, textAlign: 'right' },
  saldo: { fontSize: TYPOGRAPHY.xs, width: 68, textAlign: 'right' },
});

// ============================================================
// COMPONENTE: SIMULADOR
// ============================================================
function SimuladorDeudas({ deudas }: { deudas: DeudaConPersona[] }) {
  const [presupuesto, setPresupuesto] = useState('');
  const [estrategia, setEstrategia] = useState<EstrategiaDeuda>('BOLA_DE_NIEVE');
  const [resultado, setResultado] = useState<ResultadoSimulacion | null>(null);
  const [modalPlan, setModalPlan] = useState(false);

  const deudasPagar = deudas.filter(d => d.tipo === 'POR_PAGAR' && d.saldo_capital_pendiente_usd > 0);
  const totalDeuda = deudasPagar.reduce((s, d) => s + d.saldo_capital_pendiente_usd, 0);
  const presupuestoNum = parseFloat(presupuesto.replace(',', '.')) || 0;

  const ejecutar = useCallback(() => {
    if (presupuestoNum <= 0) { Alert.alert('Error', 'Ingresa un presupuesto mensual válido.'); return; }
    if (deudasPagar.length === 0) { Alert.alert('Info', 'No tienes deudas por pagar activas.'); return; }
    const res = simularDesendeudamiento(deudasPagar, presupuestoNum, estrategia);
    setResultado(res);
  }, [deudasPagar, presupuestoNum, estrategia]);

  const comparar = useCallback(() => {
    if (presupuestoNum <= 0) { Alert.alert('Error', 'Ingresa un presupuesto mensual válido.'); return; }
    const rBola = simularDesendeudamiento(deudasPagar, presupuestoNum, 'BOLA_DE_NIEVE');
    const rAval = simularDesendeudamiento(deudasPagar, presupuestoNum, 'AVALANCHA');
    Alert.alert(
      '📊 Comparación de Estrategias',
      `Presupuesto: ${formatUSD(presupuestoNum)}/mes\n\n` +
      `⛄ Bola de Nieve\n• Meses: ${rBola.meses_totales}\n• Total pagado: ${formatUSD(rBola.total_pagado_usd)}\n• Intereses: ${formatUSD(rBola.total_intereses_usd)}\n\n` +
      `🏔️ Avalancha\n• Meses: ${rAval.meses_totales}\n• Total pagado: ${formatUSD(rAval.total_pagado_usd)}\n• Intereses: ${formatUSD(rAval.total_intereses_usd)}\n\n` +
      `${rAval.total_intereses_usd < rBola.total_intereses_usd
        ? `✅ Avalancha ahorra ${formatUSD(rBola.total_intereses_usd - rAval.total_intereses_usd)} en intereses`
        : `✅ Resultados similares`}`,
      [{ text: 'Entendido' }],
    );
  }, [deudasPagar, presupuestoNum]);

  return (
    <View style={simS.c}>
      <View style={simS.headerRow}>
        <Ionicons name="calculator" size={20} color={COLORS.warning} />
        <Text style={simS.titulo}>Simulador de Desendeudamiento</Text>
      </View>

      <View style={simS.infoBox}>
        <Text style={simS.infoLabel}>Deuda total por pagar</Text>
        <Text style={simS.infoVal}>{formatUSD(totalDeuda)}</Text>
        <Text style={simS.infoSub}>{deudasPagar.length} deuda{deudasPagar.length !== 1 ? 's' : ''} activa{deudasPagar.length !== 1 ? 's' : ''}</Text>
      </View>

      {/* Estrategia */}
      <Text style={simS.label}>Estrategia</Text>
      <View style={simS.estrategias}>
        <TouchableOpacity
          style={[simS.estrategiaItem, estrategia === 'BOLA_DE_NIEVE' && simS.estrategiaActiva]}
          onPress={() => setEstrategia('BOLA_DE_NIEVE')}
        >
          <Text style={simS.estrategiaEmoji}>⛄</Text>
          <View style={{ flex: 1 }}>
            <Text style={[simS.estrategiaNombre, estrategia === 'BOLA_DE_NIEVE' && { color: COLORS.cobrar }]}>
              Bola de Nieve
            </Text>
            <Text style={simS.estrategiaDesc}>Menor saldo primero. Más motivación.</Text>
          </View>
          {estrategia === 'BOLA_DE_NIEVE' && <Ionicons name="checkmark-circle" size={18} color={COLORS.cobrar} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={[simS.estrategiaItem, estrategia === 'AVALANCHA' && simS.estrategiaActivaRed]}
          onPress={() => setEstrategia('AVALANCHA')}
        >
          <Text style={simS.estrategiaEmoji}>🏔️</Text>
          <View style={{ flex: 1 }}>
            <Text style={[simS.estrategiaNombre, estrategia === 'AVALANCHA' && { color: COLORS.expense }]}>
              Avalancha
            </Text>
            <Text style={simS.estrategiaDesc}>Mayor interés primero. Menos costo total.</Text>
          </View>
          {estrategia === 'AVALANCHA' && <Ionicons name="checkmark-circle" size={18} color={COLORS.expense} />}
        </TouchableOpacity>
      </View>

      {/* Presupuesto */}
      <Text style={simS.label}>Presupuesto mensual disponible (USD)</Text>
      <TextInput
        style={simS.input}
        placeholder="Ej: 300.00"
        placeholderTextColor={COLORS.textMuted}
        keyboardType="decimal-pad"
        value={presupuesto}
        onChangeText={setPresupuesto}
      />

      <View style={simS.btns}>
        <TouchableOpacity style={simS.btnSimular} onPress={ejecutar}>
          <Ionicons name="calculator" size={16} color="#fff" />
          <Text style={simS.btnTxt}>Simular</Text>
        </TouchableOpacity>
        <TouchableOpacity style={simS.btnComparar} onPress={comparar}>
          <Ionicons name="git-compare" size={16} color={COLORS.accent} />
          <Text style={simS.btnCompararTxt}>Comparar</Text>
        </TouchableOpacity>
      </View>

      {/* Resultado */}
      {resultado && (
        <View style={simS.resultado}>
          <View style={simS.resultadoHeader}>
            <Text style={simS.resultadoTitulo}>
              {resultado.estrategia === 'BOLA_DE_NIEVE' ? '⛄ Bola de Nieve' : '🏔️ Avalancha'}
            </Text>
          </View>
          <View style={simS.resultadoStats}>
            {[
              { label: 'Meses para saldar', val: `${resultado.meses_totales} meses`, color: COLORS.textPrimary },
              { label: 'Total pagado', val: formatUSD(resultado.total_pagado_usd), color: COLORS.cobrar },
              { label: 'En intereses', val: formatUSD(resultado.total_intereses_usd), color: COLORS.warning },
              { label: 'Libre de deudas en', val: resultado.meses_totales > 0 ? new Date(new Date().setMonth(new Date().getMonth() + resultado.meses_totales)).toLocaleDateString('es-VE', { month: 'long', year: 'numeric' }) : '—', color: COLORS.income },
            ].map(({ label, val, color }) => (
              <View key={label} style={simS.resultadoStat}>
                <Text style={simS.statLabel}>{label}</Text>
                <Text style={[simS.statVal, { color }]}>{val}</Text>
              </View>
            ))}
          </View>
          {resultado.pasos.length > 0 && (
            <TouchableOpacity style={simS.verPlanBtn} onPress={() => setModalPlan(true)}>
              <Ionicons name="list" size={16} color={COLORS.accent} />
              <Text style={simS.verPlanTxt}>Ver plan mes a mes</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Modal Plan */}
      {resultado && (
        <Modal visible={modalPlan} animationType="slide" presentationStyle="pageSheet">
          <View style={planModalS.c}>
            <View style={planModalS.header}>
              <Text style={planModalS.titulo}>Plan de Pagos</Text>
              <TouchableOpacity onPress={() => setModalPlan(false)} style={planModalS.closeBtn}>
                <Ionicons name="close" size={22} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>
            <View style={planModalS.colHeader}>
              <Text style={[planModalS.col, { width: 36 }]}>Mes</Text>
              <Text style={[planModalS.col, { flex: 1 }]}>Deuda</Text>
              <Text style={[planModalS.col, { width: 68, textAlign: 'right' }]}>Pago</Text>
              <Text style={[planModalS.col, { width: 68, textAlign: 'right' }]}>Saldo</Text>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {resultado.pasos.map((paso, i) => (
                <FilaPlan key={i} paso={paso} esNueva={paso.pagada_en_mes} />
              ))}
              <View style={{ height: 60 }} />
            </ScrollView>
          </View>
        </Modal>
      )}
    </View>
  );
}

const simS = StyleSheet.create({
  c: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.base, margin: SPACING.base, borderWidth: 1, borderColor: COLORS.border, gap: SPACING.md },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  titulo: { fontSize: TYPOGRAPHY.lg, fontWeight: '800', color: COLORS.textPrimary },
  infoBox: { backgroundColor: COLORS.warningDim, borderRadius: RADIUS.md, padding: SPACING.md, alignItems: 'center', gap: 3 },
  infoLabel: { fontSize: TYPOGRAPHY.xs, color: COLORS.textMuted },
  infoVal: { fontSize: TYPOGRAPHY['2xl'], fontWeight: '800', color: COLORS.warning },
  infoSub: { fontSize: TYPOGRAPHY.xs, color: COLORS.textMuted },
  label: { fontSize: TYPOGRAPHY.sm, fontWeight: '700', color: COLORS.textSecondary, marginBottom: -SPACING.xs },
  estrategias: { gap: SPACING.sm },
  estrategiaItem: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, padding: SPACING.md, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surfaceAlt },
  estrategiaActiva: { borderColor: COLORS.cobrar, backgroundColor: COLORS.cobrarDim },
  estrategiaActivaRed: { borderColor: COLORS.expense, backgroundColor: COLORS.expenseDim },
  estrategiaEmoji: { fontSize: 22 },
  estrategiaNombre: { fontSize: TYPOGRAPHY.sm, fontWeight: '700', color: COLORS.textPrimary },
  estrategiaDesc: { fontSize: TYPOGRAPHY.xs, color: COLORS.textMuted, marginTop: 2 },
  input: { backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: SPACING.md, color: COLORS.textPrimary, fontSize: TYPOGRAPHY.xl, fontWeight: '700' },
  btns: { flexDirection: 'row', gap: SPACING.sm },
  btnSimular: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, backgroundColor: COLORS.warning, borderRadius: RADIUS.md, padding: SPACING.md },
  btnTxt: { fontSize: TYPOGRAPHY.base, fontWeight: '800', color: '#fff' },
  btnComparar: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, paddingHorizontal: SPACING.md, paddingVertical: SPACING.md, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.accent },
  btnCompararTxt: { fontSize: TYPOGRAPHY.sm, fontWeight: '700', color: COLORS.accent },
  resultado: { backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.md, padding: SPACING.md, gap: SPACING.sm, borderWidth: 1, borderColor: COLORS.border },
  resultadoHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  resultadoTitulo: { fontSize: TYPOGRAPHY.base, fontWeight: '800', color: COLORS.textPrimary },
  resultadoStats: { gap: SPACING.xs },
  resultadoStat: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  statLabel: { fontSize: TYPOGRAPHY.sm, color: COLORS.textSecondary },
  statVal: { fontSize: TYPOGRAPHY.sm, fontWeight: '800' },
  verPlanBtn: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, alignSelf: 'center', paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md, backgroundColor: COLORS.accentDim, borderRadius: RADIUS.full },
  verPlanTxt: { fontSize: TYPOGRAPHY.sm, fontWeight: '700', color: COLORS.accent },
});

const planModalS = StyleSheet.create({
  c: { flex: 1, backgroundColor: COLORS.modalBg, padding: SPACING.base, paddingTop: SPACING['2xl'] },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.base },
  titulo: { fontSize: TYPOGRAPHY.xl, fontWeight: '800', color: COLORS.textPrimary },
  closeBtn: { padding: SPACING.xs, backgroundColor: COLORS.surface, borderRadius: RADIUS.sm },
  colHeader: { flexDirection: 'row', gap: SPACING.sm, paddingBottom: SPACING.sm, borderBottomWidth: 2, borderBottomColor: COLORS.border, marginBottom: SPACING.xs },
  col: { fontSize: TYPOGRAPHY.xs, fontWeight: '700', color: COLORS.textMuted },
});

// ============================================================
// COMPONENTE: LECTOR OCR
// ============================================================
function LectorOCR() {
  const [imagen, setImagen] = useState<string | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [resultado, setResultado] = useState<{
    monto_bs?: string;
    referencia?: string;
    texto: string;
  } | null>(null);

  const seleccionarImagen = async (camara: boolean) => {
    const perm = camara
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!perm.granted) {
      Alert.alert('Permiso requerido', `Se necesita acceso a ${camara ? 'la cámara' : 'la galería'}.`);
      return;
    }

    const result = camara
      ? await ImagePicker.launchCameraAsync({ quality: 0.9, base64: false })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.9, mediaTypes: ImagePicker.MediaTypeOptions.Images });

    if (!result.canceled && result.assets[0]) {
      setImagen(result.assets[0].uri);
      setResultado(null);
      await procesarOCR(result.assets[0].uri);
    }
  };

  const procesarOCR = async (uri: string) => {
    setProcesando(true);
    try {
      // Intentar usar react-native-mlkit-ocr si está disponible
      let textoCompleto = '';
      try {
        const MlkitOcr = require('@infinitered/react-native-mlkit-ocr');
        const bloques = await MlkitOcr.default.detectFromUri(uri);
        textoCompleto = bloques.map((b: any) => b.text).join('\n');
      } catch {
        // MLKit no disponible — usar regex sobre texto simulado o mostrar mensaje
        textoCompleto = '[OCR no disponible — instala @infinitered/react-native-mlkit-ocr]';
      }

      // Extracción con regex para Pago Móvil venezolano / Binance
      const regexMontoBs = /(?:bs\.?|bolivares?|monto|amount)[^\d]*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)/i;
      const regexMonto2 = /(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})\s*(?:bs|bolivares)/i;
      const regexRef = /(?:ref(?:erencia)?|n[°úu]mero?|#)\s*[:\-]?\s*([A-Z0-9]{6,20})/i;
      const regexRef2 = /(\d{8,20})/g;

      let montoBs: string | undefined;
      const matchMonto = textoCompleto.match(regexMontoBs) || textoCompleto.match(regexMonto2);
      if (matchMonto) montoBs = matchMonto[1];

      let referencia: string | undefined;
      const matchRef = textoCompleto.match(regexRef);
      if (matchRef) {
        referencia = matchRef[1];
      } else {
        const nums = textoCompleto.match(regexRef2);
        if (nums) referencia = nums[nums.length - 1];
      }

      setResultado({ monto_bs: montoBs, referencia, texto: textoCompleto });
    } catch (e) {
      console.error('[OCR]', e);
      Alert.alert('Error', 'No se pudo procesar la imagen.');
    } finally {
      setProcesando(false);
    }
  };

  return (
    <View style={ocrS.c}>
      <View style={ocrS.headerRow}>
        <Ionicons name="scan" size={20} color={COLORS.cobrar} />
        <Text style={ocrS.titulo}>Lector de Capturas OCR</Text>
      </View>
      <Text style={ocrS.desc}>
        Escanea un captura de Pago Móvil o Binance para extraer el monto en Bs. y la referencia automáticamente.
      </Text>

      {/* Botones de captura */}
      <View style={ocrS.btns}>
        <TouchableOpacity style={ocrS.btn} onPress={() => seleccionarImagen(true)}>
          <Ionicons name="camera" size={20} color="#fff" />
          <Text style={ocrS.btnTxt}>Cámara</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[ocrS.btn, { backgroundColor: COLORS.cobrar }]} onPress={() => seleccionarImagen(false)}>
          <Ionicons name="image" size={20} color="#fff" />
          <Text style={ocrS.btnTxt}>Galería</Text>
        </TouchableOpacity>
      </View>

      {/* Preview imagen */}
      {imagen && (
        <View style={ocrS.preview}>
          <Image source={{ uri: imagen }} style={ocrS.img} resizeMode="contain" />
        </View>
      )}

      {/* Procesando */}
      {procesando && (
        <View style={ocrS.procesandoBox}>
          <ActivityIndicator color={COLORS.accent} size="small" />
          <Text style={ocrS.procesandoTxt}>Analizando imagen...</Text>
        </View>
      )}

      {/* Resultado */}
      {resultado && !procesando && (
        <View style={ocrS.resultado}>
          <Text style={ocrS.resultadoTitulo}>Datos Extraídos</Text>

          <View style={ocrS.campo}>
            <Ionicons name="cash" size={14} color={COLORS.income} />
            <Text style={ocrS.campoLabel}>Monto en Bs.:</Text>
            <Text style={[ocrS.campoVal, { color: COLORS.income }]}>
              {resultado.monto_bs ? `Bs. ${resultado.monto_bs}` : 'No detectado'}
            </Text>
          </View>

          <View style={ocrS.campo}>
            <Ionicons name="barcode" size={14} color={COLORS.accent} />
            <Text style={ocrS.campoLabel}>Referencia:</Text>
            <Text style={[ocrS.campoVal, { color: COLORS.accent }]}>
              {resultado.referencia ?? 'No detectada'}
            </Text>
          </View>

          {resultado.texto.length > 0 && (
            <View style={ocrS.textoCompleto}>
              <Text style={ocrS.textoCompletoLabel}>Texto completo detectado:</Text>
              <Text style={ocrS.textoCompletoVal} numberOfLines={6} ellipsizeMode="tail">
                {resultado.texto}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={ocrS.copiarBtn}
            onPress={() => {
              if (resultado.referencia) {
                Alert.alert('Referencia', resultado.referencia, [{ text: 'OK' }]);
              }
            }}
          >
            <Ionicons name="copy" size={14} color={COLORS.accent} />
            <Text style={ocrS.copiarTxt}>Ver referencia completa</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const ocrS = StyleSheet.create({
  c: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.base, margin: SPACING.base, marginTop: 0, borderWidth: 1, borderColor: COLORS.border, gap: SPACING.md },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  titulo: { fontSize: TYPOGRAPHY.lg, fontWeight: '800', color: COLORS.textPrimary },
  desc: { fontSize: TYPOGRAPHY.sm, color: COLORS.textSecondary, lineHeight: 20 },
  btns: { flexDirection: 'row', gap: SPACING.sm },
  btn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, backgroundColor: COLORS.info, borderRadius: RADIUS.md, padding: SPACING.md },
  btnTxt: { fontSize: TYPOGRAPHY.sm, fontWeight: '700', color: '#fff' },
  preview: { borderRadius: RADIUS.md, overflow: 'hidden', backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border },
  img: { width: '100%', height: 200 },
  procesandoBox: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, justifyContent: 'center', padding: SPACING.md },
  procesandoTxt: { fontSize: TYPOGRAPHY.sm, color: COLORS.textSecondary },
  resultado: { backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.md, padding: SPACING.md, gap: SPACING.sm, borderWidth: 1, borderColor: COLORS.border },
  resultadoTitulo: { fontSize: TYPOGRAPHY.base, fontWeight: '800', color: COLORS.textPrimary, marginBottom: SPACING.xs },
  campo: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  campoLabel: { fontSize: TYPOGRAPHY.sm, color: COLORS.textSecondary },
  campoVal: { fontSize: TYPOGRAPHY.sm, fontWeight: '700', flex: 1 },
  textoCompleto: { backgroundColor: COLORS.background, borderRadius: RADIUS.sm, padding: SPACING.sm, gap: 4, borderWidth: 1, borderColor: COLORS.border },
  textoCompletoLabel: { fontSize: TYPOGRAPHY.xs, color: COLORS.textMuted },
  textoCompletoVal: { fontSize: TYPOGRAPHY.xs, color: COLORS.textSecondary, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  copiarBtn: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: SPACING.sm, backgroundColor: COLORS.accentDim, borderRadius: RADIUS.full },
  copiarTxt: { fontSize: TYPOGRAPHY.xs, fontWeight: '700', color: COLORS.accent },
});

// ============================================================
// PANTALLA PRINCIPAL
// ============================================================
export default function HerramientasScreen() {
  const insets = useSafeAreaInsets();
  const { porPagar, cargando } = useDeudas();

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <Text style={s.titulo}>Herramientas</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {cargando
          ? <ActivityIndicator color={COLORS.accent} style={{ marginTop: SPACING['2xl'] }} />
          : <SimuladorDeudas deudas={porPagar} />
        }
        <LectorOCR />
        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: SPACING.base, paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  titulo: { fontSize: TYPOGRAPHY['2xl'], fontWeight: '800', color: COLORS.textPrimary },
});

// Fix Platform import
import { Platform } from 'react-native';
