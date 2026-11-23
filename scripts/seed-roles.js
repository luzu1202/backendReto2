import pg from 'pg';

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL es obligatorio para cargar los roles.');
}

const roles = [
  ['ADMIN', 'Rol administrativo.'],
  ['USUARIO', 'Rol de usuario estándar.'],
];
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

try {
  await pool.query(
    `INSERT INTO rol (nombre, descripcion)
     VALUES ($1, $2), ($3, $4)
     ON CONFLICT (nombre) DO NOTHING`,
    roles.flat(),
  );

  const { rows } = await pool.query(
    'SELECT nombre FROM rol WHERE nombre = ANY($1::varchar[]) ORDER BY nombre',
    [roles.map(([nombre]) => nombre)],
  );
  const found = new Set(rows.map(({ nombre }) => nombre));
  if (roles.some(([nombre]) => !found.has(nombre))) {
    throw new Error('No se pudieron crear todos los roles predeterminados.');
  }

  process.stdout.write('Roles disponibles: ADMIN, USUARIO\n');
} finally {
  await pool.end();
}
