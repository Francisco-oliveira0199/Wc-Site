const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ 
                success: false, 
                error: 'Acesso não autorizado. Token necessário.' 
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Verificar se usuário ainda existe e está ativo
        const user = await User.findById(decoded.userId);
        if (!user || !user.is_active) {
            return res.status(401).json({ 
                success: false, 
                error: 'Usuário não encontrado ou inativo' 
            });
        }
        
        req.userId = decoded.userId;
        req.username = decoded.username;
        req.role = decoded.role;
        
        next();
    } catch (error) {
        console.error('Erro na autenticação:', error.message);
        return res.status(401).json({ 
            success: false, 
            error: 'Token inválido ou expirado' 
        });
    }
};

module.exports = authMiddleware;