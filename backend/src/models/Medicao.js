const { DataTypes } = require('sequelize');
const sequelize = require('../database/connection');

const Medicao = sequelize.define('Medicao', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true
  },
  estacao_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'estacoes',
      key: 'id'
    }
  },
  parametro_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'parametros',
      key: 'id'
    }
  },
  valor: {
    type: DataTypes.DECIMAL(12, 4),
    allowNull: false
  },
  data_hora: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  flag: {
    type: DataTypes.ENUM('valid', 'pending', 'invalid', 'auto_invalid'),
    defaultValue: 'pending'
  },
  motivo_flag: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  validado_por: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'usuarios',
      key: 'id'
    }
  },
  validado_em: {
    type: DataTypes.DATE,
    allowNull: true
  },
  iqar_calculado: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Valor do IQAr para esta medição específica'
  },
  classificacao_iqar: {
    type: DataTypes.ENUM('Bom', 'Moderado', 'Ruim', 'Muito Ruim', 'Péssimo'),
    allowNull: true
  },
  fonte_dados: {
    type: DataTypes.STRING(50),
    defaultValue: 'manual',
    validate: {
      isIn: [['manual', 'api_rio', 'api_cetesb', 'arquivo_csv', 'arquivo_excel', 'equipamento']]
    }
  },
  importacao_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'importacoes_log',
      key: 'id'
    }
  }
}, {
  tableName: 'medicoes',
  timestamps: true,
  createdAt: 'criado_em',
  updatedAt: 'atualizado_em',
  indexes: [
    {
      fields: ['estacao_id', 'data_hora']
    },
    {
      fields: ['parametro_id']
    },
    {
      fields: ['data_hora']
    },
    {
      fields: ['flag']
    },
    {
      fields: ['importacao_id']
    },
    {
      name: 'idx_medicoes_dashboard',
      fields: ['estacao_id', 'parametro_id', 'data_hora']
    }
  ]
});

module.exports = Medicao;
