const {Pool, Client} = require('pg');

var pool = new Pool({
    host: 'abul.db.elephantsql.com',
    user: 'jpvxrfuc',
    database: 'jpvxrfuc',
    password: 'nSdziOdOHNX6ubjULx5ERn1HcJsOAaeQ',
    port: 5432,
    max: 50,
    idleTimeoutMillis: 30000
});

module.exports = pool;