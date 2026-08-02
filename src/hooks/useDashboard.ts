// ============================================================
// useDashboard.ts — Hook de datos del Dashboard
// App Financiera Personal
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import {
  getResumenDashboard,
  getAjustes,
  updateAjustes,
} from '../db/database';
import type { ResumenDashboard, Ajustes } from '../types';

interface UseDashboardResult {
  resumen: ResumenDashboard | null;
  ajustes: Ajustes | null;
  cargando: boolean;
  error: string | null;
  ocultarSaldos: boolean;
  toggleOcultarSaldos: () => void;
  refrescar: () => Promise<void>;
}

export function useDashboard(): UseDashboardResult {
  const db = useSQLiteContext();
  const [resumen, setResumen] = useState<ResumenDashboard | null>(null);
  const [ajustes, setAjustes] = useState<Ajustes | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ocultarSaldos, setOcultarSaldos] = useState(false);

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const [res, aj] = await Promise.all([
        getResumenDashboard(db),
        getAjustes(db),
      ]);
      setResumen(res);
      setAjustes(aj);
      setOcultarSaldos(aj.ocultar_saldos === 1);
    } catch (e) {
      setError('Error cargando datos del dashboard.');
      console.error('[useDashboard]', e);
    } finally {
      setCargando(false);
    }
  }, [db]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const toggleOcultarSaldos = useCallback(async () => {
    const nuevoValor = ocultarSaldos ? 0 : 1;
    setOcultarSaldos(!ocultarSaldos);
    try {
      await updateAjustes(db, { ocultar_saldos: nuevoValor });
    } catch (e) {
      console.error('[useDashboard] Error al guardar ocultar_saldos:', e);
    }
  }, [db, ocultarSaldos]);

  return {
    resumen,
    ajustes,
    cargando,
    error,
    ocultarSaldos,
    toggleOcultarSaldos,
    refrescar: cargarDatos,
  };
}
