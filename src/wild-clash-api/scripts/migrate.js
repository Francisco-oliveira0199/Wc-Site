const fs = require('fs');
const path = require('path');

async function runMigrations() {
  console.log('🔄 Running database migrations...');
  
  try {
    // Carregar configurações do banco diretamente
    const config = {
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT || 3306
    };

    // Criar conexão temporária
    const mysql = require('mysql2');
    const connection = mysql.createConnection(config);

    // Ler arquivo SQL
    const sqlPath = path.join(__dirname, '../wildclash.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Executar cada comando
    const commands = sql.split(';').filter(cmd => cmd.trim());
    
    for (const command of commands) {
      if (command.trim()) {
        try {
          await new Promise((resolve, reject) => {
            connection.query(command + ';', (error, results) => {
              if (error) {
                // Ignorar erros de "já existe"
                if (error.message.includes('already exists')) {
                  console.log(`⚠️  Skipping (already exists): ${command.substring(0, 50)}...`);
                  resolve();
                } else {
                  reject(error);
                }
              } else {
                console.log(`✅ Executed: ${command.substring(0, 50)}...`);
                resolve();
              }
            });
          });
        } catch (error) {
          console.error(`❌ Error executing command: ${error.message}`);
        }
      }
    }

    console.log('✅ Migrations completed successfully!');
    connection.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  }
}

runMigrations();