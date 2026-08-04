// ============================================================
// _LAYOUT.TSX — Root Layout
// Cuantos Dolitas
// ============================================================

import React, { useEffect, useState, useCallback, createContext, useContext } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator,
  TouchableOpacity, StatusBar, Platform,
} from 'react-native';
import { Stack } from 'expo-router';
import { SQLiteProvider, useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';
import * as LocalAuthentication from 'expo-local-authentication';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'react-native';

import { initDatabase, getAjustes, updateAjustes } from '../src/db/database';
import { ejecutarSeedSiNecesario } from '../src/db/seed';
import { programarNotificacionesDeudas, solicitarPermisosNotificaciones } from '../src/utils/notifications';
import { DARK_COLORS, LIGHT_COLORS, DB_NAME } from '../src/constants';

// ============================================================
// TEMA CONTEXT — accesible desde cualquier pantalla
// ============================================================
export type ThemeColors = typeof DARK_COLORS;

interface ThemeCtx {
  colors: ThemeColors;
  esOscuro: boolean;
  toggleTema: () => void;
}

export const ThemeContext = createContext<ThemeCtx>({
  colors: DARK_COLORS,
  esOscuro: true,
  toggleTema: () => {},
});

export function useTheme(): ThemeCtx {
  return useContext(ThemeContext);
}

// ============================================================
// INICIALIZADOR DE BASE DE DATOS
// ============================================================
async function onDatabaseInit(db: SQLiteDatabase): Promise<void> {
  await initDatabase(db);
  await ejecutarSeedSiNecesario(db);
}

// ============================================================
// PANTALLA DE CARGA
// ============================================================
function PantallaCargando({ colors }: { colors: ThemeColors }) {
  return (
    <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors === DARK_COLORS ? 'light-content' : 'dark-content'}
                 backgroundColor={colors.background} />
      <View style={styles.logoContainer}>
        <Image
          source={require('../assets/images/icon.png')}
          style={styles.logoImg}
          resizeMode="contain"
        />
        <Text style={[styles.logoTitle, { color: colors.textPrimary }]}>Cuantos Dolitas</Text>
        <Text style={[styles.logoSubtitle, { color: colors.textSecondary }]}>
          CONTROL FINANCIERO
        </Text>
      </View>
      <ActivityIndicator size="large" color={colors.income} style={styles.spinner} />
    </View>
  );
}

