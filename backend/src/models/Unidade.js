const { DataTypes } = require('sequelize');
const sequelize = require('../database/connection');

const Unidade = sequelize.define('Unidade', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  codigo: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: { msg: 'Código é obrigatório' }
    }
  },
  nome: {
    type: DataTypes.STRING(150),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Nome é obrigatório' }
    }
  },
  endereco: {
    type: DataTypes.STRING(300),
    allowNull: true
  },
  cidade: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  estado: {
    type: DataTypes.STRING(2),
    allowNull: true,
    validate: {
      len: { args: [2, 2], msg: 'Estado deve ter 2 caracteres' }
    }
  },
  latitude: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: true
  },
  longitude: {
    type: DataTypes.DECIMAL(11, 8),
    allowNull: true
  },
  ativo: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'unidades',
  timestamps: true,
  createdAt: 'criado_em',
  updatedAt: 'atualizado_em'
});

module.exports = Unidade;
