const User = require('../models/User');
const bcrypt = require('bcryptjs')

const signup = async (req, res) => {
    try {
        const { name, email, phone, password, role } = req.body;

        if (!name || !email || !phone || !password || !role) {
            return res.status(400).json({
                status: 'error',
                error: 'All fields are required!',
            });
        }

        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            return res.status(409).json({ 
                status: 'error', 
                error: 'User already exists!' 
            });
        }

        const newUser = await User.create({ name, email, phone, password, role });
        return res.status(201).json({
            data: newUser
        });

    } catch (error) {
        console.error('Signup error:', error);
        return res.status(500).json({ 
            status: 'error',
            error: error.message 
        });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findByEmail(email);

        if (!user) {
            return res.status(404).json({
                status: 'error',
                error: 'User not found!'
            });
        }

        const checkPassword = bcrypt.compareSync(password, user.password);
        if (!checkPassword) {
            return res.status(400).json({
                status: 'error',
                error: 'Incorrect email or password!'
            });
        }

        const token = User.generateToken(user.id);

        const cookieOptions = {
            expires: new Date(
                Date.now() + (process.env.JWT_COOKIE_EXPIRES || 1) * 24 * 60 * 60 * 1000 
            ),
            httpOnly: true, 
        };

        res.cookie('accessToken', token, cookieOptions).status(200).json({
            id: user.id,
            role: user.role,
            token,
        });

    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({
            status: 'error',
            error: error.message
        });
    }
};

const logout = (req, res) => {
    res.clearCookie('accessToken', {
        secure: true,
        sameSite: "none"
    }).status(200).json({
        status: 'success',
        message: 'User has been logged out!'
    });
};

const getUserById = async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                status: 'error',
                error: 'User not found!'
            });
        }

        return res.json(user);

    } catch (error) {
        console.error("Get user error:", error);
        return res.status(500).json({
            status: 'error',
            error: 'Database error'
        });
    }
};

module.exports = { signup, login, logout, getUserById };