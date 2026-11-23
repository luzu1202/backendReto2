import Database from '../database/Database.js';
import UsuarioRol from '../entities/UsuarioRol.js';

const relatedFields = {
  usuario: {
    select: {
      id: true,
      nombre: true,
      email: true,
      activo: true,
      creadoEn: true,
      actualizadoEn: true,
    },
  },
  rol: {
    select: {
      id: true,
      nombre: true,
      descripcion: true,
      creadoEn: true,
      actualizadoEn: true,
    },
  },
};

class UsuarioRolRepository {
  constructor() {
    this.prisma = Database.getInstance().client;
  }

  async findAll({ limit = 20, offset = 0, usuarioId, rolId } = {}) {
    const where = {
      ...(usuarioId === undefined ? {} : { usuarioId }),
      ...(rolId === undefined ? {} : { rolId }),
    };

    const [total, rows] = await Promise.all([
      this.prisma.usuarioRol.count({ where }),
      this.prisma.usuarioRol.findMany({
        where,
        include: relatedFields,
        orderBy: [{ usuarioId: 'asc' }, { rolId: 'asc' }],
        skip: offset,
        take: limit,
      }),
    ]);

    return { total, items: rows.map((row) => new UsuarioRol(row).toJSON()) };
  }

  async findById(usuarioId, rolId) {
    const row = await this.prisma.usuarioRol.findUnique({
      where: { usuarioId_rolId: { usuarioId, rolId } },
      include: relatedFields,
    });

    return row ? new UsuarioRol(row).toJSON() : null;
  }

  async assign(usuarioId, rolId) {
    const [usuario, rol] = await this.prisma.$transaction([
      this.prisma.usuario.findUnique({ where: { id: usuarioId }, select: { id: true } }),
      this.prisma.rol.findUnique({ where: { id: rolId }, select: { id: true } }),
    ]);

    if (!usuario || !rol) return null;

    const row = await this.prisma.usuarioRol.create({
      data: { usuarioId, rolId },
      include: relatedFields,
    });

    return new UsuarioRol(row).toJSON();
  }

  async remove(usuarioId, rolId) {
    try {
      await this.prisma.usuarioRol.delete({
        where: { usuarioId_rolId: { usuarioId, rolId } },
      });
      return true;
    } catch (error) {
      if (error.code === 'P2025') return false;
      throw error;
    }
  }
}

export default UsuarioRolRepository;
