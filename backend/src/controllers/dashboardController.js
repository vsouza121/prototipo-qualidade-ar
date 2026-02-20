const { Op, fn, col } = require('sequelize');
const { Estacao, Medicao, Alerta, Parametro, Unidade } = require('../models');
const iqarService = require('../services/iqarService');

/**
 * GET /api/dashboard
 * Dados consolidados do dashboard
 */
const getDashboard = async (req, res) => {
  try {
    const agora = new Date();
    const inicioHoje = new Date(agora);
    inicioHoje.setHours(0, 0, 0, 0);

    // 1. Contagem de estações ativas
    const estacoesAtivas = await Estacao.count({
      where: { ativo: true }
    });

    const totalEstacoes = await Estacao.count();

    // 2. Dados coletados hoje
    const dadosColetadosHoje = await Medicao.count({
      where: {
        data_hora: { [Op.gte]: inicioHoje }
      }
    });

    // 3. Calcular disponibilidade geral
    // (Estações que comunicaram nos últimos 10 minutos)
    const dezMinutosAtras = new Date(agora - 10 * 60 * 1000);
    const estacoesOnline = await Estacao.count({
      where: {
        ativo: true,
        ultima_comunicacao: { [Op.gte]: dezMinutosAtras }
      }
    });
    const disponibilidade = estacoesAtivas > 0 
      ? ((estacoesOnline / estacoesAtivas) * 100).toFixed(1)
      : 0;

    // 4. Alertas ativos
    const alertasAtivos = await Alerta.count({
      where: { resolvido: false }
    });

    const alertasCritical = await Alerta.count({
      where: { resolvido: false, nivel: 'critical' }
    });

    // 5. IQAr de todas as estações
    const iqarEstacoes = await iqarService.calcularIQArTodasEstacoes();
    
    // Resumo do IQAr
    const iqarResumo = iqarEstacoes.slice(0, 6).map(e => ({
      estacao: e.estacao_codigo,
      nome: e.estacao_nome,
      iqar: e.iqar,
      classificacao: e.classificacao,
      cor: e.cor,
      poluente: e.poluente_predominante
    }));

    // 6. Últimas medições (tabela)
    const ultimasMedicoes = await Estacao.findAll({
      where: { ativo: true },
      attributes: ['id', 'codigo', 'nome', 'status', 'ultima_comunicacao'],
      include: [{
        model: Unidade,
        as: 'unidade',
        attributes: ['codigo']
      }],
      limit: 10
    });

    // 7. Alertas recentes
    const alertasRecentes = await Alerta.findAll({
      where: { resolvido: false },
      include: [{
        model: Estacao,
        as: 'estacao',
        attributes: ['codigo', 'nome']
      }],
      order: [['criado_em', 'DESC']],
      limit: 5
    });

    // 8. Disponibilidade por estação (top 5 piores)
    const disponibilidadePorEstacao = await Estacao.findAll({
      where: { ativo: true },
      attributes: ['id', 'codigo', 'nome', 'ultima_comunicacao'],
      order: [['ultima_comunicacao', 'ASC']],
      limit: 5
    });

    // Calcular % de disponibilidade por estação (últimas 24h)
    const disponibilidadeCalculada = await Promise.all(
      disponibilidadePorEstacao.map(async (est) => {
        const vinte4HorasAtras = new Date(agora - 24 * 60 * 60 * 1000);
        
        // Total de medições esperadas (1 a cada 5 min = 288 por dia por parâmetro)
        const totalEsperado = 288 * 6; // 6 parâmetros
        
        const totalMedicoes = await Medicao.count({
          where: {
            estacao_id: est.id,
            data_hora: { [Op.gte]: vinte4HorasAtras }
          }
        });

        const percentual = Math.min(100, ((totalMedicoes / totalEsperado) * 100).toFixed(1));

        return {
          estacao: est.codigo,
          nome: est.nome,
          disponibilidade: parseFloat(percentual),
          ultima_comunicacao: est.ultima_comunicacao
        };
      })
    );

    res.json({
      sucesso: true,
      dados: {
        // Cards principais
        cards: {
          estacoes_ativas: estacoesAtivas,
          total_estacoes: totalEstacoes,
          dados_coletados_hoje: dadosColetadosHoje,
          disponibilidade: parseFloat(disponibilidade),
          alertas_ativos: alertasAtivos,
          alertas_criticos: alertasCritical
        },
        
        // IQAr das estações
        iqar: iqarResumo,
        
        // Alertas recentes formatados
        alertas: alertasRecentes.map(a => ({
          id: a.id,
          tipo: a.tipo,
          nivel: a.nivel,
          titulo: a.titulo,
          mensagem: a.mensagem,
          estacao: a.estacao?.codigo || 'Sistema',
          criado_em: a.criado_em
        })),
        
        // Disponibilidade por estação
        disponibilidade_estacoes: disponibilidadeCalculada,
        
        // Metadata
        atualizado_em: agora
      }
    });

  } catch (error) {
    console.error('Erro ao buscar dados do dashboard:', error);
    res.status(500).json({
      sucesso: false,
      mensagem: 'Erro interno no servidor'
    });
  }
};

/**
 * GET /api/dashboard/resumo
 * Resumo rápido para header/notificações
 */
const getResumo = async (req, res) => {
  try {
    const alertasNaoLidos = await Alerta.count({
      where: { lido: false, resolvido: false }
    });

    const alertasCriticos = await Alerta.count({
      where: { nivel: 'critical', resolvido: false }
    });

    res.json({
      sucesso: true,
      dados: {
        alertas_nao_lidos: alertasNaoLidos,
        alertas_criticos: alertasCriticos
      }
    });

  } catch (error) {
    console.error('Erro ao buscar resumo:', error);
    res.status(500).json({
      sucesso: false,
      mensagem: 'Erro interno no servidor'
    });
  }
};

/**
 * GET /api/iqar
 * IQAr de todas as estações
 */
const getIQAr = async (req, res) => {
  try {
    const iqarEstacoes = await iqarService.calcularIQArTodasEstacoes();
    
    res.json({
      sucesso: true,
      dados: iqarEstacoes,
      atualizado_em: new Date()
    });

  } catch (error) {
    console.error('Erro ao calcular IQAr:', error);
    res.status(500).json({
      sucesso: false,
      mensagem: 'Erro interno no servidor'
    });
  }
};

/**
 * GET /api/iqar/estacao/:id
 * IQAr de uma estação específica
 */
const getIQArEstacao = async (req, res) => {
  try {
    const { id } = req.params;

    const estacao = await Estacao.findByPk(id);
    if (!estacao) {
      return res.status(404).json({
        sucesso: false,
        mensagem: 'Estação não encontrada'
      });
    }

    const iqar = await iqarService.calcularIQArEstacao(id);

    res.json({
      sucesso: true,
      dados: {
        estacao_id: estacao.id,
        estacao_codigo: estacao.codigo,
        estacao_nome: estacao.nome,
        ...iqar,
        atualizado_em: new Date()
      }
    });

  } catch (error) {
    console.error('Erro ao calcular IQAr da estação:', error);
    res.status(500).json({
      sucesso: false,
      mensagem: 'Erro interno no servidor'
    });
  }
};

module.exports = {
  getDashboard,
  getResumo,
  getIQAr,
  getIQArEstacao
};
