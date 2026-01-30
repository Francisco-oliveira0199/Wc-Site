const axios = require('axios');
const fs = require('fs');
const path = require('path');

class KeepAliveService {
    constructor() {
        this.services = [
            {
                name: 'Render API',
                url: process.env.RENDER_URL || 'https://wildclash-api.onrender.com',
                endpoints: ['/api/health', '/api/ping']
            }
        ];
        
        this.interval = 5 * 60 * 1000; // 5 minutos
        this.logFile = path.join(__dirname, '../logs/keep-alive.log');
        this.ensureLogDir();
    }

    ensureLogDir() {
        const logDir = path.dirname(this.logFile);
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
    }

    log(message) {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] ${message}`;
        
        console.log(logMessage);
        fs.appendFileSync(this.logFile, logMessage + '\n', 'utf8');
    }

    async pingService(service) {
        for (const endpoint of service.endpoints) {
            try {
                const url = `${service.url}${endpoint}`;
                const start = Date.now();
                
                const response = await axios.get(url, {
                    timeout: 10000,
                    headers: {
                        'User-Agent': 'KeepAlive/1.0'
                    }
                });
                
                const responseTime = Date.now() - start;
                
                this.log(`✅ ${service.name} - ${endpoint}: ${response.status} (${responseTime}ms)`);
                
                return true;
            } catch (error) {
                this.log(`❌ ${service.name} - ${endpoint}: ${error.message}`);
            }
        }
        return false;
    }

    async start() {
        this.log('🚀 Iniciando serviço de Keep-Alive');
        this.log(`⏰ Intervalo: ${this.interval / 60000} minutos`);
        
        // Ping inicial
        await this.pingAll();
        
        // Configurar intervalo
        setInterval(async () => {
            await this.pingAll();
        }, this.interval);
    }

    async pingAll() {
        this.log('--- Executando ping em todos os serviços ---');
        
        const results = [];
        for (const service of this.services) {
            const result = await this.pingService(service);
            results.push({ service: service.name, status: result });
        }
        
        // Salvar status
        this.saveStatus(results);
        
        this.log('--- Ping concluído ---\n');
    }

    saveStatus(results) {
        const statusFile = path.join(__dirname, '../logs/status.json');
        const status = {
            lastCheck: new Date().toISOString(),
            results: results,
            uptime: process.uptime()
        };
        
        fs.writeFileSync(statusFile, JSON.stringify(status, null, 2), 'utf8');
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    const keepAlive = new KeepAliveService();
    keepAlive.start().catch(console.error);
}

module.exports = KeepAliveService;