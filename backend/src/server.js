const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const config = require('./config');
const { testConnection } = require('./database/connection');
const routes = require('./routes');

// Inicializar app
const app = express();

// ==========================================
// MIDDLEWARES GLOBAIS
// ==========================================

// Segurança - headers HTTP
app.use(helmet());

// CORS - permitir requisições do frontend
// Em desenvolvimento, aceita qualquer origem
app.use(cors({
  origin: true, // Aceita qualquer origem em desenvolvimento
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Parse JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
if (config.nodeEnv === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Rate Limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    sucesso: false,
    mensagem: 'Muitas requisições. Tente novamente em alguns minutos.'
  }
});
app.use('/api', limiter);

// ==========================================
// ROTAS
// ==========================================

// Rota raiz
app.get('/', (req, res) => {
  res.json({
    nome: 'API Sistema de Gestão de Qualidade do Ar',
    versao: '1.0.0',
    empresa: 'Acoem Brasil',
    documentacao: '/api/health',
    timestamp: new Date()
  });
});

// Rotas da API
app.use('/api', routes);

// ==========================================
// TRATAMENTO DE ERROS
// ==========================================

// Rota não encontrada
app.use((req, res) => {
  res.status(404).json({
    sucesso: false,
    mensagem: `Rota não encontrada: ${req.method} ${req.originalUrl}`
  });
});

// Erro global
app.use((err, req, res, next) => {
  console.error('Erro:', err);
  
  res.status(err.status || 500).json({
    sucesso: false,
    mensagem: config.nodeEnv === 'development' ? err.message : 'Erro interno no servidor',
    ...(config.nodeEnv === 'development' && { stack: err.stack })
  });
});

// ==========================================
// INICIALIZAÇÃO DO SERVIDOR
// ==========================================

const startServer = async () => {
  console.log('\n========================================');
  console.log('🌬️  Sistema de Gestão de Qualidade do Ar');
  console.log('    Acoem Brasil - API Backend');
  console.log('========================================\n');

  // Testar conexão com o banco
  console.log('📦 Testando conexão com o banco de dados...');
  const dbConnected = await testConnection();

  if (!dbConnected) {
    console.error('\n❌ Não foi possível conectar ao banco de dados.');
    console.log('\n📋 Para configurar o banco de dados:');
    console.log('   1. Certifique-se que o SQL Server está rodando');
    console.log('   2. Crie o banco de dados: CREATE DATABASE qualidade_ar');
    console.log('   3. Configure as credenciais no arquivo .env');
    console.log('   4. Execute: npm run db:sync');
    console.log('   5. Execute: npm run db:seed');
    console.log('\n⚠️  O servidor iniciará, mas funcionalidades do banco não estarão disponíveis.\n');
  }

  // Iniciar servidor HTTP
  app.listen(config.port, () => {
    console.log(`\n🚀 Servidor iniciado com sucesso!`);
    console.log(`   URL: http://localhost:${config.port}`);
    console.log(`   Ambiente: ${config.nodeEnv}`);
    console.log(`   Banco: ${dbConnected ? '✅ Conectado' : '❌ Desconectado'}`);
    console.log('\n📚 Endpoints principais:');
    console.log(`   GET  http://localhost:${config.port}/api/health`);
    console.log(`   POST http://localhost:${config.port}/api/auth/login`);
    console.log(`   GET  http://localhost:${config.port}/api/dashboard`);
    console.log(`   GET  http://localhost:${config.port}/api/estacoes`);
    console.log(`   GET  http://localhost:${config.port}/api/medicoes`);
    console.log(`   GET  http://localhost:${config.port}/api/alertas`);
    console.log(`   GET  http://localhost:${config.port}/api/iqar`);
    console.log(`   POST http://localhost:${config.port}/api/integracao/rio/importar`);
    console.log('\n========================================\n');

    // Inicializar jobs de importação automática
    if (dbConnected) {
      try {
        const importacaoScheduler = require('./jobs/importacaoScheduler');
        importacaoScheduler.inicializarJobs();
        console.log('📅 Jobs de importação automática inicializados');
      } catch (e) {
        console.error('⚠️  Erro ao inicializar jobs:', e.message);
      }
    }
  });
};

// Tratamento de erros não capturados
process.on('uncaughtException', (err) => {
  console.error('Erro não capturado:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Promise rejeitada não tratada:', reason);
});

// Iniciar
startServer();

module.exports = app;
