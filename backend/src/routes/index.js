const express = require('express');
const router = express.Router();

// Controllers
const authController = require('../controllers/authController');
const usuariosController = require('../controllers/usuariosController');
const estacoesController = require('../controllers/estacoesController');
const medicoesController = require('../controllers/medicoesController');
const alertasController = require('../controllers/alertasController');
const dashboardController = require('../controllers/dashboardController');

// Middlewares
const { autenticar, autorizar, autenticarOpcional } = require('../middlewares/auth');

// ========================================
// ROTAS PÚBLICAS (sem autenticação)
// ========================================

// Health check
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date(),
    api: 'Qualidade do Ar API v1.0'
  });
});

// ========================================
// ROTAS DE AUTENTICAÇÃO
// ========================================
router.post('/auth/login', authController.login);
router.post('/auth/refresh', authController.refresh);
router.post('/auth/logout', autenticar, authController.logout);
router.get('/auth/me', autenticar, authController.me);
router.put('/auth/alterar-senha', autenticar, authController.alterarSenha);

// ========================================
// ROTAS DE USUÁRIOS
// ========================================
router.get('/usuarios', autenticar, autorizar('admin', 'supervisor'), usuariosController.listar);
router.get('/usuarios/:id', autenticar, autorizar('admin', 'supervisor'), usuariosController.buscarPorId);
router.post('/usuarios', autenticar, autorizar('admin'), usuariosController.criar);
router.put('/usuarios/:id', autenticar, autorizar('admin'), usuariosController.atualizar);
router.delete('/usuarios/:id', autenticar, autorizar('admin'), usuariosController.desativar);
router.put('/usuarios/:id/reativar', autenticar, autorizar('admin'), usuariosController.reativar);

// ========================================
// ROTAS DE ESTAÇÕES
// ========================================
router.get('/estacoes', autenticar, estacoesController.listar);
router.get('/estacoes/mapa', autenticarOpcional, estacoesController.mapa); // Opcional para uso público
router.get('/estacoes/:id', autenticar, estacoesController.buscarPorId);
router.get('/estacoes/:id/status', autenticar, estacoesController.status);
router.post('/estacoes', autenticar, autorizar('admin', 'supervisor'), estacoesController.criar);
router.put('/estacoes/:id', autenticar, autorizar('admin', 'supervisor'), estacoesController.atualizar);
router.delete('/estacoes/:id', autenticar, autorizar('admin'), estacoesController.desativar);

// ========================================
// ROTAS DE MEDIÇÕES
// ========================================
router.get('/medicoes', autenticar, medicoesController.listar);
router.get('/medicoes/tempo-real', autenticar, medicoesController.tempoReal);
router.get('/medicoes/estatisticas', autenticar, medicoesController.estatisticas);
router.get('/medicoes/validacao', autenticar, medicoesController.listarParaValidacao);
router.get('/medicoes/estacao/:id', autenticar, medicoesController.porEstacao);
router.post('/medicoes', autenticar, autorizar('admin', 'supervisor', 'analista'), medicoesController.criar);
router.post('/medicoes/batch', autenticar, autorizar('admin', 'supervisor'), medicoesController.criarLote);
router.put('/medicoes/:id/validar', autenticar, autorizar('admin', 'supervisor', 'analista'), medicoesController.validar);
router.put('/medicoes/validar-lote', autenticar, autorizar('admin', 'supervisor', 'analista'), medicoesController.validarLote);

// ========================================
// ROTAS DE EXPORTAÇÃO/IMPORTAÇÃO
// ========================================
router.get('/exportar', autenticar, medicoesController.exportar);
router.post('/importar', autenticar, autorizar('admin', 'supervisor'), medicoesController.importar);

