import RolController from '../../controllers/rol.controller.js';
import RolRepository from '../repositories/RolRepository.js';

class RolFactory {
  static createRepository() {
    return new RolRepository();
  }

  static createController() {
    return new RolController(RolFactory.createRepository());
  }
}

export default RolFactory;
