const http = require('http');
const https = require('https');

class HealthChecker {
  constructor() {
    this.baseUrl = process.env.API_URL || 'http://localhost:3001';
  }

  checkHealth() {
    return new Promise((resolve, reject) => {
      const url = `${this.baseUrl}/api/health`;
      const client = url.startsWith('https') ? https : http;

      const req = client.get(url, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.status === 'healthy') {
              resolve(json);
            } else {
              reject(new Error(`Health check failed: ${JSON.stringify(json)}`));
            }
          } catch (e) {
            reject(new Error(`Invalid JSON response: ${e.message}`));
          }
        });
      });

      req.on('error', (err) => {
        reject(err);
      });

      req.setTimeout(10000, () => {
        req.destroy();
        reject(new Error('Timeout'));
      });
    });
  }

  checkPing() {
    return new Promise((resolve, reject) => {
      const url = `${this.baseUrl}/api/ping`;
      const client = url.startsWith('https') ? https : http;

      const req = client.get(url, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.status === 'pong') {
              resolve(json);
            } else {
              reject(new Error(`Ping check failed: ${JSON.stringify(json)}`));
            }
          } catch (e) {
            reject(new Error(`Invalid JSON response: ${e.message}`));
          }
        });
      });

      req.on('error', (err) => {
        reject(err);
      });

      req.setTimeout(10000, () => {
        req.destroy();
        reject(new Error('Timeout'));
      });
    });
  }

  async run() {
    console.log('Checking Wild Clash API health...');
    try {
      const health = await this.checkHealth();
      console.log('✅ Health check passed:', health);
      const ping = await this.checkPing();
      console.log('✅ Ping check passed:', ping);
      process.exit(0);
    } catch (error) {
      console.error('❌ Health check failed:', error.message);
      process.exit(1);
    }
  }
}

const checker = new HealthChecker();
checker.run();