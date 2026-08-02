// ============================================================
// _LAYOUT.TSX — Root Layout
// App Financiera Personal
// SQLiteProvider + Biometría + Seed + Expo Router
// ============================================================

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  StatusBar,
  Platform,
} from 'react-native';
import { Stack } from 'expo-router';
import { SQLiteProvider, type SQLiteDatabase } from 'expo-sqlite';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Notifications from 'expo-notifications';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { initDatabase, getAjustes } from '../src/db/database';
import { ejecutarSeedSiNecesario } from '../src/db/seed';
import { COLORS, DB_NAME, TYPOGRAPHY, SPACING } from '../src/constants';

// ============================================================
// CONFIGURACIÓN DE NOTIFICACIONES
// ============================================================
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// ============================================================
// INICIALIZADOR DE BASE DE DATOS (llamado por SQLiteProvider)
// ============================================================
async function onDatabaseInit(db: SQLiteDatabase): Promise<void> {
  await initDatabase(db);
  await ejecutarSeedSiNecesario(db);
}

// ============================================================
// PANTALLA DE CARGA
// ============================================================
function PantallaCargando() {
  return (
    <View style={styles.loadingContainer}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <View style={styles.logoContainer}>
        <View style={styles.logoCircle}>
          <Ionicons name="wallet" size={40} color={COLORS.accent} />
        </View>
        <Text style={styles.logoTitle}>Finanzas</Text>
        <Text style={styles.logoSubtitle}>Personal</Text>
      </View>
      <ActivityIndicator
        size="large"
        color={COLORS.accent}
        style={styles.spinner}
      />
      <Text style={styles.loadingText}>Iniciando base de datos...</Text>
    </View>
  );
}

// ============================================================
// PANTALLA DE AUTENTICACIÓN BIOMÉTRICA
// ============================================================
function PantallaBiometria({
  onAutenticado,
}: {
  onAutenticado: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [intentando, setIntentando] = useState(false);

  const autenticar = useCallback(async () => {
    setIntentando(true);
    setError(null);
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const registrado = await LocalAuthentication.isEnrolledAsync();

      if (!compatible || !registrado) {
        // Sin hardware biométrico → acceso directo
        onAutenticado();
        return;
      }

      const resultado = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Confirma tu identidad para continuar',
        fallbackLabel: 'Usar PIN',
        cancelLabel: 'Cancelar',
        disableDeviceFallback: false,
      });

      if (resultado.success) {
        onAutenticado();
      } else {
        setError('Autenticación fallida. Intenta de nuevo.');
      }
    } catch (e) {
      setError('Error de autenticación. Intenta de nuevo.');
    } finally {
      setIntentando(false);
    }
  }, [onAutenticado]);

  // Intentar automáticamente al montar
  useEffect(() => {
    autenticar();
  }, []);

  return (
    <View style={styles.biometriaCont}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <View style={styles.logoContainer}>
        <View style={styles.logoCircle}>
          <Ionicons name="lock-closed" size={40} color={COLORS.accent} />
        </View>
        <Text style={styles.logoTitle}>Finanzas</Text>
        <Text style={styles.logoSubtitle}>Personal</Text>
      </View>

      <View style={styles.biometriaCard}>
        <Ionicons
          name="finger-print"
          size={64}
          color={intentando ? COLORS.accent : COLORS.textSecondary}
        />
        <Text style={styles.biometriaTexto}>
          {intentando ? 'Verificando identidad...' : 'Toca para desbloquear'}
        </Text>
        {error && <Text style={styles.biometriaError}>{error}</Text>}

        {!intentando && (
          <TouchableOpacity
            style={styles.biometriaBtn}
            onPress={autenticar}
            activeOpacity={0.8}
          >
            <Ionicons name="finger-print" size={20} color={COLORS.textPrimary} />
            <Text style={styles.biometriaBtnText}>Desbloquear</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ============================================================
// COMPONENTE RAÍZ
// ============================================================
export default function RootLayout() {
  const [autenticado, setAutenticado] = useState(false);
  const [verificandoBiometria, setVerificandoBiometria] = useState(true);
  const [usaBiometria, setUsaBiometria] = useState(true);

  // Verificar ajuste de biometría desde la DB
  // Se hace en el callback del SQLiteProvider
  const onDBReady = useCallback(async (db: SQLiteDatabase) => {
    try {
      const aj = await getAjustes(db);
      setUsaBiometria(aj.usar_biometria === 1);
      if (aj.usar_biometria === 0) {
        setAutenticado(true);
      }
    } catch {
      setAutenticado(true); // Fallback seguro
    } finally {
      setVerificandoBiometria(false);
    }
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <SQLiteProvider
        databaseName={DB_NAME}
        onInit={async (db) => {
          await onDatabaseInit(db);
          await onDBReady(db);
        }}
        loadingFallback={<PantallaCargando />}
      >
        {verificandoBiometria ? (
          <PantallaCargando />
        ) : !autenticado && usaBiometria ? (
          <PantallaBiometria onAutenticado={() => setAutenticado(true)} />
        ) : (
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: COLORS.background },
              animation: 'fade',
            }}
          >
            <Stack.Screen name="tabs" options={{ headerShown: false }} />
            <Stack.Screen
              name="modals/nuevo-gasto"
              options={{
                presentation: 'modal',
                animation: 'slide_from_bottom',
              }}
            />
            <Stack.Screen
              name="modals/nuevo-ingreso"
              options={{
                presentation: 'modal',
                animation: 'slide_from_bottom',
              }}
            />
            <Stack.Screen
              name="modals/nuevo-abono"
              options={{
                presentation: 'modal',
                animation: 'slide_from_bottom',
              }}
            />
            <Stack.Screen
              name="modals/nueva-inversion"
              options={{
                presentation: 'modal',
                animation: 'slide_from_bottom',
              }}
            />
            <Stack.Screen
              name="modals/nueva-deuda"
              options={{
                presentation: 'modal',
                animation: 'slide_from_bottom',
              }}
            />
            <Stack.Screen
              name="settings"
              options={{
                presentation: 'card',
                animation: 'slide_from_right',
              }}
            />
          </Stack>
        )}
      </SQLiteProvider>
    </SafeAreaProvider>
  );
}

// ============================================================
// ESTILOS
// ============================================================
const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.lg,
  },
  logoContainer: {
    alignItems: 'center',
    gap: SPACING.xs,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.accentDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  logoTitle: {
    fontSize: TYPOGRAPHY['3xl'],
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: 1,
  },
  logoSubtitle: {
    fontSize: TYPOGRAPHY.md,
    color: COLORS.textSecondary,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  spinner: {
    marginTop: SPACING.xl,
  },
  loadingText: {
    fontSize: TYPOGRAPHY.sm,
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  biometriaCont: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING['2xl'],
    paddingHorizontal: SPACING.xl,
  },
  biometriaCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: SPACING['2xl'],
    alignItems: 'center',
    gap: SPACING.md,
    width: '100%',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  biometriaTexto: {
    fontSize: TYPOGRAPHY.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
  biometriaError: {
    fontSize: TYPOGRAPHY.sm,
    color: COLORS.expense,
    textAlign: 'center',
  },
  biometriaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.accent,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: 12,
    marginTop: SPACING.sm,
  },
  biometriaBtnText: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
});
