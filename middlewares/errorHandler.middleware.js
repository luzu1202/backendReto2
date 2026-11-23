/**
 * Middleware Centralizado para el Control de Excepciones
 * Captura cualquier error no controlado ocurrido en la cadena de middlewares y controladores.
 * En producción oculta el stack trace y detalles internos de la base de datos (seguridad).
 */
export const errorHandlerMiddleware = (err, req, res, next) => {
  const statusCode = err.status || err.statusCode || 500;
  const isDev = process.env.NODE_ENV === 'development';
  const isServerError = statusCode >= 500;
  const message = isServerError && !isDev
    ? 'Ha ocurrido un error inesperado en el servidor.'
    : err.message || 'Ha ocurrido un error inesperado en el servidor.';

  console.error(`[Error Handler] ${req.method} ${req.originalUrl}:`, err);

  // Manejo de errores específicos de PostgreSQL
  if (err.code && err.code.startsWith('23')) {
    // 23505: Unique violation, 23503: Foreign key violation, etc.
    return res.status(409).json({
      success: false,
      error: {
        code: 'DATABASE_CONFLICT',
        message: 'Conflicto en la base de datos al procesar la solicitud.',
        details: isDev ? err.detail : undefined,
      },
    });
  }

  if (err.code === 'P2002') {
    return res.status(409).json({
      success: false,
      error: {
        code: 'DUPLICATE_RESOURCE',
        message: 'Ya existe un recurso con esos datos únicos.',
      },
    });
  }

  if (err.code === 'P2003') {
    return res.status(409).json({
      success: false,
      error: {
        code: 'RELATED_RECORD_CONFLICT',
        message: 'La operación entra en conflicto con registros relacionados.',
      },
    });
  }

  return res.status(statusCode).json({
    success: false,
    error: {
      code: isServerError ? 'INTERNAL_SERVER_ERROR' : err.code || 'INTERNAL_SERVER_ERROR',
      message,
      details: isDev ? err.stack : undefined,
    },
  });
};
