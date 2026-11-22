const { Pool } = require('pg');
let pool;
// Pool reutilizable entre invocaciones serverless (usa DATABASE_URL)
module.exports = () => pool || (pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false },
    max: 3
}));