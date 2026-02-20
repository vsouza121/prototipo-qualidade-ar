const { DataTypes } = require('sequelize');
const sequelize = require('../database/connection');

const Parametro = sequelize.define('Parametro', {
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
    type: DataTypes.STRING(100),
    allowNull: false
  },
  nome_cientifico: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  unidade_medida: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'µg/m³'
  },
  // Tipo do parâmetro
  tipo: {
    type: DataTypes.STRING(20),
    defaultValue: 'poluente',
    validate: {
      isIn: [['poluente', 'meteorologico', 'outro']]
    },
    comment: 'Tipo: poluente, meteorologico ou outro'
  },
  // Flag para indicar se calcula IQAr
  calcula_iqar: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Se true, este parâmetro entra no cálculo de IQAr'
  },
  // Tipo de média para cálculo (CONAMA)
  tipo_media: {
    type: DataTypes.STRING(20),
    defaultValue: 'horaria',
    validate: {
      isIn: [['horaria', '8horas', '24horas']]
    },
    comment: 'Tipo de média: horaria, 8horas ou 24horas'
  },
  // Limites para cálculo do IQAr (CONAMA) - agora opcionais
  limite_bom: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: 'Limite superior para classificação BOM'
  },
  limite_moderado: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: 'Limite superior para classificação MODERADO'
  },
  limite_ruim: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: 'Limite superior para classificação RUIM'
  },
  limite_muito_ruim: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: 'Limite superior para classificação MUITO RUIM'
  },
  limite_pessimo: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: 'Acima disso é PÉSSIMO'
  },
  // Limites físicos (para validação)
  valor_minimo: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    comment: 'Valor mínimo físicamente possível'
  },
  valor_maximo: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 9999,
    comment: 'Valor máximo físicamente possível'
  },
  // Ordem de exibição na interface
  ordem_exibicao: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  descricao: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  cor: {
    type: DataTypes.STRING(7),
    defaultValue: '#00A19A'
  },
  ativo: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'parametros',
  timestamps: true,
  createdAt: 'criado_em',
  updatedAt: 'atualizado_em',
  indexes: [
    { fields: ['codigo'] },
    { fields: ['tipo'] },
    { fields: ['calcula_iqar'] },
    { fields: ['ativo'] }
  ]
});

module.exports = Parametro;
