const db = require('../config/db-config')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const signup = async (req, res) => {
    try {
        const { name, email, phone, password, role } = req.body

        if (!name || !email || !phone || !password || !role) {
            return res.status(400).json({
                status: 'error',
                error: 'All fields are required!',
            });
        }

        const existingUserQuery = 'SELECT * FROM users WHERE email = ?'
        db.query(existingUserQuery, [email], (err, data) => {
            if(err) {
                return res.status(500).json(err)
            }
            if(data.length) {
                return res.status(409).json({ status: 'error', error: 'User already exists!' });
            }

            const salt = bcrypt.genSaltSync(10)
            const hashedPassword = bcrypt.hashSync(password, salt)

            const insertQuery = 'INSERT INTO users (`name`, `email`, `phone`, `password`, `role`) VALUE (?)'
            const userValues = [name, email, phone, hashedPassword, role]

            db.query(insertQuery, [userValues], (error, result) => {
                if (error) {
                    return res.status(500).json(err);
                }
                return res.status(201).json({
                    data: {
                        id: result.insertId,
                        name,
                        email,
                        role
                    }
                })
            })
        }) 
    } catch (error) {
        return res.status(500).json({ error: error.message })
    }
}

const login = (req, res) => {
    const {email, password} = req.body
    const userQuery = 'SELECT * FROM users WHERE email = ?'
    db.query(userQuery, [email], async (err, data) => {
        if (err) {
            return res.status(500).json(err);
        }
        if (data.length === 0) {
            return res.status(404).json('User not found!');
        }

        const user = data[0]
        const checkPassword = bcrypt.compareSync(password, user.password)

        if(!checkPassword) {
            return res.status(400).json('Incorrect email or password!');
        }

        const id = user.id
        const token = jwt.sign({id}, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRES_IN || '1h'
        })

        console.log('Generated token: ', token)

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
    })
}

const logout = (req, res) => {
    res.clearCookie('accessToken', {
        secure: true,
        sameSite: "none"
    }).status(200).json('User has been logged out!');
}

const getUserById = (req, res) => {
    const userId = req.params.id;

    const q = 'SELECT name, email, phone FROM users WHERE id = ?';
    db.query(q, [userId], (err, result) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({
                status: 'error',
                error: 'Database error'
            });
        }
        if (result.length === 0) {
            return res.status(404).json({
                status: 'error',
                error: 'User not found!'
            });
        }

        return res.json(result[0]);
    })
}

const fetchProfile = (req, res) => {
    const userId = req.user.id
    const userQuery = 'SELECT id, name, phone, email, role FROM users WHERE id = ?'
    db.query(userQuery, [userId], (err, data) => {
        if (err) {
            console.log(err);
            return res.status(500).json({
                status: 'error',
                error: 'Failed to fetch user data'
            });
        }
        if (data.length === 0) {
            return res.status(404).json({
                status: 'error',
                error: 'User not found!'
            });
        }

        const userProfile = {
            id: data[0].id,
            name: data[0].name,
            email: data[0].email,
            phone: data[0].phone,
            role: data[0].role,
        }

        return res.status(200).json({
            status: 'success',
            data: userProfile
        })
    })
}

module.exports = {signup, login, logout, fetchProfile, getUserById}