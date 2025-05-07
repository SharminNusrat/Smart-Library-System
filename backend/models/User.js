const db = require('../config/db-config');

const User = {
    exists: async (userId) => {
        const results = await query(
            'SELECT id FROM users WHERE id = ?',
            [userId]
        );
        return results.length > 0;
    },
}

module.exports = User;