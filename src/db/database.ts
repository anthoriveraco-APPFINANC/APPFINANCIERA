// ============================================================
// DATABASE.TS — App Financiera Personal
// expo-sqlite SDK 57 · Nueva API (SQLiteProvider / useSQLiteContext)
// ============================================================

import * as SQLite from 'expo-sqlite';
import { DB_NAME, DEFAULT_TASA_BS_USD } from '../constants';
import type {
  Ajustes,
  Persona,
  PersonaInput,
  DeudaCompromiso,
  DeudaInput,
  DeudaConPersona,
  AbonoDeuda,
  AbonoInput,
  Gasto,
  GastoInput,
  Ingreso,
  IngresoInput,
  Inversion,
  InversionInput,
  MovimientoInversion,
  MovimientoInversionInput,
  ResumenDashboard,
  TipoDeuda,
  EstadoDeuda,
  TipoGasto,
} from '../types';

// ============================================================
// INICIALIZACIÓN Y MIGRACIÓN DEL ESQUEMA
// ============================================================

/**
 * Ejecuta la creación de todas las tablas y los ajustes por defecto.
 * Se llama desde el SQLiteProvider en _layout.tsx con `onInit`.
 */
export async function initDatabase(db: SQLite.SQLiteDatabase): Promise<void> {
  // Habilitar claves foráneas
  await db.execAsync('PRAGMA foreign_keys = ON;');

  // Crear todas las tablas en una sola transacción
  await db.execAsync(`
    -- Personas (Acreedores y Deudores)
    CREATE TABLE IF NOT EXISTS personas (
      id   INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      tipo   TEXT CHECK(tipo IN ('DEUDOR','ACREEDOR','AMBOS')) NOT NULL,
      nota   TEXT
    );

    -- Registros de Deudas y Cuentas por Cobrar
    CREATE TABLE IF NOT EXISTS deudas_compromisos (
      id                      INTEGER PRIMARY KEY AUTOINCREMENT,
      persona_id              INTEGER NOT NULL,
      tipo                    TEXT CHECK(tipo IN ('POR_COBRAR','POR_PAGAR')) NOT NULL,
      monto_capital_usd       REAL NOT NULL,
      monto_interes_fijo_usd  REAL DEFAULT 0.0,
      dia_vencimiento_mensual INTEGER,
      es_recurrente           INTEGER DEFAULT 0,
      estado                  TEXT CHECK(estado IN ('ACTIVA','PAGADA','CANCELADA')) DEFAULT 'ACTIVA',
      descripcion             TEXT,
      FOREIGN KEY(persona_id) REFERENCES personas(id)
    );

    -- Historial de Abonos y Pagos de Deudas
    CREATE TABLE IF NOT EXISTS abonos_deudas (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      deuda_id          INTEGER NOT NULL,
      tipo_abono        TEXT CHECK(tipo_abono IN ('CAPITAL','INTERES')) NOT NULL,
      moneda_original   TEXT CHECK(moneda_original IN ('USD','BS')) NOT NULL,
      monto_original    REAL NOT NULL,
      tasa_cambio       REAL DEFAULT 1.0,
      monto_usd         REAL NOT NULL,
      fecha             TEXT NOT NULL,
      detalle           TEXT,
      referencia_pago   TEXT,
      comprobante_uri   TEXT,
      FOREIGN KEY(deuda_id) REFERENCES deudas_compromisos(id)
    );

    -- Gastos Personales y Operativos / Producción
    CREATE TABLE IF NOT EXISTS gastos (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      tipo_gasto       TEXT CHECK(tipo_gasto IN ('PERSONAL','NEGOCIO_PRODUCCION')) DEFAULT 'PERSONAL',
      categoria        TEXT NOT NULL,
      descripcion      TEXT,
      moneda_original  TEXT CHECK(moneda_original IN ('USD','BS')) NOT NULL,
      monto_original   REAL NOT NULL,
      tasa_cambio      REAL DEFAULT 1.0,
      monto_usd        REAL NOT NULL,
      fecha            TEXT NOT NULL,
      metodo_pago      TEXT,
      comprobante_uri  TEXT
    );

    -- Ingresos, Salarios y Entradas de Dinero
    CREATE TABLE IF NOT EXISTS ingresos (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      categoria        TEXT NOT NULL,
      descripcion      TEXT,
      moneda_original  TEXT CHECK(moneda_original IN ('USD','BS')) NOT NULL,
      monto_original   REAL NOT NULL,
      tasa_cambio      REAL DEFAULT 1.0,
      monto_usd        REAL NOT NULL,
      fecha            TEXT NOT NULL,
      metodo_pago      TEXT,
      comprobante_uri  TEXT
    );

    -- Portafolio de Inversiones (Activos)
    CREATE TABLE IF NOT EXISTS inversiones (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre           TEXT NOT NULL,
      tipo             TEXT NOT NULL,
      monto_inicial_usd REAL NOT NULL,
      valor_actual_usd  REAL NOT NULL,
      estado           TEXT CHECK(estado IN ('ACTIVA','LIQUIDADA')) DEFAULT 'ACTIVA',
      fecha_inicio     TEXT NOT NULL
    );

    -- Movimientos de Inversión (Aportes y Retornos)
    CREATE TABLE IF NOT EXISTS movimientos_inversion (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      inversion_id     INTEGER NOT NULL,
      tipo_movimiento  TEXT CHECK(tipo_movimiento IN ('APORTE','RETIRO_CAPITAL','GANANCIA_RENDIMIENTO')) NOT NULL,
      moneda_original  TEXT CHECK(moneda_original IN ('USD','BS')) NOT NULL,
      monto_original   REAL NOT NULL,
      tasa_cambio      REAL DEFAULT 1.0,
      monto_usd        REAL NOT NULL,
      fecha            TEXT NOT NULL,
      FOREIGN KEY(inversion_id) REFERENCES inversiones(id)
    );

    -- Ajustes Generales del Sistema (fila única id=1)
    CREATE TABLE IF NOT EXISTS ajustes (
      id                INTEGER PRIMARY KEY CHECK (id = 1),
      tasa_global_bs_usd REAL DEFAULT ${DEFAULT_TASA_BS_USD},
      modo_oscuro       INTEGER DEFAULT 1,
      usar_biometria    INTEGER DEFAULT 1,
      ocultar_saldos    INTEGER DEFAULT 0
    );

    -- Tabla de control de migraciones / seed
    CREATE TABLE IF NOT EXISTS _meta (
      clave TEXT PRIMARY KEY,
      valor TEXT NOT NULL
    );
  `);

  // Insertar ajustes por defecto si no existen (INSERT OR IGNORE)
  await db.runAsync(
    `INSERT OR IGNORE INTO ajustes (id, tasa_global_bs_usd, modo_oscuro, usar_biometria, ocultar_saldos)
     VALUES (1, ?, 1, 1, 0)`,
    [DEFAULT_TASA_BS_USD],
  );
}

