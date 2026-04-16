const { Op } = require('sequelize');
const { Estacao, Unidade, Medicao, Parametro } = require('../models');

/**
 * GET /api/estacoes
 * Listar todas as estações
 */
const listar = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      busca,
      unidade_id,
      status,
      ativo
    } = req.query;

    const offset = (page - 1) * limit;

    // Construir filtros
    const where = {};
    
    if (busca) {
      where[Op.or] = [
        { nome: { [Op.like]: `%${busca}%` } },
        { codigo: { [Op.like]: `%${busca}%` } }
      ];
    }
    
    if (unidade_id) {
      where.unidade_id = unidade_id;
    }
    
    if (status) {
      where.status = status;
    }
    
    if (ativo !== undefined) {
      where.ativo = ativo === 'true';
    }

    const { count, rows } = await Estacao.findAndCountAll({
      where,
      include: [{
        model: Unidade,
        as: 'unidade',
        attributes: ['id', 'codigo', 'nome']
      }],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['codigo', 'ASC']]
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
    console.error('Erro ao listar estações:', error);
    res.status(500).json({
      sucesso: false,
      mensagem: 'Erro interno no servidor'
    });
  }
};

/**
 * GET /api/estacoes/mapa
 * Retorna dados para o mapa georreferenciado
 * Por padrão, retorna apenas estações ativas
 */
const mapa = async (req, res) => {
  try {
    const { incluirInativas } = req.query;
    
    // Filtrar apenas estações ativas por padrão
    const where = {};
    if (incluirInativas !== 'true') {
      where.ativo = true;
    }
    
    const estacoes = await Estacao.findAll({
      where,
      include: [{
        model: Unidade,
        as: 'unidade',
        attributes: ['codigo', 'nome']
      }],
      attributes: ['id', 'codigo', 'nome', 'latitude', 'longitude', 'status', 'ultima_comunicacao', 'ativo']
    });

    // Importar serviço de IQAr para calcular valores reais
    const iqarService = require('../services/iqarService');

    // Processar cada estação com IQAr real
    const dadosMapa = await Promise.all(estacoes.map(async (estacao) => {
      let lat = parseFloat(estacao.latitude);
      let lng = parseFloat(estacao.longitude);
      
      // Se coordenadas inválidas, usar coordenadas do Rio de Janeiro com pequeno offset
      if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) {
        // Gerar offset baseado no ID para espalhar as estações no mapa
        const offsetLat = (estacao.id % 10) * 0.05;
        const offsetLng = (estacao.id % 7) * 0.07;
        lat = -22.9068 + offsetLat - 0.25;
        lng = -43.1729 + offsetLng - 0.35;
      }
      
      // Buscar IQAr real do banco de dados
      let iqarData = { iqar: null, classificacao: 'N/A', cor: '#6b7280', poluente_predominante: null };
      try {
        iqarData = await iqarService.calcularIQArEstacao(estacao.id);
      } catch (e) {
        // Se não conseguir calcular, mantém valores padrão
      }
      
      return {
        id: estacao.id,
        codigo: estacao.codigo,
        nome: estacao.nome,
        unidade: estacao.unidade?.nome || '',
        latitude: lat,
        longitude: lng,
        status: estacao.status,
        ativo: estacao.ativo,
        ultimaComunicacao: estacao.ultima_comunicacao,
        iqar: iqarData.iqar || 0,
        classificacao: iqarData.classificacao || 'N/A',
        cor: iqarData.cor,
        poluente_predominante: iqarData.poluente_predominante
      };
    }));

    res.json({
      sucesso: true,
      dados: dadosMapa
    });

  } catch (error) {
    console.error('Erro ao buscar dados do mapa:', error);
    res.status(500).json({
      sucesso: false,
      mensagem: 'Erro interno no servidor'
    });
  }
};

/**
 * GET /api/estacoes/:id
 * Buscar estação por ID
 */
const buscarPorId = async (req, res) => {
  try {
    const { id } = req.params;

    const estacao = await Estacao.findByPk(id, {
      include: [{
        model: Unidade,
        as: 'unidade'
      }]
    });

    if (!estacao) {
      return res.status(404).json({
        sucesso: false,
        mensagem: 'Estação não encontrada'
      });
    }

    res.json({
      sucesso: true,
      dados: estacao
    });

  } catch (error) {
    console.error('Erro ao buscar estação:', error);
    res.status(500).json({
      sucesso: false,
      mensagem: 'Erro interno no servidor'
    });
  }
};

/**
 * POST /api/estacoes
 * Criar nova estação
 */
