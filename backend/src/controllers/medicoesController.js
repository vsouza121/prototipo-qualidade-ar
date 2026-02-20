const { Op, fn, col, literal } = require('sequelize');
const { Medicao, Estacao, Parametro, Usuario } = require('../models');
const iqarService = require('../services/iqarService');

/**
 * GET /api/medicoes
 * Listar medições com filtros avançados
 */
const listar = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 100,
      estacao_id,
      parametro_id,
      parametro, // código do parâmetro (ex: PM2.5)
      data_inicio,
      data_fim,
      flag,
      validado
    } = req.query;

    const offset = (page - 1) * limit;

    // Construir filtros
    const where = {};
    
    if (estacao_id) where.estacao_id = estacao_id;
    if (parametro_id) where.parametro_id = parametro_id;
    if (flag) where.flag = flag;
    if (validado === 'true') where.flag = 'valid';
    if (validado === 'false') where.flag = { [Op.ne]: 'valid' };

    // Filtro de data
    if (data_inicio || data_fim) {
      where.data_hora = {};
      if (data_inicio) where.data_hora[Op.gte] = new Date(data_inicio);
      if (data_fim) where.data_hora[Op.lte] = new Date(data_fim);
    }

    // Include para filtrar por código do parâmetro
    const includeParametro = {
      model: Parametro,
      as: 'parametro',
      attributes: ['id', 'codigo', 'nome', 'unidade_medida']
    };
    
    if (parametro) {
      includeParametro.where = { codigo: parametro };
    }

    const { count, rows } = await Medicao.findAndCountAll({
      where,
      include: [
        includeParametro,
        {
          model: Estacao,
          as: 'estacao',
          attributes: ['id', 'codigo', 'nome']
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['data_hora', 'DESC']]
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
    console.error('Erro ao listar medições:', error);
    res.status(500).json({
      sucesso: false,
      mensagem: 'Erro interno no servidor'
    });
  }
};

/**
 * GET /api/medicoes/tempo-real
 * Últimas medições de todas as estações
 */
const tempoReal = async (req, res) => {
  try {
    // Buscar última medição de cada parâmetro de cada estação
    const estacoes = await Estacao.findAll({
      where: { ativo: true },
      attributes: ['id', 'codigo', 'nome']
    });

    const parametros = await Parametro.findAll({
      where: { ativo: true },
      attributes: ['id', 'codigo', 'nome', 'unidade_medida']
    });

    const resultado = [];

    for (const estacao of estacoes) {
      const medicoesPorParametro = {};

      for (const param of parametros) {
        const ultimaMedicao = await Medicao.findOne({
          where: {
            estacao_id: estacao.id,
            parametro_id: param.id
          },
          order: [['data_hora', 'DESC']],
          attributes: ['id', 'valor', 'data_hora', 'flag', 'iqar_calculado', 'classificacao_iqar']
        });

        if (ultimaMedicao) {
          medicoesPorParametro[param.codigo] = {
            valor: parseFloat(ultimaMedicao.valor),
            data_hora: ultimaMedicao.data_hora,
            flag: ultimaMedicao.flag,
            unidade: param.unidade_medida,
            iqar: ultimaMedicao.iqar_calculado,
            classificacao: ultimaMedicao.classificacao_iqar
          };
        }
      }

      // Calcular IQAr geral da estação
      const iqar = await iqarService.calcularIQArEstacao(estacao.id);

      resultado.push({
        estacao: {
          id: estacao.id,
          codigo: estacao.codigo,
          nome: estacao.nome
        },
        iqar: iqar.iqar,
        classificacao: iqar.classificacao,
        cor: iqar.cor,
        poluente_predominante: iqar.poluente_predominante,
        medicoes: medicoesPorParametro
      });
    }

    res.json({
      sucesso: true,
      dados: resultado,
      atualizadoEm: new Date()
    });

  } catch (error) {
    console.error('Erro ao buscar medições em tempo real:', error);
    res.status(500).json({
      sucesso: false,
      mensagem: 'Erro interno no servidor'
    });
  }
};

/**
 * GET /api/medicoes/estacao/:id
 * Medições de uma estação específica
 */
const porEstacao = async (req, res) => {
  try {
    const { id } = req.params;
    const { horas = 24, parametro } = req.query;

    const dataInicio = new Date();
    dataInicio.setHours(dataInicio.getHours() - parseInt(horas));

    const where = {
      estacao_id: id,
      data_hora: { [Op.gte]: dataInicio }
    };

    const include = [{
      model: Parametro,
      as: 'parametro',
      attributes: ['id', 'codigo', 'nome', 'unidade_medida']
    }];

    if (parametro) {
      include[0].where = { codigo: parametro };
    }

    const medicoes = await Medicao.findAll({
      where,
      include,
      order: [['data_hora', 'ASC']]
    });

    res.json({
      sucesso: true,
      dados: medicoes,
      periodo: {
        inicio: dataInicio,
        fim: new Date(),
        horas: parseInt(horas)
      }
    });

  } catch (error) {
    console.error('Erro ao buscar medições da estação:', error);
    res.status(500).json({
      sucesso: false,
      mensagem: 'Erro interno no servidor'
    });
  }
};

/**
 * POST /api/medicoes
 * Registrar nova medição (usado pelos sensores)
 */
const criar = async (req, res) => {
  try {
    const { estacao_id, parametro_id, valor, data_hora } = req.body;

    // Validações
    if (!estacao_id || !parametro_id || valor === undefined) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'estacao_id, parametro_id e valor são obrigatórios'
      });
    }

    // Verificar se estação existe
    const estacao = await Estacao.findByPk(estacao_id);
    if (!estacao) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'Estação não encontrada'
      });
    }

    // Verificar se parâmetro existe
    const parametro = await Parametro.findByPk(parametro_id);
    if (!parametro) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'Parâmetro não encontrado'
      });
    }

    // Validação automática do valor
    let flag = 'pending';
    let motivoFlag = null;

    if (valor < parametro.valor_minimo || valor > parametro.valor_maximo) {
      flag = 'auto_invalid';
      motivoFlag = `Valor fora do range permitido (${parametro.valor_minimo} - ${parametro.valor_maximo})`;
    }

    // Calcular IQAr para esta medição
    const { iqar, classificacao } = iqarService.calcularIQArIndividual(valor, parametro);

    // Criar medição
    const novaMedicao = await Medicao.create({
      estacao_id,
      parametro_id,
      valor,
      data_hora: data_hora || new Date(),
      flag,
      motivo_flag: motivoFlag,
      iqar_calculado: iqar,
      classificacao_iqar: classificacao
    });

    // Atualizar última comunicação da estação
    await estacao.update({ 
      ultima_comunicacao: new Date(),
      status: 'online'
    });

    res.status(201).json({
      sucesso: true,
      mensagem: 'Medição registrada com sucesso',
      dados: novaMedicao
    });

  } catch (error) {
    console.error('Erro ao registrar medição:', error);
    res.status(500).json({
      sucesso: false,
      mensagem: 'Erro interno no servidor'
    });
  }
};