// ============================================================
// HELPERS INTERNOS
// ============================================================

function toBoolean(val: number): boolean {
  return val === 1;
}

// ============================================================
// CRUD — AJUSTES
// ============================================================

export async function getAjustes(db: SQLite.SQLiteDatabase): Promise<Ajustes> {
  const row = await db.getFirstAsync<Ajustes>(
    'SELECT * FROM ajustes WHERE id = 1',
  );
  if (!row) {
    // Fallback de seguridad
    return {
      id: 1,
      tasa_global_bs_usd: DEFAULT_TASA_BS_USD,
      modo_oscuro: 1,
      usar_biometria: 1,
      ocultar_saldos: 0,
    };
  }
  return row;
}

export async function updateAjustes(
  db: SQLite.SQLiteDatabase,
  datos: Partial<Omit<Ajustes, 'id'>>,
): Promise<void> {
  const campos = Object.keys(datos) as (keyof Omit<Ajustes, 'id'>)[];
  if (campos.length === 0) return;
  const sets = campos.map((c) => `${c} = ?`).join(', ');
  const valores = campos.map((c) => datos[c]);
  await db.runAsync(`UPDATE ajustes SET ${sets} WHERE id = 1`, valores as SQLite.SQLiteBindValue[]);
}

export async function getTasa(db: SQLite.SQLiteDatabase): Promise<number> {
  const aj = await getAjustes(db);
  return aj.tasa_global_bs_usd;
}

// ============================================================
// CRUD — PERSONAS
// ============================================================

export async function getPersonas(
  db: SQLite.SQLiteDatabase,
): Promise<Persona[]> {
  return db.getAllAsync<Persona>('SELECT * FROM personas ORDER BY nombre ASC');
}

export async function getPersonaById(
  db: SQLite.SQLiteDatabase,
  id: number,
): Promise<Persona | null> {
  return db.getFirstAsync<Persona>('SELECT * FROM personas WHERE id = ?', [id]);
}

