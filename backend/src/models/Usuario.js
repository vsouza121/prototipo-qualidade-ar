const { DataTypes } = require('sequelize');
const sequelize = require('../database/connection');
const bcrypt = require('bcryptjs');

const Usuario = sequelize.define('Usuario', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  nome: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Nome é obrigatório' },
      len: { args: [2, 100], msg: 'Nome deve ter entre 2 e 100 caracteres' }
    }
  },
  email: {
    type: DataTypes.STRING(150),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: { msg: 'Email inválido' },
      notEmpty: { msg: 'Email é obrigatório' }
    }
  },
  senha_hash: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM('admin', 'supervisor', 'analista', 'operador'),
    defaultValue: 'analista',
    allowNull: false
  },
  ativo: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  ultimo_login: {
    type: DataTypes.DATE,
    allowNull: true
  },
  refresh_token: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  telefone: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  cargo: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  avatar_url: {
    type: DataTypes.STRING(500),
    allowNull: true
  }
}, {
  tableName: 'usuarios',
  timestamps: true,
  createdAt: 'criado_em',
  updatedAt: 'atualizado_em',
  hooks: {
    beforeCreate: async (usuario) => {
      if (usuario.senha_hash) {
        usuario.senha_hash = await bcrypt.hash(usuario.senha_hash, 12);
      }
    },
    beforeUpdate: async (usuario) => {
      if (usuario.changed('senha_hash')) {
        usuario.senha_hash = await bcrypt.hash(usuario.senha_hash, 12);
      }
    }
  }
});

// Método para verificar senha
Usuario.prototype.verificarSenha = async function(senha) {
  return bcrypt.compare(senha, this.senha_hash);
};

// Método para retornar dados públicos (sem senha)
Usuario.prototype.toJSON = function() {
  const values = { ...this.get() };
  delete values.senha_hash;
  delete values.refresh_token;
  return values;
};

module.exports = Usuario;