// ============================================================
// PANTALLA DE BIOMETRÍA
// ============================================================
function PantallaBiometria({
  onAutenticado, colors,
}: {
  onAutenticado: () => void;
  colors: ThemeColors;
}) {
  const [error, setError] = useState<string | null>(null);
  const [intentando, setIntentando] = useState(false);

  const autenticar = useCallback(async () => {
    setIntentando(true);
    setError(null);
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const registrado = await LocalAuthentication.isEnrolledAsync();
      if (!compatible || !registrado) { onAutenticado(); return; }

      const resultado = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Confirma tu identidad para continuar',
        fallbackLabel: 'Usar PIN',
        cancelLabel: 'Cancelar',
        disableDeviceFallback: false,
      });

      if (resultado.success) { onAutenticado(); }
      else { setError('Autenticación fallida. Intenta de nuevo.'); }
    } catch { setError('Error de autenticación.'); }
    finally { setIntentando(false); }
  }, [onAutenticado]);

  useEffect(() => { autenticar(); }, []);

  return (
    <View style={[styles.biometriaCont, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors === DARK_COLORS ? 'light-content' : 'dark-content'}
                 backgroundColor={colors.background} />
      <Image source={require('../assets/images/icon.png')}
             style={styles.logoImgBig} resizeMode="contain" />
      <Text style={[styles.logoTitle, { color: colors.textPrimary }]}>Cuantos Dolitas</Text>

      <View style={[styles.biometriaCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="finger-print" size={64}
                  color={intentando ? colors.accent : colors.textSecondary} />
        <Text style={[styles.biometriaTexto, { color: colors.textSecondary }]}>
          {intentando ? 'Verificando identidad...' : 'Toca para desbloquear'}
        </Text>
        {error && <Text style={[styles.biometriaError, { color: colors.expense }]}>{error}</Text>}
        {!intentando && (
          <TouchableOpacity style={[styles.biometriaBtn, { backgroundColor: colors.accent }]}
                            onPress={autenticar} activeOpacity={0.8}>
            <Ionicons name="finger-print" size={20} color="#fff" />
            <Text style={styles.biometriaBtnText}>Desbloquear</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ============================================================
// INNER LAYOUT — dentro del SQLiteProvider
// ============================================================
function InnerLayout() {
  const db = useSQLiteContext();
  const [autenticado, setAutenticado] = useState(false);
  const [verificando, setVerificando] = useState(true);
  const [usaBiometria, setUsaBiometria] = useState(false);
  const [esOscuro, setEsOscuro] = useState(true);

  const colors = esOscuro ? DARK_COLORS : LIGHT_COLORS;

  useEffect(() => {
    const init = async () => {
      try {
        const aj = await getAjustes(db);
        setEsOscuro(aj.modo_oscuro === 1);
        setUsaBiometria(aj.usar_biometria === 1);
        if (aj.usar_biometria === 0) setAutenticado(true);
        // Solicitar permisos y programar notificaciones
        await solicitarPermisosNotificaciones();
        await programarNotificacionesDeudas(db, 3);
      } catch {
        setAutenticado(true);
      } finally {
        setVerificando(false);
      }
    };
    init();
  }, [db]);

  const toggleTema = useCallback(async () => {
    const nuevo = !esOscuro;
    setEsOscuro(nuevo);
    await updateAjustes(db, { modo_oscuro: nuevo ? 1 : 0 });
  }, [db, esOscuro]);

  const themeValue = { colors, esOscuro, toggleTema };

  if (verificando) return <PantallaCargando colors={colors} />;
  if (!autenticado && usaBiometria) {
    return (
      <ThemeContext.Provider value={themeValue}>
        <PantallaBiometria onAutenticado={() => setAutenticado(true)} colors={colors} />
      </ThemeContext.Provider>
    );
  }

  const barStyle = esOscuro ? 'light-content' : 'dark-content';

  return (
    <ThemeContext.Provider value={themeValue}>
      <StatusBar barStyle={barStyle} backgroundColor={colors.background} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modals/nuevo-gasto"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="modals/nuevo-ingreso"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="modals/nuevo-abono"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="modals/nueva-inversion"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="modals/nueva-deuda"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="settings"
          options={{ presentation: 'card', animation: 'slide_from_right' }} />
      </Stack>
    </ThemeContext.Provider>
  );
}

// ============================================================
// ROOT LAYOUT
// ============================================================
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SQLiteProvider
        databaseName={DB_NAME}
        onInit={onDatabaseInit}
        loadingFallback={<PantallaCargando colors={DARK_COLORS} />}
      >
        <InnerLayout />
      </SQLiteProvider>
    </SafeAreaProvider>
  );
}

// ============================================================
// ESTILOS
// ============================================================
const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20,
  },
  logoContainer: { alignItems: 'center', gap: 8 },
  logoImg: { width: 100, height: 100, borderRadius: 22 },
  logoImgBig: { width: 120, height: 120, borderRadius: 26, marginBottom: 8 },
  logoTitle: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  logoSubtitle: { fontSize: 12, letterSpacing: 3, textTransform: 'uppercase' },
  spinner: { marginTop: 32 },
  biometriaCont: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 24, paddingHorizontal: 24,
  },
  biometriaCard: {
    borderRadius: 20, padding: 32, alignItems: 'center', gap: 12,
    width: '100%', borderWidth: 1,
  },
  biometriaTexto: { fontSize: 16, textAlign: 'center', marginTop: 8 },
  biometriaError: { fontSize: 13, textAlign: 'center' },
  biometriaBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12, marginTop: 8,
  },
  biometriaBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
});
