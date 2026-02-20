/**
 * Serviço de Cálculo do Índice de Qualidade do Ar (IQAr)
 * Seguindo as normas CONAMA (Conselho Nacional do Meio Ambiente)
 */

const { Medicao, Parametro, Estacao } = require('../models');
const { Op } = require('sequelize');

// Faixas do IQAr conforme CONAMA
const FAIXAS_IQAR = {
  'Bom': { min: 0, max: 40, cor: '#00A651' },           // Verde
  'Moderado': { min: 41, max: 80, cor: '#FFFF00' },     // Amarelo
  'Ruim': { min: 81, max: 120, cor: '#FF7E00' },        // Laranja
  'Muito Ruim': { min: 121, max: 200, cor: '#FF0000' }, // Vermelho
  'Péssimo': { min: 201, max: 999, cor: '#800080' }     // Roxo
};

// Limites de concentração por poluente (µg/m³) - valores de referência CONAMA
const LIMITES_CONAMA = {
  'PM2.5': {
    faixas: [
      { iqarMin: 0, iqarMax: 40, concMin: 0, concMax: 25 },
      { iqarMin: 41, iqarMax: 80, concMin: 25.1, concMax: 50 },
      { iqarMin: 81, iqarMax: 120, concMin: 50.1, concMax: 75 },
      { iqarMin: 121, iqarMax: 200, concMin: 75.1, concMax: 125 },
      { iqarMin: 201, iqarMax: 400, concMin: 125.1, concMax: 250 }
    ]
  },
  'PM10': {
    faixas: [
      { iqarMin: 0, iqarMax: 40, concMin: 0, concMax: 50 },
      { iqarMin: 41, iqarMax: 80, concMin: 50.1, concMax: 100 },
      { iqarMin: 81, iqarMax: 120, concMin: 100.1, concMax: 150 },
      { iqarMin: 121, iqarMax: 200, concMin: 150.1, concMax: 250 },
      { iqarMin: 201, iqarMax: 400, concMin: 250.1, concMax: 420 }
    ]
  },
  'O3': {
    faixas: [
      { iqarMin: 0, iqarMax: 40, concMin: 0, concMax: 100 },
      { iqarMin: 41, iqarMax: 80, concMin: 100.1, concMax: 130 },
      { iqarMin: 81, iqarMax: 120, concMin: 130.1, concMax: 160 },
      { iqarMin: 121, iqarMax: 200, concMin: 160.1, concMax: 200 },
      { iqarMin: 201, iqarMax: 400, concMin: 200.1, concMax: 400 }
    ]
  },
  'NO2': {
    faixas: [
      { iqarMin: 0, iqarMax: 40, concMin: 0, concMax: 200 },
      { iqarMin: 41, iqarMax: 80, concMin: 200.1, concMax: 240 },
      { iqarMin: 81, iqarMax: 120, concMin: 240.1, concMax: 320 },
      { iqarMin: 121, iqarMax: 200, concMin: 320.1, concMax: 1130 },
      { iqarMin: 201, iqarMax: 400, concMin: 1130.1, concMax: 2260 }
    ]
  },
  'SO2': {
    faixas: [
      { iqarMin: 0, iqarMax: 40, concMin: 0, concMax: 20 },
      { iqarMin: 41, iqarMax: 80, concMin: 20.1, concMax: 40 },
      { iqarMin: 81, iqarMax: 120, concMin: 40.1, concMax: 365 },
      { iqarMin: 121, iqarMax: 200, concMin: 365.1, concMax: 800 },
      { iqarMin: 201, iqarMax: 400, concMin: 800.1, concMax: 1600 }
    ]
  },
  'CO': {
    faixas: [
      { iqarMin: 0, iqarMax: 40, concMin: 0, concMax: 9 },
      { iqarMin: 41, iqarMax: 80, concMin: 9.1, concMax: 11 },
      { iqarMin: 81, iqarMax: 120, concMin: 11.1, concMax: 13 },
      { iqarMin: 121, iqarMax: 200, concMin: 13.1, concMax: 15 },
      { iqarMin: 201, iqarMax: 400, concMin: 15.1, concMax: 30 }
    ]
  }
};

/**
 * Calcula o IQAr para um valor específico de um poluente
 * Fórmula: IQAr = ((Imax - Imin) / (Cmax - Cmin)) × (C - Cmin) + Imin
 * 
 * @param {number} concentracao - Valor da concentração medida
 * @param {object} parametro - Objeto do parâmetro com código
 * @returns {object} { iqar, classificacao, cor }
 */
