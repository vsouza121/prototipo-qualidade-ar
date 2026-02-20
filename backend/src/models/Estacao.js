const { DataTypes } = require('sequelize');
const sequelize = require('../database/connection');

const Estacao = sequelize.define('Estacao', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  codigo: {
    type: DataTypes.STRING(30),
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
  unidade_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'unidades',
      key: 'id'
    }
  },
  latitude: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: false,
    validate: {
      min: { args: [-90], msg: 'Latitude mínima é -90' },
      max: { args: [90], msg: 'Latitude máxima é 90' }
    }
  },
  longitude: {
    type: DataTypes.DECIMAL(11, 8),
    allowNull: false,
    validate: {
      min: { args: [-180], msg: 'Longitude mínima é -180' },
      max: { args: [180], msg: 'Longitude máxima é 180' }
    }
  },
  altitude: {
    type: DataTypes.DECIMAL(7, 2),
    allowNull: true
  },
  endereco: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  bairro: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  parametros_monitorados: {
    type: DataTypes.TEXT, // JSON string: ["PM2.5", "PM10", "O3"]
    allowNull: true,
    get() {
      const raw = this.getDataValue('parametros_monitorados');
      return raw ? JSON.parse(raw) : [];
    },
    set(value) {
      this.setDataValue('parametros_monitorados', JSON.stringify(value));
    }
  },
  intervalo_coleta: {
    type: DataTypes.INTEGER, // minutos
    defaultValue: 5
  },
  status: {
    type: DataTypes.ENUM('online', 'offline', 'manutencao', 'calibracao'),
    defaultValue: 'online'
  },
  ultima_comunicacao: {
    type: DataTypes.DATE,
    allowNull: true
  },
  // Campos de integração externa
  codigo_externo: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'ID da estação na API externa'
  },
  fonte_dados: {
    type: DataTypes.ENUM('manual', 'api_rio', 'api_cetesb', 'equipamento', 'outro'),
    defaultValue: 'manual'
  },
  // Classificação
  tipo_estacao: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Automática, Manual, etc'
  },
  classificacao: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Urbana, Industrial, Rural, etc'
  },
  ativo: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  descricao: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'estacoes',
  timestamps: true,
  createdAt: 'criado_em',
  updatedAt: 'atualizado_em',
  indexes: [
    { fields: ['codigo'] },
    { fields: ['unidade_id'] },
    { fields: ['status'] },
    { fields: ['ativo'] },
    { fields: ['codigo_externo'] },
    { fields: ['fonte_dados'] }
  ]
});

module.exports = Estacao;
