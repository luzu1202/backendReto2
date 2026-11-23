import UsuarioRolController from '../../controllers/usuarioRol.controller.js';
import UsuarioRolRepository from '../repositories/UsuarioRolRepository.js';

class UsuarioRolFactory {
  static createRepository() {
    return new UsuarioRolRepository();
  }

  static createController() {
    return new UsuarioRolController(UsuarioRolFactory.createRepository());
  }
}

export default UsuarioRolFactory;
