import UsuarioController from '../../controllers/usuario.controller.js';
import UsuarioRepository from '../repositories/UsuarioRepository.js';

class UsuarioFactory {
  static createRepository() {
    return new UsuarioRepository();
  }

  static createController() {
    return new UsuarioController(UsuarioFactory.createRepository());
  }
}

export default UsuarioFactory;
