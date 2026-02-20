require('dotenv').config();
const sequelize = require('./src/database/connection');

async function verificar() {
    try {
        const [cols] = await sequelize.query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'parametros'");
        console.log('Colunas na tabela parametros:');
        cols.forEach(c => console.log('  -', c.COLUMN_NAME));
        
        console.log('\n--- Parâmetros atuais ---');
        const [params] = await sequelize.query('SELECT id, codigo, tipo, calcula_iqar, tipo_media FROM parametros ORDER BY id');
        console.table(params);
        
        process.exit(0);
    } catch (e) {
        console.error('Erro:', e.message);
        process.exit(1);
    }
}
verificar();
