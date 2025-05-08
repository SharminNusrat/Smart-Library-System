const db = require('../config/db-config');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const User = {
    create: async (userData) => {
        const salt = bcrypt.genSaltSync(10);
        const hashedPassword = bcrypt.hashSync(userData.password, salt);
        
        const [result] = await db.promise().query(
            'INSERT INTO users (name, email, phone, password, role) VALUES (?, ?, ?, ?, ?)',
            [userData.name, userData.email, userData.phone, hashedPassword, userData.role]
        );
        
        return {
            id: result.insertId,
            name: userData.name,
            email: userData.email,
            role: userData.role
        };
    },

    findByEmail: async (email) => {
        const [users] = await db.promise().query(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );
        return users[0];
    },

    findById: async (id) => {
        const [users] = await db.promise().query(
            'SELECT name, email, phone FROM users WHERE id = ?',
            [id]
        );
        return users[0];
    },

    generateToken: (userId) => {
        return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRES_IN || '1h'
        });
    },

    exists: async (userId, connection) => {
        const [results] = await connection.query(
            'SELECT id FROM users WHERE id = ?',
            [userId]
        );
        return results.length > 0;
    },

    getActiveUsers: async (limit = 5) => {
        const [results] = await db.promise().query(`
            SELECT 
                u.id AS user_id,
                u.name,
                COUNT(l.id) AS books_borrowed
            FROM users u
            LEFT JOIN loans l ON u.id = l.user_id
            GROUP BY u.id
            ORDER BY books_borrowed DESC
            LIMIT ?
        `, [limit]);
        return results;
    },

    getTotalCount: async () => {
        const [results] = await db.promise().query(`
            SELECT COUNT(*) AS total_users FROM users
        `);
        return results[0].total_users;
    }
}

module.exports = User;