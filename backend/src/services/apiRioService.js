/**
 * Serviço de Integração com a API do Rio de Janeiro (SMAC)
 * Importa dados de qualidade do ar das estações da cidade do Rio
 */
const https = require('https');
const { Op } = require('sequelize');
const Estacao = require('../models/Estacao');
const Parametro = require('../models/Parametro');
const Medicao = require('../models/Medicao');
const Unidade = require('../models/Unidade');
const ImportacaoLog = require('../models/ImportacaoLog');
const sequelize = require('../database/connection');

const API_URL = 'https://jeap.rio.rj.gov.br/je-metinfosmac/portalV2/estacao';

// Mapeamento de siglas da API para códigos do sistema
const MAPEAMENTO_PARAMETROS = {
    'MP10': 'PM10',
    'MP2.5': 'PM25',
    'PM2.5': 'PM25',
    'O3': 'O3',
    'NO2': 'NO2',
    'SO2': 'SO2',
    'CO': 'CO',
    'TEMP': 'TEMP',
    'UR': 'UR',
    'PRESS': 'PRESS',
    'DV': 'DV',
    'VV': 'VV',
    'CH': 'CHUVA',
    'RAD': 'RAD'
};

/**
 * Busca dados da API externa do Rio de Janeiro
 */
async function fetchApiRio() {
    return new Promise((resolve, reject) => {
        https.get(API_URL, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve(json);
                } catch (e) {
                    reject(new Error('Erro ao parsear JSON da API'));
                }
            });
        }).on('error', (e) => {
            reject(new Error(`Erro ao conectar na API: ${e.message}`));
        });
    });
}

/**
 * Cria ou atualiza a unidade "Rio de Janeiro" no sistema
 */
async function obterOuCriarUnidadeRio() {
    const [unidade] = await Unidade.findOrCreate({
        where: { codigo: 'SMAC-RJ' },
        defaults: {
            codigo: 'SMAC-RJ',
            nome: 'Prefeitura do Rio de Janeiro - SMAC',
            endereco: 'Rio de Janeiro, RJ',
            responsavel: 'SMAC',
            email: 'contato@smac.rio.rj.gov.br',
            ativo: true
        }
    });
    return unidade;
}

/**
 * Cria ou atualiza uma estação no sistema
 */
async function criarOuAtualizarEstacao(estacaoApi, unidadeId) {
    // Truncar código para max 30 caracteres
    let codigo = `RJ-${estacaoApi.noEstacao.replace(/\s/g, '-').toUpperCase()}`;
    codigo = codigo.substring(0, 30);
    
    const [estacao, created] = await Estacao.findOrCreate({
        where: { codigo },
        defaults: {
            codigo,
            nome: estacaoApi.noEstacao,
            unidade_id: unidadeId,
            latitude: estacaoApi.nuLatitude || -22.9068,
            longitude: estacaoApi.nuLongitude || -43.1729,
            status: estacaoApi.statusEstacao === 'Em operação' ? 'online' : 'offline',
            ativo: true,
            descricao: `Estação ${estacaoApi.classificacaoEstacao} - ${estacaoApi.tipoEstacao}`,
            ultima_comunicacao: new Date()
        }
    });

    if (!created) {
        // Atualizar última comunicação
        await estacao.update({
            ultima_comunicacao: new Date(),
            status: estacaoApi.statusEstacao === 'Em operação' ? 'online' : 'offline'
        });
    }

    return estacao;
}

/**
 * Obtém ou cria um parâmetro no sistema
 */
async function obterOuCriarParametro(siglaApi, nomeParametro) {
    const codigoSistema = MAPEAMENTO_PARAMETROS[siglaApi] || siglaApi;
    
    // Extrair unidade de medida do nome
    let unidadeMedida = 'µg/m³';
    const match = nomeParametro.match(/\((.*?)\)/);
    if (match) {
        unidadeMedida = match[1];
    }

    // Definir informações do parâmetro baseado no tipo
    const infoParametro = obterInfoParametro(codigoSistema);

    const [parametro] = await Parametro.findOrCreate({
        where: { codigo: codigoSistema },
        defaults: {
            codigo: codigoSistema,
            nome: nomeParametro.replace(/\s*\(.*?\)/, '').trim(),
            unidade_medida: unidadeMedida,
            tipo: infoParametro.tipo,
            calcula_iqar: infoParametro.calcula_iqar,
            tipo_media: infoParametro.tipo_media,
            ...infoParametro.limites,
            ativo: true
        }
    });

    return parametro;
}

/**
 * Define informações do parâmetro baseado no código
 * Inclui tipo, se calcula IQAr, tipo de média e limites CONAMA
 */