// ========================================
// ROTAS DE ALERTAS
// ========================================
router.get('/alertas', autenticar, alertasController.listar);
router.get('/alertas/ativos', autenticar, alertasController.ativos);
router.get('/alertas/:id', autenticar, alertasController.buscarPorId);
router.put('/alertas/:id/ler', autenticar, alertasController.marcarComoLido);
router.put('/alertas/:id/resolver', autenticar, autorizar('admin', 'supervisor'), alertasController.resolver);
router.put('/alertas/ler-todos', autenticar, alertasController.marcarTodosComoLidos);
router.post('/alertas', autenticar, autorizar('admin', 'supervisor'), alertasController.criar);

// ========================================
// ROTAS DO DASHBOARD E IQAR
// ========================================
router.get('/dashboard', autenticar, dashboardController.getDashboard);
router.get('/dashboard/resumo', autenticar, dashboardController.getResumo);
router.get('/iqar', autenticar, dashboardController.getIQAr);
router.get('/iqar/estacao/:id', autenticar, dashboardController.getIQArEstacao);

// ========================================
// ROTAS DE UNIDADES (bonus)
// ========================================
const { Unidade } = require('../models');

router.get('/unidades', autenticar, async (req, res) => {
  try {
    const unidades = await Unidade.findAll({
      where: { ativo: true },
      order: [['nome', 'ASC']]
    });
    res.json({ sucesso: true, dados: unidades });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: 'Erro ao listar unidades' });
  }
});

// ========================================
// ROTAS DE PARÂMETROS (CRUD completo)
// ========================================
const { Parametro } = require('../models');

// Listar todos
router.get('/parametros', autenticar, async (req, res) => {
  try {
    const parametros = await Parametro.findAll({
      where: { ativo: true },
      order: [['ordem_exibicao', 'ASC'], ['codigo', 'ASC']]
    });
    res.json({ sucesso: true, dados: parametros });
  } catch (error) {
    console.error('Erro ao listar parâmetros:', error);
    res.status(500).json({ sucesso: false, mensagem: 'Erro ao listar parâmetros' });
  }
});

// Obter um parâmetro
router.get('/parametros/:id', autenticar, async (req, res) => {
  try {
    const parametro = await Parametro.findByPk(req.params.id);
    if (!parametro) {
      return res.status(404).json({ sucesso: false, mensagem: 'Parâmetro não encontrado' });
    }
    res.json({ sucesso: true, dados: parametro });
  } catch (error) {
    console.error('Erro ao obter parâmetro:', error);
    res.status(500).json({ sucesso: false, mensagem: 'Erro ao obter parâmetro' });
  }
});

// Criar novo parâmetro
router.post('/parametros', autenticar, autorizar('admin', 'supervisor'), async (req, res) => {
  try {
    const { codigo, nome, nome_cientifico, unidade_medida, tipo, tipo_media, calcula_iqar,
            limite_bom, limite_moderado, limite_ruim, limite_muito_ruim, limite_pessimo,
            valor_minimo, valor_maximo, descricao, cor, ordem_exibicao } = req.body;
    
    // Verificar se código já existe
    const existente = await Parametro.findOne({ where: { codigo } });
    if (existente) {
      return res.status(400).json({ sucesso: false, mensagem: 'Código de parâmetro já existe' });
    }
    
    const parametro = await Parametro.create({
      codigo, nome, nome_cientifico, unidade_medida, tipo: tipo || 'poluente',
      tipo_media: tipo_media || 'horaria', calcula_iqar: calcula_iqar !== false,
      limite_bom, limite_moderado, limite_ruim, limite_muito_ruim, limite_pessimo,
      valor_minimo: valor_minimo || 0, valor_maximo: valor_maximo || 9999,
      descricao, cor: cor || '#00A19A', ordem_exibicao: ordem_exibicao || 0, ativo: true
    });
    
    res.status(201).json({ sucesso: true, mensagem: 'Parâmetro criado com sucesso', dados: parametro });
  } catch (error) {
    console.error('Erro ao criar parâmetro:', error);
    res.status(500).json({ sucesso: false, mensagem: 'Erro ao criar parâmetro: ' + error.message });
  }
});