/**
 * POST /api/medicoes/batch
 * Registrar múltiplas medições
 */
const criarLote = async (req, res) => {
  try {
    const { medicoes } = req.body;

    if (!Array.isArray(medicoes) || medicoes.length === 0) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'Array de medições é obrigatório'
      });
    }

    const resultados = {
      sucesso: 0,
      erros: 0,
      detalhes: []
    };

    for (const med of medicoes) {
      try {
        const parametro = await Parametro.findByPk(med.parametro_id);
        if (!parametro) continue;

        // Validação automática
        let flag = 'pending';
        let motivoFlag = null;
        
        if (med.valor < parametro.valor_minimo || med.valor > parametro.valor_maximo) {
          flag = 'auto_invalid';
          motivoFlag = 'Valor fora do range';
        }

        const { iqar, classificacao } = iqarService.calcularIQArIndividual(med.valor, parametro);

        await Medicao.create({
          estacao_id: med.estacao_id,
          parametro_id: med.parametro_id,
          valor: med.valor,
          data_hora: med.data_hora || new Date(),
          flag,
          motivo_flag: motivoFlag,
          iqar_calculado: iqar,
          classificacao_iqar: classificacao
        });

        resultados.sucesso++;
      } catch (err) {
        resultados.erros++;
        resultados.detalhes.push({ medicao: med, erro: err.message });
      }
    }

    // Atualizar última comunicação das estações
    const estacoesIds = [...new Set(medicoes.map(m => m.estacao_id))];
    await Estacao.update(
      { ultima_comunicacao: new Date(), status: 'online' },
      { where: { id: estacoesIds } }
    );

    res.status(201).json({
      sucesso: true,
      mensagem: `${resultados.sucesso} medições registradas, ${resultados.erros} erros`,
      dados: resultados
    });

  } catch (error) {
    console.error('Erro ao registrar medições em lote:', error);
    res.status(500).json({
      sucesso: false,
      mensagem: 'Erro interno no servidor'
    });
  }
};

