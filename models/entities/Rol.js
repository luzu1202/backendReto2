class Rol {
  constructor({ id, nombre, descripcion, creadoEn, actualizadoEn }) {
    this.id = id;
    this.nombre = nombre;
    this.descripcion = descripcion;
    this.creadoEn = creadoEn;
    this.actualizadoEn = actualizadoEn;
  }

  toJSON() {
    return {
      id: this.id,
      nombre: this.nombre,
      descripcion: this.descripcion,
      creadoEn: this.creadoEn.toISOString(),
      actualizadoEn: this.actualizadoEn.toISOString(),
    };
  }
}

export default Rol;
