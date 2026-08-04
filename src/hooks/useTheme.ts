// ============================================================
// useTheme.ts — Hook de Tema Claro/Oscuro
// Cuantos Dolitas
// ============================================================

import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { useColorScheme } from 'react-native';
import { DARK_COLORS, LIGHT_COLORS } from '../constants';
import { getAjustes, updateAjustes } from '../db/database';

export type ThemeMode = 'dark' | 'light';

export interface ThemeContextValue {
  modo: ThemeMode;
  colors: typeof DARK_COLORS;
  toggleTema: () => void;
  esOscuro: boolean;
}

export function useThemeSetup(): ThemeContextValue {
  const db = useSQLiteContext();
  const [modo, setModo] = useState<ThemeMode>('dark');

  useEffect(() => {
    getAjustes(db).then(aj => {
      setModo(aj.modo_oscuro === 1 ? 'dark' : 'light');
    }).catch(() => {});
  }, [db]);

  const toggleTema = useCallback(async () => {
    const nuevoModo: ThemeMode = modo === 'dark' ? 'light' : 'dark';
    setModo(nuevoModo);
    await updateAjustes(db, { modo_oscuro: nuevoModo === 'dark' ? 1 : 0 });
  }, [db, modo]);

  const colors = modo === 'dark' ? DARK_COLORS : LIGHT_COLORS;
  return { modo, colors, toggleTema, esOscuro: modo === 'dark' };
}
