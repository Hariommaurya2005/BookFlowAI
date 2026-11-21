const test = require('node:test');
const assert = require('node:assert/strict');
const { parsePagination, escapeRegex } = require('../src/utils/platformAdminRules');

test('pagination uses safe defaults for missing and malformed values', () => {
  assert.deepEqual(parsePagination({}), { page: 1, limit: 10, skip: 0 });
  assert.deepEqual(parsePagination({ page: 'nope', limit: '-5' }, { defaultLimit: 20, maxLimit: 100 }), { page: 1, limit: 20, skip: 0 });
});

test('pagination clamps oversized limits and pathological page values', () => {
  assert.deepEqual(parsePagination({ page: '999999999', limit: '9999' }, { defaultLimit: 20, maxLimit: 100 }), { page: 100000, limit: 100, skip: 9999900 });
});

test('regex search terms are escaped and treated literally', () => {
  assert.equal(escapeRegex('a+b(c)[d]\\e'), 'a\\+b\\(c\\)\\[d\\]\\\\e');
});
