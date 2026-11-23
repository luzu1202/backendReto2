import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { once } from 'node:events';
import Database from './models/database/Database.js';
import { errorHandlerMiddleware } from './middlewares/errorHandler.middleware.js';
import { sanitizeMiddleware } from './middlewares/sanitize.middleware.js';
import apiRouter from './routes/index.js';
import {
  validateCreateProducto,
  validatePatchProducto,
} from './middlewares/validation.middleware.js';
import {
  validateCreateRol,
  validateCreateUsuario,
  validateCreateUsuarioRol,
  validatePatchUsuario,
} from './middlewares/accountValidation.middleware.js';

const testApiKey = 'test-api-key-for-backend-tests-32chars';
process.env.API_WRITE_KEY = testApiKey;

const app = express();
app.use(express.json());
app.use(sanitizeMiddleware);
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

test('user validation enforces valid email and strong passwords', () => {
  const invalid = runValidation(validateCreateUsuario, {
    nombre: 'Usuario',
    email: 'not-an-email',
    password: 'short',
  });
  const invalidActive = runValidation(validateCreateUsuario, {
    nombre: 'Usuario',
    email: 'user@example.com',
    password: 'SafePassword123!',
    activo: 'false',
  });
  const valid = runValidation(validateCreateUsuario, {
    nombre: 'Usuario',
    email: 'user@example.com',
    password: 'Safe<Password>&123',
  });

  assert.equal(invalid.statusCode, 422);
  assert.equal(invalid.nextCalled, false);
  assert.equal(invalidActive.statusCode, 422);
  assert.equal(valid.nextCalled, true);
  assert.equal(valid.responseBody, undefined);
});

test('sanitizer preserves password input as an opaque value', () => {
  const password = 'Keep<these>&characters';
  const req = { body: { nombre: '<Usuario>', password } };

  sanitizeMiddleware(req, {}, () => {});

  assert.equal(req.body.password, password);
  assert.equal(req.body.nombre, 'Usuario');
});

test('role and assignment validation rejects unknown fields and invalid IDs', () => {
  const invalidRole = runValidation(validateCreateRol, { nombre: 'ADMIN', admin: true });
  const invalidDescription = runValidation(validateCreateRol, {
    nombre: 'ADMIN',
    descripcion: 42,
  });
  const invalidAssignment = runValidation(validateCreateUsuarioRol, {
    usuarioId: 0,
    rolId: 'not-an-id',
  });

  assert.equal(invalidRole.statusCode, 422);
  assert.equal(invalidDescription.statusCode, 422);
  assert.equal(invalidAssignment.statusCode, 422);
});

test('user PATCH validation rejects empty updates', () => {
  const result = runValidation(validatePatchUsuario, {});

  assert.equal(result.statusCode, 422);
  assert.equal(result.nextCalled, false);
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

test('all product mutations require a write key', async () => {
  const mutations = [
    { method: 'POST', path: '/productos' },
    { method: 'PUT', path: '/productos/1' },
    { method: 'PATCH', path: '/productos/1' },
    { method: 'DELETE', path: '/productos/1' },
  ];

  for (const { method, path } of mutations) {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: method === 'DELETE' ? undefined : '{}',
    });
    const body = await response.json();

    assert.equal(response.status, 401, `${method} ${path}`);
    assert.equal(body.error.code, 'UNAUTHORIZED', `${method} ${path}`);
    if (method === 'POST') {
      assert.equal(response.headers.get('www-authenticate'), 'Bearer');
    }
  }
});

test('user and role APIs require a write key for reads and writes', async () => {
  const protectedRequests = [
    { method: 'GET', path: '/usuarios' },
    { method: 'GET', path: '/roles' },
    { method: 'GET', path: '/usuarios-roles' },
    { method: 'POST', path: '/usuarios' },
    { method: 'POST', path: '/roles' },
    { method: 'POST', path: '/usuarios-roles' },
  ];

  for (const { method, path } of protectedRequests) {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: method === 'GET' ? undefined : '{}',
    });
    const body = await response.json();

    assert.equal(response.status, 401, `${method} ${path}`);
    assert.equal(body.error.code, 'UNAUTHORIZED', `${method} ${path}`);
  }
});

test('product API rejects an invalid write key', async () => {
  const response = await fetch(`${apiBaseUrl}/productos`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer invalid-api-key',
    },
    body: '{}',
  });
  const body = await response.json();

  assert.equal(response.status, 401);
  assert.equal(body.error.code, 'UNAUTHORIZED');
});

