import { Router } from 'express';
import RolFactory from '../models/factories/RolFactory.js';
import { requireWriteApiKey } from '../middlewares/apiKey.middleware.js';
import { paginationMiddleware } from '../middlewares/pagination.middleware.js';
import {
  validateCreateRol,
  validatePatchRol,
  validateRolIdParam,
  validateUpdateRol,
} from '../middlewares/accountValidation.middleware.js';

const router = Router();
const rolController = RolFactory.createController();

router.use(requireWriteApiKey);
router.get('/', paginationMiddleware, rolController.getAll);
router.get('/:id', validateRolIdParam, rolController.getById);
router.post('/', validateCreateRol, rolController.create);
router.put('/:id', validateRolIdParam, validateUpdateRol, rolController.update);
router.patch('/:id', validateRolIdParam, validatePatchRol, rolController.partialUpdate);
router.delete('/:id', validateRolIdParam, rolController.delete);

export default router;
