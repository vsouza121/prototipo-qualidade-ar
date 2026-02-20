const { Op } = require('sequelize');
const { Usuario } = require('../models');

/**
 * GET /api/usuarios
 * Listar todos os usuários (com paginação e filtros)
 */
const listar = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      busca, 
      role, 
      ativo,
      ordenar = 'nome',
      direcao = 'ASC'
    } = req.query;

    const offset = (page - 1) * limit;

    // Construir filtros
    const where = {};
    
    if (busca) {
      where[Op.or] = [
        { nome: { [Op.like]: `%${busca}%` } },
        { email: { [Op.like]: `%${busca}%` } }
      ];
    }
    
    if (role) {
      where.role = role;
    }
    
    if (ativo !== undefined) {
      where.ativo = ativo === 'true';
    }

    const { count, rows } = await Usuario.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[ordenar, direcao]],
      attributes: { exclude: ['senha_hash', 'refresh_token'] }
    });

    res.json({
      sucesso: true,
      dados: rows,
      paginacao: {
        total: count,
        pagina: parseInt(page),
        limite: parseInt(limit),
        totalPaginas: Math.ceil(count / limit)
      }
    });

  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    res.status(500).json({
      sucesso: false,
      mensagem: 'Erro interno no servidor'
    });
  }
};

/**
 * GET /api/usuarios/:id
 * Buscar usuário por ID
 */
const buscarPorId = async (req, res) => {
  try {
    const { id } = req.params;

    const usuario = await Usuario.findByPk(id, {
      attributes: { exclude: ['senha_hash', 'refresh_token'] }
    });

    if (!usuario) {
      return res.status(404).json({
        sucesso: false,
        mensagem: 'Usuário não encontrado'
      });
    }

    res.json({
      sucesso: true,
      dados: usuario
    });

  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    res.status(500).json({
      sucesso: false,
      mensagem: 'Erro interno no servidor'
    });
  }
};

/**
 * POST /api/usuarios
 * Criar novo usuário
 */
const criar = async (req, res) => {
  try {
    const { nome, email, senha, role, cargo, telefone } = req.body;

    // Validações
    if (!nome || !email || !senha) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'Nome, email e senha são obrigatórios'
      });
    }

    // Verificar se email já existe
    const usuarioExistente = await Usuario.findOne({ where: { email } });
    if (usuarioExistente) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'Email já cadastrado'
      });
    }

    // Criar usuário
    const novoUsuario = await Usuario.create({
      nome,
      email,
      senha_hash: senha,
      role: role || 'analista',
      cargo,
      telefone
    });

    res.status(201).json({
      sucesso: true,
      mensagem: 'Usuário criado com sucesso',
      dados: novoUsuario.toJSON()
    });

  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    res.status(500).json({
      sucesso: false,
      mensagem: 'Erro interno no servidor'
    });
  }
};

/**
 * PUT /api/usuarios/:id
 * Atualizar usuário
 */
const atualizar = async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, email, role, cargo, telefone, ativo } = req.body;

    const usuario = await Usuario.findByPk(id);

    if (!usuario) {
      return res.status(404).json({
        sucesso: false,
        mensagem: 'Usuário não encontrado'
      });
    }

    // Verificar se email já existe (em outro usuário)
    if (email && email !== usuario.email) {
      const emailExistente = await Usuario.findOne({ where: { email } });
      if (emailExistente) {
        return res.status(400).json({
          sucesso: false,
          mensagem: 'Email já cadastrado em outro usuário'
        });
      }
    }

    // Atualizar dados
    await usuario.update({
      nome: nome || usuario.nome,
      email: email || usuario.email,
      role: role || usuario.role,
      cargo: cargo !== undefined ? cargo : usuario.cargo,
      telefone: telefone !== undefined ? telefone : usuario.telefone,
      ativo: ativo !== undefined ? ativo : usuario.ativo
    });

    res.json({
      sucesso: true,
      mensagem: 'Usuário atualizado com sucesso',
      dados: usuario.toJSON()
    });

  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    res.status(500).json({
      sucesso: false,
      mensagem: 'Erro interno no servidor'
    });
  }
};

/**
 * DELETE /api/usuarios/:id
 * Desativar usuário (soft delete)
 */
const desativar = async (req, res) => {
  try {
    const { id } = req.params;

    const usuario = await Usuario.findByPk(id);

    if (!usuario) {
      return res.status(404).json({
        sucesso: false,
        mensagem: 'Usuário não encontrado'
      });
    }

    // Não permitir desativar a si mesmo
    if (usuario.id === req.usuarioId) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'Você não pode desativar sua própria conta'
      });
    }

    await usuario.update({ ativo: false });

    res.json({
      sucesso: true,
      mensagem: 'Usuário desativado com sucesso'
    });

  } catch (error) {
    console.error('Erro ao desativar usuário:', error);
    res.status(500).json({
      sucesso: false,
      mensagem: 'Erro interno no servidor'
    });
  }
};

/**
 * PUT /api/usuarios/:id/reativar
 * Reativar usuário
 */
const reativar = async (req, res) => {
  try {
    const { id } = req.params;

    const usuario = await Usuario.findByPk(id);

    if (!usuario) {
      return res.status(404).json({
        sucesso: false,
        mensagem: 'Usuário não encontrado'
      });
    }

    await usuario.update({ ativo: true });

    res.json({
      sucesso: true,
      mensagem: 'Usuário reativado com sucesso',
      dados: usuario.toJSON()
    });

  } catch (error) {
    console.error('Erro ao reativar usuário:', error);
    res.status(500).json({
      sucesso: false,
      mensagem: 'Erro interno no servidor'
    });
  }
};

module.exports = {
  listar,
  buscarPorId,
  criar,
  atualizar,
  desativar,
  reativar
};
