import Rol from './Rol.js';
import Usuario from './Usuario.js';

class UsuarioRol {
  constructor({ usuarioId, rolId, asignadoEn, usuario, rol }) {
    this.usuarioId = usuarioId;
    this.rolId = rolId;
    this.asignadoEn = asignadoEn;
    this.usuario = usuario;
    this.rol = rol;
  }

  toJSON() {
    return {
      usuarioId: this.usuarioId,
      rolId: this.rolId,
      asignadoEn: this.asignadoEn.toISOString(),
      ...(this.usuario ? { usuario: new Usuario(this.usuario).toJSON() } : {}),
      ...(this.rol ? { rol: new Rol(this.rol).toJSON() } : {}),
    };
  }
}

export default UsuarioRol;
