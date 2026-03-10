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
 * Estatísticas completas para página de análise
 */
const estatisticas = async (req, res) => {
  try {
    const {
      estacao_id,
      parametro, // código do parâmetro (ex: PM2.5)
      dias = 30
    } = req.query;

    // Calcular data de início baseada nos dias
    const dataInicio = new Date();
    dataInicio.setDate(dataInicio.getDate() - parseInt(dias));

    // Construir filtros base
    const where = {};
    if (estacao_id && estacao_id !== '') {
      where.estacao_id = estacao_id;
    }
    
    where.data_hora = { [Op.gte]: dataInicio };

    // Buscar o parâmetro pelo código
    let parametroObj = null;
    if (parametro) {
      parametroObj = await Parametro.findOne({ where: { codigo: parametro, ativo: true } });
      if (parametroObj) {
        where.parametro_id = parametroObj.id;
      }
    }

    // Buscar todas as medições para cálculos
    const medicoes = await Medicao.findAll({
      where,
      include: [
        {
          model: Estacao,
          as: 'estacao',
          attributes: ['id', 'codigo', 'nome'],
          where: { ativo: true },
          required: true
        },
        {
          model: Parametro,
          as: 'parametro',
          attributes: ['id', 'codigo', 'nome', 'unidade_medida'],
          required: true
        }
      ],
      order: [['data_hora', 'ASC']],
      raw: true,
      nest: true
    });

    if (medicoes.length === 0) {
      return res.json({
        sucesso: true,
        dados: {
          estatisticas: {
            total: 0,
            media: 0,
            mediana: 0,
            desvio_padrao: 0,
            minimo: 0,
            maximo: 0
          },
          percentis: {},
          histograma: [],
          comparativo_estacoes: [],
          serie_temporal: [],
          unidade: parametroObj?.unidade_medida || 'µg/m³'
        }
      });
    }

    // Extrair valores numéricos
    const valores = medicoes.map(m => parseFloat(m.valor)).filter(v => !isNaN(v));
    valores.sort((a, b) => a - b);

    // Calcular estatísticas básicas
    const total = valores.length;
    const media = valores.reduce((a, b) => a + b, 0) / total;
    const minimo = valores[0];
    const maximo = valores[valores.length - 1];
    
    // Mediana
    const mediana = total % 2 === 0
      ? (valores[total / 2 - 1] + valores[total / 2]) / 2
      : valores[Math.floor(total / 2)];
    
    // Desvio padrão
    const variancia = valores.reduce((acc, val) => acc + Math.pow(val - media, 2), 0) / total;
    const desvio_padrao = Math.sqrt(variancia);

    // Calcular percentis
    const calcularPercentil = (arr, p) => {
      const idx = (p / 100) * (arr.length - 1);
      const lower = Math.floor(idx);
      const upper = Math.ceil(idx);
      if (lower === upper) return arr[lower];
      return arr[lower] + (arr[upper] - arr[lower]) * (idx - lower);
    };

    const percentis = {
      p10: calcularPercentil(valores, 10),
      p25: calcularPercentil(valores, 25),
      p50: calcularPercentil(valores, 50),
      p75: calcularPercentil(valores, 75),
      p90: calcularPercentil(valores, 90),
      p95: calcularPercentil(valores, 95),
      p99: calcularPercentil(valores, 99)
    };

    // Calcular histograma (10 faixas)
    const range = maximo - minimo || 1;
    const numFaixas = 10;
    const tamFaixa = range / numFaixas;
    const histograma = [];
    
    for (let i = 0; i < numFaixas; i++) {
      const limiteInf = minimo + (i * tamFaixa);
      const limiteSup = minimo + ((i + 1) * tamFaixa);
      const contagem = valores.filter(v => 
        i === numFaixas - 1 
          ? v >= limiteInf && v <= limiteSup 
          : v >= limiteInf && v < limiteSup
      ).length;
      
      histograma.push({
        faixa: `${limiteInf.toFixed(0)}-${limiteSup.toFixed(0)}`,
        limiteInf,
        limiteSup,
        contagem,
        percentual: ((contagem / total) * 100).toFixed(1)
      });
    }

    // Calcular comparativo por estação
    const estacaoMap = {};
    medicoes.forEach(m => {
      const estId = m.estacao.id;
      if (!estacaoMap[estId]) {
        estacaoMap[estId] = {
          estacao_id: estId,
          nome: m.estacao.nome,
          codigo: m.estacao.codigo,
          valores: []
        };
      }
      estacaoMap[estId].valores.push(parseFloat(m.valor));
    });

    const comparativo_estacoes = Object.values(estacaoMap).map(e => {
      const vals = e.valores.sort((a, b) => a - b);
      const n = vals.length;
      const avg = vals.reduce((a, b) => a + b, 0) / n;
      const med = n % 2 === 0 
        ? (vals[n / 2 - 1] + vals[n / 2]) / 2 
        : vals[Math.floor(n / 2)];
      
      // Classificação baseada na média
      let classificacao = 'good';
      if (avg > 25) classificacao = 'bad';
      else if (avg > 15) classificacao = 'moderate';

      return {
        estacao_id: e.estacao_id,
        nome: e.nome,
        codigo: e.codigo,
        media: parseFloat(avg.toFixed(2)),
        mediana: parseFloat(med.toFixed(2)),
        minimo: vals[0],
        maximo: vals[n - 1],
        amostras: n,
        classificacao,
        q1: calcularPercentil(vals, 25),
        q3: calcularPercentil(vals, 75)
      };
    }).sort((a, b) => a.media - b.media);

    // Calcular série temporal (agregação diária)
    const serieMap = {};
    medicoes.forEach(m => {
      const data = new Date(m.data_hora).toISOString().split('T')[0];
      if (!serieMap[data]) {
        serieMap[data] = { valores: [], data };
      }
      serieMap[data].valores.push(parseFloat(m.valor));
    });

    const serie_temporal = Object.values(serieMap)
      .map(d => ({
        data: d.data,
        media: parseFloat((d.valores.reduce((a, b) => a + b, 0) / d.valores.length).toFixed(2)),
        minimo: Math.min(...d.valores),
        maximo: Math.max(...d.valores),
        amostras: d.valores.length
      }))
      .sort((a, b) => new Date(a.data) - new Date(b.data));

    // Calcular linha de tendência (regressão linear simples)
    if (serie_temporal.length >= 2) {
      const n = serie_temporal.length;
      let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
      serie_temporal.forEach((d, i) => {
        sumX += i;
        sumY += d.media;
        sumXY += i * d.media;
        sumX2 += i * i;
      });
      const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
      const intercept = (sumY - slope * sumX) / n;
      
      serie_temporal.forEach((d, i) => {
        d.tendencia = parseFloat((intercept + slope * i).toFixed(2));
      });
    }

    // Unidade de medida
    const unidade = parametroObj?.unidade_medida || medicoes[0]?.parametro?.unidade_medida || 'µg/m³';

    res.json({
      sucesso: true,
      dados: {
        estatisticas: {
          total,
          media: parseFloat(media.toFixed(2)),
          mediana: parseFloat(mediana.toFixed(2)),
          desvio_padrao: parseFloat(desvio_padrao.toFixed(2)),
          minimo: parseFloat(minimo.toFixed(2)),
          maximo: parseFloat(maximo.toFixed(2))
        },
        percentis: {
          p10: parseFloat(percentis.p10.toFixed(2)),
          p25: parseFloat(percentis.p25.toFixed(2)),
          p50: parseFloat(percentis.p50.toFixed(2)),
          p75: parseFloat(percentis.p75.toFixed(2)),
          p90: parseFloat(percentis.p90.toFixed(2)),
          p95: parseFloat(percentis.p95.toFixed(2)),
          p99: parseFloat(percentis.p99.toFixed(2))
        },
        histograma,
        comparativo_estacoes,
        serie_temporal,
        unidade,
        periodo: {
          inicio: dataInicio,
          fim: new Date(),
          dias: parseInt(dias)
        }
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

/**
 * GET /api/medicoes/rosa-ventos
 * Dados para rosa dos ventos
 */
const rosaVentos = async (req, res) => {
  try {
    const { estacao_id, dias = 30 } = req.query;

    if (!estacao_id) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'estacao_id é obrigatório'
      });
    }

    // Calcular data de início
    const dataInicio = new Date();
    dataInicio.setDate(dataInicio.getDate() - parseInt(dias));

    // Buscar parâmetros de direção e velocidade do vento
    const paramDirecao = await Parametro.findOne({ where: { codigo: 'DV', ativo: true } });
    const paramVelocidade = await Parametro.findOne({ where: { codigo: 'VV', ativo: true } });

    if (!paramDirecao || !paramVelocidade) {
      return res.json({
        sucesso: true,
        dados: {
          mensagem: 'Parâmetros de vento (DV/VV) não configurados',
          directions: [],
          frequencies: [],
          avgSpeeds: [],
          estatisticas: null,
          porHora: [],
          tabelaDirecoes: []
        }
      });
    }

    // Buscar medições de direção do vento
    const medicoesDirecao = await Medicao.findAll({
      where: {
        estacao_id,
        parametro_id: paramDirecao.id,
        data_hora: { [Op.gte]: dataInicio }
      },
      attributes: ['valor', 'data_hora'],
      order: [['data_hora', 'ASC']],
      raw: true
    });

    // Buscar medições de velocidade do vento
    const medicoesVelocidade = await Medicao.findAll({
      where: {
        estacao_id,
        parametro_id: paramVelocidade.id,
        data_hora: { [Op.gte]: dataInicio }
      },
      attributes: ['valor', 'data_hora'],
      order: [['data_hora', 'ASC']],
      raw: true
    });

    if (medicoesDirecao.length === 0 || medicoesVelocidade.length === 0) {
      return res.json({
        sucesso: true,
        dados: {
          mensagem: 'Sem dados de vento para o período selecionado',
          directions: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'],
          frequencies: [0, 0, 0, 0, 0, 0, 0, 0],
          avgSpeeds: [0, 0, 0, 0, 0, 0, 0, 0],
          estatisticas: {
            velocidadeMedia: 0,
            velocidadeMaxima: 0,
            direcaoPredominante: '-',
            calmaria: 0
          },
          porHora: [],
          tabelaDirecoes: []
        }
      });
    }

    // Criar mapa de velocidade por timestamp para cruzar dados
    const velocidadeMap = {};
    medicoesVelocidade.forEach(m => {
      const key = new Date(m.data_hora).toISOString();
      velocidadeMap[key] = parseFloat(m.valor);
    });

    // Definir direções cardeais
    const direcoes = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const limites = [22.5, 67.5, 112.5, 157.5, 202.5, 247.5, 292.5, 337.5];
    
    // Função para converter graus em direção cardinal
    const grausParaDirecao = (graus) => {
      if (graus >= 337.5 || graus < 22.5) return 'N';
      if (graus >= 22.5 && graus < 67.5) return 'NE';
      if (graus >= 67.5 && graus < 112.5) return 'E';
      if (graus >= 112.5 && graus < 157.5) return 'SE';
      if (graus >= 157.5 && graus < 202.5) return 'S';
      if (graus >= 202.5 && graus < 247.5) return 'SW';
      if (graus >= 247.5 && graus < 292.5) return 'W';
      return 'NW';
    };

    // Agregar dados por direção
    const contagem = { N: 0, NE: 0, E: 0, SE: 0, S: 0, SW: 0, W: 0, NW: 0 };
    const somaVelocidade = { N: 0, NE: 0, E: 0, SE: 0, S: 0, SW: 0, W: 0, NW: 0 };
    const maxVelocidade = { N: 0, NE: 0, E: 0, SE: 0, S: 0, SW: 0, W: 0, NW: 0 };
    let totalMedicoes = 0;
    let calmaria = 0;
    let somaVelocidadeTotal = 0;
    let velocidadeMax = 0;
    
    // Agregar por hora do dia
    const porHora = Array(24).fill(0).map(() => ({ soma: 0, contagem: 0 }));

    medicoesDirecao.forEach(m => {
      const direcao = grausParaDirecao(parseFloat(m.valor));
      const key = new Date(m.data_hora).toISOString();
      const velocidade = velocidadeMap[key] || 0;
      const hora = new Date(m.data_hora).getHours();
      
      totalMedicoes++;
      contagem[direcao]++;
      somaVelocidade[direcao] += velocidade;
      somaVelocidadeTotal += velocidade;
      
      if (velocidade > maxVelocidade[direcao]) {
        maxVelocidade[direcao] = velocidade;
      }
      if (velocidade > velocidadeMax) {
        velocidadeMax = velocidade;
      }
      if (velocidade < 0.5) {
        calmaria++;
      }
      
      // Agregar por hora
      porHora[hora].soma += velocidade;
      porHora[hora].contagem++;
    });

    // Calcular frequências e médias
    const frequencies = direcoes.map(d => totalMedicoes > 0 ? parseFloat(((contagem[d] / totalMedicoes) * 100).toFixed(1)) : 0);
    const avgSpeeds = direcoes.map(d => contagem[d] > 0 ? parseFloat((somaVelocidade[d] / contagem[d]).toFixed(1)) : 0);
    
    // Determinar direção predominante
    let maxFreq = 0;
    let direcaoPredominante = 'N';
    direcoes.forEach((d, i) => {
      if (frequencies[i] > maxFreq) {
        maxFreq = frequencies[i];
        direcaoPredominante = d;
      }
    });

    // Montar tabela de direções ordenada
    const tabelaDirecoes = direcoes.map((d, i) => ({
      direcao: d,
      frequencia: frequencies[i],
      velocidadeMedia: avgSpeeds[i],
      velocidadeMaxima: parseFloat(maxVelocidade[d].toFixed(1)),
      contagem: contagem[d]
    })).sort((a, b) => b.frequencia - a.frequencia);

    // Velocidade média por hora
    const velocidadePorHora = porHora.map((h, i) => ({
      hora: i,
      velocidadeMedia: h.contagem > 0 ? parseFloat((h.soma / h.contagem).toFixed(1)) : 0
    }));

    res.json({
      sucesso: true,
      dados: {
        directions: direcoes,
        frequencies,
        avgSpeeds,
        estatisticas: {
          velocidadeMedia: totalMedicoes > 0 ? parseFloat((somaVelocidadeTotal / totalMedicoes).toFixed(1)) : 0,
          velocidadeMaxima: parseFloat(velocidadeMax.toFixed(1)),
          direcaoPredominante,
          calmaria: totalMedicoes > 0 ? parseFloat(((calmaria / totalMedicoes) * 100).toFixed(1)) : 0,
          totalMedicoes
        },
        porHora: velocidadePorHora,
        tabelaDirecoes,
        periodo: {
          inicio: dataInicio,
          fim: new Date(),
          dias: parseInt(dias)
        }
      }
    });

  } catch (error) {
    console.error('Erro ao gerar rosa dos ventos:', error);
    res.status(500).json({
      sucesso: false,
      mensagem: 'Erro interno no servidor'
    });
  }
};

/**
 * GET /api/medicoes/radar-poluentes
 * Dados para radar de poluentes correlacionados com direção do vento
 */
const radarPoluentes = async (req, res) => {
  try {
    const { estacao_id, dias = 30 } = req.query;

    if (!estacao_id) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'estacao_id é obrigatório'
      });
    }

    // Calcular data de início
    const dataInicio = new Date();
    dataInicio.setDate(dataInicio.getDate() - parseInt(dias));

    // Buscar parâmetro de direção do vento
    const paramDirecao = await Parametro.findOne({ where: { codigo: 'DV', ativo: true } });

    if (!paramDirecao) {
      return res.json({
        sucesso: true,
        dados: {
          mensagem: 'Parâmetro de direção do vento (DV) não configurado',
          poluentes: [],
          directions: [],
          dadosPorPoluente: {}
        }
      });
    }

    // Buscar poluentes configurados (tipo 'quimico' ou sem tipo específico meteorológico)
    const poluentes = await Parametro.findAll({
      where: {
        ativo: true,
        tipo: { [Op.or]: ['quimico', null] },
        codigo: { [Op.notIn]: ['DV', 'VV', 'TEMP', 'UR', 'PRESS', 'RAD', 'PRECIP'] }
      }
    });

    // Se não houver poluentes configurados, usar lista padrão
    const codigosPoluentes = poluentes.length > 0 
      ? poluentes.map(p => p.codigo) 
      : ['PM2.5', 'PM10', 'O3', 'NO2', 'SO2', 'CO'];

    // Buscar medições de direção do vento
    const medicoesDirecao = await Medicao.findAll({
      where: {
        estacao_id,
        parametro_id: paramDirecao.id,
        data_hora: { [Op.gte]: dataInicio }
      },
      attributes: ['valor', 'data_hora'],
      raw: true
    });

    if (medicoesDirecao.length === 0) {
      return res.json({
        sucesso: true,
        dados: {
          mensagem: 'Sem dados de direção de vento para o período',
          poluentes: codigosPoluentes,
          directions: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'],
          dadosPorPoluente: {}
        }
      });
    }

    // Criar mapa de direção por timestamp
    const direcaoMap = {};
    const grausParaDirecao = (graus) => {
      if (graus >= 337.5 || graus < 22.5) return 'N';
      if (graus >= 22.5 && graus < 67.5) return 'NE';
      if (graus >= 67.5 && graus < 112.5) return 'E';
      if (graus >= 112.5 && graus < 157.5) return 'SE';
      if (graus >= 157.5 && graus < 202.5) return 'S';
      if (graus >= 202.5 && graus < 247.5) return 'SW';
      if (graus >= 247.5 && graus < 292.5) return 'W';
      return 'NW';
    };

    medicoesDirecao.forEach(m => {
      const dataHora = new Date(m.data_hora);
      // Agrupar por hora para correlacionar
      const key = `${dataHora.getFullYear()}-${dataHora.getMonth()}-${dataHora.getDate()}-${dataHora.getHours()}`;
      direcaoMap[key] = grausParaDirecao(parseFloat(m.valor));
    });

    const direcoes = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const dadosPorPoluente = {};
    const poluentesEncontrados = [];

    // Para cada poluente, buscar medições e correlacionar com direção
    for (const codigo of codigosPoluentes) {
      const parametro = await Parametro.findOne({ where: { codigo, ativo: true } });
      if (!parametro) continue;

      const medicoesPoluente = await Medicao.findAll({
        where: {
          estacao_id,
          parametro_id: parametro.id,
          data_hora: { [Op.gte]: dataInicio }
        },
        attributes: ['valor', 'data_hora'],
        raw: true
      });

      if (medicoesPoluente.length === 0) continue;

      poluentesEncontrados.push({
        codigo: parametro.codigo,
        nome: parametro.nome,
        unidade: parametro.unidade_medida
      });

      // Agregar valores por direção
      const somaPorDirecao = { N: 0, NE: 0, E: 0, SE: 0, S: 0, SW: 0, W: 0, NW: 0 };
      const contagemPorDirecao = { N: 0, NE: 0, E: 0, SE: 0, S: 0, SW: 0, W: 0, NW: 0 };

      medicoesPoluente.forEach(m => {
        const dataHora = new Date(m.data_hora);
        const key = `${dataHora.getFullYear()}-${dataHora.getMonth()}-${dataHora.getDate()}-${dataHora.getHours()}`;
        const direcao = direcaoMap[key];
        
        if (direcao) {
          const valor = parseFloat(m.valor);
          if (!isNaN(valor)) {
            somaPorDirecao[direcao] += valor;
            contagemPorDirecao[direcao]++;
          }
        }
      });

      // Calcular médias
      const mediaPorDirecao = direcoes.map(d => 
        contagemPorDirecao[d] > 0 
          ? parseFloat((somaPorDirecao[d] / contagemPorDirecao[d]).toFixed(2)) 
          : 0
      );

      // Encontrar máximo para normalização
      const maxValor = Math.max(...mediaPorDirecao);
      const valoresNormalizados = mediaPorDirecao.map(v => 
        maxValor > 0 ? parseFloat((v / maxValor * 100).toFixed(1)) : 0
      );

      dadosPorPoluente[codigo] = {
        nome: parametro.nome,
        unidade: parametro.unidade_medida,
        valores: mediaPorDirecao,
        valoresNormalizados,
        maximo: maxValor,
        totalAmostras: medicoesPoluente.length
      };
    }

    res.json({
      sucesso: true,
      dados: {
        poluentes: poluentesEncontrados,
        directions: direcoes,
        dadosPorPoluente,
        periodo: {
          inicio: dataInicio,
          fim: new Date(),
          dias: parseInt(dias)
        }
      }
    });

  } catch (error) {
    console.error('Erro ao gerar radar de poluentes:', error);
    res.status(500).json({
      sucesso: false,
      mensagem: 'Erro interno no servidor'
    });
  }
};

