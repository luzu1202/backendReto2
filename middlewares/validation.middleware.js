/**
 * Middleware de Validación de Entradas
 * Valida formatos, rangos, tipos de datos y parámetros de ruta.
 * Responde con 400 Bad Request o 422 Unprocessable Entity en caso de datos inválidos.
 */

// Valida que el parámetro :id sea un entero positivo
export const validateIdParam = (req, res, next) => {
  const { id } = req.params;
  const parsedId = Number(id);

  if (!Number.isInteger(parsedId) || parsedId <= 0) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_ID_PARAM',
        message: "El parámetro 'id' debe ser un número entero positivo mayor a cero.",
      },
    });
  }

  next();
};

const isHttpUrl = (value) => {
  if (typeof value !== 'string') return false;

  try {
    const url = new URL(value.trim());
    return ['http:', 'https:'].includes(url.protocol) && Boolean(url.hostname);
  } catch {
    return false;
  }
};

const isNumericInput = (value) => (
  (typeof value === 'number' && Number.isFinite(value))
  || (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value)))
);

// Valida los datos para crear un nuevo producto (POST)
export const validateCreateProducto = (req, res, next) => {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return res.status(422).json({
      success: false,
      error: {
        code: 'VALIDATION_FAILED',
        message: 'El cuerpo de la solicitud debe ser un objeto JSON.',
      },
    });
  }

  const { nombre, descripcion, urlimagen, pvp, stock } = req.body;
  const errors = [];

  if (!nombre || typeof nombre !== 'string' || nombre.trim().length < 3) {
    errors.push("El campo 'nombre' es obligatorio y debe tener al menos 3 caracteres.");
  }

  if (!descripcion || typeof descripcion !== 'string' || descripcion.trim().length < 10) {
    errors.push("El campo 'descripcion' es obligatorio y debe tener al menos 10 caracteres.");
  }

  if (!isHttpUrl(urlimagen)) {
    errors.push("El campo 'urlimagen' es obligatorio y debe ser una URL válida que empiece por http/https.");
  }

  const numericPvp = Number(pvp);
  if (!isNumericInput(pvp) || numericPvp <= 0) {
    errors.push("El campo 'pvp' (Precio de Venta al Público) es obligatorio y debe ser un número mayor a 0.");
  }

  const numericStock = Number(stock);
  if (!isNumericInput(stock) || !Number.isInteger(numericStock) || numericStock < 0) {
    errors.push("El campo 'stock' es obligatorio y debe ser un número entero mayor o igual a 0.");
  }

  if (errors.length > 0) {
    return res.status(422).json({
      success: false,
      error: {
        code: 'VALIDATION_FAILED',
        message: 'La solicitud contiene errores de validación en los datos enviados.',
        details: errors,
      },
    });
  }

  next();
};

// Valida actualización total (PUT)
export const validateUpdateProducto = (req, res, next) => {
  // Para PUT todos los campos son obligatorios
  return validateCreateProducto(req, res, next);
};

// Valida actualización parcial (PATCH)
export const validatePatchProducto = (req, res, next) => {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return res.status(422).json({
      success: false,
      error: {
        code: 'VALIDATION_FAILED',
        message: 'El cuerpo de la solicitud debe ser un objeto JSON.',
      },
    });
  }

  const { nombre, descripcion, urlimagen, pvp, stock } = req.body;
  const errors = [];

  const fieldsProvided = Object.keys(req.body);
  if (fieldsProvided.length === 0) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'EMPTY_BODY',
        message: 'Debe proporcionar al menos un campo válido para actualizar parcialmente el producto.',
      },
    });
  }

  const validFields = new Set(['nombre', 'descripcion', 'urlimagen', 'pvp', 'stock']);
  if (fieldsProvided.some((field) => !validFields.has(field))) {
    errors.push('La solicitud contiene campos que no se pueden actualizar.');
  }

  if (nombre !== undefined && (typeof nombre !== 'string' || nombre.trim().length < 3)) {
    errors.push("El campo 'nombre' debe tener al menos 3 caracteres.");
  }

  if (descripcion !== undefined && (typeof descripcion !== 'string' || descripcion.trim().length < 10)) {
    errors.push("El campo 'descripcion' debe tener al menos 10 caracteres.");
  }

  if (urlimagen !== undefined && !isHttpUrl(urlimagen)) {
    errors.push("El campo 'urlimagen' debe ser una URL válida.");
  }

  if (pvp !== undefined) {
    const numericPvp = Number(pvp);
    if (!isNumericInput(pvp) || numericPvp <= 0) {
      errors.push("El campo 'pvp' debe ser un número mayor a 0.");
    }
  }

  if (stock !== undefined) {
    const numericStock = Number(stock);
    if (!isNumericInput(stock) || !Number.isInteger(numericStock) || numericStock < 0) {
      errors.push("El campo 'stock' debe ser un número entero mayor o igual a 0.");
    }
  }

  if (errors.length > 0) {
    return res.status(422).json({
      success: false,
      error: {
        code: 'VALIDATION_FAILED',
        message: 'Errores de validación en la actualización parcial.',
        details: errors,
      },
    });
  }

  next();
};