// Atualizar parâmetro
router.put('/parametros/:id', autenticar, autorizar('admin', 'supervisor'), async (req, res) => {
  try {
    const parametro = await Parametro.findByPk(req.params.id);
    if (!parametro) {
      return res.status(404).json({ sucesso: false, mensagem: 'Parâmetro não encontrado' });
    }
    
    const { codigo, nome, nome_cientifico, unidade_medida, tipo, tipo_media, calcula_iqar,
            limite_bom, limite_moderado, limite_ruim, limite_muito_ruim, limite_pessimo,
            valor_minimo, valor_maximo, descricao, cor, ordem_exibicao } = req.body;
    
    // Verificar se código já existe (outro parâmetro)
    if (codigo && codigo !== parametro.codigo) {
      const existente = await Parametro.findOne({ where: { codigo } });
      if (existente) {
        return res.status(400).json({ sucesso: false, mensagem: 'Código de parâmetro já existe' });
      }
    }
    
    await parametro.update({
      codigo: codigo || parametro.codigo,
      nome: nome || parametro.nome,
      nome_cientifico: nome_cientifico !== undefined ? nome_cientifico : parametro.nome_cientifico,
      unidade_medida: unidade_medida || parametro.unidade_medida,
      tipo: tipo || parametro.tipo,
      tipo_media: tipo_media || parametro.tipo_media,
      calcula_iqar: calcula_iqar !== undefined ? calcula_iqar : parametro.calcula_iqar,
      limite_bom: limite_bom !== undefined ? limite_bom : parametro.limite_bom,
      limite_moderado: limite_moderado !== undefined ? limite_moderado : parametro.limite_moderado,
      limite_ruim: limite_ruim !== undefined ? limite_ruim : parametro.limite_ruim,
      limite_muito_ruim: limite_muito_ruim !== undefined ? limite_muito_ruim : parametro.limite_muito_ruim,
      limite_pessimo: limite_pessimo !== undefined ? limite_pessimo : parametro.limite_pessimo,
      valor_minimo: valor_minimo !== undefined ? valor_minimo : parametro.valor_minimo,
      valor_maximo: valor_maximo !== undefined ? valor_maximo : parametro.valor_maximo,
      descricao: descricao !== undefined ? descricao : parametro.descricao,
      cor: cor || parametro.cor,
      ordem_exibicao: ordem_exibicao !== undefined ? ordem_exibicao : parametro.ordem_exibicao
    });
    
    res.json({ sucesso: true, mensagem: 'Parâmetro atualizado com sucesso', dados: parametro });
  } catch (error) {
    console.error('Erro ao atualizar parâmetro:', error);
    res.status(500).json({ sucesso: false, mensagem: 'Erro ao atualizar parâmetro: ' + error.message });
  }
});

// Excluir parâmetro (soft delete)
router.delete('/parametros/:id', autenticar, autorizar('admin'), async (req, res) => {
  try {
    const parametro = await Parametro.findByPk(req.params.id);
    if (!parametro) {
      return res.status(404).json({ sucesso: false, mensagem: 'Parâmetro não encontrado' });
    }
    
    // Soft delete - apenas marca como inativo
    await parametro.update({ ativo: false });
    
    res.json({ sucesso: true, mensagem: 'Parâmetro excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir parâmetro:', error);
    res.status(500).json({ sucesso: false, mensagem: 'Erro ao excluir parâmetro' });
  }
});

// ========================================
// ROTAS DE INTEGRAÇÃO COM APIs EXTERNAS
// ========================================
const integracaoController = require('../controllers/integracaoController');

// API do Rio de Janeiro (SMAC)
router.get('/integracao/rio/status', autenticar, integracaoController.statusIntegracaoRio);
router.get('/integracao/rio/preview', autenticar, integracaoController.previewDadosRio);
router.post('/integracao/rio/importar', autenticar, autorizar('admin', 'supervisor'), integracaoController.importarDadosRio);

module.exports = router;
