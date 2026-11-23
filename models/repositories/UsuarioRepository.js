import Database from '../database/Database.js';
import Usuario from '../entities/Usuario.js';
import { hashPassword } from '../security/password.js';

const publicFields = {
  id: true,
  nombre: true,
  email: true,
  activo: true,
  creadoEn: true,
  actualizadoEn: true,
};

class UsuarioRepository {
  constructor() {
    this.prisma = Database.getInstance().client;
  }

  async findAll({ limit = 20, offset = 0, search = '' } = {}) {
    const term = search.trim();
    const where = term
      ? {
          OR: [
            { nombre: { contains: term, mode: 'insensitive' } },
            { email: { contains: term, mode: 'insensitive' } },
          ],
        }
      : {};

    const [total, rows] = await Promise.all([
      this.prisma.usuario.count({ where }),
      this.prisma.usuario.findMany({
        where,
        select: publicFields,
        orderBy: { id: 'asc' },
        skip: offset,
        take: limit,
      }),
    ]);

    return { total, items: rows.map((row) => new Usuario(row).toJSON()) };
  }

  async findById(id) {
    const row = await this.prisma.usuario.findUnique({
      where: { id: Number(id) },
      select: publicFields,
    });

    return row ? new Usuario(row).toJSON() : null;
  }

  async create({ nombre, email, password, activo }) {
    const passwordHash = await hashPassword(password);
    const row = await this.prisma.usuario.create({
      data: {
        nombre,
        email: email.toLowerCase(),
        passwordHash,
        ...(activo === undefined ? {} : { activo }),
      },
      select: publicFields,
    });

    return new Usuario(row).toJSON();
  }

  async update(id, { nombre, email, password, activo }) {
    try {
      const row = await this.prisma.usuario.update({
        where: { id: Number(id) },
        data: {
          nombre,
          email: email.toLowerCase(),
          passwordHash: await hashPassword(password),
          ...(activo === undefined ? {} : { activo }),
        },
        select: publicFields,
      });

      return new Usuario(row).toJSON();
    } catch (error) {
      if (error.code === 'P2025') return null;
      throw error;
    }
  }

  async partialUpdate(id, fields) {
    const data = {};
    if (fields.nombre !== undefined) data.nombre = fields.nombre;
    if (fields.email !== undefined) data.email = fields.email.toLowerCase();
    if (fields.password !== undefined) data.passwordHash = await hashPassword(fields.password);
    if (fields.activo !== undefined) data.activo = fields.activo;

    try {
      const row = await this.prisma.usuario.update({
        where: { id: Number(id) },
        data,
        select: publicFields,
      });

      return new Usuario(row).toJSON();
    } catch (error) {
      if (error.code === 'P2025') return null;
      throw error;
    }
  }

  async delete(id) {
    try {
      await this.prisma.usuario.delete({ where: { id: Number(id) } });
      return true;
    } catch (error) {
      if (error.code === 'P2025') return false;
      throw error;
    }
  }
}

export default UsuarioRepository;
