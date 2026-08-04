// ============================================================
// SETTINGS — Cuantos Dolitas
// ============================================================
import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, Switch, ActivityIndicator, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSQLiteContext } from 'expo-sqlite';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as LocalAuthentication from 'expo-local-authentication';

import { useTheme } from './_layout';
import { getAjustes, updateAjustes, exportarDatosJSON, importarDatosJSON } from '../src/db/database';
import { parsearMonto } from '../src/utils/currency';
import { TYPOGRAPHY, SPACING, RADIUS, DEFAULT_TASA_BS_USD } from '../src/constants';
import { programarNotificacionesDeudas } from '../src/utils/notifications';
import type { Ajustes } from '../src/types';

function Seccion({ titulo, children, colors }: { titulo: string; children: React.ReactNode; colors: any }) {
  return (
    <View style={{ marginBottom: 24 }}>
      <Text style={[sS.secTitulo, { color: colors.textMuted }]}>{titulo}</Text>
      {children}
    </View>
  );
}

function FilaSwitch({ icono, label, desc, valor, color, onChange, colors }: {
  icono: any; label: string; desc?: string; valor: boolean;
  color?: string; onChange: (v: boolean) => void; colors: any;
}) {
  const c = color ?? colors.accent;
  return (
    <View style={[sS.fila, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[sS.filaIcono, { backgroundColor: c + '20' }]}>
        <Ionicons name={icono} size={18} color={c} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[sS.filaLabel, { color: colors.textPrimary }]}>{label}</Text>
        {desc && <Text style={[sS.filaDesc, { color: colors.textMuted }]}>{desc}</Text>}
      </View>
      <Switch value={valor} onValueChange={onChange}
        trackColor={{ false: colors.border, true: c + '80' }}
        thumbColor={valor ? c : colors.textMuted}
        ios_backgroundColor={colors.border} />
    </View>
  );
}

