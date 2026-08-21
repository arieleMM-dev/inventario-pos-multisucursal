const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://admin:adminpassword@127.0.0.1:5433/inventariodb?schema=public' });
client.connect().then(async () => {
  try {
    await client.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
    console.log('=== Base de datos reiniciada con éxito ===');
  } catch (e) {
    console.error(e);
  } finally {
    client.end();
  }
});