test('protected API refuses requests when the key is missing or weak', async () => {
  const previousKey = process.env.API_WRITE_KEY;

  try {
    for (const key of [undefined, 'weak-key']) {
      if (key === undefined) {
        delete process.env.API_WRITE_KEY;
      } else {
        process.env.API_WRITE_KEY = key;
      }

      const response = await fetch(`${apiBaseUrl}/usuarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      const body = await response.json();

      assert.equal(response.status, 503);
      assert.equal(body.error.code, 'WRITE_AUTH_NOT_CONFIGURED');
    }
  } finally {
    process.env.API_WRITE_KEY = previousKey;
  }
});

test('product API rejects a non-object create payload', async () => {
  const response = await fetch(`${apiBaseUrl}/productos`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${testApiKey}`,
    },
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
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testApiKey}`,
      },
      body: JSON.stringify({
        nombre: originalName,
        descripcion: 'Producto temporal para pruebas de API',
        urlimagen: 'https://example.com/api-test.png',
        pvp: 12.5,
        stock: 2,
      }),
    });

    test('seed creates the default ADMIN and USUARIO roles', {
      skip: !process.env.TEST_DATABASE_URL,
    }, async () => {
      const roles = await Database.getInstance().client.rol.findMany({
        where: { nombre: { in: ['ADMIN', 'USUARIO'] } },
        select: { nombre: true },
      });

      assert.deepEqual(
        roles.map(({ nombre }) => nombre).sort(),
        ['ADMIN', 'USUARIO'],
      );
    });

    test('user, role, and assignment APIs persist safely and support CRUD', {
      skip: !process.env.TEST_DATABASE_URL,
    }, async () => {
      const suffix = Date.now();
      const password = `Safe<Password>&${suffix}`;
      const email = `user-${suffix}@example.com`;
      let userId;
      let roleId;
      let roleName = `TEST_${suffix}`;
      const authHeaders = { Authorization: `Bearer ${testApiKey}` };

      try {
        const roleResponse = await fetch(`${apiBaseUrl}/roles`, {
          method: 'POST',
          headers: { ...authHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ nombre: roleName, descripcion: 'Rol temporal de pruebas' }),
        });
        const createdRole = await roleResponse.json();
        assert.equal(roleResponse.status, 201);
        roleId = createdRole.data.id;

        const duplicateRoleResponse = await fetch(`${apiBaseUrl}/roles`, {
          method: 'POST',
          headers: { ...authHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ nombre: roleName }),
        });
        assert.equal(duplicateRoleResponse.status, 409);

        const userResponse = await fetch(`${apiBaseUrl}/usuarios`, {
          method: 'POST',
          headers: { ...authHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nombre: 'Usuario de prueba',
            email,
            password,
          }),
        });
        const createdUser = await userResponse.json();
        assert.equal(userResponse.status, 201);
        userId = createdUser.data.id;
        assert.equal(createdUser.data.email, email);
        assert.equal(createdUser.data.password, undefined);
        assert.equal(createdUser.data.passwordHash, undefined);

        const userLookup = await fetch(`${apiBaseUrl}/usuarios/${userId}`, {
          headers: authHeaders,
        });
        const userDetails = await userLookup.json();
        assert.equal(userLookup.status, 200);
        assert.equal(userDetails.data.passwordHash, undefined);

        const userListResponse = await fetch(
          `${apiBaseUrl}/usuarios?search=${encodeURIComponent(email)}`,
          { headers: authHeaders },
        );
        const userList = await userListResponse.json();
        assert.equal(userListResponse.status, 200);
        assert.ok(userList.data.some((user) => user.id === userId));
        assert.equal(userList.data[0].passwordHash, undefined);

        const persistedUser = await Database.getInstance().client.usuario.findUnique({
          where: { id: userId },
        });
        assert.match(persistedUser.passwordHash, /^scrypt\$/);
        assert.notEqual(persistedUser.passwordHash, password);

        const duplicateUserResponse = await fetch(`${apiBaseUrl}/usuarios`, {
          method: 'POST',
          headers: { ...authHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nombre: 'Otro usuario',
            email,
            password,
          }),
        });
        assert.equal(duplicateUserResponse.status, 409);

        const assignmentResponse = await fetch(`${apiBaseUrl}/usuarios-roles`, {
          method: 'POST',
          headers: { ...authHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ usuarioId: userId, rolId }),
        });
        const createdAssignment = await assignmentResponse.json();
        assert.equal(assignmentResponse.status, 201);
        assert.equal(createdAssignment.data.usuario.id, userId);
        assert.equal(createdAssignment.data.rol.id, roleId);
        assert.equal(createdAssignment.data.usuario.passwordHash, undefined);

        const duplicateAssignmentResponse = await fetch(`${apiBaseUrl}/usuarios-roles`, {
          method: 'POST',
          headers: { ...authHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ usuarioId: userId, rolId }),
        });
        assert.equal(duplicateAssignmentResponse.status, 409);

        const assignmentListResponse = await fetch(
          `${apiBaseUrl}/usuarios-roles?usuarioId=${userId}&rolId=${roleId}`,
          { headers: authHeaders },
        );
        const assignmentList = await assignmentListResponse.json();
        assert.equal(assignmentListResponse.status, 200);
        assert.equal(assignmentList.pagination.totalItems, 1);
        assert.equal(assignmentList.data[0].usuario.passwordHash, undefined);

        const removeAssignmentResponse = await fetch(
          `${apiBaseUrl}/usuarios-roles/${userId}/${roleId}`,
          { method: 'DELETE', headers: authHeaders },
        );
        assert.equal(removeAssignmentResponse.status, 204);

        const reassignResponse = await fetch(`${apiBaseUrl}/usuarios-roles`, {
          method: 'POST',
          headers: { ...authHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ usuarioId: userId, rolId }),
        });
        assert.equal(reassignResponse.status, 201);

        const userUpdateResponse = await fetch(`${apiBaseUrl}/usuarios/${userId}`, {
          method: 'PATCH',
          headers: { ...authHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ activo: false, password: `Changed<Password>&${suffix}` }),
        });
        const updatedUser = await userUpdateResponse.json();
        assert.equal(userUpdateResponse.status, 200);
        assert.equal(updatedUser.data.activo, false);
        assert.equal(updatedUser.data.passwordHash, undefined);

        const updatedPersistedUser = await Database.getInstance().client.usuario.findUnique({
          where: { id: userId },
        });
        assert.notEqual(updatedPersistedUser.passwordHash, persistedUser.passwordHash);

        const roleUpdateResponse = await fetch(`${apiBaseUrl}/roles/${roleId}`, {
          method: 'PATCH',
          headers: { ...authHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ descripcion: 'Descripción actualizada' }),
        });
        const updatedRole = await roleUpdateResponse.json();
        assert.equal(roleUpdateResponse.status, 200);
        assert.equal(updatedRole.data.descripcion, 'Descripción actualizada');

        const assignmentLookup = await fetch(`${apiBaseUrl}/usuarios-roles/${userId}/${roleId}`, {
          headers: authHeaders,
        });
        assert.equal(assignmentLookup.status, 200);

        const deleteUserResponse = await fetch(`${apiBaseUrl}/usuarios/${userId}`, {
          method: 'DELETE',
          headers: authHeaders,
        });
        assert.equal(deleteUserResponse.status, 204);
        userId = undefined;

        const deletedAssignment = await fetch(`${apiBaseUrl}/usuarios-roles/${createdUser.data.id}/${roleId}`, {
          headers: authHeaders,
        });
        assert.equal(deletedAssignment.status, 404);

        const deleteRoleResponse = await fetch(`${apiBaseUrl}/roles/${roleId}`, {
          method: 'DELETE',
          headers: authHeaders,
        });
        assert.equal(deleteRoleResponse.status, 204);
        roleId = undefined;
      } finally {
        if (userId) {
          await fetch(`${apiBaseUrl}/usuarios/${userId}`, { method: 'DELETE', headers: authHeaders });
        }
        if (roleId) {
          await fetch(`${apiBaseUrl}/roles/${roleId}`, { method: 'DELETE', headers: authHeaders });
        }
      }
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
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testApiKey}`,
      },
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
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testApiKey}`,
      },
      body: JSON.stringify({ stock: 7 }),
    });
    const patchResult = await patchResponse.json();
    assert.equal(patchResponse.status, 200);
    assert.equal(patchResult.data.stock, 7);

    const deleteResponse = await fetch(`${apiBaseUrl}/productos/${productId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${testApiKey}` },
    });
    assert.equal(deleteResponse.status, 204);
    productId = undefined;

    const missingResponse = await fetch(`${apiBaseUrl}/productos/${created.data.id}`);
    assert.equal(missingResponse.status, 404);
  } finally {
    if (productId) {
      await fetch(`${apiBaseUrl}/productos/${productId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${testApiKey}` },
      });
    }
  }
});