const criar = async (req, res) => {
  try {
    const { 
      codigo, 
      nome, 
      unidade_id, 
      latitude, 
      longitude, 
      altitude,
      parametros_monitorados,
      intervalo_coleta,
      descricao
    } = req.body;

    // Validações
    if (!codigo || !nome || !unidade_id || !latitude || !longitude) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'Código, nome, unidade, latitude e longitude são obrigatórios'
      });
    }

    // Verificar se código já existe
    const estacaoExistente = await Estacao.findOne({ where: { codigo } });
    if (estacaoExistente) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'Código de estação já cadastrado'
      });
    }

    // Verificar se unidade existe
    const unidade = await Unidade.findByPk(unidade_id);
    if (!unidade) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'Unidade não encontrada'
      });
    }

    // Criar estação
    const novaEstacao = await Estacao.create({
      codigo,
      nome,
      unidade_id,
      latitude,
      longitude,
      altitude,
      parametros_monitorados: parametros_monitorados || ['PM2.5', 'PM10', 'O3', 'NO2', 'SO2', 'CO'],
      intervalo_coleta: intervalo_coleta || 5,
      descricao,
      status: 'online',
      ultima_comunicacao: new Date()
    });

    res.status(201).json({
      sucesso: true,
      mensagem: 'Estação criada com sucesso',
      dados: novaEstacao
    });

  } catch (error) {
    console.error('Erro ao criar estação:', error);
    res.status(500).json({
      sucesso: false,
      mensagem: 'Erro interno no servidor'
    });
  }
};

/**
 * PUT /api/estacoes/:id
 * Atualizar estação
 */
const atualizar = async (req, res) => {
  try {
    const { id } = req.params;
    const dados = req.body;

    const estacao = await Estacao.findByPk(id);

    if (!estacao) {
      return res.status(404).json({
        sucesso: false,
        mensagem: 'Estação não encontrada'
      });
    }

    // Verificar se código já existe (em outra estação)
    if (dados.codigo && dados.codigo !== estacao.codigo) {
      const codigoExistente = await Estacao.findOne({ where: { codigo: dados.codigo } });
      if (codigoExistente) {
        return res.status(400).json({
          sucesso: false,
          mensagem: 'Código já cadastrado em outra estação'
        });
      }
    }

    await estacao.update(dados);

    res.json({
      sucesso: true,
      mensagem: 'Estação atualizada com sucesso',
      dados: estacao
    });

  } catch (error) {
    console.error('Erro ao atualizar estação:', error);
    res.status(500).json({
      sucesso: false,
      mensagem: 'Erro interno no servidor'
    });
  }
};

/**
 * DELETE /api/estacoes/:id
 * Desativar estação (soft delete)
 */
const desativar = async (req, res) => {
  try {
    const { id } = req.params;

    const estacao = await Estacao.findByPk(id);

    if (!estacao) {
      return res.status(404).json({
        sucesso: false,
        mensagem: 'Estação não encontrada'
      });
    }

    await estacao.update({ ativo: false, status: 'offline' });

    res.json({
      sucesso: true,
      mensagem: 'Estação desativada com sucesso'
    });

  } catch (error) {
    console.error('Erro ao desativar estação:', error);
    res.status(500).json({
      sucesso: false,
      mensagem: 'Erro interno no servidor'
    });
  }
};

/**
 * GET /api/estacoes/:id/status
 * Retorna status atual da estação
 */


//teste

const status = async (req, res) => {
  try {
    const { id } = req.params;

    const estacao = await Estacao.findByPk(id, {
      attributes: ['id', 'codigo', 'nome', 'status', 'ultima_comunicacao', 'ativo']
    });

    if (!estacao) {
      return res.status(404).json({
        sucesso: false,
        mensagem: 'Estação não encontrada'
      });
    }

    // Verificar se estação está online (comunicou nos últimos 10 minutos)
    const agora = new Date();
    const ultimaComunicacao = new Date(estacao.ultima_comunicacao);
    const diffMinutos = (agora - ultimaComunicacao) / (1000 * 60);
    
    let statusCalculado = estacao.status;
    if (diffMinutos > 10 && estacao.status === 'online') {
      statusCalculado = 'offline';
    }

    res.json({
      sucesso: true,
      dados: {
        id: estacao.id,
        codigo: estacao.codigo,
        nome: estacao.nome,
        status: statusCalculado,
        ativo: estacao.ativo,
        ultima_comunicacao: estacao.ultima_comunicacao,
        minutos_desde_comunicacao: Math.round(diffMinutos)
      }
    });

  } catch (error) {
    console.error('Erro ao buscar status:', error);
    res.status(500).json({
      sucesso: false,
      mensagem: 'Erro interno no servidor'
    });
  }
};

module.exports = {
  listar,
  mapa,
  buscarPorId,
  criar,
  atualizar,
  desativar,
  status
};
