const { DataTypes } = require('sequelize');
const sequelize = require('../database/connection');

const MedicaoDiaria = sequelize.define('MedicaoDiaria', {
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
  data: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  valor_medio: {
    type: DataTypes.DECIMAL(12, 4),
    allowNull: false
  },
  valor_minimo: {
    type: DataTypes.DECIMAL(12, 4),
    allowNull: true
  },
  valor_maximo: {
    type: DataTypes.DECIMAL(12, 4),
    allowNull: true
  },
  desvio_padrao: {
    type: DataTypes.DECIMAL(12, 4),
    allowNull: true
  },
  total_medicoes: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  medicoes_validas: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  percentil_50: {
    type: DataTypes.DECIMAL(12, 4),
    allowNull: true
  },
  percentil_90: {
    type: DataTypes.DECIMAL(12, 4),
    allowNull: true
  },
  percentil_95: {
    type: DataTypes.DECIMAL(12, 4),
    allowNull: true
  },
  iqar: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  classificacao_iqar: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  calculado_em: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'medicoes_diarias',
  timestamps: false,
  indexes: [
    { fields: ['estacao_id', 'data'] },
    { fields: ['parametro_id', 'data'] },
    { unique: true, fields: ['estacao_id', 'parametro_id', 'data'] }
  ]
});

module.exports = MedicaoDiaria;
