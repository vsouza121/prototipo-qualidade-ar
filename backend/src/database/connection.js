const { Sequelize } = require('sequelize');
const config = require('../config');

// Configuração do Sequelize para SQL Server
const sequelize = new Sequelize(
  config.database.name,
  config.database.user,
  config.database.password,
  {
    host: config.database.host,
    port: config.database.port,
    dialect: config.database.dialect,
    dialectOptions: config.database.dialectOptions,
    pool: config.database.pool,
    logging: config.database.logging,
    define: {
      timestamps: true,
      underscored: true, // usa snake_case nas colunas
      freezeTableName: true
    }
  }
);

// Testar conexão
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexão com SQL Server estabelecida com sucesso!');
    return true;
  } catch (error) {
    console.error('❌ Erro ao conectar com SQL Server:', error.message);
    return false;
  }
};

// Exporta sequelize diretamente para compatibilidade
module.exports = sequelize;
module.exports.sequelize = sequelize;
module.exports.testConnection = testConnection;
