class UsuarioController {
  constructor(usuarioRepository) {
    this.usuarioRepository = usuarioRepository;
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
      const { total, items } = await this.usuarioRepository.findAll({ limit, offset, search });
      const totalPages = Math.ceil(total / limit) || 1;

      return res.status(200).json({
        success: true,
        message: 'Listado de usuarios obtenido exitosamente.',
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
      const usuario = await this.usuarioRepository.findById(req.params.id);
      if (!usuario) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'El usuario solicitado no existe.' },
        });
      }

      return res.status(200).json({ success: true, data: usuario });
    } catch (error) {
      return next(error);
    }
  }

  async create(req, res, next) {
    try {
      const usuario = await this.usuarioRepository.create(req.body);
      return res.status(201).json({
        success: true,
        message: 'Usuario creado exitosamente.',
        data: usuario,
      });
    } catch (error) {
      return next(error);
    }
  }

  async update(req, res, next) {
    try {
      const usuario = await this.usuarioRepository.update(req.params.id, req.body);
      if (!usuario) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'El usuario solicitado no existe.' },
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Usuario actualizado exitosamente.',
        data: usuario,
      });
    } catch (error) {
      return next(error);
    }
  }

  async partialUpdate(req, res, next) {
    try {
      const usuario = await this.usuarioRepository.partialUpdate(req.params.id, req.body);
      if (!usuario) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'El usuario solicitado no existe.' },
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Usuario actualizado parcialmente.',
        data: usuario,
      });
    } catch (error) {
      return next(error);
    }
  }

  async delete(req, res, next) {
    try {
      const eliminado = await this.usuarioRepository.delete(req.params.id);
      if (!eliminado) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'El usuario solicitado no existe.' },
        });
      }

      return res.status(204).send();
    } catch (error) {
      return next(error);
    }
  }
}

export default UsuarioController;
