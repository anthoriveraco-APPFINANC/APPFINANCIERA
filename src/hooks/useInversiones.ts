// ============================================================
// useInversiones.ts — Hook de Portafolio de Inversiones
// App Financiera Personal
// ============================================================

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import {
  getInversiones,
  getMovimientosByInversion,
  insertInversion,
  insertMovimientoInversion,
  liquidarInversion,
  updateValorInversion,
  getTasa,
} from '../db/database';
import type {
  Inversion,
  InversionInput,
  MovimientoInversion,
  MovimientoInversionInput,
} from '../types';

// ============================================================
// HOOK PRINCIPAL — PORTAFOLIO
// ============================================================
export function useInversiones() {
  const db = useSQLiteContext();

  const [inversiones, setInversiones] = useState<Inversion[]>([]);
  const [tasaGlobal, setTasaGlobal] = useState(36.50);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const [inv, tasa] = await Promise.all([
        getInversiones(db),
        getTasa(db),
      ]);
      setInversiones(inv);
      setTasaGlobal(tasa);
    } catch (e) {
      setError('Error cargando inversiones.');
      console.error('[useInversiones]', e);
    } finally {
      setCargando(false);
    }
  }, [db]);

  useEffect(() => { cargar(); }, [cargar]);

  // ── MÉTRICAS CONSOLIDADAS ──
  const totalValorActual = useMemo(
    () => inversiones.filter(i => i.estado === 'ACTIVA').reduce((s, i) => s + i.valor_actual_usd, 0),
    [inversiones],
  );
  const totalInvertido = useMemo(
    () => inversiones.filter(i => i.estado === 'ACTIVA').reduce((s, i) => s + i.monto_inicial_usd, 0),
    [inversiones],
  );
  const gananciaTotal = totalValorActual - totalInvertido;
  const rentabilidadPct = totalInvertido > 0 ? (gananciaTotal / totalInvertido) * 100 : 0;

  // ── MUTACIONES ──
  const agregarInversion = useCallback(
    async (datos: InversionInput): Promise<boolean> => {
      try {
        await insertInversion(db, datos);
        await cargar();
        return true;
      } catch (e) {
        console.error('[useInversiones] agregarInversion:', e);
        return false;
      }
    },
    [db, cargar],
  );

  const registrarMovimiento = useCallback(
    async (datos: MovimientoInversionInput): Promise<boolean> => {
      try {
        await insertMovimientoInversion(db, datos);
        await cargar();
        return true;
      } catch (e) {
        console.error('[useInversiones] registrarMovimiento:', e);
        return false;
      }
    },
    [db, cargar],
  );

  const actualizarValor = useCallback(
    async (id: number, nuevoValor: number): Promise<boolean> => {
      try {
        await updateValorInversion(db, id, nuevoValor);
        await cargar();
        return true;
      } catch (e) {
        console.error('[useInversiones] actualizarValor:', e);
        return false;
      }
    },
    [db, cargar],
  );

  const cerrarInversion = useCallback(
    async (id: number): Promise<boolean> => {
      try {
        await liquidarInversion(db, id);
        await cargar();
        return true;
      } catch (e) {
        console.error('[useInversiones] cerrarInversion:', e);
        return false;
      }
    },
    [db, cargar],
  );

  return {
    inversiones,
    totalValorActual,
    totalInvertido,
    gananciaTotal,
    rentabilidadPct,
    tasaGlobal,
    cargando,
    error,
    refrescar: cargar,
    agregarInversion,
    registrarMovimiento,
    actualizarValor,
    cerrarInversion,
  };
}

// ============================================================
// HOOK — MOVIMIENTOS DE UNA INVERSIÓN
// ============================================================
export function useMovimientosInversion(inversionId: number | null) {
  const db = useSQLiteContext();
  const [movimientos, setMovimientos] = useState<MovimientoInversion[]>([]);
  const [cargando, setCargando] = useState(false);

  const cargar = useCallback(async () => {
    if (!inversionId) return;
    setCargando(true);
    try {
      const data = await getMovimientosByInversion(db, inversionId);
      setMovimientos(data);
    } catch (e) {
      console.error('[useMovimientosInversion]', e);
    } finally {
      setCargando(false);
    }
  }, [db, inversionId]);

  useEffect(() => { cargar(); }, [cargar]);

  const totalAportes = useMemo(
    () => movimientos.filter(m => m.tipo_movimiento === 'APORTE').reduce((s, m) => s + m.monto_usd, 0),
    [movimientos],
  );
  const totalGanancias = useMemo(
    () => movimientos.filter(m => m.tipo_movimiento === 'GANANCIA_RENDIMIENTO').reduce((s, m) => s + m.monto_usd, 0),
    [movimientos],
  );
  const totalRetiros = useMemo(
    () => movimientos.filter(m => m.tipo_movimiento === 'RETIRO_CAPITAL').reduce((s, m) => s + m.monto_usd, 0),
    [movimientos],
  );

  return { movimientos, totalAportes, totalGanancias, totalRetiros, cargando, refrescar: cargar };
}