export async function insertPersona(
  db: SQLite.SQLiteDatabase,
  datos: PersonaInput,
): Promise<number> {
  const result = await db.runAsync(
    'INSERT INTO personas (nombre, tipo, nota) VALUES (?, ?, ?)',
    [datos.nombre, datos.tipo, datos.nota ?? null],
  );
  return result.lastInsertRowId;
}

export async function updatePersona(
  db: SQLite.SQLiteDatabase,
  id: number,
  datos: Partial<PersonaInput>,
): Promise<void> {
  const campos = Object.keys(datos) as (keyof PersonaInput)[];
  if (campos.length === 0) return;
  const sets = campos.map((c) => `${c} = ?`).join(', ');
  const valores = campos.map((c) => datos[c]);
  await db.runAsync(
    `UPDATE personas SET ${sets} WHERE id = ?`,
    [...valores, id] as SQLite.SQLiteBindValue[],
  );
}

export async function deletePersona(
  db: SQLite.SQLiteDatabase,
  id: number,
): Promise<void> {
  await db.runAsync('DELETE FROM personas WHERE id = ?', [id]);
}

// ============================================================
// CRUD — DEUDAS Y COMPROMISOS
// ============================================================

export async function getDeudas(
  db: SQLite.SQLiteDatabase,
  filtros?: { tipo?: TipoDeuda; estado?: EstadoDeuda },
): Promise<DeudaCompromiso[]> {
  let query = 'SELECT * FROM deudas_compromisos WHERE 1=1';
  const params: SQLite.SQLiteBindValue[] = [];
  if (filtros?.tipo) {
    query += ' AND tipo = ?';
    params.push(filtros.tipo);
  }
  if (filtros?.estado) {
    query += ' AND estado = ?';
    params.push(filtros.estado);
  }
  query += ' ORDER BY id DESC';
  return db.getAllAsync<DeudaCompromiso>(query, params);
}

/**
 * Retorna deudas enriquecidas con nombre de persona y saldos calculados
 */
export async function getDeudasConPersona(
  db: SQLite.SQLiteDatabase,
  tipo?: TipoDeuda,
): Promise<DeudaConPersona[]> {
  const tipoFiltro = tipo ? `AND dc.tipo = '${tipo}'` : '';
  const rows = await db.getAllAsync<{
    id: number;
    persona_id: number;
    tipo: TipoDeuda;
    monto_capital_usd: number;
    monto_interes_fijo_usd: number;
    dia_vencimiento_mensual: number | null;
    es_recurrente: number;
    estado: EstadoDeuda;
    descripcion: string | null;
    persona_nombre: string;
    persona_tipo: string;
    total_abonado_capital_usd: number;
    total_abonado_interes_usd: number;
  }>(`
    SELECT
      dc.*,
      p.nombre  AS persona_nombre,
      p.tipo    AS persona_tipo,
      COALESCE((
        SELECT SUM(a.monto_usd)
        FROM abonos_deudas a
        WHERE a.deuda_id = dc.id AND a.tipo_abono = 'CAPITAL'
      ), 0.0) AS total_abonado_capital_usd,
      COALESCE((
        SELECT SUM(a.monto_usd)
        FROM abonos_deudas a
        WHERE a.deuda_id = dc.id AND a.tipo_abono = 'INTERES'
      ), 0.0) AS total_abonado_interes_usd
    FROM deudas_compromisos dc
    JOIN personas p ON p.id = dc.persona_id
    WHERE dc.estado = 'ACTIVA'
    ${tipoFiltro}
    ORDER BY dc.id DESC
  `);

  return rows.map((r) => ({
    ...r,
    dia_vencimiento_mensual: r.dia_vencimiento_mensual ?? undefined,
    descripcion: r.descripcion ?? undefined,
    persona_tipo: r.persona_tipo as import('../types').TipoPersona,
    saldo_capital_pendiente_usd: Math.max(
      0,
      r.monto_capital_usd - r.total_abonado_capital_usd,
    ),
  }));
}

export async function getDeudaById(
  db: SQLite.SQLiteDatabase,
  id: number,
): Promise<DeudaCompromiso | null> {
  return db.getFirstAsync<DeudaCompromiso>(
    'SELECT * FROM deudas_compromisos WHERE id = ?',
    [id],
  );
}

