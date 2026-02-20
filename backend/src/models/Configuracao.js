const { DataTypes } = require('sequelize');
const sequelize = require('../database/connection');

const Configuracao = sequelize.define('Configuracao', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  chave: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  valor: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  tipo: {
    type: DataTypes.STRING(20),
    defaultValue: 'string',
    validate: {
      isIn: [['string', 'number', 'boolean', 'json']]
    }
  },
  descricao: {
    type: DataTypes.STRING(255),
    allowNull: true
  }
}, {
  tableName: 'configuracoes',
  timestamps: true,
  createdAt: 'criado_em',
  updatedAt: 'atualizado_em'
});

// Métodos estáticos para acesso fácil às configurações
Configuracao.getValue = async function(chave, valorPadrao = null) {
  const config = await this.findOne({ where: { chave } });
  if (!config) return valorPadrao;
  
  switch (config.tipo) {
    case 'number':
      return parseFloat(config.valor);
    case 'boolean':
      return config.valor === 'true';
    case 'json':
      try {
        return JSON.parse(config.valor);
      } catch {
        return valorPadrao;
      }
    default:
      return config.valor;
  }
};

Configuracao.setValue = async function(chave, valor, tipo = 'string', descricao = null) {
  const valorString = tipo === 'json' ? JSON.stringify(valor) : String(valor);
  
  const [config, created] = await this.findOrCreate({
    where: { chave },
    defaults: { valor: valorString, tipo, descricao }
  });
  
  if (!created) {
    config.valor = valorString;
    if (tipo) config.tipo = tipo;
    if (descricao) config.descricao = descricao;
    await config.save();
  }
  
  return config;
};

module.exports = Configuracao;
