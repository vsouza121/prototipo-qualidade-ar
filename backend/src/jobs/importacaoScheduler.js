/**
 * Job Scheduler para importação automática de dados
 * Executa importações periódicas das APIs externas
 * 
 * A importação contínua garante que os dados da API externa
 * sejam sempre inseridos no banco de dados e exibidos no sistema.
 * 
 * IMPORTANTE: A API retorna dados da hora atual + últimas 5 horas.
 * O sistema verifica duplicatas por (estacao_id + parametro_id + data_hora)
 * e só insere registros NOVOS que ainda não existem no banco.
 */
const cron = require('node-cron');
const apiRioService = require('../services/apiRioService');

// Armazenar referências dos jobs
const jobs = {};

// Configuração padrão do intervalo de importação (em minutos)
let intervaloImportacao = 60; // A cada 1 hora por padrão

// Status das execuções
const statusExecucoes = {
    rio: {
        ultima_execucao: null,
        proxima_execucao: null,
        status: 'parado',
        ultima_resposta: null,
        intervalo_minutos: intervaloImportacao,
        total_importacoes: 0,
        medicoes_totais: 0
    }
};

/**
 * Calcula próxima execução no minuto 05 de cada hora
 */
function calcularProximaExecucao() {
    try {
        const agora = new Date();
        const proxima = new Date(agora);
        
        // Se ainda não passou do minuto 05 desta hora, executa nesta hora
        if (agora.getMinutes() < 5) {
            proxima.setMinutes(5, 0, 0);
        } else {
            // Já passou do minuto 05, executa na próxima hora
            proxima.setHours(agora.getHours() + 1);
            proxima.setMinutes(5, 0, 0);
        }
        
        return proxima;
    } catch (e) {
        return null;
    }
}

/**
 * Converte intervalo em minutos para expressão cron
 */
function intervaloParaCron(minutos) {
    if (minutos < 1) minutos = 1;
    if (minutos >= 60) {
        // A cada X horas
        const horas = Math.floor(minutos / 60);
        return `0 */${horas} * * *`;
    }
    // A cada X minutos
    return `*/${minutos} * * * *`;
}

/**
 * Job para importar dados da API do Rio de Janeiro
 * Padrão: a cada 5 minutos
 */
function iniciarJobRio(cronExpression = '*/' + intervaloImportacao + ' * * * *') {
    if (jobs.rio) {
        jobs.rio.stop();
    }

    console.log(`[Scheduler] Iniciando job API Rio com expressão: ${cronExpression} (intervalo: ${intervaloImportacao} min)`);
    
    jobs.rio = cron.schedule(cronExpression, async () => {
        console.log('[Scheduler] Executando importação API Rio...');
        statusExecucoes.rio.status = 'executando';
        statusExecucoes.rio.ultima_execucao = new Date();

        try {
            const resultado = await apiRioService.importarDadosApiRio();
            statusExecucoes.rio.ultima_resposta = resultado;
            statusExecucoes.rio.status = resultado.sucesso ? 'sucesso' : 'erro';
            statusExecucoes.rio.total_importacoes++;
            statusExecucoes.rio.medicoes_totais += resultado.medicoes_inseridas || 0;
            console.log(`[Scheduler] Importação API Rio concluída: ${resultado.medicoes_inseridas} novas medições`);
        } catch (e) {
            statusExecucoes.rio.status = 'erro';
            statusExecucoes.rio.ultima_resposta = { erro: e.message };
            console.error('[Scheduler] Erro na importação API Rio:', e.message);
        }

        // Calcular próxima execução
        statusExecucoes.rio.proxima_execucao = calcularProximaExecucao();
    });

    statusExecucoes.rio.status = 'agendado';
    statusExecucoes.rio.intervalo_minutos = 60; // A cada hora no minuto 05
    statusExecucoes.rio.proxima_execucao = calcularProximaExecucao();

    return jobs.rio;
}

/**
 * Configura intervalo de importação - fixo no minuto 05 de cada hora
 * Mantido para compatibilidade com a API, mas sempre usa minuto 05
 */
function configurarIntervalo(minutos) {
    console.log(`[Scheduler] Configuração de intervalo ignorada - usando minuto 05 fixo de cada hora`);
    
    // Reiniciar job com minuto 05 fixo
    const cronExpr = '5 * * * *';
    iniciarJobRio(cronExpr);
    
    return {
        intervalo_minutos: 60,
        cron_expression: cronExpr,
        proxima_execucao: statusExecucoes.rio.proxima_execucao
    };
}

/**
 * Para o job da API do Rio
 */
function pararJobRio() {
    if (jobs.rio) {
        jobs.rio.stop();
        jobs.rio = null;
        statusExecucoes.rio.status = 'parado';
        statusExecucoes.rio.proxima_execucao = null;
        console.log('[Scheduler] Job API Rio parado');
    }
}

/**
 * Retorna status de todos os jobs
 */
function getStatus() {
    return {
        jobs: {
            rio: {
                ativo: !!jobs.rio,
                ...statusExecucoes.rio
            }
        },
        timestamp: new Date()
    };
}

/**
 * Executa importação imediata (fora do schedule)
 */
async function executarImediato(api = 'rio') {
    console.log(`[Scheduler] Execução imediata solicitada: ${api}`);
    
    if (api === 'rio') {
        statusExecucoes.rio.status = 'executando';
        statusExecucoes.rio.ultima_execucao = new Date();
        
        try {
            const resultado = await apiRioService.importarDadosApiRio();
            statusExecucoes.rio.ultima_resposta = resultado;
            statusExecucoes.rio.status = resultado.sucesso ? 'sucesso' : 'erro';
            statusExecucoes.rio.total_importacoes++;
            statusExecucoes.rio.medicoes_totais += resultado.medicoes_inseridas || 0;
            return resultado;
        } catch (e) {
            statusExecucoes.rio.status = 'erro';
            statusExecucoes.rio.ultima_resposta = { erro: e.message };
            throw e;
        }
    }
    
    throw new Error(`API desconhecida: ${api}`);
}

/**
 * Inicializa todos os jobs ao iniciar o servidor
 */
function inicializarJobs() {
    console.log('[Scheduler] Inicializando jobs de importação contínua...');
    
    // Iniciar job da API do Rio no minuto 05 de cada hora (ex: 00:05, 01:05, 02:05...)
    const cronExpr = '5 * * * *';
    iniciarJobRio(cronExpr);
    
    // Executar uma importação inicial após 5 segundos
    setTimeout(async () => {
        console.log('[Scheduler] Executando importação inicial...');
        try {
            await executarImediato('rio');
            console.log('[Scheduler] Importação inicial concluída com sucesso');
        } catch (e) {
            console.error('[Scheduler] Erro na importação inicial:', e.message);
        }
    }, 5000);
    
    console.log('[Scheduler] Jobs inicializados - Importação no minuto 05 de cada hora');
}

module.exports = {
    iniciarJobRio,
    pararJobRio,
    configurarIntervalo,
    getStatus,
    executarImediato,
    inicializarJobs
};
