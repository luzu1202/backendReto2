const sendValidationError = (res, details) => res.status(422).json({
  success: false,
  error: {
    code: 'VALIDATION_FAILED',
    message: 'La solicitud contiene errores de validación.',
    details,
  },
});

const isObjectBody = (body) => (
  body !== null && typeof body === 'object' && !Array.isArray(body)
);

const rejectUnknownFields = (body, allowedFields) => (
  Object.keys(body).filter((field) => !allowedFields.has(field))
);

const validateUsuario = (req, res, next, partial) => {
  if (!isObjectBody(req.body)) {
    return sendValidationError(res, ['El cuerpo debe ser un objeto JSON.']);
  }

  const allowedFields = new Set(['nombre', 'email', 'password', 'activo']);
  const fields = Object.keys(req.body);
  const errors = [];
  const unknownFields = rejectUnknownFields(req.body, allowedFields);

  if (unknownFields.length) errors.push('La solicitud contiene campos no permitidos.');
  if (partial && fields.length === 0) errors.push('Debe proporcionar al menos un campo para actualizar.');

  const fieldsToValidate = partial
    ? fields
    : ['nombre', 'email', 'password', ...(Object.hasOwn(req.body, 'activo') ? ['activo'] : [])];
  for (const field of fieldsToValidate) {
    if (!allowedFields.has(field)) continue;

    const value = req.body[field];
    if (field === 'nombre' && (
      typeof value !== 'string' || value.trim().length < 2 || value.trim().length > 120
    )) {
      errors.push("'nombre' debe tener entre 2 y 120 caracteres.");
    }

    if (field === 'email' && (
      typeof value !== 'string'
      || value.trim().length > 254
      || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim())
    )) {
      errors.push("'email' debe ser una dirección válida de hasta 254 caracteres.");
    }

    if (field === 'password' && (
      typeof value !== 'string' || value.length < 12 || value.length > 128
    )) {
      errors.push("'password' debe tener entre 12 y 128 caracteres.");
    }

    if (field === 'activo' && typeof value !== 'boolean') {
      errors.push("'activo' debe ser booleano.");
    }
  }

  if (!partial) {
    for (const field of ['nombre', 'email', 'password']) {
      if (!Object.hasOwn(req.body, field)) errors.push(`El campo '${field}' es obligatorio.`);
    }
  }

  if (errors.length) return sendValidationError(res, errors);

  req.body = {
    ...req.body,
    ...(req.body.nombre === undefined ? {} : { nombre: req.body.nombre.trim() }),
    ...(req.body.email === undefined ? {} : { email: req.body.email.trim().toLowerCase() }),
  };
  return next();
};

export const validateCreateUsuario = (req, res, next) => validateUsuario(req, res, next, false);
export const validateUpdateUsuario = validateCreateUsuario;
export const validatePatchUsuario = (req, res, next) => validateUsuario(req, res, next, true);

const validateRol = (req, res, next, partial) => {
  if (!isObjectBody(req.body)) {
    return sendValidationError(res, ['El cuerpo debe ser un objeto JSON.']);
  }

  const allowedFields = new Set(['nombre', 'descripcion']);
  const fields = Object.keys(req.body);
  const errors = [];
  const unknownFields = rejectUnknownFields(req.body, allowedFields);

  if (unknownFields.length) errors.push('La solicitud contiene campos no permitidos.');
  if (partial && fields.length === 0) errors.push('Debe proporcionar al menos un campo para actualizar.');

  const fieldsToValidate = partial
    ? fields
    : ['nombre', ...(Object.hasOwn(req.body, 'descripcion') ? ['descripcion'] : [])];
  for (const field of fieldsToValidate) {
    if (!allowedFields.has(field)) continue;
    const value = req.body[field];

    if (field === 'nombre' && (
      typeof value !== 'string'
      || value.trim().length < 2
      || value.trim().length > 50
      || !/^[A-Za-z][A-Za-z0-9_-]*$/.test(value.trim())
    )) {
      errors.push("'nombre' debe tener entre 2 y 50 caracteres alfanuméricos, '_' o '-'.");
    }

    if (field === 'descripcion' && value !== null && (
      typeof value !== 'string' || value.trim().length > 255
    )) {
      errors.push("'descripcion' debe ser texto de hasta 255 caracteres o null.");
    }
  }

  if (!partial && !Object.hasOwn(req.body, 'nombre')) {
    errors.push("El campo 'nombre' es obligatorio.");
  }

  if (errors.length) return sendValidationError(res, errors);

  req.body = {
    ...req.body,
    ...(req.body.nombre === undefined ? {} : { nombre: req.body.nombre.trim().toUpperCase() }),
    ...(typeof req.body.descripcion === 'string'
      ? { descripcion: req.body.descripcion.trim() }
      : {}),
  };
  return next();
};

export const validateCreateRol = (req, res, next) => validateRol(req, res, next, false);
export const validateUpdateRol = validateCreateRol;
export const validatePatchRol = (req, res, next) => validateRol(req, res, next, true);

const positiveInteger = (value) => (
  typeof value === 'string' && /^\d+$/.test(value) && Number.isSafeInteger(Number(value)) && Number(value) > 0
);

export const validateUsuarioIdParam = (req, res, next) => {
  if (!positiveInteger(req.params.id)) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_ID_PARAM', message: "'id' debe ser un entero positivo." },
    });
  }
  return next();
};

export const validateRolIdParam = validateUsuarioIdParam;

export const validateUsuarioRolParams = (req, res, next) => {
  if (!positiveInteger(req.params.usuarioId) || !positiveInteger(req.params.rolId)) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_ID_PARAM',
        message: "'usuarioId' y 'rolId' deben ser enteros positivos.",
      },
    });
  }
  return next();
};

export const validateCreateUsuarioRol = (req, res, next) => {
  if (!isObjectBody(req.body)) {
    return sendValidationError(res, ['El cuerpo debe ser un objeto JSON.']);
  }

  const fields = Object.keys(req.body);
  const errors = [];
  if (fields.some((field) => !['usuarioId', 'rolId'].includes(field))) {
    errors.push('La solicitud contiene campos no permitidos.');
  }
  if (!positiveInteger(String(req.body.usuarioId ?? ''))) {
    errors.push("'usuarioId' debe ser un entero positivo.");
  }
  if (!positiveInteger(String(req.body.rolId ?? ''))) {
    errors.push("'rolId' debe ser un entero positivo.");
  }

  if (errors.length) return sendValidationError(res, errors);

  req.body.usuarioId = Number(req.body.usuarioId);
  req.body.rolId = Number(req.body.rolId);
  return next();
};

export const validateUsuarioRolQuery = (req, res, next) => {
  const filters = {};
  for (const field of ['usuarioId', 'rolId']) {
    if (req.query[field] === undefined) continue;
    if (!positiveInteger(req.query[field])) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ID_QUERY',
          message: `'${field}' debe ser un entero positivo.`,
        },
      });
    }
    filters[field] = Number(req.query[field]);
  }

  req.usuarioRolFilters = filters;
  return next();
};
