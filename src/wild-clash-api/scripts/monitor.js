// Script de monitoramento simples para ser executado localmente (opcional)
const axios = require('axios');

class SimpleMonitor {
  constructor() {
    this.url = process.env.API_URL || 'http://localhost:3001';
    this.interval = 5 * 60 * 1000; // 5 minutos
  }

  async check() {
    try {
      const healthResponse = await axios.get(`${this.url}/api/health`, { timeout: 10000 });
      console.log(`[${new Date().toISOString()}] Health: ${healthResponse.data.status}`);
      
      const pingResponse = await axios.get(`${this.url}/api/ping`, { timeout: 10000 });
      console.log(`[${new Date().toISOString()}] Ping: ${pingResponse.data.status}`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error: ${error.message}`);
    }
  }

  start() {
    console.log(`Starting monitor for ${this.url}`);
    this.check(); // executar imediatamente
    setInterval(() => this.check(), this.interval);
  }
}

const monitor = new SimpleMonitor();
monitor.start();