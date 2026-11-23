import pg from 'pg';

const { Pool } = pg;
const types = [
  'Taladro percutor inalámbrico',
  'Sierra circular eléctrica',
  'Amoladora angular 4-1/2',
  'Martillo carpintero 16oz',
  'Set de destornilladores aislados',
  'Lijadora orbital compacta',
  'Llave francesa ajustable 10 pulg',
  'Juego de llaves combinadas',
  'Caja portaherramientas metálica',
  'Cinta métrica autobloqueante 8m',
  'Nivel láser autonivelante 360',
  'Pistola de calor profesional',
  'Soldadora inverter 200A',
  'Compresor de aire 2HP',
  'Generador eléctrico a gasolina',
  'Bomba de agua periférica 1/2HP',
  'Manguera reforzada 25m',
  'Escalera de aluminio 6 peldaños',
  'Gafas de seguridad policarbonato',
  'Guantes de protección mecánica',
  'Pintura látex antibacterial 1 galón',
  'Rodillo profesional antigoteo',
  'Brocha para cerdas sintéticas 3 pulg',
  'Disco diamantado de corte 115mm',
  'Candado de latón macizo 50mm',
];
const imageUrls = [
  'https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=500&q=80',
  'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=500&q=80',
  'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=500&q=80',
  'https://images.unsplash.com/photo-1586864387967-d02ef85d93e8?w=500&q=80',
  'https://images.unsplash.com/photo-1581783898377-1c85bf937427?w=500&q=80',
  'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=500&q=80',
  'https://images.unsplash.com/photo-1611288875785-f62fb9b044a7?w=500&q=80',
  'https://images.unsplash.com/photo-1581166397057-235af2b3c6dd?w=500&q=80',
  'https://images.unsplash.com/photo-1530124566582-a618bc2615dc?w=500&q=80',
  'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=500&q=80',
  'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=500&q=80',
  'https://images.unsplash.com/photo-1581092162384-8987c1d64718?w=500&q=80',
  'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=500&q=80',
  'https://images.unsplash.com/photo-1616401784845-180882ba9ba8?w=500&q=80',
  'https://images.unsplash.com/photo-1581092334651-ddf26d9a09d0?w=500&q=80',
  'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=500&q=80',
  'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=500&q=80',
  'https://images.unsplash.com/photo-1570050785780-3c79854c7813?w=500&q=80',
  'https://images.unsplash.com/photo-1593854519602-687eae339d57?w=500&q=80',
  'https://images.unsplash.com/photo-1584483766114-2cea6facdf57?w=500&q=80',
  'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=500&q=80',
  'https://images.unsplash.com/photo-1525909002-1b05e0c869d8?w=500&q=80',
  'https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=500&q=80',
  'https://images.unsplash.com/photo-1560846389-956694677531?w=500&q=80',
  'https://images.unsplash.com/photo-1555529902-5261145633bf?w=500&q=80',
];
const brands = [
  'DeWalt',
  'Bosch Professional',
  'Makita',
  'Stanley',
  'Milwaukee',
  'Black+Decker',
  'Truper Expert',
  'Craftsman',
  'Total Tools',
  '3M Industrial',
];
const models = [
  'Heavy Duty V-100',
  'Pro Edition Max',
  'Extreme Torque 20V',
  'Titanium Precision',
  'Eco Powerline',
  'Ultra Durable X7',
  'Compact Force',
  'Master Series 3000',
  'Industrial Plus',
  'Turbo Grip Gen-2',
];

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL es obligatorio para cargar los productos.');
}

const products = Array.from({ length: 10000 }, (_, index) => {
  const i = index + 1;
  const type = types[(i * 7) % types.length];
  const brand = brands[(i * 13) % brands.length];
  const model = models[(i * 3) % models.length];

  return {
    name: `${type} ${brand} ${model}`,
    description: `Herramienta profesional: ${type} de alto rendimiento, marca ${brand}, ideal para trabajos exigentes en construcción, taller y hogar. Garantía oficial de fábrica y máxima durabilidad.`,
    imageUrl: imageUrls[(i * 7) % imageUrls.length],
    price: ((((i * 179) % 98050) / 100) + 4.5).toFixed(2),
    stock: 1 + ((i * 37) % 250),
  };
});

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

try {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query('LOCK TABLE producto IN EXCLUSIVE MODE');

    const { rows } = await client.query('SELECT COUNT(*)::int AS total FROM producto');
    if (rows[0].total === 0) {
      await client.query(
        `INSERT INTO producto (nombre, descripcion, urlimagen, pvp, stock)
         SELECT * FROM unnest(
           $1::varchar[], $2::text[], $3::varchar[], $4::numeric[], $5::integer[]
         )`,
        [
          products.map((product) => product.name),
          products.map((product) => product.description),
          products.map((product) => product.imageUrl),
          products.map((product) => product.price),
          products.map((product) => product.stock),
        ],
      );
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
