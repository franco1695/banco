const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./bank.db', (err) => {
    if (err) {
        console.error('Error al conectar con la base de datos', err.message);
    } else {
        console.log('Conectado a la base de datos SQLite.');
        initDb();
    }
});

function initDb() {
    db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT,
            role TEXT,
            balance REAL DEFAULT 0.0
        )`, () => {
            db.get(`SELECT * FROM users WHERE username = ?`, ['admin'], (err, row) => {
                if (!row) {
                    db.run(`INSERT INTO users (username, password, role, balance) VALUES (?, ?, ?, ?)`,
                        ['admin', 'admin123', 'admin', 10000.0]
                    );
                    console.log('Super usuario creado: admin / admin123');
                }
            });
        });

        db.run(`CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sender TEXT,
            receiver TEXT,
            amount REAL,
            date TEXT
        )`);
    });
}

module.exports = db;