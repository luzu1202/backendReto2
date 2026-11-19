import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { once } from 'node:events';
import apiRouter from './routes/index.js';
import {
  validateCreateProducto,
  validatePatchProducto,
} from './middlewares/validation.middleware.js';

const app = express();
app.use(express.json());
app.use('/api/v1', apiRouter);

let server;
let apiBaseUrl;

before(async () => {
  server = app.listen(0);
  await once(server, 'listening');
  apiBaseUrl = `http://127.0.0.1:${server.address().port}/api/v1`;
});

after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

const runValidation = (middleware, body) => {
  let statusCode;
  let responseBody;
  let nextCalled = false;

  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(payload) {
      responseBody = payload;
      return this;
    },
  };

  middleware({ body }, res, () => {
    nextCalled = true;
  });

  return { statusCode, responseBody, nextCalled };
};

test('create validation rejects non-object JSON bodies', () => {
  for (const body of [null, [], 'product']) {
    const result = runValidation(validateCreateProducto, body);
    assert.equal(result.statusCode, 422);
    assert.equal(result.nextCalled, false);
  }
});

test('create validation rejects partially numeric values and invalid URL schemes', () => {
  const result = runValidation(validateCreateProducto, {
    nombre: 'Producto válido',
    descripcion: 'Descripción suficientemente larga',
    urlimagen: 'javascript:alert(1)',
    pvp: '12abc',
    stock: '2x',
  });

  assert.equal(result.statusCode, 422);
  assert.equal(result.responseBody.error.code, 'VALIDATION_FAILED');
});

test('create validation accepts a valid product payload', () => {
  const result = runValidation(validateCreateProducto, {
    nombre: 'Producto válido',
    descripcion: 'Descripción suficientemente larga',
    urlimagen: 'https://example.com/product.png',
    pvp: 12.5,
    stock: 2,
  });

  assert.equal(result.nextCalled, true);
  assert.equal(result.statusCode, undefined);
});

test('create validation rejects non-numeric JSON types', () => {
  const result = runValidation(validateCreateProducto, {
    nombre: 'Producto válido',
    descripcion: 'Descripción suficientemente larga',
    urlimagen: 'https://example.com/product.png',
    pvp: false,
    stock: [],
  });

  assert.equal(result.statusCode, 422);
  assert.equal(result.responseBody.error.code, 'VALIDATION_FAILED');
});

test('patch validation rejects unknown fields', () => {
  const result = runValidation(validatePatchProducto, { admin: true });

  assert.equal(result.statusCode, 422);
  assert.equal(result.responseBody.error.code, 'VALIDATION_FAILED');
});

test('health endpoint returns an online response', async () => {
  const response = await fetch(`${apiBaseUrl}/health`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
});

test('product API rejects invalid IDs without querying the database', async () => {
  const response = await fetch(`${apiBaseUrl}/productos/not-an-id`);
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.error.code, 'INVALID_ID_PARAM');
});

test('product API rejects a non-object create payload', async () => {
  const response = await fetch(`${apiBaseUrl}/productos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '[]',
  });
  const body = await response.json();

  assert.equal(response.status, 422);
  assert.equal(body.error.code, 'VALIDATION_FAILED');
});
