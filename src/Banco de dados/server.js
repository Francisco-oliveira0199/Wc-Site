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

// Configuração de segurança melhorada
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
    crossOriginEmbedderPolicy: false,
}));

// Configuração CORS
const corsOptions = {
    origin: function(origin, callback) {
        const allowedOrigins = process.env.CORS_ORIGIN ? 
            process.env.CORS_ORIGIN.split(',') : 
            ['http://localhost:3000', 'https://*.render.com', 'https://*.onrender.com'];
        
        if (!origin || allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};
app.use(cors(corsOptions));

// Rate limiting com configurações específicas
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || 15) * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX || 100),
    message: { 
        success: false,
        error: 'Muitas requisições deste IP, tente novamente em 15 minutos.' 
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
});
app.use('/api/', limiter);

// Middleware para parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware melhorado
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`${new Date().toISOString()} ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms - IP: ${req.ip}`);
    });
    next();
});

// Health check detalhado para Better Stack
app.get('/api/health', async (req, res) => {
    try {
        // Testar conexão com o banco
        await db.query('SELECT 1');
        
        // Coletar métricas do sistema
        const memoryUsage = process.memoryUsage();
        const uptime = process.uptime();
        
        res.json({ 
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            environment: process.env.NODE_ENV,
            database: 'connected',
            memory: {
                rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
                heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
                heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
                external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`
            },
            uptime: `${Math.round(uptime)}s`,
            node: process.version
        });
    } catch (error) {
        console.error('Health check failed:', error);
        res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: 'Database connection failed',
            environment: process.env.NODE_ENV
        });
    }
});

// Endpoint especial para keep-alive do Render
app.get('/api/ping', (req, res) => {
    res.json({ 
        success: true,
        message: 'pong',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/codes', codeRoutes);

// Rota raiz
app.get('/', (req, res) => {
    res.json({
        service: 'Wild Clash API',
        version: '1.0.0',
        status: 'online',
        documentation: '/api/health',
        endpoints: {
            auth: '/api/auth',
            codes: '/api/codes',
            health: '/api/health'
        }
    });
});

// 404 Handler
app.use('*', (req, res) => {
    res.status(404).json({ 
        success: false,
        error: 'Rota não encontrada',
        path: req.originalUrl,
        method: req.method
    });
});

// Error handler melhorado
app.use((err, req, res, next) => {
    console.error('Erro não tratado:', {
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        url: req.url,
        method: req.method,
        body: req.body,
        params: req.params,
        query: req.query,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
    });
    
    // Erro de validação
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            error: 'Erro de validação',
            details: err.errors
        });
    }
    
    // Erro de token JWT
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            success: false,
            error: 'Token inválido'
        });
    }
    
    // Erro de token expirado
    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            success: false,
            error: 'Token expirado'
        });
    }
    
    // Erro de rate limit
    if (err.name === 'RateLimitError') {
        return res.status(429).json({
            success: false,
            error: 'Limite de requisições excedido'
        });
    }
    
    // Erro genérico
    res.status(err.status || 500).json({
        success: false,
        error: process.env.NODE_ENV === 'development' ? err.message : 'Erro interno do servidor'
    });
});

// Conectar ao banco e iniciar servidor
async function startServer() {
    try {
        await db.connect();
        console.log(' Banco de dados conectado');
        
        // Criar conexão de teste para verificar funcionalidade
        const [settings] = await db.query('SELECT COUNT(*) as count FROM system_settings');
        console.log(` Configurações do sistema: ${settings[0].count} registros`);
        
        app.listen(PORT, () => {
            console.log(` Servidor rodando na porta ${PORT}`);
            console.log(` Ambiente: ${process.env.NODE_ENV}`);
            console.log(` Health check: http://localhost:${PORT}/api/health`);
            console.log(` Keep-alive: http://localhost:${PORT}/api/ping`);
            console.log(` Uptime monitor ativo`);
        });
        
        // Log de inicialização completa
        console.log(` Sistema iniciado em: ${new Date().toISOString()}`);
        
    } catch (err) {
        console.error(' Erro ao iniciar servidor:', err);
        process.exit(1);
    }
}

// Iniciar servidor
startServer();

// Process handlers para graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM recebido. Encerrando servidor...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT recebido. Encerrando servidor...');
    process.exit(0);
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

module.exports = app;