function obterInfoParametro(codigo) {
    // Parâmetros poluentes (calculam IQAr)
    const poluentes = {
        'PM25': { tipo_media: '24horas', limites: { limite_bom: 25, limite_moderado: 50, limite_ruim: 75, limite_muito_ruim: 125, limite_pessimo: 250 } },
        'PM10': { tipo_media: '24horas', limites: { limite_bom: 50, limite_moderado: 100, limite_ruim: 150, limite_muito_ruim: 250, limite_pessimo: 420 } },
        'O3': { tipo_media: '8horas', limites: { limite_bom: 100, limite_moderado: 130, limite_ruim: 160, limite_muito_ruim: 200, limite_pessimo: 400 } },
        'NO2': { tipo_media: 'horaria', limites: { limite_bom: 200, limite_moderado: 240, limite_ruim: 320, limite_muito_ruim: 1130, limite_pessimo: 2260 } },
        'SO2': { tipo_media: '24horas', limites: { limite_bom: 20, limite_moderado: 40, limite_ruim: 365, limite_muito_ruim: 800, limite_pessimo: 1600 } },
        'CO': { tipo_media: '8horas', limites: { limite_bom: 9, limite_moderado: 11, limite_ruim: 13, limite_muito_ruim: 15, limite_pessimo: 50 } }
    };
    
    // Parâmetros meteorológicos (não calculam IQAr)
    const meteorologicos = ['TEMP', 'UR', 'PRESS', 'DV', 'VV', 'CHUVA', 'RAD', 'CH'];
    
    // Verificar se é poluente
    if (poluentes[codigo]) {
        return {
            tipo: 'poluente',
            calcula_iqar: true,
            tipo_media: poluentes[codigo].tipo_media,
            limites: poluentes[codigo].limites
        };
    }
    
    // Verificar se é meteorológico
    if (meteorologicos.includes(codigo)) {
        return {
            tipo: 'meteorologico',
            calcula_iqar: false,
            tipo_media: 'horaria',
            limites: {} // Meteorológicos não têm limites de IQAr
        };
    }
    
    // Tipo desconhecido - tratar como "outro"
    return {
        tipo: 'outro',
        calcula_iqar: false,
        tipo_media: 'horaria',
        limites: {}
    };
}

/**
 * Insere medições no banco de dados
 */
async function inserirMedicoes(estacao, parametro, dadosApi, importacaoId = null) {
    const medicoes = [];
    let inseridos = 0;
    let duplicados = 0;

    for (const dado of dadosApi) {
        if (dado.valor === null || dado.valor === undefined) continue;

        const dataHora = new Date(dado.data);
        
        // Verificar se já existe
        const existente = await Medicao.findOne({
            where: {
                estacao_id: estacao.id,
                parametro_id: parametro.id,
                data_hora: dataHora
            }
        });

        if (existente) {
            duplicados++;
            continue;
        }

        // Definir flag baseado no dadoValidado da API
        const flag = dado.dadoValidado === 1 ? 'valid' : 'pending';

        try {
            await Medicao.create({
                estacao_id: estacao.id,
                parametro_id: parametro.id,
                valor: dado.valor,
                data_hora: dataHora,
                flag: flag,
                motivo_flag: dado.dadoValidado === 1 ? 'Validado pela API SMAC' : 'Pendente validação',
                fonte_dados: 'api_rio',
                importacao_id: importacaoId
            });
            inseridos++;
        } catch (e) {
            console.error(`Erro ao inserir medição: ${e.message}`);
        }
    }

    return { inseridos, duplicados };
}

/**
 * Função principal de importação
 */