/**
 * GET /api/medicoes/estatisticas
 * Estatísticas agregadas
 */
const estatisticas = async (req, res) => {
  try {
    const {
      estacao_id,
      parametro_id,
      data_inicio,
      data_fim,
      agregacao = 'hora' // hora, dia, semana, mes
    } = req.query;

    const where = { flag: 'valid' };
    if (estacao_id) where.estacao_id = estacao_id;
    if (parametro_id) where.parametro_id = parametro_id;
    
    if (data_inicio || data_fim) {
      where.data_hora = {};
      if (data_inicio) where.data_hora[Op.gte] = new Date(data_inicio);
      if (data_fim) where.data_hora[Op.lte] = new Date(data_fim);
    }

    // Calcular estatísticas básicas
    const stats = await Medicao.findOne({
      where,
      attributes: [
        [fn('COUNT', col('id')), 'total'],
        [fn('AVG', col('valor')), 'media'],
        [fn('MIN', col('valor')), 'minimo'],
        [fn('MAX', col('valor')), 'maximo'],
        [fn('STDEV', col('valor')), 'desvio_padrao']
      ],
      raw: true
    });

    res.json({
      sucesso: true,
      dados: {
        total: parseInt(stats.total) || 0,
        media: parseFloat(stats.media) || 0,
        minimo: parseFloat(stats.minimo) || 0,
        maximo: parseFloat(stats.maximo) || 0,
        desvio_padrao: parseFloat(stats.desvio_padrao) || 0
      }
    });

  } catch (error) {
    console.error('Erro ao calcular estatísticas:', error);
    res.status(500).json({
      sucesso: false,
      mensagem: 'Erro interno no servidor'
    });
  }
};

/**
 * PUT /api/medicoes/:id/validar
 * Validar ou invalidar uma medição
 */
const validar = async (req, res) => {
  try {
    const { id } = req.params;
    const { flag, motivo } = req.body;
    const usuarioId = req.usuario.id;

    // Validar flag
    const flagsValidas = ['valid', 'invalid', 'pending'];
    if (!flagsValidas.includes(flag)) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'Flag inválida. Use: valid, invalid ou pending'
      });
    }

    const medicao = await Medicao.findByPk(id);
    if (!medicao) {
      return res.status(404).json({
        sucesso: false,
        mensagem: 'Medição não encontrada'
      });
    }

    // Atualizar medição
    await medicao.update({
      flag,
      motivo_flag: motivo || null,
      validado_por: usuarioId,
      validado_em: new Date()
    });

    res.json({
      sucesso: true,
      mensagem: `Medição ${flag === 'valid' ? 'validada' : flag === 'invalid' ? 'invalidada' : 'marcada como pendente'} com sucesso`,
      dados: medicao
    });

  } catch (error) {
    console.error('Erro ao validar medição:', error);
    res.status(500).json({
      sucesso: false,
      mensagem: 'Erro interno no servidor'
    });
  }
};

