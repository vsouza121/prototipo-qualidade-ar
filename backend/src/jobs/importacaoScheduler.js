/**
 * Job Scheduler para importação automática de dados
 * Executa importações periódicas das APIs externas
 */
const cron = require('node-cron');
const apiRioService = require('../services/apiRioService');

// Armazenar referências dos jobs
const jobs = {};

// Status das execuções
const statusExecucoes = {
    rio: {
        ultima_execucao: null,
        proxima_execucao: null,
        status: 'parado',
        ultima_resposta: null
    }
};

/**
 * Calcula próxima execução baseado na expressão cron
 */
function calcularProximaExecucao(cronExpression) {
    try {
        // Formato simples: calcular próxima hora cheia + 5 minutos
        const agora = new Date();
        const proxima = new Date(agora);
        proxima.setMinutes(5, 0, 0);
        if (proxima <= agora) {
            proxima.setHours(proxima.getHours() + 1);
        }
        return proxima;
    } catch (e) {
        return null;
    }
}

/**
 * Job para importar dados da API do Rio de Janeiro
 * Padrão: a cada hora (minuto 5)
 */
function iniciarJobRio(cronExpression = '5 * * * *') {
    if (jobs.rio) {
        jobs.rio.stop();
    }

    console.log(`[Scheduler] Iniciando job API Rio com expressão: ${cronExpression}`);
    
    jobs.rio = cron.schedule(cronExpression, async () => {
        console.log('[Scheduler] Executando importação API Rio...');
        statusExecucoes.rio.status = 'executando';
        statusExecucoes.rio.ultima_execucao = new Date();

        try {
            const resultado = await apiRioService.importarDadosApiRio();
            statusExecucoes.rio.ultima_resposta = resultado;
            statusExecucoes.rio.status = resultado.sucesso ? 'sucesso' : 'erro';
            console.log(`[Scheduler] Importação API Rio concluída: ${resultado.medicoes_inseridas} novas medições`);
        } catch (e) {
            statusExecucoes.rio.status = 'erro';
            statusExecucoes.rio.ultima_resposta = { erro: e.message };
            console.error('[Scheduler] Erro na importação API Rio:', e.message);
        }

        // Calcular próxima execução
        statusExecucoes.rio.proxima_execucao = calcularProximaExecucao(cronExpression);
    });

    statusExecucoes.rio.status = 'agendado';
    statusExecucoes.rio.proxima_execucao = calcularProximaExecucao(cronExpression);

    return jobs.rio;
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
    console.log('[Scheduler] Inicializando jobs de importação...');
    
    // Iniciar job da API do Rio (a cada hora, no minuto 5)
    iniciarJobRio('5 * * * *');
    
    // Executar uma importação inicial após 10 segundos
    setTimeout(async () => {
        console.log('[Scheduler] Executando importação inicial...');
        try {
            await executarImediato('rio');
        } catch (e) {
            console.error('[Scheduler] Erro na importação inicial:', e.message);
        }
    }, 10000);
    
    console.log('[Scheduler] Jobs inicializados com sucesso');
}

module.exports = {
    iniciarJobRio,
    pararJobRio,
    getStatus,
    executarImediato,
    inicializarJobs
};
