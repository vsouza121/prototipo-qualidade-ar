const { DataTypes } = require('sequelize');
const sequelize = require('../database/connection');

const Alerta = sequelize.define('Alerta', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  estacao_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'estacoes',
      key: 'id'
    }
  },
  parametro_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'parametros',
      key: 'id'
    }
  },
  tipo: {
    type: DataTypes.ENUM(
      'ULTRAPASSAGEM_LIMITE',
      'DADOS_PENDENTES',
      'ESTACAO_OFFLINE',
      'MANUTENCAO_PROGRAMADA',
      'DISPONIBILIDADE_BAIXA',
      'TENDENCIA_ALTA',
      'SISTEMA'
    ),
    allowNull: false
  },
  nivel: {
    type: DataTypes.ENUM('info', 'warning', 'critical'),
    defaultValue: 'warning'
  },
  titulo: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  mensagem: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  valor_detectado: {
    type: DataTypes.DECIMAL(12, 4),
    allowNull: true
  },
  valor_limite: {
    type: DataTypes.DECIMAL(12, 4),
    allowNull: true
  },
  lido: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  lido_por: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'usuarios',
      key: 'id'
    }
  },
  lido_em: {
    type: DataTypes.DATE,
    allowNull: true
  },
  resolvido: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  resolvido_por: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'usuarios',
      key: 'id'
    }
  },
  resolvido_em: {
    type: DataTypes.DATE,
    allowNull: true
  },
  observacao_resolucao: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'alertas',
  timestamps: true,
  createdAt: 'criado_em',
  updatedAt: 'atualizado_em',
  indexes: [
    {
      fields: ['estacao_id']
    },
    {
      fields: ['tipo']
    },
    {
      fields: ['nivel']
    },
    {
      fields: ['lido']
    },
    {
      fields: ['resolvido']
    },
    {
      fields: ['criado_em']
    }
  ]
});

module.exports = Alerta;