export async function insertDeuda(
  db: SQLite.SQLiteDatabase,
  datos: DeudaInput,
): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO deudas_compromisos
       (persona_id, tipo, monto_capital_usd, monto_interes_fijo_usd,
        dia_vencimiento_mensual, es_recurrente, estado, descripcion)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      datos.persona_id,
      datos.tipo,
      datos.monto_capital_usd,
      datos.monto_interes_fijo_usd,
      datos.dia_vencimiento_mensual ?? null,
      datos.es_recurrente,
      datos.estado,
      datos.descripcion ?? null,
    ],
  );
  return result.lastInsertRowId;
}

export async function updateDeuda(
  db: SQLite.SQLiteDatabase,
  id: number,
  datos: Partial<DeudaInput>,
): Promise<void> {
  const campos = Object.keys(datos) as (keyof DeudaInput)[];
  if (campos.length === 0) return;
  const sets = campos.map((c) => `${c} = ?`).join(', ');
  const valores = campos.map((c) => datos[c]);
  await db.runAsync(
    `UPDATE deudas_compromisos SET ${sets} WHERE id = ?`,
    [...valores, id] as SQLite.SQLiteBindValue[],
  );
}

export async function marcarDeudaPagada(
  db: SQLite.SQLiteDatabase,
  id: number,
): Promise<void> {
  await db.runAsync(
    "UPDATE deudas_compromisos SET estado = 'PAGADA' WHERE id = ?",
    [id],
  );
}

// ============================================================
// CRUD — ABONOS DE DEUDAS
// ============================================================

export async function getAbonosByDeuda(
  db: SQLite.SQLiteDatabase,
  deudaId: number,
): Promise<AbonoDeuda[]> {
  return db.getAllAsync<AbonoDeuda>(
    'SELECT * FROM abonos_deudas WHERE deuda_id = ? ORDER BY fecha DESC',
    [deudaId],
  );
}

export async function insertAbono(
  db: SQLite.SQLiteDatabase,
  datos: AbonoInput,
): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO abonos_deudas
       (deuda_id, tipo_abono, moneda_original, monto_original,
        tasa_cambio, monto_usd, fecha, detalle, referencia_pago, comprobante_uri)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      datos.deuda_id,
      datos.tipo_abono,
      datos.moneda_original,
      datos.monto_original,
      datos.tasa_cambio,
      datos.monto_usd,
      datos.fecha,
      datos.detalle ?? null,
      datos.referencia_pago ?? null,
      datos.comprobante_uri ?? null,
    ],
  );
  return result.lastInsertRowId;
}

export async function deleteAbono(
  db: SQLite.SQLiteDatabase,
  id: number,
): Promise<void> {
  await db.runAsync('DELETE FROM abonos_deudas WHERE id = ?', [id]);
}

// ============================================================
// CRUD — GASTOS
// ============================================================

export async function getGastos(
  db: SQLite.SQLiteDatabase,
  filtros?: {
    tipo_gasto?: TipoGasto;
    categoria?: string;
    desde?: string; // YYYY-MM-DD
    hasta?: string; // YYYY-MM-DD
    limite?: number;
  },
): Promise<Gasto[]> {
  let query = 'SELECT * FROM gastos WHERE 1=1';
  const params: SQLite.SQLiteBindValue[] = [];

  if (filtros?.tipo_gasto) {
    query += ' AND tipo_gasto = ?';
    params.push(filtros.tipo_gasto);
  }
  if (filtros?.categoria) {
    query += ' AND categoria = ?';
    params.push(filtros.categoria);
  }
  if (filtros?.desde) {
    query += ' AND fecha >= ?';
    params.push(filtros.desde);
  }
  if (filtros?.hasta) {
    query += ' AND fecha <= ?';
    params.push(filtros.hasta);
  }
  query += ' ORDER BY fecha DESC';
  if (filtros?.limite) {
    query += ' LIMIT ?';
    params.push(filtros.limite);
  }

  return db.getAllAsync<Gasto>(query, params);
}

export async function insertGasto(
  db: SQLite.SQLiteDatabase,
  datos: GastoInput,
): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO gastos
       (tipo_gasto, categoria, descripcion, moneda_original,
        monto_original, tasa_cambio, monto_usd, fecha, metodo_pago, comprobante_uri)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      datos.tipo_gasto,
      datos.categoria,
      datos.descripcion ?? null,
      datos.moneda_original,
      datos.monto_original,
      datos.tasa_cambio,
      datos.monto_usd,
      datos.fecha,
      datos.metodo_pago ?? null,
      datos.comprobante_uri ?? null,
    ],
  );
  return result.lastInsertRowId;
}

