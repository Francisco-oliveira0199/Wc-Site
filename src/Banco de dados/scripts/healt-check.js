#!/usr/bin/env node

const axios = require('axios');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

class HealthChecker {
    constructor() {
        this.endpoints = [
            'http://localhost:3001/api/health',
            'http://localhost:3001/api/ping'
        ];
        
        this.thresholds = {
            responseTime: 5000, // 5 segundos
            memoryLimit: 500, // 500MB
            cpuLimit: 80 // 80%
        };
    }

    async checkAll() {
        console.log(' Iniciando verificação completa de saúde...\n');

        // 1. Verificar endpoints da API
        console.log('1. Verificando endpoints da API:');
        for (const endpoint of this.endpoints) {
            await this.checkEndpoint(endpoint);
        }

        // 2. Verificar banco de dados
        console.log('\n2. Verificando banco de dados:');
        await this.checkDatabase();

        // 3. Verificar recursos do sistema
        console.log('\n3. Verificando recursos do sistema:');
        await this.checkSystemResources();

        console.log('\n✅ Verificação completa concluída!');
    }

    async checkEndpoint(url) {
        try {
            const start = Date.now();
            const response = await axios.get(url, { timeout: 10000 });
            const responseTime = Date.now() - start;

            const status = responseTime < this.thresholds.responseTime ? '✅' : '⚠️';
            
            console.log(`${status} ${url}`);
            console.log(`   Status: ${response.status}`);
            console.log(`   Tempo: ${responseTime}ms`);
            console.log(`   Dados: ${JSON.stringify(response.data).substring(0, 100)}...`);
            
            if (responseTime > this.thresholds.responseTime) {
                console.log(`  Tempo de resposta alto: ${responseTime}ms`);
            }
        } catch (error) {
            console.log(` ${url}`);
            console.log(`   Erro: ${error.message}`);
        }
    }

    async checkDatabase() {
        try {
            // Verificar se o banco está respondendo
            const { stdout } = await execPromise('mysqladmin ping -h localhost -u root');
            
            if (stdout.includes('mysqld is alive')) {
                console.log(' Banco de dados MySQL está online');
            } else {
                console.log(' Banco de dados não responde');
            }

            // Verificar espaço em disco
            const { stdout: diskSpace } = await execPromise('df -h /');
            console.log('\n Espaço em disco:');
            console.log(diskSpace);

        } catch (error) {
            console.log(` Erro ao verificar banco: ${error.message}`);
        }
    }

    async checkSystemResources() {
        try {
            // Memória
            const { stdout: memoryInfo } = await execPromise('free -m');
            console.log(' Memória:');
            console.log(memoryInfo);

            // CPU
            const { stdout: cpuInfo } = await execPromise('top -bn1 | grep "Cpu(s)"');
            console.log(' CPU:');
            console.log(cpuInfo);

            // Processos Node
            const { stdout: nodeProcesses } = await execPromise('ps aux | grep node');
            console.log(' Processos Node:');
            const lines = nodeProcesses.split('\n').filter(line => line.includes('server.js'));
            console.log(lines.slice(0, 3).join('\n'));

        } catch (error) {
            console.log(` Erro ao verificar recursos: ${error.message}`);
        }
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    const checker = new HealthChecker();
    checker.checkAll().catch(console.error);
}

module.exports = HealthChecker;