import test, { after } from 'node:test';
import assert from 'node:assert/strict';

process.env.DATABASE_URL ||= 'mysql://root:password@localhost:3306/mann_ki_mannat';
process.env.JWT_SECRET ||= 'local-test-secret-with-at-least-32-characters';
const { app } = await import('../src/app.js');
const server = app.listen(0);
const address = await new Promise((resolve, reject) => {
  server.once('listening', () => resolve(server.address()));
  server.once('error', reject);
});
after(() => new Promise((resolve) => server.close(resolve)));

test('health endpoint returns a ready response without requiring a database query', async () => {
  const response = await fetch(`http://127.0.0.1:${address.port}/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { success: true, status: 'ok' });
});