export async function updateGasto(
  db: SQLite.SQLiteDatabase,
  id: number,
  datos: Partial<GastoInput>,
): Promise<void> {
  const campos = Object.keys(datos) as (keyof GastoInput)[];
  if (campos.length === 0) return;
  const sets = campos.map((c) => `${c} = ?`).join(', ');
  const valores = campos.map((c) => datos[c]);
  await db.runAsync(
    `UPDATE gastos SET ${sets} WHERE id = ?`,
    [...valores, id] as SQLite.SQLiteBindValue[],
  );
}

export async function deleteGasto(
  db: SQLite.SQLiteDatabase,
  id: number,
): Promise<void> {
  await db.runAsync('DELETE FROM gastos WHERE id = ?', [id]);
}

// ============================================================
// CRUD — INGRESOS
// ============================================================

export async function getIngresos(
  db: SQLite.SQLiteDatabase,
  filtros?: {
    categoria?: string;
    desde?: string;
    hasta?: string;
    limite?: number;
  },
): Promise<Ingreso[]> {
  let query = 'SELECT * FROM ingresos WHERE 1=1';
  const params: SQLite.SQLiteBindValue[] = [];

  if (filtros?.categoria) {
    query += ' AND categoria = ?';
    params.push(filtros.categoria);
  }
  if (filtros?.desde) {
    query += ' AND fecha >= ?';
    params.push(filtros.desde);
  }
  if (filtros?.hasta) {
    query += ' AND fecha <= ?';
    params.push(filtros.hasta);
  }
  query += ' ORDER BY fecha DESC';
  if (filtros?.limite) {
    query += ' LIMIT ?';
    params.push(filtros.limite);
  }

  return db.getAllAsync<Ingreso>(query, params);
}

export async function insertIngreso(
  db: SQLite.SQLiteDatabase,
  datos: IngresoInput,
): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO ingresos
       (categoria, descripcion, moneda_original, monto_original,
        tasa_cambio, monto_usd, fecha, metodo_pago, comprobante_uri)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      datos.categoria,
      datos.descripcion ?? null,
      datos.moneda_original,
      datos.monto_original,
      datos.tasa_cambio,
      datos.monto_usd,
      datos.fecha,
      datos.metodo_pago ?? null,
      datos.comprobante_uri ?? null,
    ],
  );
  return result.lastInsertRowId;
}

export async function updateIngreso(
  db: SQLite.SQLiteDatabase,
  id: number,
  datos: Partial<IngresoInput>,
): Promise<void> {
  const campos = Object.keys(datos) as (keyof IngresoInput)[];
  if (campos.length === 0) return;
  const sets = campos.map((c) => `${c} = ?`).join(', ');
  const valores = campos.map((c) => datos[c]);
  await db.runAsync(
    `UPDATE ingresos SET ${sets} WHERE id = ?`,
    [...valores, id] as SQLite.SQLiteBindValue[],
  );
}

export async function deleteIngreso(
  db: SQLite.SQLiteDatabase,
  id: number,
): Promise<void> {
  await db.runAsync('DELETE FROM ingresos WHERE id = ?', [id]);
}

// ============================================================
// CRUD — INVERSIONES
// ============================================================

export async function getInversiones(
  db: SQLite.SQLiteDatabase,
  soloActivas = false,
): Promise<Inversion[]> {
  const query = soloActivas
    ? "SELECT * FROM inversiones WHERE estado = 'ACTIVA' ORDER BY fecha_inicio DESC"
    : 'SELECT * FROM inversiones ORDER BY fecha_inicio DESC';
  return db.getAllAsync<Inversion>(query);
}

export async function getInversionById(
  db: SQLite.SQLiteDatabase,
  id: number,
): Promise<Inversion | null> {
  return db.getFirstAsync<Inversion>(
    'SELECT * FROM inversiones WHERE id = ?',
    [id],
  );
}

export async function insertInversion(
  db: SQLite.SQLiteDatabase,
  datos: InversionInput,
): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO inversiones
       (nombre, tipo, monto_inicial_usd, valor_actual_usd, estado, fecha_inicio)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      datos.nombre,
      datos.tipo,
      datos.monto_inicial_usd,
      datos.valor_actual_usd,
      datos.estado,
      datos.fecha_inicio,
    ],
  );
  return result.lastInsertRowId;
}

export async function updateValorInversion(
  db: SQLite.SQLiteDatabase,
  id: number,
  nuevoValorUsd: number,
): Promise<void> {
  await db.runAsync(
    'UPDATE inversiones SET valor_actual_usd = ? WHERE id = ?',
    [nuevoValorUsd, id],
  );
}

