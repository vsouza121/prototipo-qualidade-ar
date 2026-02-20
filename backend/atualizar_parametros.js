require('dotenv').config();
const sequelize = require('./src/database/connection');

async function atualizar() {
    console.log('Atualizando parâmetros com tipo NULL...');
    
    // TEMPI - Temperatura interna (meteorológico)
    await sequelize.query("UPDATE parametros SET tipo='meteorologico', calcula_iqar=0, tipo_media='horaria' WHERE codigo='TEMPI'");
    
    // NO - Monóxido de nitrogênio (poluente)
    await sequelize.query("UPDATE parametros SET tipo='poluente', calcula_iqar=1, tipo_media='horaria' WHERE codigo='NO'");
    
    // NOX - Óxidos de nitrogênio (poluente)
    await sequelize.query("UPDATE parametros SET tipo='poluente', calcula_iqar=1, tipo_media='horaria' WHERE codigo='NOX'");
    
    // MP2,5 - PM2.5 (poluente) - código diferente
    await sequelize.query("UPDATE parametros SET tipo='poluente', calcula_iqar=1, tipo_media='24horas' WHERE codigo='MP2,5'");
    
    // CH4 - Metano (poluente mas não entra em IQAr padrão CONAMA)
    await sequelize.query("UPDATE parametros SET tipo='poluente', calcula_iqar=0, tipo_media='horaria' WHERE codigo='CH4'");
    
    // HCNM - Hidrocarbonetos não metano (poluente mas não entra em IQAr padrão)
    await sequelize.query("UPDATE parametros SET tipo='poluente', calcula_iqar=0, tipo_media='horaria' WHERE codigo='HCNM'");
    
    // HCT - Hidrocarbonetos totais (poluente mas não entra em IQAr padrão)
    await sequelize.query("UPDATE parametros SET tipo='poluente', calcula_iqar=0, tipo_media='horaria' WHERE codigo='HCT'");
    
    console.log('Parâmetros atualizados!');
    
    console.log('\nResultado:');
    const [params] = await sequelize.query('SELECT id, codigo, tipo, calcula_iqar, tipo_media FROM parametros ORDER BY tipo, codigo');
    console.table(params);
    
    process.exit(0);
}
atualizar();
