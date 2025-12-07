import app from '../src/app.js';

const server = app.listen(0, async () => {
  try {
    const { port } = server.address();
    const base = `http://localhost:${port}/api`;

    const publicResponse = await fetch(`${base}/workshops/public`);
    const publicData = await publicResponse.json();
    console.log('PUBLIC_WORKSHOPS', publicResponse.status, publicData.length);

    const loginResponse = await fetch(`${base}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@warsztat.local', password: 'admin123' })
    });
    const loginPayload = await loginResponse.json();
    if (!loginPayload.token) {
      throw new Error('Authentication failed');
    }

    const privateResponse = await fetch(`${base}/workshops`, {
      headers: { Authorization: `Bearer ${loginPayload.token}` }
    });
    const privateData = await privateResponse.json();
    console.log('PRIVATE_WORKSHOPS', privateResponse.status, privateData.length);
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    server.close();
  }
});