/**
 * GET /api/medicoes/sazonalidade
 * Análise sazonal dos poluentes
 */
const sazonalidade = async (req, res) => {
  try {
    const { parametro = 'PM2.5', estacao_id, anos = 1 } = req.query;

    // Calcular data de início (últimos X anos)
    const dataInicio = new Date();
    dataInicio.setFullYear(dataInicio.getFullYear() - parseInt(anos));

    // Buscar parâmetro
    const parametroObj = await Parametro.findOne({ 
      where: { codigo: parametro, ativo: true } 
    });

    if (!parametroObj) {
      return res.status(404).json({
        sucesso: false,
        mensagem: `Parâmetro ${parametro} não encontrado`
      });
    }

    // Construir filtro
    const where = {
      parametro_id: parametroObj.id,
      data_hora: { [Op.gte]: dataInicio }
    };
    if (estacao_id) where.estacao_id = estacao_id;

    // Buscar todas as medições
    const medicoes = await Medicao.findAll({
      where,
      attributes: ['valor', 'data_hora'],
      include: [{
        model: Estacao,
        as: 'estacao',
        attributes: ['id', 'nome'],
        where: { ativo: true },
        required: true
      }],
      raw: true,
      nest: true
    });

    if (medicoes.length === 0) {
      return res.json({
        sucesso: true,
        dados: {
          parametro: parametroObj.codigo,
          unidade: parametroObj.unidade_medida,
          sazonalidade: {
            verao: { media: 0, mediana: 0, minimo: 0, maximo: 0, amostras: 0 },
            outono: { media: 0, mediana: 0, minimo: 0, maximo: 0, amostras: 0 },
            inverno: { media: 0, mediana: 0, minimo: 0, maximo: 0, amostras: 0 },
            primavera: { media: 0, mediana: 0, minimo: 0, maximo: 0, amostras: 0 }
          },
          porMes: [],
          tendencia: null
        }
      });
    }

    // Determinar estação do ano (Hemisfério Sul)
    // Verão: Dez-Fev | Outono: Mar-Mai | Inverno: Jun-Ago | Primavera: Set-Nov
    const getEstacao = (mes) => {
      if (mes === 11 || mes === 0 || mes === 1) return 'verao';
      if (mes >= 2 && mes <= 4) return 'outono';
      if (mes >= 5 && mes <= 7) return 'inverno';
      return 'primavera';
    };

    // Agrupar por estação
    const porEstacaoAno = {
      verao: [],
      outono: [],
      inverno: [],
      primavera: []
    };

    // Agrupar por mês
    const porMes = Array(12).fill(null).map(() => []);

    medicoes.forEach(m => {
      const data = new Date(m.data_hora);
      const mes = data.getMonth();
      const valor = parseFloat(m.valor);
      
      if (!isNaN(valor)) {
        porEstacaoAno[getEstacao(mes)].push(valor);
        porMes[mes].push(valor);
      }
    });

    // Calcular estatísticas por estação
    const calcularStats = (valores) => {
      if (valores.length === 0) {
        return { media: 0, mediana: 0, minimo: 0, maximo: 0, amostras: 0, desvio: 0 };
      }
      
      valores.sort((a, b) => a - b);
      const n = valores.length;
      const media = valores.reduce((a, b) => a + b, 0) / n;
      const mediana = n % 2 === 0 
        ? (valores[n/2-1] + valores[n/2]) / 2 
        : valores[Math.floor(n/2)];
      const variancia = valores.reduce((acc, v) => acc + Math.pow(v - media, 2), 0) / n;
      
      return {
        media: parseFloat(media.toFixed(2)),
        mediana: parseFloat(mediana.toFixed(2)),
        minimo: parseFloat(valores[0].toFixed(2)),
        maximo: parseFloat(valores[n-1].toFixed(2)),
        amostras: n,
        desvio: parseFloat(Math.sqrt(variancia).toFixed(2))
      };
    };

    const sazonalidadeStats = {
      verao: calcularStats(porEstacaoAno.verao),
      outono: calcularStats(porEstacaoAno.outono),
      inverno: calcularStats(porEstacaoAno.inverno),
      primavera: calcularStats(porEstacaoAno.primavera)
    };

    // Calcular médias mensais
    const nomesMeses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const estatisticasMensais = porMes.map((valores, i) => ({
      mes: nomesMeses[i],
      mesNumero: i + 1,
      ...calcularStats(valores)
    }));

    // Calcular variação sazonal (índice)
    const mediasEstacoes = [
      sazonalidadeStats.verao.media,
      sazonalidadeStats.outono.media,
      sazonalidadeStats.inverno.media,
      sazonalidadeStats.primavera.media
    ].filter(m => m > 0);
    
    const mediaGeral = mediasEstacoes.length > 0 
      ? mediasEstacoes.reduce((a, b) => a + b, 0) / mediasEstacoes.length 
      : 0;

    const variacaoSazonal = {
      verao: mediaGeral > 0 ? parseFloat(((sazonalidadeStats.verao.media / mediaGeral - 1) * 100).toFixed(1)) : 0,
      outono: mediaGeral > 0 ? parseFloat(((sazonalidadeStats.outono.media / mediaGeral - 1) * 100).toFixed(1)) : 0,
      inverno: mediaGeral > 0 ? parseFloat(((sazonalidadeStats.inverno.media / mediaGeral - 1) * 100).toFixed(1)) : 0,
      primavera: mediaGeral > 0 ? parseFloat(((sazonalidadeStats.primavera.media / mediaGeral - 1) * 100).toFixed(1)) : 0
    };

    // Identificar estação crítica (maior média)
    const estacoes = ['verao', 'outono', 'inverno', 'primavera'];
    const estacaoNomes = { verao: 'Verão', outono: 'Outono', inverno: 'Inverno', primavera: 'Primavera' };
    let estacaoCritica = 'verao';
    let maiorMedia = 0;
    estacoes.forEach(e => {
      if (sazonalidadeStats[e].media > maiorMedia) {
        maiorMedia = sazonalidadeStats[e].media;
        estacaoCritica = e;
      }
    });

    res.json({
      sucesso: true,
      dados: {
        parametro: parametroObj.codigo,
        nomeParametro: parametroObj.nome,
        unidade: parametroObj.unidade_medida,
        sazonalidade: sazonalidadeStats,
        variacaoSazonal,
        porMes: estatisticasMensais,
        resumo: {
          mediaGeral: parseFloat(mediaGeral.toFixed(2)),
          estacaoCritica: estacaoNomes[estacaoCritica],
          estacaoCriticaCodigo: estacaoCritica,
          maiorMedia: parseFloat(maiorMedia.toFixed(2)),
          totalAmostras: medicoes.length
        },
        periodo: {
          inicio: dataInicio,
          fim: new Date(),
          anos: parseInt(anos)
        }
      }
    });

  } catch (error) {
    console.error('Erro ao calcular sazonalidade:', error);
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
  importar,
  rosaVentos,
  radarPoluentes,
  sazonalidade
};