export async function liquidarInversion(
  db: SQLite.SQLiteDatabase,
  id: number,
): Promise<void> {
  await db.runAsync(
    "UPDATE inversiones SET estado = 'LIQUIDADA' WHERE id = ?",
    [id],
  );
}

// ============================================================
// CRUD — MOVIMIENTOS DE INVERSIÓN
// ============================================================

export async function getMovimientosByInversion(
  db: SQLite.SQLiteDatabase,
  inversionId: number,
): Promise<MovimientoInversion[]> {
  return db.getAllAsync<MovimientoInversion>(
    'SELECT * FROM movimientos_inversion WHERE inversion_id = ? ORDER BY fecha DESC',
    [inversionId],
  );
}

export async function insertMovimientoInversion(
  db: SQLite.SQLiteDatabase,
  datos: MovimientoInversionInput,
): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO movimientos_inversion
       (inversion_id, tipo_movimiento, moneda_original, monto_original,
        tasa_cambio, monto_usd, fecha)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      datos.inversion_id,
      datos.tipo_movimiento,
      datos.moneda_original,
      datos.monto_original,
      datos.tasa_cambio,
      datos.monto_usd,
      datos.fecha,
    ],
  );

  // Si es ganancia, registrar también como ingreso automáticamente
  if (datos.tipo_movimiento === 'GANANCIA_RENDIMIENTO') {
    const inv = await getInversionById(db, datos.inversion_id);
    await insertIngreso(db, {
      categoria: 'Rendimiento Inversión',
      descripcion: `Ganancia de inversión: ${inv?.nombre ?? 'ID ' + datos.inversion_id}`,
      moneda_original: datos.moneda_original,
      monto_original: datos.monto_original,
      tasa_cambio: datos.tasa_cambio,
      monto_usd: datos.monto_usd,
      fecha: datos.fecha,
      metodo_pago: undefined,
    });

    // Actualizar valor actual de la inversión
    if (inv) {
      await updateValorInversion(
        db,
        datos.inversion_id,
        inv.valor_actual_usd + datos.monto_usd,
      );
    }
  }

  // Si es aporte, incrementar valor actual
  if (datos.tipo_movimiento === 'APORTE') {
    const inv = await getInversionById(db, datos.inversion_id);
    if (inv) {
      await updateValorInversion(
        db,
        datos.inversion_id,
        inv.valor_actual_usd + datos.monto_usd,
      );
    }
  }

  // Si es retiro de capital, decrementar valor actual
  if (datos.tipo_movimiento === 'RETIRO_CAPITAL') {
    const inv = await getInversionById(db, datos.inversion_id);
    if (inv) {
      await updateValorInversion(
        db,
        datos.inversion_id,
        Math.max(0, inv.valor_actual_usd - datos.monto_usd),
      );
    }
  }

  return result.lastInsertRowId;
}

// ============================================================
// QUERIES CONSOLIDADAS — DASHBOARD
// ============================================================

