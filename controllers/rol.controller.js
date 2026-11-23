class RolController {
  constructor(rolRepository) {
    this.rolRepository = rolRepository;
    this.getAll = this.getAll.bind(this);
    this.getById = this.getById.bind(this);
    this.create = this.create.bind(this);
    this.update = this.update.bind(this);
    this.partialUpdate = this.partialUpdate.bind(this);
    this.delete = this.delete.bind(this);
  }

  async getAll(req, res, next) {
    try {
      const { limit, offset, page } = req.pagination;
      const search = typeof req.query.search === 'string' ? req.query.search : '';
      const { total, items } = await this.rolRepository.findAll({ limit, offset, search });
      const totalPages = Math.ceil(total / limit) || 1;

      return res.status(200).json({
        success: true,
        message: 'Listado de roles obtenido exitosamente.',
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
      const rol = await this.rolRepository.findById(req.params.id);
      if (!rol) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'El rol solicitado no existe.' },
        });
      }

      return res.status(200).json({ success: true, data: rol });
    } catch (error) {
      return next(error);
    }
  }

  async create(req, res, next) {
    try {
      const rol = await this.rolRepository.create(req.body);
      return res.status(201).json({
        success: true,
        message: 'Rol creado exitosamente.',
        data: rol,
      });
    } catch (error) {
      return next(error);
    }
  }

  async update(req, res, next) {
    try {
      const rol = await this.rolRepository.update(req.params.id, req.body);
      if (!rol) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'El rol solicitado no existe.' },
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Rol actualizado exitosamente.',
        data: rol,
      });
    } catch (error) {
      return next(error);
    }
  }

  async partialUpdate(req, res, next) {
    try {
      const rol = await this.rolRepository.partialUpdate(req.params.id, req.body);
      if (!rol) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'El rol solicitado no existe.' },
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Rol actualizado parcialmente.',
        data: rol,
      });
    } catch (error) {
      return next(error);
    }
  }

  async delete(req, res, next) {
    try {
      const eliminado = await this.rolRepository.delete(req.params.id);
      if (!eliminado) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'El rol solicitado no existe.' },
        });
      }

      return res.status(204).send();
    } catch (error) {
      return next(error);
    }
  }
}

export default RolController;
