import { Router } from 'express';
import UsuarioFactory from '../models/factories/UsuarioFactory.js';
import { requireWriteApiKey } from '../middlewares/apiKey.middleware.js';
import { paginationMiddleware } from '../middlewares/pagination.middleware.js';
import {
  validateCreateUsuario,
  validatePatchUsuario,
  validateUpdateUsuario,
  validateUsuarioIdParam,
} from '../middlewares/accountValidation.middleware.js';

const router = Router();
const usuarioController = UsuarioFactory.createController();

router.use(requireWriteApiKey);
router.get('/', paginationMiddleware, usuarioController.getAll);
router.get('/:id', validateUsuarioIdParam, usuarioController.getById);
router.post('/', validateCreateUsuario, usuarioController.create);
router.put('/:id', validateUsuarioIdParam, validateUpdateUsuario, usuarioController.update);
router.patch('/:id', validateUsuarioIdParam, validatePatchUsuario, usuarioController.partialUpdate);
router.delete('/:id', validateUsuarioIdParam, usuarioController.delete);

export default router;
