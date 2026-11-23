import { Router } from 'express';
import UsuarioRolFactory from '../models/factories/UsuarioRolFactory.js';
import { requireWriteApiKey } from '../middlewares/apiKey.middleware.js';
import { paginationMiddleware } from '../middlewares/pagination.middleware.js';
import {
  validateCreateUsuarioRol,
  validateUsuarioRolParams,
  validateUsuarioRolQuery,
} from '../middlewares/accountValidation.middleware.js';

const router = Router();
const usuarioRolController = UsuarioRolFactory.createController();

router.use(requireWriteApiKey);
router.get(
  '/',
  validateUsuarioRolQuery,
  paginationMiddleware,
  usuarioRolController.getAll,
);
router.get('/:usuarioId/:rolId', validateUsuarioRolParams, usuarioRolController.getById);
router.post('/', validateCreateUsuarioRol, usuarioRolController.assign);
router.delete('/:usuarioId/:rolId', validateUsuarioRolParams, usuarioRolController.remove);

export default router;
