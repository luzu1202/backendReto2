class UsuarioRolController {
  constructor(usuarioRolRepository) {
    this.usuarioRolRepository = usuarioRolRepository;
    this.getAll = this.getAll.bind(this);
    this.getById = this.getById.bind(this);
    this.assign = this.assign.bind(this);
    this.remove = this.remove.bind(this);
  }

  async getAll(req, res, next) {
    try {
      const { limit, offset, page } = req.pagination;
      const { total, items } = await this.usuarioRolRepository.findAll({
        limit,
        offset,
        ...req.usuarioRolFilters,
      });
      const totalPages = Math.ceil(total / limit) || 1;

      return res.status(200).json({
        success: true,
        message: 'Asignaciones de roles obtenidas exitosamente.',
        data: items,
        pagination: {
          totalItems: total,
          itemsPerPage: limit,
          currentPage: page,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      });
    } catch (error) {
      return next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const asignacion = await this.usuarioRolRepository.findById(
        Number(req.params.usuarioId),
        Number(req.params.rolId),
      );
      if (!asignacion) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'La asignación solicitada no existe.' },
        });
      }

      return res.status(200).json({ success: true, data: asignacion });
    } catch (error) {
      return next(error);
    }
  }

  async assign(req, res, next) {
    try {
      const asignacion = await this.usuarioRolRepository.assign(
        req.body.usuarioId,
        req.body.rolId,
      );
      if (!asignacion) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'RELATED_RECORD_NOT_FOUND',
            message: 'El usuario o el rol indicado no existe.',
          },
        });
      }

      return res.status(201).json({
        success: true,
        message: 'Rol asignado al usuario exitosamente.',
        data: asignacion,
      });
    } catch (error) {
      return next(error);
    }
  }

  async remove(req, res, next) {
    try {
      const eliminado = await this.usuarioRolRepository.remove(
        Number(req.params.usuarioId),
        Number(req.params.rolId),
      );
      if (!eliminado) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'La asignación solicitada no existe.' },
        });
      }

      return res.status(204).send();
    } catch (error) {
      return next(error);
    }
  }
}

export default UsuarioRolController;
