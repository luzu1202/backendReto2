import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { once } from 'node:events';
import Database from './models/database/Database.js';
import { errorHandlerMiddleware } from './middlewares/errorHandler.middleware.js';
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
  if (process.env.TEST_DATABASE_URL) {
    await Database.getInstance().close();
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

test('error handler hides internal server messages in production', () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const originalConsoleError = console.error;
  let responseBody;

  process.env.NODE_ENV = 'production';
  console.error = () => {};

  try {
    errorHandlerMiddleware(
      new Error('Database password or connection details'),
      { method: 'GET', originalUrl: '/api/v1/productos' },
      {
        status() {
          return this;
        },
        json(payload) {
          responseBody = payload;
          return this;
        },
      },
      () => {},
    );
  } finally {
    console.error = originalConsoleError;
    if (previousNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = previousNodeEnv;
    }
  }

  assert.equal(responseBody.error.code, 'INTERNAL_SERVER_ERROR');
  assert.equal(responseBody.error.message, 'Ha ocurrido un error inesperado en el servidor.');
  assert.equal(responseBody.error.details, undefined);
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

test('product API supports create, read, update, patch, search, and delete', {
  skip: !process.env.TEST_DATABASE_URL,
}, async () => {
  const suffix = Date.now();
  const originalName = `API test ${suffix}`;
  let productId;

  try {
    const createResponse = await fetch(`${apiBaseUrl}/productos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: originalName,
        descripcion: 'Producto temporal para pruebas de API',
        urlimagen: 'https://example.com/api-test.png',
        pvp: 12.5,
        stock: 2,
      }),
    });
    const created = await createResponse.json();
    assert.equal(createResponse.status, 201);
    productId = created.data.id;

    const byIdResponse = await fetch(`${apiBaseUrl}/productos/${productId}`);
    const byId = await byIdResponse.json();
    assert.equal(byIdResponse.status, 200);
    assert.equal(byId.data.nombre, originalName);

    const searchResponse = await fetch(
      `${apiBaseUrl}/productos?search=${encodeURIComponent(originalName)}`
    );
    const searchResult = await searchResponse.json();
    assert.equal(searchResponse.status, 200);
    assert.ok(searchResult.data.some((product) => product.id === productId));

    const putResponse = await fetch(`${apiBaseUrl}/productos/${productId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: `Updated ${originalName}`,
        descripcion: 'Producto temporal actualizado para pruebas',
        urlimagen: 'https://example.com/api-test-updated.png',
        pvp: 14.25,
        stock: 4,
      }),
    });
    const putResult = await putResponse.json();
    assert.equal(putResponse.status, 200);
    assert.equal(putResult.data.stock, 4);

    const patchResponse = await fetch(`${apiBaseUrl}/productos/${productId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stock: 7 }),
    });
    const patchResult = await patchResponse.json();
    assert.equal(patchResponse.status, 200);
    assert.equal(patchResult.data.stock, 7);

    const deleteResponse = await fetch(`${apiBaseUrl}/productos/${productId}`, {
      method: 'DELETE',
    });
    assert.equal(deleteResponse.status, 204);
    productId = undefined;

    const missingResponse = await fetch(`${apiBaseUrl}/productos/${created.data.id}`);
    assert.equal(missingResponse.status, 404);
  } finally {
    if (productId) {
      await fetch(`${apiBaseUrl}/productos/${productId}`, { method: 'DELETE' });
    }
  }
});
