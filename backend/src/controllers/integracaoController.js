/**
 * Controller para gerenciar integração com APIs externas
 */
const apiRioService = require('../services/apiRioService');

/**
 * POST /api/integracao/rio/importar
 * Executa importação manual dos dados da API do Rio
 */
async function importarDadosRio(req, res) {
    try {
        console.log('[Integração] Importação manual iniciada por:', req.user?.nome || 'Sistema');
        
        const resultado = await apiRioService.importarDadosApiRio();
        
        if (resultado.sucesso) {
            return res.json({
                sucesso: true,
                mensagem: 'Importação concluída com sucesso',
                dados: resultado
            });
        } else {
            return res.status(500).json({
                sucesso: false,
                mensagem: 'Importação concluída com erros',
                dados: resultado
            });
        }
    } catch (e) {
        console.error('[Integração] Erro na importação:', e.message);
        return res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao executar importação',
            erro: e.message
        });
    }
}

/**
 * GET /api/integracao/rio/status
 * Retorna status da integração com a API do Rio
 */
async function statusIntegracaoRio(req, res) {
    try {
        const status = await apiRioService.obterStatusApi();
        
        return res.json({
            sucesso: true,
            dados: status
        });
    } catch (e) {
        return res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao obter status',
            erro: e.message
        });
    }
}

/**
 * GET /api/integracao/rio/preview
 * Faz preview dos dados da API sem importar
 */
async function previewDadosRio(req, res) {
    try {
        const dados = await apiRioService.fetchApiRio();
        
        // Resumir dados para preview
        const preview = dados.map(estacao => ({
            nome: estacao.noEstacao,
            status: estacao.statusEstacao,
            tipo: estacao.tipoEstacao,
            classificacao: estacao.classificacaoEstacao,
            latitude: estacao.nuLatitude,
            longitude: estacao.nuLongitude,
            parametros: estacao.medicoes ? estacao.medicoes.map(m => ({
                sigla: m.sigla,
                nome: m.parametro,
                quantidade_dados: m.dados ? m.dados.length : 0
            })) : []
        }));
        
        return res.json({
            sucesso: true,
            dados: {
                total_estacoes: preview.length,
                estacoes: preview,
                api_url: apiRioService.API_URL
            }
        });
    } catch (e) {
        return res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao obter preview',
            erro: e.message
        });
    }
}

module.exports = {
    importarDadosRio,
    statusIntegracaoRio,
    previewDadosRio
};