async function importarDadosApiRio() {
    console.log('[API Rio] Iniciando importação de dados...');
    const inicio = Date.now();
    
    const resultado = {
        sucesso: true,
        estacoes: 0,
        parametros: 0,
        medicoes_inseridas: 0,
        medicoes_duplicadas: 0,
        erros: []
    };

    // Criar log de importação
    const importacaoLog = await ImportacaoLog.create({
        fonte: 'api_rio',
        tipo: 'medicoes',
        status: 'executando'
    });

    const transaction = await sequelize.transaction();

    try {
        // 1. Buscar dados da API
        console.log('[API Rio] Buscando dados da API externa...');
        const dadosApi = await fetchApiRio();
        console.log(`[API Rio] Recebidas ${dadosApi.length} estações`);

        // 2. Criar/obter unidade Rio de Janeiro
        const unidade = await obterOuCriarUnidadeRio();
        console.log(`[API Rio] Unidade: ${unidade.nome}`);

        // 3. Processar cada estação
        for (const estacaoApi of dadosApi) {
            try {
                // Criar/atualizar estação
                const estacao = await criarOuAtualizarEstacao(estacaoApi, unidade.id);
                resultado.estacoes++;
                console.log(`[API Rio] Processando estação: ${estacao.nome}`);

                // Processar medições de cada parâmetro
                if (estacaoApi.medicoes && Array.isArray(estacaoApi.medicoes)) {
                    for (const medicaoApi of estacaoApi.medicoes) {
                        try {
                            // Criar/obter parâmetro
                            const parametro = await obterOuCriarParametro(
                                medicaoApi.sigla,
                                medicaoApi.parametro
                            );

                            // Inserir medições (com ID do log de importação)
                            if (medicaoApi.dados && Array.isArray(medicaoApi.dados)) {
                                const { inseridos, duplicados } = await inserirMedicoes(
                                    estacao,
                                    parametro,
                                    medicaoApi.dados,
                                    importacaoLog.id
                                );
                                resultado.medicoes_inseridas += inseridos;
                                resultado.medicoes_duplicadas += duplicados;
                            }
                        } catch (e) {
                            resultado.erros.push(`Erro em ${estacao.nome}/${medicaoApi.sigla}: ${e.message}`);
                        }
                    }
                }
            } catch (e) {
                resultado.erros.push(`Erro na estação ${estacaoApi.noEstacao}: ${e.message}`);
            }
        }

        await transaction.commit();
        
        const duracao = ((Date.now() - inicio) / 1000).toFixed(2);
        console.log(`[API Rio] Importação concluída em ${duracao}s`);
        console.log(`[API Rio] Estações: ${resultado.estacoes}, Medições: ${resultado.medicoes_inseridas}, Duplicadas: ${resultado.medicoes_duplicadas}`);
        
        // Atualizar log de importação com sucesso
        await importacaoLog.update({
            status: resultado.erros.length > 0 ? 'parcial' : 'sucesso',
            total_registros: resultado.medicoes_inseridas + resultado.medicoes_duplicadas,
            registros_novos: resultado.medicoes_inseridas,
            registros_atualizados: 0,
            registros_erro: resultado.erros.length,
            tempo_execucao_ms: Date.now() - inicio,
            mensagem: `Importadas ${resultado.medicoes_inseridas} medições de ${resultado.estacoes} estações`,
            detalhes_erro: resultado.erros.length > 0 ? resultado.erros.join('\n') : null
        });
        
        resultado.duracao_segundos = parseFloat(duracao);
        resultado.importacao_id = importacaoLog.id;
        return resultado;

    } catch (e) {
        await transaction.rollback();
        console.error('[API Rio] Erro na importação:', e.message);
        
        // Atualizar log de importação com erro
        await importacaoLog.update({
            status: 'erro',
            tempo_execucao_ms: Date.now() - inicio,
            mensagem: 'Erro na importação',
            detalhes_erro: e.message
        });
        
        resultado.sucesso = false;
        resultado.erros.push(e.message);
        return resultado;
    }
}

/**
 * Obtém status da última importação
 */
async function obterStatusApi() {
    try {
        // Contar estações do Rio
        const totalEstacoes = await Estacao.count({
            where: { codigo: { [Op.like]: 'RJ-%' } }
        });

        // Última importação bem-sucedida
        const ultimaImportacao = await ImportacaoLog.findOne({
            where: { 
                fonte: 'api_rio',
                status: { [Op.in]: ['sucesso', 'parcial'] }
            },
            order: [['data_execucao', 'DESC']]
        });

        // Última medição
        const ultimaMedicao = await Medicao.findOne({
            where: { fonte_dados: 'api_rio' },
            order: [['criado_em', 'DESC']]
        });

        return {
            sucesso: true,
            status: 'online',
            total_estacoes_rj: totalEstacoes,
            ultima_importacao: ultimaImportacao ? {
                data: ultimaImportacao.data_execucao,
                status: ultimaImportacao.status,
                registros_novos: ultimaImportacao.registros_novos,
                tempo_execucao_ms: ultimaImportacao.tempo_execucao_ms
            } : null,
            ultima_medicao: ultimaMedicao ? ultimaMedicao.criado_em : null,
            api_url: API_URL
        };
    } catch (e) {
        return {
            sucesso: false,
            status: 'erro',
            erro: e.message
        };
    }
}

/**
 * Obtém histórico de importações
 */
async function obterHistoricoImportacoes(limite = 10) {
    try {
        const importacoes = await ImportacaoLog.findAll({
            where: { fonte: 'api_rio' },
            order: [['data_execucao', 'DESC']],
            limit: limite
        });
        return { sucesso: true, importacoes };
    } catch (e) {
        return { sucesso: false, erro: e.message };
    }
}

module.exports = {
    importarDadosApiRio,
    fetchApiRio,
    obterStatusApi,
    obterHistoricoImportacoes,
    API_URL
};
