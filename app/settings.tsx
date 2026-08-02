// ============================================================
// SETTINGS.TSX — Configuración
// App Financiera Personal
// ============================================================

import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, Switch, ActivityIndicator,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSQLiteContext } from 'expo-sqlite';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as LocalAuthentication from 'expo-local-authentication';

import { getAjustes, updateAjustes, exportarDatosJSON, importarDatosJSON } from '../src/db/database';
import { formatUSD, parsearMonto } from '../src/utils/currency';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, DEFAULT_TASA_BS_USD } from '../src/constants';
import type { Ajustes } from '../src/types';

// ============================================================
// COMPONENTE: Fila de ajuste con Switch
// ============================================================
function FilaSwitch({
  icono, label, descripcion, valor, color, onChange,
}: {
  icono: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  descripcion?: string;
  valor: boolean;
  color?: string;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={filaS.row}>
      <View style={[filaS.icono, { backgroundColor: (color ?? COLORS.accent) + '20' }]}>
        <Ionicons name={icono} size={18} color={color ?? COLORS.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={filaS.label}>{label}</Text>
        {descripcion ? <Text style={filaS.desc}>{descripcion}</Text> : null}
      </View>
      <Switch
        value={valor}
        onValueChange={onChange}
        trackColor={{ false: COLORS.border, true: (color ?? COLORS.accent) + '80' }}
        thumbColor={valor ? (color ?? COLORS.accent) : COLORS.textMuted}
        ios_backgroundColor={COLORS.border}
      />
    </View>
  );
}

// ============================================================
// COMPONENTE: Fila de acción con botón
// ============================================================
function FilaAccion({
  icono, label, descripcion, color, onPress, loading, sublabel,
}: {
  icono: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  descripcion?: string;
  color?: string;
  onPress: () => void;
  loading?: boolean;
  sublabel?: string;
}) {
  return (
    <TouchableOpacity style={filaS.row} onPress={onPress} activeOpacity={0.7}>
      <View style={[filaS.icono, { backgroundColor: (color ?? COLORS.accent) + '20' }]}>
        {loading
          ? <ActivityIndicator size="small" color={color ?? COLORS.accent} />
          : <Ionicons name={icono} size={18} color={color ?? COLORS.accent} />
        }
      </View>
      <View style={{ flex: 1 }}>
        <Text style={filaS.label}>{label}</Text>
        {descripcion ? <Text style={filaS.desc}>{descripcion}</Text> : null}
      </View>
      {sublabel
        ? <Text style={[filaS.sublabel, { color: color ?? COLORS.accent }]}>{sublabel}</Text>
        : <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
      }
    </TouchableOpacity>
  );
}

const filaS = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, padding: SPACING.md, backgroundColor: COLORS.surface, borderRadius: RADIUS.md, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.border },
  icono: { width: 40, height: 40, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: TYPOGRAPHY.base, fontWeight: '600', color: COLORS.textPrimary },
  desc: { fontSize: TYPOGRAPHY.xs, color: COLORS.textMuted, marginTop: 2, lineHeight: 16 },
  sublabel: { fontSize: TYPOGRAPHY.sm, fontWeight: '700' },
});

// ============================================================
// COMPONENTE: Sección con título
// ============================================================
function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <View style={secS.c}>
      <Text style={secS.titulo}>{titulo}</Text>
      {children}
    </View>
  );
}
const secS = StyleSheet.create({
  c: { marginBottom: SPACING.lg },
  titulo: { fontSize: TYPOGRAPHY.xs, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 1.5, marginBottom: SPACING.sm, paddingHorizontal: SPACING.xs },
});

