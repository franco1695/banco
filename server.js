const express = require('express');
const db = require('./database');
const app = express();

app.use(express.json());

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Usuario y contraseña obligatorios' });
    }

    db.get(`SELECT * FROM users WHERE username = ? AND password = ?`, [username, password], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(401).json({ error: 'Credenciales inválidas' });

        res.json({
            message: 'Login exitoso',
            user: { id: user.id, username: user.username, role: user.role, balance: user.balance }
        });
    });
});

app.post('/api/users', (req, res) => {
    const { admin_username, username, password, initial_balance } = req.body;

    db.get(`SELECT * FROM users WHERE username = ? AND role = 'admin'`, [admin_username], (err, admin) => {
        if (!admin) return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de Super Usuario.' });

        const balance = initial_balance || 0.0;
        db.run(`INSERT INTO users (username, password, role, balance) VALUES (?, ?, 'client', ?)`,
            [username, password, balance],
            function (err) {
                if (err) return res.status(400).json({ error: 'El usuario ya existe o datos inválidos' });
                res.status(201).json({
                    message: 'Usuario creado exitosamente',
                    userId: this.lastID,
                    username,
                    balance
                });
            }
        );
    });
});

app.get('/api/users', (req, res) => {
    db.all(`SELECT id, username, role, balance FROM users`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ users: rows });
    });
});

app.get('/api/balance/:username', (req, res) => {
    const { username } = req.params;
    db.get(`SELECT username, balance FROM users WHERE username = ?`, [username], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
        res.json(user);
    });
});

app.post('/api/transfer', (req, res) => {
    const { sender, receiver, amount } = req.body;

    if (!sender || !receiver || !amount || amount <= 0) {
        return res.status(400).json({ error: 'Datos de transferencia inválidos' });
    }

    db.serialize(() => {
        db.get(`SELECT * FROM users WHERE username = ?`, [sender], (err, senderUser) => {
            if (!senderUser) return res.status(404).json({ error: 'Remitente no encontrado' });
            if (senderUser.balance < amount) return res.status(400).json({ error: 'Fondos insuficientes' });

            db.get(`SELECT * FROM users WHERE username = ?`, [receiver], (err, receiverUser) => {
                if (!receiverUser) return res.status(404).json({ error: 'Destinatario no encontrado' });

                db.run(`UPDATE users SET balance = balance - ? WHERE username = ?`, [amount, sender]);
                db.run(`UPDATE users SET balance = balance + ? WHERE username = ?`, [amount, receiver]);

                const date = new Date().toISOString();
                db.run(`INSERT INTO transactions (sender, receiver, amount, date) VALUES (?, ?, ?, ?)`,
                    [sender, receiver, amount, date]
                );

                res.json({ message: 'Transferencia realizada con éxito', sender, receiver, amount });
            });
        });
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor bancario corriendo en el puerto ${PORT}`);
});
