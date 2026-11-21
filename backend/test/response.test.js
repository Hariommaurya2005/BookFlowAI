const test = require('node:test');
const assert = require('node:assert/strict');
const { sendSuccess, sendError } = require('../src/utils/response');

const createMockResponse = () => ({
  statusCode: null,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(payload) {
    this.body = payload;
    return this;
  },
});

test('sendSuccess preserves paginated metadata', () => {
  const response = createMockResponse();
  sendSuccess(response, 'Items retrieved', [{ id: 'one' }], 200, { total: 21, page: 2, totalPages: 3 });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body.data, [{ id: 'one' }]);
  assert.deepEqual(response.body.meta, { total: 21, page: 2, totalPages: 3 });
});

test('sendSuccess keeps the default response format for existing callers', () => {
  const response = createMockResponse();
  sendSuccess(response, 'Created', { id: 'one' }, 201);

  assert.equal(response.statusCode, 201);
  assert.deepEqual(response.body, { success: true, message: 'Created', data: { id: 'one' } });
});

test('sendError keeps error response format unchanged', () => {
  const response = createMockResponse();
  sendError(response, 'Invalid request', 400);

  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.body, { success: false, message: 'Invalid request' });
});
