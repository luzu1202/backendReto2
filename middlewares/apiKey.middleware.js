import { createHash, timingSafeEqual } from 'node:crypto';

const minimumKeyLength = 32;

export const requireWriteApiKey = (req, res, next) => {
  const expectedKey = process.env.API_WRITE_KEY;

  if (!expectedKey || Buffer.byteLength(expectedKey) < minimumKeyLength) {
    return res.status(503).json({
      success: false,
      error: {
        code: 'WRITE_AUTH_NOT_CONFIGURED',
        message: 'El servidor no tiene configurada la autenticación para escrituras.',
      },
    });
  }

  const [scheme, suppliedKey, ...extra] = (req.get('authorization') || '').split(/\s+/);
  const hasBearerToken = scheme === 'Bearer' && Boolean(suppliedKey) && extra.length === 0;
  const expectedDigest = createHash('sha256').update(expectedKey).digest();
  const suppliedDigest = createHash('sha256')
    .update(hasBearerToken ? suppliedKey : '')
    .digest();

  if (!timingSafeEqual(suppliedDigest, expectedDigest)) {
    res.set('WWW-Authenticate', 'Bearer');
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Se requiere una API key válida para acceder a este recurso protegido.',
      },
    });
  }

  next();
};
