// ============================================================
// useFlujo.ts — Hook de Flujo de Caja
// App Financiera Personal
// ============================================================

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import {
  getGastos,
  getIngresos,
  insertGasto,
  insertIngreso,
  deleteGasto,
  deleteIngreso,
  getTasa,
} from '../db/database';
import { primerDiaMesDB } from '../utils/currency';
import type { Gasto, GastoInput, Ingreso, IngresoInput, TipoGasto } from '../types';

// ============================================================
// TIPOS INTERNOS
// ============================================================
export type FiltroMes = { anio: number; mes: number }; // mes: 1-12
export type MovimientoUnificado =
  | (Gasto & { _tipo: 'gasto' })
  | (Ingreso & { _tipo: 'ingreso' });

// ============================================================
// HELPER: Rango de fechas del mes
// ============================================================
function rangoMes(filtro: FiltroMes): { desde: string; hasta: string } {
  const mesStr = String(filtro.mes).padStart(2, '0');
  const desde = `${filtro.anio}-${mesStr}-01`;
  // Último día del mes usando el truco del día 0 del mes siguiente
  const ultimoDia = new Date(filtro.anio, filtro.mes, 0).getDate();
  const hasta = `${filtro.anio}-${mesStr}-${ultimoDia}`;
  return { desde, hasta };
}

// ============================================================
// HOOK PRINCIPAL
// ============================================================
export function useFlujo() {
  const db = useSQLiteContext();

  const hoy = new Date();
  const [filtroMes, setFiltroMes] = useState<FiltroMes>({
    anio: hoy.getFullYear(),
    mes: hoy.getMonth() + 1,
  });
  const [filtroTipoGasto, setFiltroTipoGasto] = useState<TipoGasto | 'TODOS'>('TODOS');
  const [filtroCategoria, setFiltroCategoria] = useState<string>('');

  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [ingresos, setIngresos] = useState<Ingreso[]>([]);
  const [tasaGlobal, setTasaGlobal] = useState(36.50);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const { desde, hasta } = rangoMes(filtroMes);
      const [g, i, tasa] = await Promise.all([
        getGastos(db, {
          desde,
          hasta,
          tipo_gasto:
            filtroTipoGasto !== 'TODOS' ? filtroTipoGasto : undefined,
          categoria: filtroCategoria || undefined,
        }),
        getIngresos(db, { desde, hasta }),
        getTasa(db),
      ]);
      setGastos(g);
      setIngresos(i);
      setTasaGlobal(tasa);
    } catch (e) {
      setError('Error cargando flujo de caja.');
      console.error('[useFlujo]', e);
    } finally {
      setCargando(false);
    }
  }, [db, filtroMes, filtroTipoGasto, filtroCategoria]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // ── MOVIMIENTOS UNIFICADOS (cronológico descendente) ──
  const movimientos = useMemo<MovimientoUnificado[]>(() => {
    const g: MovimientoUnificado[] = gastos.map((x) => ({ ...x, _tipo: 'gasto' as const }));
    const i: MovimientoUnificado[] = ingresos.map((x) => ({ ...x, _tipo: 'ingreso' as const }));
    return [...g, ...i].sort((a, b) =>
      b.fecha.localeCompare(a.fecha),
    );
  }, [gastos, ingresos]);

  // ── TOTALES DEL MES ──
  const totalIngresos = useMemo(
    () => ingresos.reduce((s, x) => s + x.monto_usd, 0),
    [ingresos],
  );
  const totalGastos = useMemo(
    () => gastos.reduce((s, x) => s + x.monto_usd, 0),
    [gastos],
  );
  const totalGastosPersonales = useMemo(
    () =>
      gastos
        .filter((g) => g.tipo_gasto === 'PERSONAL')
        .reduce((s, x) => s + x.monto_usd, 0),
    [gastos],
  );
  const totalGastosNegocio = useMemo(
    () =>
      gastos
        .filter((g) => g.tipo_gasto === 'NEGOCIO_PRODUCCION')
        .reduce((s, x) => s + x.monto_usd, 0),
    [gastos],
  );
  const balance = totalIngresos - totalGastos;

  // ── RESUMEN POR CATEGORÍA ──
  const resumenCategorias = useMemo(() => {
    const mapa: Record<string, number> = {};
    for (const g of gastos) {
      mapa[g.categoria] = (mapa[g.categoria] ?? 0) + g.monto_usd;
    }
    return Object.entries(mapa)
      .map(([categoria, total]) => ({ categoria, total }))
      .sort((a, b) => b.total - a.total);
  }, [gastos]);

  // ── MUTACIONES ──
  const agregarGasto = useCallback(
    async (datos: GastoInput): Promise<boolean> => {
      try {
        await insertGasto(db, datos);
        await cargarDatos();
        return true;
      } catch (e) {
        console.error('[useFlujo] agregarGasto:', e);
        return false;
      }
    },
    [db, cargarDatos],
  );

  const agregarIngreso = useCallback(
    async (datos: IngresoInput): Promise<boolean> => {
      try {
        await insertIngreso(db, datos);
        await cargarDatos();
        return true;
      } catch (e) {
        console.error('[useFlujo] agregarIngreso:', e);
        return false;
      }
    },
    [db, cargarDatos],
  );

  const eliminarGasto = useCallback(
    async (id: number): Promise<boolean> => {
      try {
        await deleteGasto(db, id);
        await cargarDatos();
        return true;
      } catch (e) {
        console.error('[useFlujo] eliminarGasto:', e);
        return false;
      }
    },
    [db, cargarDatos],
  );

  const eliminarIngreso = useCallback(
    async (id: number): Promise<boolean> => {
      try {
        await deleteIngreso(db, id);
        await cargarDatos();
        return true;
      } catch (e) {
        console.error('[useFlujo] eliminarIngreso:', e);
        return false;
      }
    },
    [db, cargarDatos],
  );

  // ── NAVEGACIÓN DE MES ──
  const mesSiguiente = useCallback(() => {
    setFiltroMes((prev) => {
      const nuevaMes = prev.mes === 12 ? 1 : prev.mes + 1;
      const nuevoAnio = prev.mes === 12 ? prev.anio + 1 : prev.anio;
      return { anio: nuevoAnio, mes: nuevaMes };
    });
  }, []);

  const mesAnterior = useCallback(() => {
    setFiltroMes((prev) => {
      const nuevaMes = prev.mes === 1 ? 12 : prev.mes - 1;
      const nuevoAnio = prev.mes === 1 ? prev.anio - 1 : prev.anio;
      return { anio: nuevoAnio, mes: nuevaMes };
    });
  }, []);

  const esHoy = filtroMes.anio === hoy.getFullYear() && filtroMes.mes === hoy.getMonth() + 1;

  return {
    movimientos,
    gastos,
    ingresos,
    totalIngresos,
    totalGastos,
    totalGastosPersonales,
    totalGastosNegocio,
    balance,
    resumenCategorias,
    filtroMes,
    filtroTipoGasto,
    filtroCategoria,
    tasaGlobal,
    esHoy,
    cargando,
    error,
    setFiltroTipoGasto,
    setFiltroCategoria,
    mesSiguiente,
    mesAnterior,
    agregarGasto,
    agregarIngreso,
    eliminarGasto,
    eliminarIngreso,
    refrescar: cargarDatos,
  };
}
