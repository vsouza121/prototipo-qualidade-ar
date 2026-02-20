/**
 * Script de Sincronização do Banco de Dados
 * 
 * Este script sincroniza os modelos Sequelize com o banco de dados SQL Server
 * Cria tabelas, índices e relacionamentos automaticamente
 * 
 * USO:
 *   node src/database/sync.js           # Apenas cria tabelas que não existem
 *   node src/database/sync.js --force   # APAGA e recria todas as tabelas (CUIDADO!)
 *   node src/database/sync.js --alter   # Altera tabelas existentes (adiciona colunas)
 *   node src/database/sync.js --seed    # Insere dados iniciais
 */

require('dotenv').config();

const sequelize = require('./connection');
const { testConnection } = require('./connection');
const models = require('../models');

// Cores para console
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

const log = {
    info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
    success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
    warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
    error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
    title: (msg) => console.log(`\n${colors.cyan}═══ ${msg} ═══${colors.reset}\n`)
};

async function sincronizarBancoDados() {
    const args = process.argv.slice(2);
    const forceMode = args.includes('--force');
    const alterMode = args.includes('--alter');
    const seedMode = args.includes('--seed');
    
    log.title('SINCRONIZAÇÃO DO BANCO DE DADOS');
    
    if (forceMode) {
        log.warn('MODO FORCE ATIVADO - Todas as tabelas serão recriadas!');
        log.warn('Todos os dados serão PERDIDOS!');
        console.log('');
    } else if (alterMode) {
        log.info('Modo ALTER ativado - Tabelas existentes serão modificadas');
    } else {
        log.info('Modo padrão - Apenas tabelas que não existem serão criadas');
    }
    
    try {
        // 1. Testar conexão
        log.info('Testando conexão com o banco de dados...');
        const conectado = await testConnection();
        
        if (!conectado) {
            log.error('Não foi possível conectar ao banco de dados.');
            log.error('Verifique as configurações no arquivo .env');
            console.log('\n📋 Verifique se:');
            console.log('   1. O SQL Server está rodando');
            console.log('   2. As credenciais no arquivo .env estão corretas');
            console.log('   3. O banco de dados "qualidade_ar" existe');
            console.log('\n💡 Para criar o banco, execute no SQL Server:');
            console.log('   CREATE DATABASE qualidade_ar;');
            process.exit(1);
        }
        log.success('Conexão estabelecida com sucesso!');
        
        // 2. Listar modelos
        log.info('Modelos carregados:');
        const nomesModelos = Object.keys(models);
        nomesModelos.forEach(nome => {
            console.log(`   - ${nome}`);
        });
        
        // 3. Sincronizar
        log.info('Iniciando sincronização...');
        
        const options = {};
        if (forceMode) {
            options.force = true;
        } else if (alterMode) {
            options.alter = true;
        }
        
        await sequelize.sync(options);
        
        log.success('Sincronização concluída com sucesso!');
        
        // 4. Listar tabelas criadas
        log.info('Verificando tabelas no banco de dados...');
        const [results] = await sequelize.query(`
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_TYPE = 'BASE TABLE' 
            ORDER BY TABLE_NAME
        `);
        
        log.success(`${results.length} tabelas encontradas:`);
        results.forEach(row => {
            console.log(`   - ${row.TABLE_NAME}`);
        });
        
        // 5. Inserir dados iniciais se necessário
        if (forceMode || seedMode) {
            await inserirDadosIniciais();
        }
        
        log.title('SINCRONIZAÇÃO FINALIZADA');
        
    } catch (error) {
        log.error(`Erro durante a sincronização: ${error.message}`);
        console.error(error);
        process.exit(1);
    } finally {
        await sequelize.close();
    }
}

