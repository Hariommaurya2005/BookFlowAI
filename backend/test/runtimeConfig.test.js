const test = require('node:test');
const assert = require('node:assert/strict');
const { getProductionConfigErrors, assertRuntimeConfig } = require('../src/utils/runtimeConfig');

const validProductionEnv = () => ({
  NODE_ENV: 'production',
  MONGO_URI: 'mongodb+srv://user:pass@example.mongodb.net/bookflow',
  JWT_ACCESS_SECRET: 'a'.repeat(40),
  JWT_REFRESH_SECRET: 'b'.repeat(40),
  CLIENT_URL: 'https://bookflow.example.com',
});

test('valid production configuration passes startup validation', () => {
  assert.deepEqual(getProductionConfigErrors(validProductionEnv()), []);
  assert.equal(assertRuntimeConfig(validProductionEnv()), true);
});

test('production startup rejects placeholder or short JWT secrets', () => {
  const env = validProductionEnv();
  env.JWT_ACCESS_SECRET = 'your_super_secret_access_key_here';
  env.JWT_REFRESH_SECRET = 'short';
  assert.equal(getProductionConfigErrors(env).filter((error) => error.includes('JWT_')).length, 2);
});

test('production startup rejects identical access and refresh secrets', () => {
  const env = validProductionEnv();
  env.JWT_REFRESH_SECRET = env.JWT_ACCESS_SECRET;
  assert.ok(getProductionConfigErrors(env).some((error) => error.includes('must be different')));
});

test('production startup requires a public HTTPS frontend URL and MongoDB URI', () => {
  const env = validProductionEnv();
  env.CLIENT_URL = 'http://localhost:5173';
  env.MONGO_URI = 'invalid';
  const errors = getProductionConfigErrors(env);
  assert.ok(errors.some((error) => error.includes('MONGO_URI')));
  assert.ok(errors.some((error) => error.includes('CLIENT_URL')));
});

test('development remains usable with local example configuration', () => {
  assert.deepEqual(getProductionConfigErrors({ NODE_ENV: 'development' }), []);
});
