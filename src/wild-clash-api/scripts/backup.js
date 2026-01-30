#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const axios = require('axios');
const winston = require('winston');

// Configurar logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ 
      filename: path.join(__dirname, '../logs/backup.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 5
    }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

class DatabaseBackup {
  constructor() {
    this.backupDir = path.join(__dirname, '../backups');
    this.maxBackups = parseInt(process.env.MAX_BACKUPS || 10);
    this.backupRetentionDays = parseInt(process.env.BACKUP_RETENTION_DAYS || 30);
    this.ensureDirectories();
    
    // Configurações do banco
    this.dbConfig = {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    };
    
    // Configurações para upload (opcional)
    this.uploadConfig = {
      enabled: process.env.BACKUP_UPLOAD_ENABLED === 'true',
      service: process.env.BACKUP_UPLOAD_SERVICE, // 'google_drive', 'dropbox', 's3'
      apiKey: process.env.BACKUP_UPLOAD_API_KEY,
      folderId: process.env.BACKUP_UPLOAD_FOLDER_ID
    };
  }

  ensureDirectories() {
    // Criar diretórios necessários
    const directories = [
      this.backupDir,
      path.join(__dirname, '../logs'),
      path.join(__dirname, '../temp')
    ];
    
    directories.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        logger.info(`Diretório criado: ${dir}`);
      }
    });
  }

  async validateDatabaseConfig() {
    const requiredVars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
    const missing = requiredVars.filter(varName => !process.env[varName]);
    
    if (missing.length > 0) {
      throw new Error(`Variáveis de ambiente faltando: ${missing.join(', ')}`);
    }
    
    logger.info('Configuração do banco validada com sucesso');
    return true;
  }

  async createBackup(options = {}) {
    const startTime = Date.now();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupType = options.type || 'full';
    const backupFile = path.join(this.backupDir, `backup-${backupType}-${timestamp}.sql`);
    const compressedFile = `${backupFile}.gz`;
    
    logger.info(`Iniciando backup ${backupType}...`, { timestamp, backupType });

    try {
      // Validar configuração
      await this.validateDatabaseConfig();

      // Comando mysqldump
      const dumpCommand = this.buildDumpCommand(backupFile, options);
      
      logger.debug(`Executando comando: ${dumpCommand.substring(0, 100)}...`);
      
      // Executar dump
      const { stdout, stderr } = await execPromise(dumpCommand);
      
      if (stderr && !stderr.includes('Warning')) {
        throw new Error(`Erro no mysqldump: ${stderr}`);
      }

      // Compactar backup
      await this.compressBackup(backupFile, compressedFile);
      
      // Remover arquivo não compactado
      fs.unlinkSync(backupFile);
      
      // Verificar integridade
      await this.verifyBackup(compressedFile);
      
      // Estatísticas
      const stats = fs.statSync(compressedFile);
      const fileSizeMB = (stats.size / 1024 / 1024).toFixed(2);
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      
      logger.info(`Backup criado com sucesso!`, {
        file: compressedFile,
        size: `${fileSizeMB} MB`,
        duration: `${duration} segundos`,
        backupType
      });

      // Upload para serviço externo (opcional)
      if (this.uploadConfig.enabled) {
        await this.uploadBackup(compressedFile);
      }

      // Limpeza de backups antigos
      await this.cleanupOldBackups();

      // Salvar metadados
      await this.saveBackupMetadata({
        filename: path.basename(compressedFile),
        size: fileSizeMB,
        type: backupType,
        timestamp: new Date().toISOString(),
        duration,
        checksum: await this.calculateChecksum(compressedFile)
      });

      return {
        success: true,
        file: compressedFile,
        size: fileSizeMB,
        duration,
        message: 'Backup concluído com sucesso'
      };

    } catch (error) {
      logger.error(`Erro ao criar backup: ${error.message}`, { error: error.stack });
      
      // Limpar arquivos em caso de erro
      if (fs.existsSync(backupFile)) fs.unlinkSync(backupFile);
      if (fs.existsSync(compressedFile)) fs.unlinkSync(compressedFile);
      
      return {
        success: false,
        error: error.message,
        message: 'Falha ao criar backup'
      };
    }
  }

  buildDumpCommand(outputFile, options) {
    const { host, port, user, password, database } = this.dbConfig;
    
    const baseCommand = `mysqldump --host=${host} --port=${port} --user=${user}`;
    
    // Adicionar senha (usando variável de ambiente para segurança)
    process.env.MYSQL_PWD = password;
    
    let command = `${baseCommand} --single-transaction --routines --triggers --events`;
    
    // Opções específicas
    if (options.skipData) {
      command += ' --no-data';
    }
    
    if (options.skipStructure) {
      command += ' --no-create-info';
    }
    
    // Tabelas específicas
    if (options.tables && options.tables.length > 0) {
      command += ` ${database} ${options.tables.join(' ')}`;
    } else {
      command += ` ${database}`;
    }
    
    command += ` > ${outputFile}`;
    
    return command;
  }

  async compressBackup(inputFile, outputFile) {
    const command = `gzip -c ${inputFile} > ${outputFile}`;
    
    try {
      await execPromise(command);
      logger.debug(`Backup compactado: ${outputFile}`);
    } catch (error) {
      throw new Error(`Erro ao compactar backup: ${error.message}`);
    }
  }

  async verifyBackup(backupFile) {
    try {
      // Verificar se o arquivo existe e tem tamanho
      const stats = fs.statSync(backupFile);
      if (stats.size === 0) {
        throw new Error('Arquivo de backup vazio');
      }

      // Verificar integridade do gzip
      const verifyCommand = `gzip -t ${backupFile}`;
      await execPromise(verifyCommand);
      
      logger.debug(`Backup verificado com sucesso: ${backupFile}`);
      return true;
    } catch (error) {
      throw new Error(`Backup corrompido: ${error.message}`);
    }
  }

  async cleanupOldBackups() {
    try {
      const files = fs.readdirSync(this.backupDir)
        .filter(file => file.endsWith('.sql.gz'))
        .map(file => {
          const filePath = path.join(this.backupDir, file);
          const stats = fs.statSync(filePath);
          return {
            name: file,
            path: filePath,
            time: stats.mtime.getTime(),
            age: Date.now() - stats.mtime.getTime()
          };
        })
        .sort((a, b) => b.time - a.time); // Mais recente primeiro

      // Limitar por quantidade
      if (files.length > this.maxBackups) {
        const toDelete = files.slice(this.maxBackups);
        for (const file of toDelete) {
          fs.unlinkSync(file.path);
          logger.info(`Backup antigo removido (quantidade): ${file.name}`);
        }
      }

      // Limitar por idade
      const cutoffTime = Date.now() - (this.backupRetentionDays * 24 * 60 * 60 * 1000);
      const oldFiles = files.filter(file => file.time < cutoffTime);
      
      for (const file of oldFiles) {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
          logger.info(`Backup antigo removido (idade): ${file.name}`);
        }
      }

      logger.info(`Limpeza concluída. Backups restantes: ${files.length - oldFiles.length}`);
    } catch (error) {
      logger.error(`Erro na limpeza de backups: ${error.message}`);
    }
  }

  async listBackups() {
    try {
      const files = fs.readdirSync(this.backupDir)
        .filter(file => file.endsWith('.sql.gz'))
        .map(file => {
          const filePath = path.join(this.backupDir, file);
          const stats = fs.statSync(filePath);
          const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
          
          return {
            name: file,
            path: filePath,
            size: `${sizeMB} MB`,
            created: stats.mtime,
            age: Math.floor((Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24))
          };
        })
        .sort((a, b) => b.created - a.created);

      return {
        count: files.length,
        totalSize: files.reduce((sum, file) => sum + parseFloat(file.size), 0).toFixed(2),
        backups: files
      };
    } catch (error) {
      logger.error(`Erro ao listar backups: ${error.message}`);
      return { count: 0, backups: [] };
    }
  }

  async restoreBackup(backupFile, options = {}) {
    const startTime = Date.now();
    
    if (!backupFile) {
      // Usar backup mais recente
      const backups = await this.listBackups();
      if (backups.count === 0) {
        throw new Error('Nenhum backup disponível para restauração');
      }
      backupFile = backups.backups[0].path;
    }

    logger.info(`Iniciando restauração: ${backupFile}`, { options });

    try {
      // Verificar se o backup existe
      if (!fs.existsSync(backupFile)) {
        throw new Error(`Arquivo de backup não encontrado: ${backupFile}`);
      }

      // Descompactar
      const tempDir = path.join(__dirname, '../temp');
      const tempFile = path.join(tempDir, `restore-${Date.now()}.sql`);
      
      const decompressCommand = `gzip -dc ${backupFile} > ${tempFile}`;
      await execPromise(decompressCommand);

      // Backup do banco atual (opcional)
      if (options.backupBeforeRestore) {
        logger.info('Criando backup do banco atual antes da restauração...');
        await this.createBackup({ type: 'pre-restore' });
      }

      // Restaurar
      const restoreCommand = this.buildRestoreCommand(tempFile, options);
      await execPromise(restoreCommand);

      // Limpar arquivo temporário
      fs.unlinkSync(tempFile);

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      
      logger.info(`Restauração concluída com sucesso!`, {
        file: backupFile,
        duration: `${duration} segundos`
      });

      return {
        success: true,
        message: 'Banco de dados restaurado com sucesso',
        duration,
        backupUsed: path.basename(backupFile)
      };

    } catch (error) {
      logger.error(`Erro na restauração: ${error.message}`, { error: error.stack });
      
      return {
        success: false,
        error: error.message,
        message: 'Falha na restauração do banco de dados'
      };
    }
  }

  buildRestoreCommand(sqlFile, options) {
    const { host, port, user, password, database } = this.dbConfig;
    
    // Configurar senha
    process.env.MYSQL_PWD = password;
    
    let command = `mysql --host=${host} --port=${port} --user=${user}`;
    
    // Opções específicas
    if (options.dropDatabase) {
      command += ` -e "DROP DATABASE IF EXISTS ${database}; CREATE DATABASE ${database};"`;
    }
    
    command += ` ${database} < ${sqlFile}`;
    
    return command;
  }

  async scheduleBackups() {
    logger.info('Agendando backups automáticos...');
    
    const intervals = {
      daily: 24 * 60 * 60 * 1000,
      weekly: 7 * 24 * 60 * 60 * 1000,
      monthly: 30 * 24 * 60 * 60 * 1000
    };
    
    const interval = process.env.BACKUP_INTERVAL || 'daily';
    const intervalMs = intervals[interval] || intervals.daily;
    
    logger.info(`Backup agendado: ${interval} (${intervalMs / 1000 / 60 / 60} horas)`);
    
    // Executar primeiro backup imediatamente
    await this.createBackup({ type: `scheduled-${interval}` });
    
    // Agendar backups periódicos
    setInterval(async () => {
      try {
        await this.createBackup({ type: `scheduled-${interval}` });
      } catch (error) {
        logger.error(`Erro no backup agendado: ${error.message}`);
      }
    }, intervalMs);
    
    // Manter agendamento ativo
    setInterval(() => {
      logger.debug('Serviço de backup ativo...');
    }, 60 * 60 * 1000); // Log a cada hora
  }

  async saveBackupMetadata(metadata) {
    const metadataFile = path.join(this.backupDir, 'backup-metadata.json');
    
    try {
      let allMetadata = [];
      
      if (fs.existsSync(metadataFile)) {
        const existingData = fs.readFileSync(metadataFile, 'utf8');
        allMetadata = JSON.parse(existingData);
      }
      
      allMetadata.push({
        ...metadata,
        id: Date.now().toString()
      });
      
      // Manter apenas os 100 registros mais recentes
      if (allMetadata.length > 100) {
        allMetadata = allMetadata.slice(-100);
      }
      
      fs.writeFileSync(metadataFile, JSON.stringify(allMetadata, null, 2), 'utf8');
      logger.debug('Metadados do backup salvos');
    } catch (error) {
      logger.error(`Erro ao salvar metadados: ${error.message}`);
    }
  }

  async calculateChecksum(filePath) {
    try {
      const { stdout } = await execPromise(`sha256sum ${filePath}`);
      return stdout.split(' ')[0];
    } catch (error) {
      return null;
    }
  }

  async uploadBackup(filePath) {
    if (!this.uploadConfig.enabled) {
      return { success: false, message: 'Upload desabilitado' };
    }
    
    try {
      const service = this.uploadConfig.service;
      const fileName = path.basename(filePath);
      const fileStats = fs.statSync(filePath);
      
      logger.info(`Enviando backup para ${service}: ${fileName}`, {
        size: `${(fileStats.size / 1024 / 1024).toFixed(2)} MB`
      });
      
      // Implementação específica por serviço
      switch (service) {
        case 'google_drive':
          return await this.uploadToGoogleDrive(filePath);
        case 'dropbox':
          return await this.uploadToDropbox(filePath);
        case 's3':
          return await this.uploadToS3(filePath);
        default:
          logger.warn(`Serviço de upload não suportado: ${service}`);
          return { success: false, message: 'Serviço não suportado' };
      }
    } catch (error) {
      logger.error(`Erro no upload: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async uploadToGoogleDrive(filePath) {
    // Implementação básica para Google Drive
    const fileName = path.basename(filePath);
    const fileContent = fs.readFileSync(filePath);
    
    // Nota: Esta é uma implementação básica. Para produção,
    // você precisaria implementar OAuth2 completo.
    logger.info(`[SIMULAÇÃO] Upload para Google Drive: ${fileName}`);
    
    return {
      success: true,
      message: 'Upload simulado para Google Drive',
      fileName,
      simulated: true
    };
  }

  async uploadToDropbox(filePath) {
    // Implementação básica para Dropbox
    const fileName = path.basename(filePath);
    
    logger.info(`[SIMULAÇÃO] Upload para Dropbox: ${fileName}`);
    
    return {
      success: true,
      message: 'Upload simulado para Dropbox',
      fileName,
      simulated: true
    };
  }

  async sendNotification(title, message, level = 'info') {
    const webhookUrl = process.env.BACKUP_NOTIFICATION_WEBHOOK;
    
    if (!webhookUrl) return;
    
    try {
      await axios.post(webhookUrl, {
        title,
        message,
        level,
        timestamp: new Date().toISOString(),
        service: 'wildclash-backup'
      });
    } catch (error) {
      logger.error(`Erro ao enviar notificação: ${error.message}`);
    }
  }
}

// Interface de linha de comando
async function main() {
  const args = process.argv.slice(2);
  const action = args[0] || 'create';
  
  const backup = new DatabaseBackup();
  
  try {
    switch (action) {
      case 'create':
        const options = {
          type: args[1] || 'full',
          skipData: args.includes('--skip-data'),
          skipStructure: args.includes('--skip-structure'),
          tables: args.includes('--tables') ? args[args.indexOf('--tables') + 1].split(',') : []
        };
        
        const result = await backup.createBackup(options);
        console.log(JSON.stringify(result, null, 2));
        process.exit(result.success ? 0 : 1);
        
      case 'restore':
        const backupFile = args[1] || null;
        const restoreOptions = {
          backupBeforeRestore: !args.includes('--no-backup'),
          dropDatabase: args.includes('--drop-database')
        };
        
        const restoreResult = await backup.restoreBackup(backupFile, restoreOptions);
        console.log(JSON.stringify(restoreResult, null, 2));
        process.exit(restoreResult.success ? 0 : 1);
        
      case 'list':
        const backups = await backup.listBackups();
        console.log(JSON.stringify(backups, null, 2));
        break;
        
      case 'schedule':
        await backup.scheduleBackups();
        console.log('Backups agendados. Mantenha este processo rodando.');
        // Manter processo vivo
        setInterval(() => {}, 24 * 60 * 60 * 1000);
        break;
        
      case 'cleanup':
        await backup.cleanupOldBackups();
        console.log('Limpeza de backups concluída.');
        break;
        
      case 'upload':
        const fileToUpload = args[1];
        if (!fileToUpload) {
          console.error('Erro: Especifique o arquivo para upload');
          process.exit(1);
        }
        const uploadResult = await backup.uploadBackup(fileToUpload);
        console.log(JSON.stringify(uploadResult, null, 2));
        break;
        
      case 'help':
      default:
        console.log(`
📦 Sistema de Backup Wild Clash API
------------------------------------
Comandos disponíveis:

  create [type]         Criar backup (full, data, structure)
  restore [file]        Restaurar backup
  list                  Listar backups disponíveis
  schedule              Agendar backups automáticos
  cleanup               Limpar backups antigos
  upload <file>         Upload para serviço externo
  help                  Mostrar esta ajuda

Opções:
  --skip-data           Pular dados (apenas estrutura)
  --skip-structure      Pular estrutura (apenas dados)
  --tables <lista>      Backup apenas tabelas específicas
  --no-backup           Não criar backup antes de restaurar
  --drop-database       Apagar banco antes de restaurar

Exemplos:
  npm run backup create
  npm run backup create --skip-data
  npm run backup restore backups/backup-full-2024-01-30T10-00-00Z.sql.gz
  npm run backup list
        `);
        break;
    }
  } catch (error) {
    console.error(`❌ Erro: ${error.message}`);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  main().catch(error => {
    console.error('Erro fatal:', error);
    process.exit(1);
  });
}

module.exports = DatabaseBackup;