async function inserirDadosIniciais() {
    log.info('Inserindo dados iniciais...');
    
    const { Parametro, Usuario, Configuracao } = models;
    
    try {
        // Parâmetros de poluentes (CONAMA 491/2018)
        const parametrosPoluentes = [
            { codigo: 'PM25', nome: 'PM2.5', nome_cientifico: 'Material Particulado Fino', unidade_medida: 'µg/m³', tipo: 'poluente', limite_bom: 25, limite_moderado: 50, limite_ruim: 75, limite_muito_ruim: 125, limite_pessimo: 250, cor: '#FF6B6B', ordem_exibicao: 1 },
            { codigo: 'PM10', nome: 'PM10', nome_cientifico: 'Material Particulado Inalável', unidade_medida: 'µg/m³', tipo: 'poluente', limite_bom: 50, limite_moderado: 100, limite_ruim: 150, limite_muito_ruim: 250, limite_pessimo: 420, cor: '#FFA94D', ordem_exibicao: 2 },
            { codigo: 'O3', nome: 'O₃', nome_cientifico: 'Ozônio', unidade_medida: 'µg/m³', tipo: 'poluente', limite_bom: 100, limite_moderado: 130, limite_ruim: 160, limite_muito_ruim: 200, limite_pessimo: 400, cor: '#74C0FC', ordem_exibicao: 3 },
            { codigo: 'NO2', nome: 'NO₂', nome_cientifico: 'Dióxido de Nitrogênio', unidade_medida: 'µg/m³', tipo: 'poluente', limite_bom: 200, limite_moderado: 240, limite_ruim: 320, limite_muito_ruim: 1130, limite_pessimo: 2260, cor: '#A9E34B', ordem_exibicao: 4 },
            { codigo: 'SO2', nome: 'SO₂', nome_cientifico: 'Dióxido de Enxofre', unidade_medida: 'µg/m³', tipo: 'poluente', limite_bom: 20, limite_moderado: 40, limite_ruim: 365, limite_muito_ruim: 800, limite_pessimo: 1600, cor: '#DA77F2', ordem_exibicao: 5 },
            { codigo: 'CO', nome: 'CO', nome_cientifico: 'Monóxido de Carbono', unidade_medida: 'ppm', tipo: 'poluente', limite_bom: 9, limite_moderado: 11, limite_ruim: 13, limite_muito_ruim: 15, limite_pessimo: 50, cor: '#69DB7C', ordem_exibicao: 6 }
        ];
        
        // Parâmetros meteorológicos
        const parametrosMeteo = [
            { codigo: 'TEMP', nome: 'Temperatura', nome_cientifico: 'Temperatura do Ar', unidade_medida: '°C', tipo: 'meteorologico', valor_minimo: -10, valor_maximo: 50, cor: '#FF9F43', ordem_exibicao: 10 },
            { codigo: 'UR', nome: 'Umidade Relativa', nome_cientifico: 'Umidade Relativa do Ar', unidade_medida: '%', tipo: 'meteorologico', valor_minimo: 0, valor_maximo: 100, cor: '#54A0FF', ordem_exibicao: 11 },
            { codigo: 'PRESS', nome: 'Pressão', nome_cientifico: 'Pressão Atmosférica', unidade_medida: 'hPa', tipo: 'meteorologico', valor_minimo: 900, valor_maximo: 1100, cor: '#5F27CD', ordem_exibicao: 12 },
            { codigo: 'VV', nome: 'Velocidade Vento', nome_cientifico: 'Velocidade do Vento', unidade_medida: 'm/s', tipo: 'meteorologico', valor_minimo: 0, valor_maximo: 50, cor: '#00D2D3', ordem_exibicao: 13 },
            { codigo: 'DV', nome: 'Direção Vento', nome_cientifico: 'Direção do Vento', unidade_medida: '°', tipo: 'meteorologico', valor_minimo: 0, valor_maximo: 360, cor: '#10AC84', ordem_exibicao: 14 },
            { codigo: 'CHUVA', nome: 'Precipitação', nome_cientifico: 'Precipitação Acumulada', unidade_medida: 'mm', tipo: 'meteorologico', valor_minimo: 0, valor_maximo: 500, cor: '#2E86DE', ordem_exibicao: 15 },
            { codigo: 'RAD', nome: 'Radiação Solar', nome_cientifico: 'Radiação Solar Global', unidade_medida: 'W/m²', tipo: 'meteorologico', valor_minimo: 0, valor_maximo: 1500, cor: '#F9CA24', ordem_exibicao: 16 }
        ];
        
        for (const param of [...parametrosPoluentes, ...parametrosMeteo]) {
            await Parametro.findOrCreate({
                where: { codigo: param.codigo },
                defaults: param
            });
        }
        log.success('Parâmetros inseridos');
        
        // Usuário admin padrão
        const bcrypt = require('bcrypt');
        const senhaHash = await bcrypt.hash('admin123', 10);
        
        await Usuario.findOrCreate({
            where: { email: 'admin@acoem.com.br' },
            defaults: {
                nome: 'Administrador',
                email: 'admin@acoem.com.br',
                senha: senhaHash,
                role: 'admin',
                ativo: true
            }
        });
        log.success('Usuário admin criado (admin@acoem.com.br / admin123)');
        
        // Configurações do sistema
        if (Configuracao) {
            const configs = [
                { chave: 'intervalo_importacao_api', valor: '60', tipo: 'number', descricao: 'Intervalo em minutos para importação automática de APIs' },
                { chave: 'api_rio_ativa', valor: 'true', tipo: 'boolean', descricao: 'API do Rio de Janeiro ativa' },
                { chave: 'validacao_automatica', valor: 'true', tipo: 'boolean', descricao: 'Validação automática de dados' },
                { chave: 'limite_variacao_percentual', valor: '50', tipo: 'number', descricao: 'Limite percentual de variação para pré-invalidação' }
            ];
            
            for (const cfg of configs) {
                await Configuracao.findOrCreate({
                    where: { chave: cfg.chave },
                    defaults: cfg
                });
            }
            log.success('Configurações do sistema inseridas');
        }
        
    } catch (error) {
        log.warn(`Erro ao inserir dados iniciais: ${error.message}`);
    }
}

// Executar
sincronizarBancoDados();
