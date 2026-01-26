const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const codeRoutes = require('./routes/codes');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3001;

// Configuração de segurança
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
}));

// Configuração CORS
const corsOptions = {
    origin: process.env.CORS_ORIGIN === '*' ? '*' : process.env.CORS_ORIGIN?.split(',') || '*',
    credentials: true,
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // limite por IP
    message: { error: 'Muitas requisições deste IP, tente novamente em 15 minutos.' }
});
app.use('/api/', limiter);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
    next();
});

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/codes', codeRoutes);

// Rota de saúde
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'online', 
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: process.env.NODE_ENV
    });
});

// 404 Handler
app.use('*', (req, res) => {
    res.status(404).json({ 
        success: false,
        error: 'Rota não encontrada' 
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Erro não tratado:', {
        message: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        timestamp: new Date().toISOString()
    });
    
    res.status(err.status || 500).json({
        success: false,
        error: process.env.NODE_ENV === 'development' ? err.message : 'Erro interno do servidor'
    });
});

// Conectar ao banco e iniciar servidor
async function startServer() {
    try {
        await db.connect();
        console.log('Banco de dados conectado');
        
        app.listen(PORT, () => {
            console.log(`Servidor rodando na porta ${PORT}`);
            console.log(`Ambiente: ${process.env.NODE_ENV}`);
            console.log(`Health check: http://localhost:${PORT}/api/health`);
        });
    } catch (err) {
        console.error('Erro ao conectar ao banco de dados:', err);
        process.exit(1);
    }
}

startServer();

module.exports = app;