// ============================================================
// PANTALLA PRINCIPAL
// ============================================================
export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const db = useSQLiteContext();

  const [ajustes, setAjustes] = useState<Ajustes | null>(null);
  const [tasaInput, setTasaInput] = useState('');
  const [cargando, setCargando] = useState(true);
  const [exportando, setExportando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [guardandoTasa, setGuardandoTasa] = useState(false);
  const [tieneBiometria, setTieneBiometria] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const aj = await getAjustes(db);
      setAjustes(aj);
      setTasaInput(aj.tasa_global_bs_usd.toString());

      const compatible = await LocalAuthentication.hasHardwareAsync();
      const registrado = await LocalAuthentication.isEnrolledAsync();
      setTieneBiometria(compatible && registrado);
    } catch (e) {
      console.error('[Settings]', e);
    } finally {
      setCargando(false);
    }
  }, [db]);

  useEffect(() => { cargar(); }, [cargar]);

  // ── ACTUALIZAR TASA ──
  const guardarTasa = useCallback(async () => {
    const tasa = parsearMonto(tasaInput);
    if (tasa <= 0) { Alert.alert('Error', 'Tasa inválida.'); return; }
    setGuardandoTasa(true);
    await updateAjustes(db, { tasa_global_bs_usd: tasa });
    await cargar();
    setGuardandoTasa(false);
    Alert.alert('✅ Listo', `Tasa actualizada a Bs. ${tasa.toFixed(2)}/USD`);
  }, [db, tasaInput, cargar]);

  // ── TOGGLE SWITCH ──
  const toggleSwitch = useCallback(async (campo: keyof Omit<Ajustes, 'id' | 'tasa_global_bs_usd'>, valor: boolean) => {
    if (campo === 'usar_biometria' && valor && !tieneBiometria) {
      Alert.alert('No disponible', 'Este dispositivo no tiene biometría configurada.');
      return;
    }
    await updateAjustes(db, { [campo]: valor ? 1 : 0 });
    setAjustes(prev => prev ? { ...prev, [campo]: valor ? 1 : 0 } : prev);
  }, [db, tieneBiometria]);

  // ── EXPORTAR JSON ──
  const exportarBackup = useCallback(async () => {
    setExportando(true);
    try {
      const json = await exportarDatosJSON(db);
      const fecha = new Date().toISOString().split('T')[0];
      const nombreArchivo = `finanzas_backup_${fecha}.json`;
      const rutaTemp = FileSystem.documentDirectory + nombreArchivo;

      await FileSystem.writeAsStringAsync(rutaTemp, json, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const puedeCompartir = await Sharing.isAvailableAsync();
      if (puedeCompartir) {
        await Sharing.shareAsync(rutaTemp, {
          mimeType: 'application/json',
          dialogTitle: `Backup — ${fecha}`,
          UTI: 'public.json',
        });
      } else {
        Alert.alert('Backup guardado', `Archivo: ${nombreArchivo}\nRuta: ${rutaTemp}`);
      }
    } catch (e) {
      console.error('[Backup Export]', e);
      Alert.alert('Error', 'No se pudo exportar el backup.');
    } finally {
      setExportando(false);
    }
  }, [db]);

  // ── IMPORTAR JSON ──
  const importarBackup = useCallback(async () => {
    Alert.alert(
      '⚠️ Importar Backup',
      'Esta acción BORRARÁ todos los datos actuales y los reemplazará con los del archivo. ¿Continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Importar',
          style: 'destructive',
          onPress: async () => {
            setImportando(true);
            try {
              const resultado = await DocumentPicker.getDocumentAsync({
                type: 'application/json',
                copyToCacheDirectory: true,
              });

              if (resultado.canceled || !resultado.assets?.[0]) {
                setImportando(false);
                return;
              }

              const uri = resultado.assets[0].uri;
              const contenido = await FileSystem.readAsStringAsync(uri, {
                encoding: FileSystem.EncodingType.UTF8,
              });

              const ok = await importarDatosJSON(db, contenido);
              if (ok) {
                Alert.alert('✅ Importación exitosa', 'Los datos han sido restaurados correctamente.');
                await cargar();
              } else {
                Alert.alert('Error', 'El archivo no es un backup válido.');
              }
            } catch (e) {
              console.error('[Backup Import]', e);
              Alert.alert('Error', 'No se pudo importar el backup.');
            } finally {
              setImportando(false);
            }
          },
        },
      ],
    );
  }, [db, cargar]);

  // ── RESTABLECER SEED ──
  const restablecerDatos = useCallback(() => {
    Alert.alert(
      '⚠️ Restablecer datos iniciales',
      'Esto recargará las personas y deudas iniciales. Los datos actuales se mantendrán.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Restablecer',
          style: 'destructive',
          onPress: async () => {
            try {
              const { setMetaValor } = await import('../src/db/database');
              const { ejecutarSeedSiNecesario } = await import('../src/db/seed');
              // Resetear flag para re-ejecutar seed
              await db.runAsync("DELETE FROM _meta WHERE clave = 'seed_v1_completado'");
              await ejecutarSeedSiNecesario(db);
              Alert.alert('✅ Hecho', 'Datos iniciales restaurados.');
            } catch (e) {
              Alert.alert('Error', 'No se pudo restablecer.');
            }
          },
        },
      ],
    );
  }, [db]);

  if (cargando || !ajustes) {
    return (
      <View style={[s.container, s.centrado, { paddingTop: insets.top }]}>
        <ActivityIndicator color={COLORS.accent} size="large" />
      </View>
    );
  }

  const tasa = ajustes.tasa_global_bs_usd;
  const tasaActualizada = parsearMonto(tasaInput);
  const tasaModificada = tasaActualizada !== tasa && tasaActualizada > 0;

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={s.titulo}>Configuración</Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── TASA DE CAMBIO ── */}
        <Seccion titulo="TASA DE CAMBIO BS/USD">
          <View style={tasaS.card}>
            <View style={tasaS.tasaHeader}>
              <Ionicons name="swap-horizontal" size={18} color={COLORS.warning} />
              <Text style={tasaS.tasaLabel}>Tasa Global</Text>
              <View style={tasaS.tasaActualBadge}>
                <Text style={tasaS.tasaActualTxt}>Actual: Bs. {tasa.toFixed(2)}/USD</Text>
              </View>
            </View>

            <View style={tasaS.inputRow}>
              <Text style={tasaS.inputPrefix}>Bs.</Text>
              <TextInput
                style={tasaS.input}
                value={tasaInput}
                onChangeText={setTasaInput}
                keyboardType="decimal-pad"
                placeholder={DEFAULT_TASA_BS_USD.toString()}
                placeholderTextColor={COLORS.textMuted}
              />
              <Text style={tasaS.inputSuffix}>/USD</Text>
            </View>

            {tasaModificada && (
              <View style={tasaS.diferencia}>
                <Ionicons name="information-circle" size={14} color={COLORS.warning} />
                <Text style={tasaS.diferenciaTxt}>
                  Cambio: {((tasaActualizada - tasa) / tasa * 100).toFixed(2)}% vs tasa actual
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[tasaS.btn, !tasaModificada && { opacity: 0.4 }, guardandoTasa && { opacity: 0.6 }]}
              onPress={guardarTasa}
              disabled={!tasaModificada || guardandoTasa}
            >
              {guardandoTasa
                ? <ActivityIndicator color="#fff" size="small" />
                : <><Ionicons name="checkmark" size={16} color="#fff" /><Text style={tasaS.btnTxt}>Actualizar Tasa</Text></>
              }
            </TouchableOpacity>

            <Text style={tasaS.nota}>
              💡 Esta tasa se usa por defecto en todos los formularios. Puedes editarla por transacción.
            </Text>
          </View>
        </Seccion>

        {/* ── PRIVACIDAD Y SEGURIDAD ── */}
        <Seccion titulo="PRIVACIDAD Y SEGURIDAD">
          <FilaSwitch
            icono="finger-print"
            label="Autenticación Biométrica"
            descripcion={tieneBiometria ? 'Requiere huella o Face ID al abrir la app' : 'No disponible en este dispositivo'}
            valor={ajustes.usar_biometria === 1}
            color={COLORS.accent}
            onChange={v => toggleSwitch('usar_biometria', v)}
          />
          <FilaSwitch
            icono="eye-off"
            label="Ocultar Saldos al Iniciar"
            descripcion="Los montos se muestran como $***.**"
            valor={ajustes.ocultar_saldos === 1}
            color={COLORS.warning}
            onChange={v => toggleSwitch('ocultar_saldos', v)}
          />
        </Seccion>

        {/* ── DATOS Y BACKUP ── */}
        <Seccion titulo="DATOS Y RESPALDO">
          <FilaAccion
            icono="cloud-upload"
            label="Exportar Backup JSON"
            descripcion="Guarda todos tus datos en un archivo JSON para compartir o respaldar"
            color={COLORS.info}
            onPress={exportarBackup}
            loading={exportando}
            sublabel={exportando ? undefined : 'Compartir'}
          />
          <FilaAccion
            icono="cloud-download"
            label="Restaurar desde Backup"
            descripcion="⚠️ Borra los datos actuales y restaura desde un archivo JSON"
            color={COLORS.warning}
            onPress={importarBackup}
            loading={importando}
          />
          <FilaAccion
            icono="refresh"
            label="Recargar Datos Iniciales"
            descripcion="Vuelve a cargar las personas y deudas de ejemplo (no borra datos existentes)"
            color={COLORS.textMuted}
            onPress={restablecerDatos}
          />
        </Seccion>

        {/* ── INFORMACIÓN ── */}
        <Seccion titulo="INFORMACIÓN">
          <View style={infoS.card}>
            <View style={infoS.fila}>
              <Text style={infoS.label}>Versión</Text>
              <Text style={infoS.val}>1.0.0 MVP</Text>
            </View>
            <View style={infoS.sep} />
            <View style={infoS.fila}>
              <Text style={infoS.label}>Base de datos</Text>
              <Text style={infoS.val}>SQLite local</Text>
            </View>
            <View style={infoS.sep} />
            <View style={infoS.fila}>
              <Text style={infoS.label}>Tasa por defecto</Text>
              <Text style={infoS.val}>Bs. {DEFAULT_TASA_BS_USD}/USD</Text>
            </View>
            <View style={infoS.sep} />
            <View style={infoS.fila}>
              <Text style={infoS.label}>Plataforma</Text>
              <Text style={infoS.val}>{Platform.OS === 'android' ? 'Android' : 'iOS'} · Expo SDK 57</Text>
            </View>
          </View>

          {/* Descargo */}
          <View style={infoS.disclaimer}>
            <Ionicons name="shield-checkmark" size={16} color={COLORS.textMuted} />
            <Text style={infoS.disclaimerTxt}>
              Todos tus datos se almacenan localmente en este dispositivo. Nunca se envían a servidores externos.
            </Text>
          </View>
        </Seccion>

        <View style={{ height: SPACING['3xl'] }} />
      </ScrollView>
    </View>
  );
}

