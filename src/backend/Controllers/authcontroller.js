const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

class AuthController {
    static async login(req, res) {
        try {
            const { username, password } = req.body;

            if (!username || !password) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Usuário e senha são obrigatórios' 
                });
            }

            const user = await User.findByUsername(username);
            
            if (!user) {
                return res.status(401).json({ 
                    success: false, 
                    error: 'Credenciais inválidas' 
                });
            }

            if (!user.is_active) {
                return res.status(401).json({ 
                    success: false, 
                    error: 'Usuário inativo' 
                });
            }

            const isValidPassword = await bcrypt.compare(password, user.password_hash);
            if (!isValidPassword) {
                return res.status(401).json({ 
                    success: false, 
                    error: 'Credenciais inválidas' 
                });
            }

            await User.updateLastLogin(user.id);

            const token = jwt.sign(
                { 
                    userId: user.id, 
                    username: user.username,
                    role: user.role || 'admin'
                },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
            );

            res.json({
                success: true,
                message: 'Login realizado com sucesso',
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: user.role
                }
            });
        } catch (error) {
            console.error('Erro no login:', error);
            res.status(500).json({ 
                success: false, 
                error: 'Erro no servidor' 
            });
        }
    }

    static async validateToken(req, res) {
        try {
            const token = req.headers.authorization?.split(' ')[1];
            
            if (!token) {
                return res.status(401).json({ 
                    success: false, 
                    error: 'Token não fornecido' 
                });
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            // Verificar se usuário ainda existe e está ativo
            const user = await User.findByUsername(decoded.username);
            if (!user || !user.is_active) {
                return res.status(401).json({ 
                    success: false, 
                    error: 'Usuário não encontrado ou inativo' 
                });
            }
            
            res.json({
                success: true,
                user: decoded
            });
        } catch (error) {
            res.status(401).json({ 
                success: false, 
                error: 'Token inválido' 
            });
        }
    }
}

module.exports = AuthController;