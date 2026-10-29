import mysql from 'mysql2/promise';

async function checkVersion() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '1234',
    database: 'auto_elevate_erp'
  });
  const [rows] = await connection.execute('SELECT VERSION() as version');
  console.log(rows);
  await connection.end();
}

checkVersion().catch(console.error);
