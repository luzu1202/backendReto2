import Database from '../database/Database.js';
import Rol from '../entities/Rol.js';

class RolRepository {
  constructor() {
    this.prisma = Database.getInstance().client;
  }

  async findAll({ limit = 20, offset = 0, search = '' } = {}) {
    const term = search.trim();
    const where = term
      ? {
          OR: [
            { nombre: { contains: term, mode: 'insensitive' } },
            { descripcion: { contains: term, mode: 'insensitive' } },
          ],
        }
      : {};

    const [total, rows] = await Promise.all([
      this.prisma.rol.count({ where }),
      this.prisma.rol.findMany({
        where,
        orderBy: { id: 'asc' },
        skip: offset,
        take: limit,
      }),
    ]);

    return { total, items: rows.map((row) => new Rol(row).toJSON()) };
  }

  async findById(id) {
    const row = await this.prisma.rol.findUnique({ where: { id: Number(id) } });
    return row ? new Rol(row).toJSON() : null;
  }

  async create({ nombre, descripcion }) {
    const row = await this.prisma.rol.create({
      data: { nombre, descripcion: descripcion ?? null },
    });
    return new Rol(row).toJSON();
  }

  async update(id, { nombre, descripcion }) {
    try {
      const row = await this.prisma.rol.update({
        where: { id: Number(id) },
        data: { nombre, descripcion: descripcion ?? null },
      });
      return new Rol(row).toJSON();
    } catch (error) {
      if (error.code === 'P2025') return null;
      throw error;
    }
  }

  async partialUpdate(id, fields) {
    try {
      const row = await this.prisma.rol.update({
        where: { id: Number(id) },
        data: fields,
      });
      return new Rol(row).toJSON();
    } catch (error) {
      if (error.code === 'P2025') return null;
      throw error;
    }
  }

  async delete(id) {
    try {
      await this.prisma.rol.delete({ where: { id: Number(id) } });
      return true;
    } catch (error) {
      if (error.code === 'P2025') return false;
      throw error;
    }
  }
}

export default RolRepository;
