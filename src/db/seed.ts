// ============================================================
// SEED.TS — Cuantos Dolitas
// El seed ya NO se ejecuta automáticamente.
// La app arranca completamente vacía.
// Esta función puede llamarse manualmente desde Settings
// si el usuario quiere cargar datos de ejemplo.
// ============================================================

import * as SQLite from 'expo-sqlite';
import { SEED_KEY } from '../constants';
import { getMetaValor, setMetaValor } from './database';

/**
 * NO hace nada automáticamente.
 * La app arranca en blanco.
 */
export async function ejecutarSeedSiNecesario(
  _db: SQLite.SQLiteDatabase,
): Promise<void> {
  // App vacía por diseño — sin datos de ejemplo automáticos
  return;
}
