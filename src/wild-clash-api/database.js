const mysql = require('mysql2/promise');

class Database {
    constructor() {
        this.pool = null;
        this.config = {
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT || 3306,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        };
    }

    async connect() {
        try {
            this.pool = mysql.createPool(this.config);
            
            // Test connection
            const connection = await this.pool.getConnection();
            console.log('✅ Connected to MySQL database');
            connection.release();
            
            return this.pool;
        } catch (error) {
            console.error('❌ Database connection error:', error.message);
            throw error;
        }
    }

    async query(sql, params = []) {
        try {
            const [results] = await this.pool.execute(sql, params);
            return results;
        } catch (error) {
            console.error('❌ Query error:', error.message);
            throw error;
        }
    }
}

module.exports = new Database();