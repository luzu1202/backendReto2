class Usuario {
  constructor({ id, nombre, email, activo, creadoEn, actualizadoEn }) {
    this.id = id;
    this.nombre = nombre;
    this.email = email;
    this.activo = activo;
    this.creadoEn = creadoEn;
    this.actualizadoEn = actualizadoEn;
  }

  toJSON() {
    return {
      id: this.id,
      nombre: this.nombre,
      email: this.email,
      activo: this.activo,
      creadoEn: this.creadoEn.toISOString(),
      actualizadoEn: this.actualizadoEn.toISOString(),
    };
  }
}

export default Usuario;