function FilaAccion({ icono, label, desc, color, onPress, loading, colors }: {
  icono: any; label: string; desc?: string; color?: string;
  onPress: () => void; loading?: boolean; colors: any;
}) {
  const c = color ?? colors.accent;
  return (
    <TouchableOpacity style={[sS.fila, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={onPress} activeOpacity={0.7}>
      <View style={[sS.filaIcono, { backgroundColor: c + '20' }]}>
        {loading ? <ActivityIndicator size="small" color={c} />
          : <Ionicons name={icono} size={18} color={c} />}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[sS.filaLabel, { color: colors.textPrimary }]}>{label}</Text>
        {desc && <Text style={[sS.filaDesc, { color: colors.textMuted }]}>{desc}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const db = useSQLiteContext();
  const { colors, esOscuro, toggleTema } = useTheme();

  const [ajustes, setAjustes] = useState<Ajustes | null>(null);
  const [tasaInput, setTasaInput] = useState('');
  const [cargando, setCargando] = useState(true);
  const [exportando, setExportando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [guardandoTasa, setGuardandoTasa] = useState(false);
  const [tieneBiometria, setTieneBiometria] = useState(false);
  const [diasAviso, setDiasAviso] = useState('3');

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const aj = await getAjustes(db);
      setAjustes(aj);
      setTasaInput(aj.tasa_global_bs_usd.toString());
      const comp = await LocalAuthentication.hasHardwareAsync();
      const reg = await LocalAuthentication.isEnrolledAsync();
      setTieneBiometria(comp && reg);
    } catch (e) { console.error(e); }
    finally { setCargando(false); }
  }, [db]);

  useEffect(() => { cargar(); }, [cargar]);

  const guardarTasa = useCallback(async () => {
    const tasa = parsearMonto(tasaInput);
    if (tasa <= 0) { Alert.alert('Error', 'Tasa inválida.'); return; }
    setGuardandoTasa(true);
    await updateAjustes(db, { tasa_global_bs_usd: tasa });
    await cargar();
    setGuardandoTasa(false);
    Alert.alert('✅ Listo', `Tasa actualizada a Bs. ${tasa.toFixed(2)}/USD`);
  }, [db, tasaInput, cargar]);

  const toggleSwitch = useCallback(async (campo: 'usar_biometria' | 'ocultar_saldos', valor: boolean) => {
    if (campo === 'usar_biometria' && valor && !tieneBiometria) {
      Alert.alert('No disponible', 'Este dispositivo no tiene biometría configurada.'); return;
    }
    await updateAjustes(db, { [campo]: valor ? 1 : 0 });
    setAjustes(prev => prev ? { ...prev, [campo]: valor ? 1 : 0 } : prev);
  }, [db, tieneBiometria]);

  const exportarBackup = useCallback(async () => {
    setExportando(true);
    try {
      const json = await exportarDatosJSON(db);
      const fecha = new Date().toISOString().split('T')[0];
      const ruta = FileSystem.documentDirectory + `cuantos_dolitas_${fecha}.json`;
      await FileSystem.writeAsStringAsync(ruta, json, { encoding: FileSystem.EncodingType.UTF8 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(ruta, { mimeType: 'application/json', dialogTitle: `Backup ${fecha}` });
      } else {
        Alert.alert('Guardado', ruta);
      }
    } catch { Alert.alert('Error', 'No se pudo exportar.'); }
    finally { setExportando(false); }
  }, [db]);

  const importarBackup = useCallback(async () => {
    Alert.alert('⚠️ Restaurar Backup',
      'Esto borrará todos los datos actuales. ¿Continuar?',
      [{ text: 'Cancelar', style: 'cancel' },
       { text: 'Restaurar', style: 'destructive', onPress: async () => {
         setImportando(true);
         try {
           const res = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true });
           if (res.canceled || !res.assets?.[0]) { setImportando(false); return; }
           const contenido = await FileSystem.readAsStringAsync(res.assets[0].uri, { encoding: FileSystem.EncodingType.UTF8 });
           const ok = await importarDatosJSON(db, contenido);
           if (ok) { Alert.alert('✅ Éxito', 'Datos restaurados.'); await cargar(); }
           else Alert.alert('Error', 'Archivo inválido.');
         } catch { Alert.alert('Error', 'No se pudo importar.'); }
         finally { setImportando(false); }
       }}]);
  }, [db, cargar]);

  const reprogramarNotificaciones = useCallback(async () => {
    const dias = parseInt(diasAviso) || 3;
    await programarNotificacionesDeudas(db, dias);
    Alert.alert('✅ Notificaciones', `Se programaron alertas ${dias} días antes de cada vencimiento.`);
  }, [db, diasAviso]);

  const borrarTodo = useCallback(() => {
    Alert.alert('⚠️ BORRAR TODO',
      'Esto eliminará TODOS los datos de la app permanentemente. ¿Estás seguro?',
      [{ text: 'Cancelar', style: 'cancel' },
       { text: 'BORRAR TODO', style: 'destructive', onPress: async () => {
         await db.execAsync(`
           DELETE FROM movimientos_inversion;
           DELETE FROM abonos_deudas;
           DELETE FROM gastos;
           DELETE FROM ingresos;
           DELETE FROM inversiones;
           DELETE FROM deudas_compromisos;
           DELETE FROM personas;
           DELETE FROM _meta;
         `);
         Alert.alert('✅ Listo', 'Todos los datos fueron eliminados.');
       }}]);
  }, [db]);

  if (cargando || !ajustes) {
    return (
      <View style={[{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  const tasaNum = parsearMonto(tasaInput);
  const tasaCambiada = tasaNum !== ajustes.tasa_global_bs_usd && tasaNum > 0;

  return (
    <View style={[{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[sS.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={[sS.backBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[sS.titulo, { color: colors.textPrimary }]}>Configuración</Text>
      </View>

      <ScrollView contentContainerStyle={sS.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* APARIENCIA */}
        <Seccion titulo="APARIENCIA" colors={colors}>
          <FilaSwitch
            icono={esOscuro ? 'moon' : 'sunny'}
            label="Modo Oscuro"
            desc={esOscuro ? 'Tema oscuro activo' : 'Tema claro activo'}
            valor={esOscuro}
            color={esOscuro ? colors.info : colors.warning}
            onChange={toggleTema}
            colors={colors}
          />
        </Seccion>

        {/* TASA */}
        <Seccion titulo="TASA DE CAMBIO BS/USD" colors={colors}>
          <View style={[sS.tasaCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[sS.tasaActual, { color: colors.textMuted }]}>
              Actual: Bs. {ajustes.tasa_global_bs_usd.toFixed(2)}/USD
            </Text>
            <View style={[sS.tasaInputRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={[sS.tasaPrefix, { color: colors.textSecondary, backgroundColor: colors.surfaceAlt }]}>Bs.</Text>
              <TextInput style={[sS.tasaInput, { color: colors.textPrimary }]}
                value={tasaInput} onChangeText={setTasaInput}
                keyboardType="decimal-pad" placeholder={DEFAULT_TASA_BS_USD.toString()}
                placeholderTextColor={colors.textMuted} />
              <Text style={[sS.tasaPrefix, { color: colors.textSecondary, backgroundColor: colors.surfaceAlt }]}>/USD</Text>
            </View>
            <TouchableOpacity
              style={[sS.tasaBtn, { backgroundColor: colors.warning, opacity: tasaCambiada ? 1 : 0.4 }]}
              onPress={guardarTasa} disabled={!tasaCambiada || guardandoTasa}>
              {guardandoTasa ? <ActivityIndicator color="#fff" size="small" />
                : <><Ionicons name="checkmark" size={16} color="#fff" /><Text style={sS.tasaBtnTxt}>Actualizar Tasa</Text></>}
            </TouchableOpacity>
          </View>
        </Seccion>

        {/* PRIVACIDAD */}
        <Seccion titulo="PRIVACIDAD Y SEGURIDAD" colors={colors}>
          <FilaSwitch icono="finger-print" label="Autenticación Biométrica"
            desc={tieneBiometria ? 'Requiere huella al abrir la app' : 'No disponible en este dispositivo'}
            valor={ajustes.usar_biometria === 1} color={colors.accent}
            onChange={v => toggleSwitch('usar_biometria', v)} colors={colors} />
          <FilaSwitch icono="eye-off" label="Ocultar Saldos al Iniciar"
            desc="Los montos se muestran como $***.**"
            valor={ajustes.ocultar_saldos === 1} color={colors.warning}
            onChange={v => toggleSwitch('ocultar_saldos', v)} colors={colors} />
        </Seccion>

        {/* NOTIFICACIONES */}
        <Seccion titulo="NOTIFICACIONES" colors={colors}>
          <View style={[sS.tasaCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[sS.tasaActual, { color: colors.textMuted }]}>
              Días de aviso previo al vencimiento
            </Text>
            <View style={[sS.tasaInputRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <TextInput style={[sS.tasaInput, { color: colors.textPrimary, textAlign: 'center' }]}
                value={diasAviso} onChangeText={setDiasAviso}
                keyboardType="number-pad" placeholder="3"
                placeholderTextColor={colors.textMuted} />
              <Text style={[sS.tasaPrefix, { color: colors.textSecondary, backgroundColor: colors.surfaceAlt }]}>días</Text>
            </View>
            <TouchableOpacity style={[sS.tasaBtn, { backgroundColor: colors.income }]} onPress={reprogramarNotificaciones}>
              <Ionicons name="notifications" size={16} color="#fff" />
              <Text style={sS.tasaBtnTxt}>Reprogramar Notificaciones</Text>
            </TouchableOpacity>
          </View>
        </Seccion>

        {/* DATOS */}
        <Seccion titulo="DATOS Y RESPALDO" colors={colors}>
          <FilaAccion icono="cloud-upload" label="Exportar Backup JSON"
            desc="Guarda todos tus datos en un archivo"
            color={colors.info} onPress={exportarBackup} loading={exportando} colors={colors} />
          <FilaAccion icono="cloud-download" label="Restaurar desde Backup"
            desc="⚠️ Borra datos actuales y restaura"
            color={colors.warning} onPress={importarBackup} loading={importando} colors={colors} />
          <FilaAccion icono="trash" label="Borrar Todos los Datos"
            desc="⚠️ Elimina todo permanentemente"
            color={colors.expense} onPress={borrarTodo} colors={colors} />
        </Seccion>

        {/* INFO */}
        <View style={[sS.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {[
            ['App', 'Cuantos Dolitas'],
            ['Versión', '2.0.0'],
            ['Base de datos', 'SQLite local'],
            ['Plataforma', `${Platform.OS === 'android' ? 'Android' : 'iOS'}`],
          ].map(([label, val], i, arr) => (
            <React.Fragment key={label}>
              <View style={sS.infoFila}>
                <Text style={[sS.infoLabel, { color: colors.textSecondary }]}>{label}</Text>
                <Text style={[sS.infoVal, { color: colors.textPrimary }]}>{val}</Text>
              </View>
              {i < arr.length - 1 && <View style={[sS.infoSep, { backgroundColor: colors.border }]} />}
            </React.Fragment>
          ))}
        </View>

        <View style={[sS.disclaimer, { backgroundColor: colors.incomeDim, borderColor: colors.income + '30' }]}>
          <Ionicons name="shield-checkmark" size={16} color={colors.textMuted} />
          <Text style={[sS.disclaimerTxt, { color: colors.textSecondary }]}>
            Todos tus datos se almacenan localmente en este dispositivo. Nunca se envían a servidores externos.
          </Text>
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

const sS = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  backBtn: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  titulo: { fontSize: 20, fontWeight: '800' },
  scroll: { padding: 16 },
  secTitulo: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 10 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 12, marginBottom: 8, borderWidth: 1 },
  filaIcono: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  filaLabel: { fontSize: 15, fontWeight: '600' },
  filaDesc: { fontSize: 12, marginTop: 2 },
  tasaCard: { borderRadius: 14, padding: 16, borderWidth: 1, gap: 12 },
  tasaActual: { fontSize: 13 },
  tasaInputRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, borderWidth: 1, overflow: 'hidden' },
  tasaPrefix: { paddingHorizontal: 14, paddingVertical: 14, fontSize: 16, fontWeight: '700' },
  tasaInput: { flex: 1, padding: 14, fontSize: 22, fontWeight: '700' },
  tasaBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 10, padding: 14 },
  tasaBtnTxt: { fontSize: 15, fontWeight: '800', color: '#fff' },
  infoCard: { borderRadius: 14, borderWidth: 1, overflow: 'hidden', marginBottom: 12 },
  infoFila: { flexDirection: 'row', justifyContent: 'space-between', padding: 14 },
  infoLabel: { fontSize: 14 },
  infoVal: { fontSize: 14, fontWeight: '600' },
  infoSep: { height: 1 },
  disclaimer: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: 12, padding: 14, borderWidth: 1 },
  disclaimerTxt: { fontSize: 12, flex: 1, lineHeight: 16 },
});