export async function getResumenDashboard(
  db: SQLite.SQLiteDatabase,
): Promise<ResumenDashboard> {
  const hoy = new Date();
  const primerDiaMes = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-01`;
  const ultimoDiaMes = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-31`;

  // Ingresos del mes
  const ingRow = await db.getFirstAsync<{ total: number }>(
    'SELECT COALESCE(SUM(monto_usd), 0) AS total FROM ingresos WHERE fecha >= ? AND fecha <= ?',
    [primerDiaMes, ultimoDiaMes],
  );

  // Gastos del mes (total)
  const gasRow = await db.getFirstAsync<{ total: number }>(
    'SELECT COALESCE(SUM(monto_usd), 0) AS total FROM gastos WHERE fecha >= ? AND fecha <= ?',
    [primerDiaMes, ultimoDiaMes],
  );

  // Gastos personales del mes
  const gasPerRow = await db.getFirstAsync<{ total: number }>(
    "SELECT COALESCE(SUM(monto_usd), 0) AS total FROM gastos WHERE tipo_gasto = 'PERSONAL' AND fecha >= ? AND fecha <= ?",
    [primerDiaMes, ultimoDiaMes],
  );

  // Gastos negocio del mes
  const gasNegRow = await db.getFirstAsync<{ total: number }>(
    "SELECT COALESCE(SUM(monto_usd), 0) AS total FROM gastos WHERE tipo_gasto = 'NEGOCIO_PRODUCCION' AND fecha >= ? AND fecha <= ?",
    [primerDiaMes, ultimoDiaMes],
  );

  // Total por cobrar (deudas activas POR_COBRAR = saldo capital pendiente)
  const cobrarRow = await db.getFirstAsync<{ total: number }>(`
    SELECT COALESCE(SUM(
      dc.monto_capital_usd -
      COALESCE((SELECT SUM(a.monto_usd) FROM abonos_deudas a
                WHERE a.deuda_id = dc.id AND a.tipo_abono = 'CAPITAL'), 0)
    ), 0) AS total
    FROM deudas_compromisos dc
    WHERE dc.tipo = 'POR_COBRAR' AND dc.estado = 'ACTIVA'
  `);

  // Total por pagar (deudas activas POR_PAGAR = saldo capital pendiente)
  const pagarRow = await db.getFirstAsync<{ total: number }>(`
    SELECT COALESCE(SUM(
      dc.monto_capital_usd -
      COALESCE((SELECT SUM(a.monto_usd) FROM abonos_deudas a
                WHERE a.deuda_id = dc.id AND a.tipo_abono = 'CAPITAL'), 0)
    ), 0) AS total
    FROM deudas_compromisos dc
    WHERE dc.tipo = 'POR_PAGAR' AND dc.estado = 'ACTIVA'
  `);

  // Total inversiones activas (valor actual)
  const invRow = await db.getFirstAsync<{ total: number }>(
    "SELECT COALESCE(SUM(valor_actual_usd), 0) AS total FROM inversiones WHERE estado = 'ACTIVA'",
  );

  // Tasa global
  const ajustes = await getAjustes(db);

  const ingresos_mes = ingRow?.total ?? 0;
  const gastos_mes = gasRow?.total ?? 0;

  return {
    ingresos_mes_usd: ingresos_mes,
    gastos_mes_usd: gastos_mes,
    gastos_personales_mes_usd: gasPerRow?.total ?? 0,
    gastos_negocio_mes_usd: gasNegRow?.total ?? 0,
    total_por_cobrar_usd: Math.max(0, cobrarRow?.total ?? 0),
    total_por_pagar_usd: Math.max(0, pagarRow?.total ?? 0),
    total_inversiones_activas_usd: invRow?.total ?? 0,
    liquidez_neta_usd: ingresos_mes - gastos_mes,
    tasa_global: ajustes.tasa_global_bs_usd,
  };
}

// ============================================================
// BACKUP Y EXPORTACIÓN JSON
// ============================================================

export async function exportarDatosJSON(
  db: SQLite.SQLiteDatabase,
): Promise<string> {
  const [
    ajustes,
    personas,
    deudas,
    abonos,
    gastos,
    ingresos,
    inversiones,
    movimientos,
  ] = await Promise.all([
    db.getAllAsync('SELECT * FROM ajustes'),
    db.getAllAsync('SELECT * FROM personas'),
    db.getAllAsync('SELECT * FROM deudas_compromisos'),
    db.getAllAsync('SELECT * FROM abonos_deudas'),
    db.getAllAsync('SELECT * FROM gastos'),
    db.getAllAsync('SELECT * FROM ingresos'),
    db.getAllAsync('SELECT * FROM inversiones'),
    db.getAllAsync('SELECT * FROM movimientos_inversion'),
  ]);

  const backup = {
    version: '1.0.0',
    fecha_exportacion: new Date().toISOString(),
    datos: {
      ajustes,
      personas,
      deudas_compromisos: deudas,
      abonos_deudas: abonos,
      gastos,
      ingresos,
      inversiones,
      movimientos_inversion: movimientos,
    },
  };

  return JSON.stringify(backup, null, 2);
}

/**
 * Importa un JSON de backup (DESTRUCTIVO: borra todo y recrea)
 * Retorna true si fue exitoso
 */
