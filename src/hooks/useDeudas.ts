// ============================================================
// useDeudas.ts — Hook de Deudas y Abonos
// App Financiera Personal
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import {
  getDeudasConPersona,
  getAbonosByDeuda,
  insertAbono,
  insertDeuda,
  insertPersona,
  marcarDeudaPagada,
  updateDeuda,
  deleteAbono,
  getTasa,
} from '../db/database';
import type {
  DeudaConPersona,
  AbonoDeuda,
  AbonoInput,
  DeudaInput,
  PersonaInput,
} from '../types';

// ============================================================
// HOOK PRINCIPAL
// ============================================================
export function useDeudas() {
  const db = useSQLiteContext();

  const [porCobrar, setPorCobrar] = useState<DeudaConPersona[]>([]);
  const [porPagar, setPorPagar] = useState<DeudaConPersona[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tasaGlobal, setTasaGlobal] = useState(36.50);

  const cargarDeudas = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const [cobrar, pagar, tasa] = await Promise.all([
        getDeudasConPersona(db, 'POR_COBRAR'),
        getDeudasConPersona(db, 'POR_PAGAR'),
        getTasa(db),
      ]);
      setPorCobrar(cobrar);
      setPorPagar(pagar);
      setTasaGlobal(tasa);
    } catch (e) {
      setError('Error cargando deudas.');
      console.error('[useDeudas]', e);
    } finally {
      setCargando(false);
    }
  }, [db]);

  useEffect(() => {
    cargarDeudas();
  }, [cargarDeudas]);

  // ── TOTALES ──
  const totalPorCobrar = porCobrar.reduce(
    (s, d) => s + d.saldo_capital_pendiente_usd,
    0,
  );
  const totalPorPagar = porPagar.reduce(
    (s, d) => s + d.saldo_capital_pendiente_usd,
    0,
  );
  const totalInteresesPendientes = porPagar.reduce((s, d) => {
    const abonado = d.total_abonado_interes_usd;
    const interesTotal = d.monto_interes_fijo_usd;
    return s + Math.max(0, interesTotal - abonado);
  }, 0);

  // ── MUTACIONES ──
  const registrarAbono = useCallback(
    async (datos: AbonoInput): Promise<boolean> => {
      try {
        await insertAbono(db, datos);
        // Si el saldo capital queda en 0, marcar como pagada automáticamente
        const deudas = await getDeudasConPersona(db);
        const deuda = deudas.find((d) => d.id === datos.deuda_id);
        if (
          deuda &&
          datos.tipo_abono === 'CAPITAL' &&
          deuda.saldo_capital_pendiente_usd <= 0.01
        ) {
          await marcarDeudaPagada(db, datos.deuda_id);
        }
        await cargarDeudas();
        return true;
      } catch (e) {
        console.error('[useDeudas] registrarAbono:', e);
        return false;
      }
    },
    [db, cargarDeudas],
  );

  const eliminarAbono = useCallback(
    async (id: number): Promise<boolean> => {
      try {
        await deleteAbono(db, id);
        await cargarDeudas();
        return true;
      } catch (e) {
        console.error('[useDeudas] eliminarAbono:', e);
        return false;
      }
    },
    [db, cargarDeudas],
  );

  const nuevaDeuda = useCallback(
    async (
      personaDatos: PersonaInput,
      deudaDatos: Omit<DeudaInput, 'persona_id'>,
    ): Promise<boolean> => {
      try {
        const personaId = await insertPersona(db, personaDatos);
        await insertDeuda(db, { ...deudaDatos, persona_id: personaId });
        await cargarDeudas();
        return true;
      } catch (e) {
        console.error('[useDeudas] nuevaDeuda:', e);
        return false;
      }
    },
    [db, cargarDeudas],
  );

  const cerrarDeuda = useCallback(
    async (id: number): Promise<boolean> => {
      try {
        await marcarDeudaPagada(db, id);
        await cargarDeudas();
        return true;
      } catch (e) {
        console.error('[useDeudas] cerrarDeuda:', e);
        return false;
      }
    },
    [db, cargarDeudas],
  );

  return {
    porCobrar,
    porPagar,
    totalPorCobrar,
    totalPorPagar,
    totalInteresesPendientes,
    tasaGlobal,
    cargando,
    error,
    refrescar: cargarDeudas,
    registrarAbono,
    eliminarAbono,
    nuevaDeuda,
    cerrarDeuda,
  };
}

// ============================================================
// HOOK DE ABONOS POR DEUDA INDIVIDUAL
// ============================================================
export function useAbonosDeuda(deudaId: number | null) {
  const db = useSQLiteContext();
  const [abonos, setAbonos] = useState<AbonoDeuda[]>([]);
  const [cargando, setCargando] = useState(false);

  const cargar = useCallback(async () => {
    if (!deudaId) return;
    setCargando(true);
    try {
      const data = await getAbonosByDeuda(db, deudaId);
      setAbonos(data);
    } catch (e) {
      console.error('[useAbonosDeuda]', e);
    } finally {
      setCargando(false);
    }
  }, [db, deudaId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return { abonos, cargando, refrescar: cargar };
}
