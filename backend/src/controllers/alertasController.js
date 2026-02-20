const { Op } = require('sequelize');
const { Alerta, Estacao, Parametro, Usuario } = require('../models');

/**
 * GET /api/alertas
 * Listar alertas com filtros
 */
const listar = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      estacao_id,
      tipo,
      nivel,
      lido,
      resolvido
    } = req.query;

    const offset = (page - 1) * limit;

    // Construir filtros
    const where = {};
    if (estacao_id) where.estacao_id = estacao_id;
    if (tipo) where.tipo = tipo;
    if (nivel) where.nivel = nivel;
    if (lido !== undefined) where.lido = lido === 'true';
    if (resolvido !== undefined) where.resolvido = resolvido === 'true';

    const { count, rows } = await Alerta.findAndCountAll({
      where,
      include: [
        {
          model: Estacao,
          as: 'estacao',
          attributes: ['id', 'codigo', 'nome']
        },
        {
          model: Parametro,
          as: 'parametro',
          attributes: ['id', 'codigo', 'nome', 'unidade_medida']
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['criado_em', 'DESC']]
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
    console.error('Erro ao listar alertas:', error);
    res.status(500).json({
      sucesso: false,
      mensagem: 'Erro interno no servidor'
    });
  }
};

/**
 * GET /api/alertas/ativos
 * Alertas não resolvidos
 */
const ativos = async (req, res) => {
  try {
    const alertas = await Alerta.findAll({
      where: { resolvido: false },
      include: [
        {
          model: Estacao,
          as: 'estacao',
          attributes: ['id', 'codigo', 'nome']
        },
        {
          model: Parametro,
          as: 'parametro',
          attributes: ['id', 'codigo', 'nome']
        }
      ],
      order: [
        ['nivel', 'DESC'], // critical primeiro
        ['criado_em', 'DESC']
      ]
    });

    // Contar por nível
    const resumo = {
      total: alertas.length,
      critical: alertas.filter(a => a.nivel === 'critical').length,
      warning: alertas.filter(a => a.nivel === 'warning').length,
      info: alertas.filter(a => a.nivel === 'info').length
    };

    res.json({
      sucesso: true,
      resumo,
      dados: alertas
    });

  } catch (error) {
    console.error('Erro ao buscar alertas ativos:', error);
    res.status(500).json({
      sucesso: false,
      mensagem: 'Erro interno no servidor'
    });
  }
};

/**
 * GET /api/alertas/:id
 * Buscar alerta por ID
 */
const buscarPorId = async (req, res) => {
  try {
    const { id } = req.params;

    const alerta = await Alerta.findByPk(id, {
      include: [
        { model: Estacao, as: 'estacao' },
        { model: Parametro, as: 'parametro' }
      ]
    });

    if (!alerta) {
      return res.status(404).json({
        sucesso: false,
        mensagem: 'Alerta não encontrado'
      });
    }

    res.json({
      sucesso: true,
      dados: alerta
    });

  } catch (error) {
    console.error('Erro ao buscar alerta:', error);
    res.status(500).json({
      sucesso: false,
      mensagem: 'Erro interno no servidor'
    });
  }
};

/**
 * PUT /api/alertas/:id/ler
 * Marcar alerta como lido
 */
const marcarComoLido = async (req, res) => {
  try {
    const { id } = req.params;

    const alerta = await Alerta.findByPk(id);

    if (!alerta) {
      return res.status(404).json({
        sucesso: false,
        mensagem: 'Alerta não encontrado'
      });
    }

    await alerta.update({
      lido: true,
      lido_por: req.usuarioId,
      lido_em: new Date()
    });

    res.json({
      sucesso: true,
      mensagem: 'Alerta marcado como lido'
    });

  } catch (error) {
    console.error('Erro ao marcar alerta como lido:', error);
    res.status(500).json({
      sucesso: false,
      mensagem: 'Erro interno no servidor'
    });
  }
};

/**
 * PUT /api/alertas/:id/resolver
 * Resolver alerta
 */
const resolver = async (req, res) => {
  try {
    const { id } = req.params;
    const { observacao } = req.body;

    const alerta = await Alerta.findByPk(id);

    if (!alerta) {
      return res.status(404).json({
        sucesso: false,
        mensagem: 'Alerta não encontrado'
      });
    }

    await alerta.update({
      resolvido: true,
      resolvido_por: req.usuarioId,
      resolvido_em: new Date(),
      observacao_resolucao: observacao || null
    });

    res.json({
      sucesso: true,
      mensagem: 'Alerta resolvido com sucesso'
    });

  } catch (error) {
    console.error('Erro ao resolver alerta:', error);
    res.status(500).json({
      sucesso: false,
      mensagem: 'Erro interno no servidor'
    });
  }
};

/**
 * POST /api/alertas
 * Criar novo alerta (uso interno)
 */
const criar = async (req, res) => {
  try {
    const {
      estacao_id,
      parametro_id,
      tipo,
      nivel,
      titulo,
      mensagem,
      valor_detectado,
      valor_limite
    } = req.body;

    if (!tipo || !titulo || !mensagem) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'tipo, titulo e mensagem são obrigatórios'
      });
    }

    const novoAlerta = await Alerta.create({
      estacao_id,
      parametro_id,
      tipo,
      nivel: nivel || 'warning',
      titulo,
      mensagem,
      valor_detectado,
      valor_limite
    });

    res.status(201).json({
      sucesso: true,
      mensagem: 'Alerta criado com sucesso',
      dados: novoAlerta
    });

  } catch (error) {
    console.error('Erro ao criar alerta:', error);
    res.status(500).json({
      sucesso: false,
      mensagem: 'Erro interno no servidor'
    });
  }
};

/**
 * PUT /api/alertas/ler-todos
 * Marcar todos os alertas como lidos
 */
const marcarTodosComoLidos = async (req, res) => {
  try {
    await Alerta.update(
      {
        lido: true,
        lido_por: req.usuarioId,
        lido_em: new Date()
      },
      {
        where: { lido: false }
      }
    );

    res.json({
      sucesso: true,
      mensagem: 'Todos os alertas foram marcados como lidos'
    });

  } catch (error) {
    console.error('Erro ao marcar alertas como lidos:', error);
    res.status(500).json({
      sucesso: false,
      mensagem: 'Erro interno no servidor'
    });
  }
};

module.exports = {
  listar,
  ativos,
  buscarPorId,
  marcarComoLido,
  resolver,
  criar,
  marcarTodosComoLidos
};