/**
 * PUT /api/medicoes/validar-lote
 * Validar ou invalidar múltiplas medições
 */
const validarLote = async (req, res) => {
  try {
    const { ids, flag, motivo } = req.body;
    const usuarioId = req.usuario.id;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'IDs das medições são obrigatórios'
      });
    }

    const flagsValidas = ['valid', 'invalid', 'pending'];
    if (!flagsValidas.includes(flag)) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'Flag inválida. Use: valid, invalid ou pending'
      });
    }

    // Atualizar todas as medições
    const [updated] = await Medicao.update(
      {
        flag,
        motivo_flag: motivo || null,
        validado_por: usuarioId,
        validado_em: new Date()
      },
      {
        where: { id: { [Op.in]: ids } }
      }
    );

    res.json({
      sucesso: true,
      mensagem: `${updated} medições atualizadas com sucesso`,
      atualizadas: updated
    });

  } catch (error) {
    console.error('Erro ao validar medições em lote:', error);
    res.status(500).json({
      sucesso: false,
      mensagem: 'Erro interno no servidor'
    });
  }
};

/**
 * GET /api/medicoes/validacao
 * Listar medições para validação com filtros específicos
 */
const listarParaValidacao = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      unidade_id,
      estacao_id,
      parametro_id,
      data_inicio,
      data_fim,
      flags // pode ser: pending, valid, invalid, auto_invalid ou múltiplos separados por vírgula
    } = req.query;

    const offset = (page - 1) * limit;
    const where = {};

    if (estacao_id) where.estacao_id = estacao_id;
    if (parametro_id) where.parametro_id = parametro_id;

    // Filtro por múltiplos flags
    if (flags) {
      const flagArray = flags.split(',').map(f => f.trim());
      where.flag = { [Op.in]: flagArray };
    }

    // Filtro de data
    if (data_inicio || data_fim) {
      where.data_hora = {};
      if (data_inicio) where.data_hora[Op.gte] = new Date(data_inicio);
      if (data_fim) {
        const fim = new Date(data_fim);
        fim.setHours(23, 59, 59, 999);
        where.data_hora[Op.lte] = fim;
      }
    }

    // Include para Estação (com filtro de unidade)
    const includeEstacao = {
      model: Estacao,
      as: 'estacao',
      attributes: ['id', 'codigo', 'nome', 'unidade_id']
    };
    
    if (unidade_id) {
      includeEstacao.where = { unidade_id };
    }

    const { count, rows } = await Medicao.findAndCountAll({
      where,
      include: [
        includeEstacao,
        {
          model: Parametro,
          as: 'parametro',
          attributes: ['id', 'codigo', 'nome', 'unidade_medida']
        },
        {
          model: Usuario,
          as: 'validador',
          attributes: ['id', 'nome'],
          required: false
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['data_hora', 'DESC']]
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
    console.error('Erro ao listar medições para validação:', error);
    res.status(500).json({
      sucesso: false,
      mensagem: 'Erro interno no servidor'
    });
  }
};

/**
 * GET /api/exportar
 * Exportar dados filtrados em CSV ou JSON
 */
const exportar = async (req, res) => {
  try {
    const {
      formato = 'csv', // csv ou json
      estacao_id,
      parametro_id,
      data_inicio,
      data_fim,
      flag
    } = req.query;

    const where = {};
    if (estacao_id) where.estacao_id = estacao_id;
    if (parametro_id) where.parametro_id = parametro_id;
    if (flag) where.flag = flag;

    if (data_inicio || data_fim) {
      where.data_hora = {};
      if (data_inicio) where.data_hora[Op.gte] = new Date(data_inicio);
      if (data_fim) {
        const fim = new Date(data_fim);
        fim.setHours(23, 59, 59, 999);
        where.data_hora[Op.lte] = fim;
      }
    }

    const medicoes = await Medicao.findAll({
      where,
      include: [
        {
          model: Estacao,
          as: 'estacao',
          attributes: ['codigo', 'nome']
        },
        {
          model: Parametro,
          as: 'parametro',
          attributes: ['codigo', 'nome', 'unidade_medida']
        }
      ],
      order: [['data_hora', 'ASC']],
      limit: 10000 // Limite de segurança
    });

    if (formato === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=medicoes.json');
      return res.json({
        sucesso: true,
        dados: medicoes,
        exportado_em: new Date(),
        total: medicoes.length
      });
    }

    // Formato CSV
    const header = 'Data/Hora;Estação;Parâmetro;Valor;Unidade;Flag;Motivo\n';
    const linhas = medicoes.map(m => {
      const dataHora = new Date(m.data_hora).toLocaleString('pt-BR');
      return `${dataHora};${m.estacao?.codigo || ''};${m.parametro?.codigo || ''};${m.valor};${m.parametro?.unidade_medida || ''};${m.flag};${m.motivo_flag || ''}`;
    }).join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=medicoes.csv');
    res.send('\uFEFF' + header + linhas); // BOM para Excel reconhecer UTF-8

  } catch (error) {
    console.error('Erro ao exportar dados:', error);
    res.status(500).json({
      sucesso: false,
      mensagem: 'Erro interno no servidor'
    });
  }
};

/**
 * POST /api/importar  
 * Importar dados de arquivo CSV
 */
const importar = async (req, res) => {
  try {
    const { dados } = req.body; // Array de medições
    const usuarioId = req.usuario.id;

    if (!dados || !Array.isArray(dados) || dados.length === 0) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'Dados para importação são obrigatórios'
      });
    }

    // Buscar mapeamento de estações e parâmetros
    const estacoes = await Estacao.findAll({ attributes: ['id', 'codigo'] });
    const parametros = await Parametro.findAll({ attributes: ['id', 'codigo'] });
    
    const estacaoMap = {};
    estacoes.forEach(e => { estacaoMap[e.codigo] = e.id; });
    
    const parametroMap = {};
    parametros.forEach(p => { parametroMap[p.codigo] = p.id; });

    let importados = 0;
    let erros = [];

    for (let i = 0; i < dados.length; i++) {
      const item = dados[i];
      try {
        const estacaoId = estacaoMap[item.estacao_codigo];
        const parametroId = parametroMap[item.parametro_codigo];

        if (!estacaoId) {
          erros.push({ linha: i + 1, erro: `Estação '${item.estacao_codigo}' não encontrada` });
          continue;
        }
        if (!parametroId) {
          erros.push({ linha: i + 1, erro: `Parâmetro '${item.parametro_codigo}' não encontrado` });
          continue;
        }

        // Verificar se já existe medição para mesma estação/parâmetro/data
        const existe = await Medicao.findOne({
          where: {
            estacao_id: estacaoId,
            parametro_id: parametroId,
            data_hora: new Date(item.data_hora)
          }
        });

        if (existe) {
          // Atualizar existente
          await existe.update({
            valor: parseFloat(item.valor),
            flag: item.flag || 'pending',
            motivo_flag: item.motivo || null
          });
        } else {
          // Criar nova
          await Medicao.create({
            estacao_id: estacaoId,
            parametro_id: parametroId,
            valor: parseFloat(item.valor),
            data_hora: new Date(item.data_hora),
            flag: item.flag || 'pending',
            motivo_flag: item.motivo || null
          });
        }
        importados++;
      } catch (itemError) {
        erros.push({ linha: i + 1, erro: itemError.message });
      }
    }

    res.json({
      sucesso: true,
      mensagem: `${importados} de ${dados.length} registros importados`,
      importados,
      total: dados.length,
      erros: erros.length > 0 ? erros : undefined
    });

  } catch (error) {
    console.error('Erro ao importar dados:', error);
    res.status(500).json({
      sucesso: false,
      mensagem: 'Erro interno no servidor'
    });
  }
};

module.exports = {
  listar,
  tempoReal,
  porEstacao,
  criar,
  criarLote,
  estatisticas,
  validar,
  validarLote,
  listarParaValidacao,
  exportar,
  importar
};