// ============================================================
// ESTILOS
// ============================================================
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centrado: { alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingHorizontal: SPACING.base, paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backBtn: { width: 36, height: 36, borderRadius: RADIUS.sm, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
  titulo: { fontSize: TYPOGRAPHY.xl, fontWeight: '800', color: COLORS.textPrimary },
  scroll: { padding: SPACING.base },
});

const tasaS = StyleSheet.create({
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.base, borderWidth: 1, borderColor: COLORS.border, gap: SPACING.sm },
  tasaHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  tasaLabel: { fontSize: TYPOGRAPHY.base, fontWeight: '700', color: COLORS.textPrimary, flex: 1 },
  tasaActualBadge: { backgroundColor: COLORS.warningDim, paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: RADIUS.full },
  tasaActualTxt: { fontSize: TYPOGRAPHY.xs, fontWeight: '700', color: COLORS.warning },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.background, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  inputPrefix: { paddingHorizontal: SPACING.md, fontSize: TYPOGRAPHY.lg, fontWeight: '700', color: COLORS.textSecondary, backgroundColor: COLORS.surfaceAlt },
  input: { flex: 1, padding: SPACING.md, fontSize: TYPOGRAPHY['2xl'], fontWeight: '800', color: COLORS.textPrimary, textAlign: 'center' },
  inputSuffix: { paddingHorizontal: SPACING.md, fontSize: TYPOGRAPHY.lg, fontWeight: '700', color: COLORS.textSecondary, backgroundColor: COLORS.surfaceAlt },
  diferencia: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, backgroundColor: COLORS.warningDim, borderRadius: RADIUS.sm, padding: SPACING.sm },
  diferenciaTxt: { fontSize: TYPOGRAPHY.xs, color: COLORS.warning },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, backgroundColor: COLORS.warning, borderRadius: RADIUS.md, padding: SPACING.md },
  btnTxt: { fontSize: TYPOGRAPHY.base, fontWeight: '800', color: '#fff' },
  nota: { fontSize: TYPOGRAPHY.xs, color: COLORS.textMuted, lineHeight: 16 },
});

const infoS = StyleSheet.create({
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  fila: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.md },
  sep: { height: 1, backgroundColor: COLORS.border },
  label: { fontSize: TYPOGRAPHY.sm, color: COLORS.textSecondary },
  val: { fontSize: TYPOGRAPHY.sm, fontWeight: '600', color: COLORS.textPrimary },
  disclaimer: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm, backgroundColor: COLORS.incomeDim, borderRadius: RADIUS.md, padding: SPACING.md, marginTop: SPACING.sm, borderWidth: 1, borderColor: COLORS.income + '30' },
  disclaimerTxt: { fontSize: TYPOGRAPHY.xs, color: COLORS.textSecondary, flex: 1, lineHeight: 16 },
});
