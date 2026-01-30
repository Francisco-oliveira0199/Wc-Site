const db = require('../database');

class User {
    static async findByUsername(username) {
        const sql = 'SELECT * FROM administrators WHERE username = ? AND is_active = TRUE';
        const results = await db.query(sql, [username]);
        return results[0] || null;
    }

    static async findById(id) {
        const sql = 'SELECT * FROM administrators WHERE id = ? AND is_active = TRUE';
        const results = await db.query(sql, [id]);
        return results[0] || null;
    }

    static async updateLastLogin(userId) {
        const sql = 'UPDATE administrators SET last_login = NOW() WHERE id = ?';
        await db.query(sql, [userId]);
    }

    static async getAll() {
        const sql = 'SELECT id, username, email, full_name, role, created_at, last_login, is_active FROM administrators';
        return await db.query(sql);
    }
}

module.exports = User;