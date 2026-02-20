const { DataTypes } = require('sequelize');
const sequelize = require('../database/connection');

const ImportacaoLog = sequelize.define('ImportacaoLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  fonte: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      isIn: [['api_rio', 'api_cetesb', 'arquivo_csv', 'arquivo_excel', 'manual', 'equipamento']]
    }
  },
  tipo: {
    type: DataTypes.STRING(30),
    allowNull: false,
    validate: {
      isIn: [['estacoes', 'medicoes', 'parametros', 'alertas']]
    }
  },
  data_execucao: {
    type: DataTypes.DATE,
    allowNull: true
  },
  data_inicio_dados: {
    type: DataTypes.DATE,
    allowNull: true
  },
  data_fim_dados: {
    type: DataTypes.DATE,
    allowNull: true
  },
  total_registros: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  registros_novos: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  registros_atualizados: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  registros_erro: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  status: {
    type: DataTypes.STRING(20),
    defaultValue: 'executando',
    validate: {
      isIn: [['executando', 'sucesso', 'erro', 'parcial']]
    }
  },
  mensagem: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  detalhes_erro: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  usuario_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'usuarios',
      key: 'id'
    }
  },
  tempo_execucao_ms: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  tableName: 'importacoes_log',
  timestamps: false,
  indexes: [
    { fields: ['fonte', 'data_execucao'] },
    { fields: ['status'] },
    { fields: ['data_execucao'] }
  ]
});

module.exports = ImportacaoLog;
