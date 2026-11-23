import { readFile } from 'node:fs/promises';
import pg from 'pg';

const { Pool } = pg;
const sourceSqlUrl = new URL('../../capa1_datos/base_de_datos.sql', import.meta.url);
const sourceSql = await readFile(sourceSqlUrl, 'utf8');
const insertStart = sourceSql.indexOf('INSERT INTO producto');
const insertEnd = sourceSql.indexOf('-- 4. VERIFICACIÓN', insertStart);

if (insertStart < 0 || insertEnd < 0) {
  throw new Error('No se encontró el bloque INSERT de productos en base_de_datos.sql.');
}

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL es obligatorio para cargar los productos.');
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

try {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query('LOCK TABLE producto IN EXCLUSIVE MODE');

    const { rows } = await client.query('SELECT COUNT(*)::int AS total FROM producto');
    if (rows[0].total === 0) {
      await client.query(sourceSql.slice(insertStart, insertEnd).trim());
    }

    const result = await client.query('SELECT COUNT(*)::int AS total FROM producto');
    if (result.rows[0].total < 10000) {
      throw new Error(`Se esperaban al menos 10000 productos; se encontraron ${result.rows[0].total}.`);
    }

    await client.query('COMMIT');
    process.stdout.write(`Productos disponibles en la base de datos: ${result.rows[0].total}\n`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
} finally {
  await pool.end();
}
