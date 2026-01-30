const axios = require('axios');
const fs = require('fs');
const path = require('path');

class ServiceMonitor {
    constructor() {
        this.apiUrl = process.env.API_URL || 'https://wildclash-api.onrender.com';
        this.checkInterval = parseInt(process.env.CHECK_INTERVAL || 300000); // 5 minutos
        this.maxRetries = 3;
        this.logFile = path.join(__dirname, '../logs/monitor.log');
        this.ensureLogDirectory();
    }

    ensureLogDirectory() {
        const logDir = path.dirname(this.logFile);
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
    }

    log(message, type = 'INFO') {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [${type}] ${message}`;
        
        console.log(logMessage);
        
        // Log para arquivo
        fs.appendFileSync(this.logFile, logMessage + '\n', 'utf8');
    }

    async checkHealth() {
        try {
            const response = await axios.get(`${this.apiUrl}/api/health`, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'WildClash-Monitor/1.0'
                }
            });

            const data = response.data;
            
            if (data.status === 'healthy') {
                this.log(` Health check OK - Database: ${data.database} - Memory: ${data.memory.heapUsed}`);
                return true;
            } else {
                this.log(` Health check FAILED - Status: ${data.status}`, 'ERROR');
                return false;
            }
        } catch (error) {
            this.log(` Health check ERROR: ${error.message}`, 'ERROR');
            return false;
        }
    }

    async keepAlive() {
        try {
            const response = await axios.get(`${this.apiUrl}/api/ping`, {
                timeout: 10000
            });

            if (response.data.success) {
                this.log(` Keep-alive OK - Uptime: ${response.data.uptime}s`);
                return true;
            }
            return false;
        } catch (error) {
            this.log(` Keep-alive ERROR: ${error.message}`, 'ERROR');
            return false;
        }
    }

    async monitor() {
        this.log(' Iniciando monitoramento do serviço Wild Clash');
        this.log(` API URL: ${this.apiUrl}`);
        this.log(` Intervalo de verificação: ${this.checkInterval / 1000}s`);

        let consecutiveFailures = 0;
        let totalChecks = 0;
        let successfulChecks = 0;

        const performCheck = async () => {
            totalChecks++;
            
            this.log(` Executando verificação #${totalChecks}...`);
            
            const healthOk = await this.checkHealth();
            const pingOk = await this.keepAlive();

            if (healthOk && pingOk) {
                successfulChecks++;
                consecutiveFailures = 0;
                this.log(` Estatísticas: ${successfulChecks}/${totalChecks} checks bem-sucedidos`);
            } else {
                consecutiveFailures++;
                this.log(` Falhas consecutivas: ${consecutiveFailures}/${this.maxRetries}`, 'WARNING');
                
                if (consecutiveFailures >= this.maxRetries) {
                    this.log(` CRÍTICO: ${consecutiveFailures} falhas consecutivas detectadas`, 'CRITICAL');
                    // Aqui você pode adicionar notificações:
                    // - Email
                    // - Slack
                    // - Discord
                    // - SMS
                }
            }

            // Salvar estatísticas periódicas
            if (totalChecks % 10 === 0) {
                this.saveStats({
                    totalChecks,
                    successfulChecks,
                    consecutiveFailures,
                    successRate: (successfulChecks / totalChecks * 100).toFixed(2),
                    lastCheck: new Date().toISOString()
                });
            }
        };

        // Executar imediatamente
        await performCheck();

        // Agendar execução periódica
        setInterval(async () => {
            await performCheck();
        }, this.checkInterval);
    }

    saveStats(stats) {
        const statsFile = path.join(__dirname, '../logs/stats.json');
        fs.writeFileSync(statsFile, JSON.stringify(stats, null, 2), 'utf8');
        this.log(` Estatísticas salvas: ${stats.successRate}% de sucesso`);
    }
}

// Iniciar monitoramento se executado diretamente
if (require.main === module) {
    const monitor = new ServiceMonitor();
    monitor.monitor().catch(console.error);
}

module.exports = ServiceMonitor;