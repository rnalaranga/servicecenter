import mysql from 'mysql2/promise';

async function checkVersion() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '1234',
    database: 'golden_auto_detail'
  });
  const [rows] = await connection.execute('SELECT VERSION() as version');
  console.log(rows);
  await connection.end();
}

checkVersion().catch(console.error);
