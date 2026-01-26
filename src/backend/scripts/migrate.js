const db = require('../database');
const fs = require('fs');
const path = require('path');

async function runMigrations() {
    try {
        console.log('Conectando ao banco de dados...');
        await db.connect();
        
        console.log('Executando migrações...');
        const sqlPath = path.join(__dirname, '../wildclash.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        
        // Separar os comandos SQL
        const commands = sql.split(';').filter(cmd => cmd.trim());
        
        for (const command of commands) {
            if (command.trim()) {
                try {
                    await db.query(command + ';');
                } catch (error) {
                    // Ignorar erros de duplicação
                    if (!error.message.includes('already exists')) {
                        console.log(`Comando ignorado: ${error.message}`);
                    }
                }
            }
        }
        
        console.log('Migrações concluídas com sucesso!');
        process.exit(0);
    } catch (error) {
        console.error('Erro nas migrações:', error);
        process.exit(1);
    }
}

runMigrations();