export async function importarDatosJSON(
  db: SQLite.SQLiteDatabase,
  jsonString: string,
): Promise<boolean> {
  try {
    const backup = JSON.parse(jsonString);
    if (!backup?.datos) return false;

    const d = backup.datos;

    await db.withTransactionAsync(async () => {
      // Limpiar tablas en orden seguro (respetar FKs)
      await db.execAsync(`
        DELETE FROM movimientos_inversion;
        DELETE FROM abonos_deudas;
        DELETE FROM gastos;
        DELETE FROM ingresos;
        DELETE FROM inversiones;
        DELETE FROM deudas_compromisos;
        DELETE FROM personas;
        DELETE FROM ajustes;
      `);

      // Restaurar ajustes
      for (const row of d.ajustes ?? []) {
        await db.runAsync(
          `INSERT INTO ajustes (id, tasa_global_bs_usd, modo_oscuro, usar_biometria, ocultar_saldos)
           VALUES (?, ?, ?, ?, ?)`,
          [row.id, row.tasa_global_bs_usd, row.modo_oscuro, row.usar_biometria, row.ocultar_saldos],
        );
      }

      // Restaurar personas
      for (const row of d.personas ?? []) {
        await db.runAsync(
          'INSERT INTO personas (id, nombre, tipo, nota) VALUES (?, ?, ?, ?)',
          [row.id, row.nombre, row.tipo, row.nota],
        );
      }

      // Restaurar deudas
      for (const row of d.deudas_compromisos ?? []) {
        await db.runAsync(
          `INSERT INTO deudas_compromisos
             (id, persona_id, tipo, monto_capital_usd, monto_interes_fijo_usd,
              dia_vencimiento_mensual, es_recurrente, estado, descripcion)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            row.id, row.persona_id, row.tipo, row.monto_capital_usd,
            row.monto_interes_fijo_usd, row.dia_vencimiento_mensual,
            row.es_recurrente, row.estado, row.descripcion,
          ],
        );
      }

      // Restaurar abonos
      for (const row of d.abonos_deudas ?? []) {
        await db.runAsync(
          `INSERT INTO abonos_deudas
             (id, deuda_id, tipo_abono, moneda_original, monto_original,
              tasa_cambio, monto_usd, fecha, detalle, referencia_pago, comprobante_uri)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            row.id, row.deuda_id, row.tipo_abono, row.moneda_original,
            row.monto_original, row.tasa_cambio, row.monto_usd, row.fecha,
            row.detalle, row.referencia_pago, row.comprobante_uri,
          ],
        );
      }

      // Restaurar gastos
      for (const row of d.gastos ?? []) {
        await db.runAsync(
          `INSERT INTO gastos
             (id, tipo_gasto, categoria, descripcion, moneda_original,
              monto_original, tasa_cambio, monto_usd, fecha, metodo_pago, comprobante_uri)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            row.id, row.tipo_gasto, row.categoria, row.descripcion,
            row.moneda_original, row.monto_original, row.tasa_cambio,
            row.monto_usd, row.fecha, row.metodo_pago, row.comprobante_uri,
          ],
        );
      }

      // Restaurar ingresos
      for (const row of d.ingresos ?? []) {
        await db.runAsync(
          `INSERT INTO ingresos
             (id, categoria, descripcion, moneda_original, monto_original,
              tasa_cambio, monto_usd, fecha, metodo_pago, comprobante_uri)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            row.id, row.categoria, row.descripcion, row.moneda_original,
            row.monto_original, row.tasa_cambio, row.monto_usd, row.fecha,
            row.metodo_pago, row.comprobante_uri,
          ],
        );
      }

      // Restaurar inversiones
      for (const row of d.inversiones ?? []) {
        await db.runAsync(
          `INSERT INTO inversiones
             (id, nombre, tipo, monto_inicial_usd, valor_actual_usd, estado, fecha_inicio)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            row.id, row.nombre, row.tipo, row.monto_inicial_usd,
            row.valor_actual_usd, row.estado, row.fecha_inicio,
          ],
        );
      }

      // Restaurar movimientos
      for (const row of d.movimientos_inversion ?? []) {
        await db.runAsync(
          `INSERT INTO movimientos_inversion
             (id, inversion_id, tipo_movimiento, moneda_original, monto_original,
              tasa_cambio, monto_usd, fecha)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            row.id, row.inversion_id, row.tipo_movimiento, row.moneda_original,
            row.monto_original, row.tasa_cambio, row.monto_usd, row.fecha,
          ],
        );
      }
    });

    return true;
  } catch (e) {
    console.error('[DB] Error al importar JSON:', e);
    return false;
  }
}

// ============================================================
// META — Control de seed / migraciones
// ============================================================

export async function getMetaValor(
  db: SQLite.SQLiteDatabase,
  clave: string,
): Promise<string | null> {
  const row = await db.getFirstAsync<{ valor: string }>(
    'SELECT valor FROM _meta WHERE clave = ?',
    [clave],
  );
  return row?.valor ?? null;
}

export async function setMetaValor(
  db: SQLite.SQLiteDatabase,
  clave: string,
  valor: string,
): Promise<void> {
  await db.runAsync(
    'INSERT OR REPLACE INTO _meta (clave, valor) VALUES (?, ?)',
    [clave, valor],
  );
}