const calcularIQArIndividual = (concentracao, parametro) => {
  const codigo = parametro.codigo || parametro;
  
  // Verificar se o parâmetro deve calcular IQAr
  if (parametro.calcula_iqar === false || parametro.tipo === 'meteorologico') {
    return { iqar: null, classificacao: null, cor: '#999999', nao_calcula: true };
  }
  
  const limites = LIMITES_CONAMA[codigo];
  
  if (!limites) {
    return { iqar: null, classificacao: null, cor: '#999999' };
  }

  // Encontrar a faixa correta
  let faixa = limites.faixas.find(f => 
    concentracao >= f.concMin && concentracao <= f.concMax
  );

  // Se não encontrou, usar a última faixa (Péssimo)
  if (!faixa) {
    if (concentracao > limites.faixas[limites.faixas.length - 1].concMax) {
      faixa = limites.faixas[limites.faixas.length - 1];
    } else {
      faixa = limites.faixas[0];
    }
  }

  // Calcular IQAr usando interpolação linear
  const { iqarMin, iqarMax, concMin, concMax } = faixa;
  const iqar = Math.round(
    ((iqarMax - iqarMin) / (concMax - concMin)) * (concentracao - concMin) + iqarMin
  );

  // Garantir que está dentro dos limites
  const iqarFinal = Math.max(0, Math.min(400, iqar));

  // Determinar classificação
  const classificacao = obterClassificacao(iqarFinal);
  const cor = FAIXAS_IQAR[classificacao].cor;

  return {
    iqar: iqarFinal,
    classificacao,
    cor
  };
};

/**
 * Obtém a classificação baseada no valor do IQAr
 */
const obterClassificacao = (iqar) => {
  if (iqar <= 40) return 'Bom';
  if (iqar <= 80) return 'Moderado';
  if (iqar <= 120) return 'Ruim';
  if (iqar <= 200) return 'Muito Ruim';
  return 'Péssimo';
};

/**
 * Calcula o IQAr geral de uma estação
 * O IQAr da estação é o MAIOR valor entre todos os poluentes
 * 
 * @param {number} estacaoId - ID da estação
 * @returns {object} { iqar, classificacao, cor, poluente_predominante, detalhes }
 */
const calcularIQArEstacao = async (estacaoId) => {
  try {
    // Buscar apenas parâmetros que calculam IQAr (poluentes)
    const parametros = await Parametro.findAll({ 
      where: { 
        ativo: true,
        calcula_iqar: true,  // Apenas parâmetros que calculam IQAr
        tipo: 'poluente'     // Apenas poluentes
      } 
    });
    
    let maiorIQAr = 0;
    let poluentePredominante = null;
    let valorPoluente = null;
    const detalhes = {};

    for (const param of parametros) {
      // Buscar última medição válida deste parâmetro
      const ultimaMedicao = await Medicao.findOne({
        where: {
          estacao_id: estacaoId,
          parametro_id: param.id,
          flag: { [Op.in]: ['valid', 'pending'] }
        },
        order: [['data_hora', 'DESC']]
      });

      if (ultimaMedicao) {
        const { iqar, classificacao, cor } = calcularIQArIndividual(
          parseFloat(ultimaMedicao.valor),
          param
        );

        // Só adicionar se calculou IQAr
        if (iqar !== null) {
          detalhes[param.codigo] = {
            valor: parseFloat(ultimaMedicao.valor),
            unidade: param.unidade_medida,
            iqar,
            classificacao,
            cor,
            data_hora: ultimaMedicao.data_hora
          };

          if (iqar > maiorIQAr) {
            maiorIQAr = iqar;
            poluentePredominante = param.codigo;
            valorPoluente = parseFloat(ultimaMedicao.valor);
          }
        }
      }
    }

    const classificacao = obterClassificacao(maiorIQAr);
    const cor = FAIXAS_IQAR[classificacao].cor;

    return {
      iqar: maiorIQAr,
      classificacao,
      cor,
      poluente_predominante: poluentePredominante,
      valor_poluente: valorPoluente,
      detalhes
    };
  } catch (error) {
    console.error('Erro ao calcular IQAr da estação:', error);
    return {
      iqar: null,
      classificacao: null,
      cor: '#999999',
      poluente_predominante: null,
      detalhes: {}
    };
  }
};

/**
 * Calcula o IQAr de todas as estações
 */
const calcularIQArTodasEstacoes = async () => {
  try {
    const estacoes = await Estacao.findAll({ 
      where: { ativo: true },
      attributes: ['id', 'codigo', 'nome']
    });

    const resultados = [];

    for (const estacao of estacoes) {
      const iqar = await calcularIQArEstacao(estacao.id);
      resultados.push({
        estacao_id: estacao.id,
        estacao_codigo: estacao.codigo,
        estacao_nome: estacao.nome,
        ...iqar
      });
    }

    // Ordenar por IQAr (maior primeiro)
    resultados.sort((a, b) => (b.iqar || 0) - (a.iqar || 0));

    return resultados;
  } catch (error) {
    console.error('Erro ao calcular IQAr de todas estações:', error);
    return [];
  }
};

module.exports = {
  calcularIQArIndividual,
  calcularIQArEstacao,
  calcularIQArTodasEstacoes,
  obterClassificacao,
  FAIXAS_IQAR,
  LIMITES_CONAMA
};
