import express from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import path from 'path';
import pg from "pg";
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const app = express();

// PostgreSQL pool configuration
const pool = new Pool({
    user: 'postgres',
    host: 'db',
    database: 'test_db',
    password: 'postgres',
    port: 5432,
});

const retryConnection = async (retries = 5, delay = 5000) => {
    for (let i = 0; i < retries; i++) {
        try {
            const client = await pool.connect();
            client.release();
            console.log('Connected to database');
            return;
        } catch (err) {
            console.error(`Database connection attempt ${i + 1} failed, retrying in ${delay / 1000} seconds...`);
            await new Promise(res => setTimeout(res, delay));
        }
    }
    throw new Error('Unable to connect to the database after multiple attempts');
};

// Initialize connection retry mechanism
retryConnection().then(() => {
    app.use(bodyParser.urlencoded({ extended: true }));

    app.use(express.static(path.join(__dirname, 'public')));

    app.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });

    app.post('/submit', async (req, res) => {
        const { name, email } = req.body;
        try {
            const client = await pool.connect();
            await client.query('INSERT INTO users (name, email) VALUES ($1, $2)', [name, email]);
            client.release();
            res.send('New record created successfully');
        } catch (err) {
            console.error(err);
            res.status(500).send('Server error');
        }
    });

    app.listen(process.env.PORT, () => {
        console.log(`Server running at http://localhost:${process.env.PORT}/`);
    });
}).catch(err => {
    console.error(err);
    process.exit(1);
});