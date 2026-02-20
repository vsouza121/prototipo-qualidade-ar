/**
 * Script de Migração do Banco de Dados
 * Adiciona novas colunas às tabelas existentes e cria tabelas novas
 */

require('dotenv').config();

const sequelize = require('./connection');
const { testConnection } = require('./connection');

const log = {
    info: (msg) => console.log(`\x1b[34mℹ\x1b[0m ${msg}`),
    success: (msg) => console.log(`\x1b[32m✓\x1b[0m ${msg}`),
    warn: (msg) => console.log(`\x1b[33m⚠\x1b[0m ${msg}`),
    error: (msg) => console.log(`\x1b[31m✗\x1b[0m ${msg}`),
    title: (msg) => console.log(`\n\x1b[36m═══ ${msg} ═══\x1b[0m\n`)
};

async function executarMigracao() {
    log.title('MIGRAÇÃO DO BANCO DE DADOS');
    
    try {
        log.info('Testando conexão...');
        const conectado = await testConnection();
        if (!conectado) {
            log.error('Não foi possível conectar ao banco de dados');
            process.exit(1);
        }
        
        // Função helper para verificar se coluna existe
        async function colunaExiste(tabela, coluna) {
            const [result] = await sequelize.query(`
                SELECT COUNT(*) as count 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME = '${tabela}' AND COLUMN_NAME = '${coluna}'
            `);
            return result[0].count > 0;
        }
        
        // Função helper para verificar se tabela existe
        async function tabelaExiste(tabela) {
            const [result] = await sequelize.query(`
                SELECT COUNT(*) as count 
                FROM INFORMATION_SCHEMA.TABLES 
                WHERE TABLE_NAME = '${tabela}'
            `);
            return result[0].count > 0;
        }
        
        // ========================
        // MIGRAÇÃO: Tabela estacoes
        // ========================
        log.info('Atualizando tabela estacoes...');
        
        const colunasEstacoes = [
            { nome: 'endereco', tipo: 'NVARCHAR(255) NULL' },
            { nome: 'bairro', tipo: 'NVARCHAR(100) NULL' },
            { nome: 'codigo_externo', tipo: 'NVARCHAR(100) NULL' },
            { nome: 'fonte_dados', tipo: "NVARCHAR(50) DEFAULT 'manual'" },
            { nome: 'tipo_estacao', tipo: 'NVARCHAR(50) NULL' },
            { nome: 'classificacao', tipo: 'NVARCHAR(50) NULL' }
        ];
        
        for (const col of colunasEstacoes) {
            if (!(await colunaExiste('estacoes', col.nome))) {
                await sequelize.query(`ALTER TABLE estacoes ADD ${col.nome} ${col.tipo}`);
                log.success(`Coluna estacoes.${col.nome} adicionada`);
            }
        }
        
        // Atualizar coluna status para incluir 'calibracao'
        try {
            await sequelize.query(`
                IF EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'estacoes_status_check')
                    ALTER TABLE estacoes DROP CONSTRAINT estacoes_status_check
            `);
        } catch (e) { /* ignore */ }
        
        // ========================
        // MIGRAÇÃO: Tabela medicoes
        // ========================
        log.info('Atualizando tabela medicoes...');
        
        const colunasMedicoes = [
            { nome: 'fonte_dados', tipo: "NVARCHAR(50) DEFAULT 'manual'" },
            { nome: 'importacao_id', tipo: 'INT NULL' }
        ];
        
        for (const col of colunasMedicoes) {
            if (!(await colunaExiste('medicoes', col.nome))) {
                await sequelize.query(`ALTER TABLE medicoes ADD ${col.nome} ${col.tipo}`);
                log.success(`Coluna medicoes.${col.nome} adicionada`);
            }
        }
        
        // ========================
        // CRIAR: Tabela importacoes_log
        // ========================
        if (!(await tabelaExiste('importacoes_log'))) {
            log.info('Criando tabela importacoes_log...');
            await sequelize.query(`
                CREATE TABLE importacoes_log (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    fonte NVARCHAR(50) NOT NULL,
                    tipo NVARCHAR(30) NOT NULL,
                    data_execucao DATETIME DEFAULT GETDATE(),
                    data_inicio_dados DATETIME NULL,
                    data_fim_dados DATETIME NULL,
                    total_registros INT DEFAULT 0,
                    registros_novos INT DEFAULT 0,
                    registros_atualizados INT DEFAULT 0,
                    registros_erro INT DEFAULT 0,
                    status NVARCHAR(20) DEFAULT 'executando',
                    mensagem NVARCHAR(MAX) NULL,
                    detalhes_erro NVARCHAR(MAX) NULL,
                    usuario_id INT NULL,
                    tempo_execucao_ms INT NULL,
                    criado_em DATETIME DEFAULT GETDATE()
                )
            `);
            log.success('Tabela importacoes_log criada');
        }
        
        // ========================
        // CRIAR: Tabela medicoes_horarias
        // ========================
        if (!(await tabelaExiste('medicoes_horarias'))) {
            log.info('Criando tabela medicoes_horarias...');
            await sequelize.query(`
                CREATE TABLE medicoes_horarias (
                    id BIGINT IDENTITY(1,1) PRIMARY KEY,
                    estacao_id INT NOT NULL,
                    parametro_id INT NOT NULL,
                    data_hora DATETIME NOT NULL,
                    valor_medio DECIMAL(12,4) NOT NULL,
                    valor_minimo DECIMAL(12,4) NULL,
                    valor_maximo DECIMAL(12,4) NULL,
                    desvio_padrao DECIMAL(12,4) NULL,
                    total_medicoes INT DEFAULT 0,
                    medicoes_validas INT DEFAULT 0,
                    iqar INT NULL,
                    classificacao_iqar NVARCHAR(20) NULL,
                    calculado_em DATETIME DEFAULT GETDATE(),
                    CONSTRAINT FK_medicoes_horarias_estacao FOREIGN KEY (estacao_id) REFERENCES estacoes(id),
                    CONSTRAINT FK_medicoes_horarias_parametro FOREIGN KEY (parametro_id) REFERENCES parametros(id),
                    CONSTRAINT UQ_medicoes_horarias UNIQUE (estacao_id, parametro_id, data_hora)
                )
            `);
            log.success('Tabela medicoes_horarias criada');
        }
        
        // ========================
        // CRIAR: Tabela medicoes_diarias
        // ========================
        if (!(await tabelaExiste('medicoes_diarias'))) {
            log.info('Criando tabela medicoes_diarias...');
            await sequelize.query(`
                CREATE TABLE medicoes_diarias (
                    id BIGINT IDENTITY(1,1) PRIMARY KEY,
                    estacao_id INT NOT NULL,
                    parametro_id INT NOT NULL,
                    data DATE NOT NULL,
                    valor_medio DECIMAL(12,4) NOT NULL,
                    valor_minimo DECIMAL(12,4) NULL,
                    valor_maximo DECIMAL(12,4) NULL,
                    desvio_padrao DECIMAL(12,4) NULL,
                    total_medicoes INT DEFAULT 0,
                    medicoes_validas INT DEFAULT 0,
                    percentil_50 DECIMAL(12,4) NULL,
                    percentil_90 DECIMAL(12,4) NULL,
                    percentil_95 DECIMAL(12,4) NULL,
                    iqar INT NULL,
                    classificacao_iqar NVARCHAR(20) NULL,
                    calculado_em DATETIME DEFAULT GETDATE(),
                    CONSTRAINT FK_medicoes_diarias_estacao FOREIGN KEY (estacao_id) REFERENCES estacoes(id),
                    CONSTRAINT FK_medicoes_diarias_parametro FOREIGN KEY (parametro_id) REFERENCES parametros(id),
                    CONSTRAINT UQ_medicoes_diarias UNIQUE (estacao_id, parametro_id, data)
                )
            `);
            log.success('Tabela medicoes_diarias criada');
        }
        
        // ========================
        // CRIAR: Tabela configuracoes
        // ========================
        if (!(await tabelaExiste('configuracoes'))) {
            log.info('Criando tabela configuracoes...');
            await sequelize.query(`
                CREATE TABLE configuracoes (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    chave NVARCHAR(50) NOT NULL UNIQUE,
                    valor NVARCHAR(MAX) NULL,
                    tipo NVARCHAR(20) DEFAULT 'string',
                    descricao NVARCHAR(255) NULL,
                    criado_em DATETIME DEFAULT GETDATE(),
                    atualizado_em DATETIME DEFAULT GETDATE()
                )
            `);
            log.success('Tabela configuracoes criada');
            
            // Inserir configurações padrão
            await sequelize.query(`
                INSERT INTO configuracoes (chave, valor, tipo, descricao) VALUES
                ('intervalo_importacao_api', '60', 'number', 'Intervalo em minutos para importação automática'),
                ('api_rio_ativa', 'true', 'boolean', 'API do Rio de Janeiro ativa'),
                ('validacao_automatica', 'true', 'boolean', 'Validação automática de dados')
            `);
            log.success('Configurações padrão inseridas');
        }
        
        // ========================
        // CRIAR ÍNDICES
        // ========================
        log.info('Criando índices...');
        
        const indices = [
            { tabela: 'estacoes', nome: 'IX_estacoes_codigo_externo', colunas: 'codigo_externo' },
            { tabela: 'estacoes', nome: 'IX_estacoes_fonte_dados', colunas: 'fonte_dados' },
            { tabela: 'medicoes', nome: 'IX_medicoes_importacao', colunas: 'importacao_id' },
            { tabela: 'medicoes', nome: 'IX_medicoes_fonte', colunas: 'fonte_dados' },
            { tabela: 'importacoes_log', nome: 'IX_importacoes_fonte', colunas: 'fonte, data_execucao' },
            { tabela: 'importacoes_log', nome: 'IX_importacoes_status', colunas: 'status' },
            { tabela: 'medicoes_horarias', nome: 'IX_medicoes_horarias_estacao', colunas: 'estacao_id, data_hora' },
            { tabela: 'medicoes_diarias', nome: 'IX_medicoes_diarias_estacao', colunas: 'estacao_id, data' }
        ];
        
        for (const idx of indices) {
            try {
                // Verificar se índice existe
                const [result] = await sequelize.query(`
                    SELECT COUNT(*) as count 
                    FROM sys.indexes 
                    WHERE name = '${idx.nome}' AND object_id = OBJECT_ID('${idx.tabela}')
                `);
                
                if (result[0].count === 0) {
                    await sequelize.query(`CREATE INDEX ${idx.nome} ON ${idx.tabela}(${idx.colunas})`);
                    log.success(`Índice ${idx.nome} criado`);
                }
            } catch (e) {
                log.warn(`Índice ${idx.nome} já existe ou não pôde ser criado: ${e.message}`);
            }
        }
        
        // ========================
        // ADICIONAR FK de importação em medicoes
        // ========================
        try {
            await sequelize.query(`
                IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_medicoes_importacao')
                BEGIN
                    ALTER TABLE medicoes 
                    ADD CONSTRAINT FK_medicoes_importacao 
                    FOREIGN KEY (importacao_id) REFERENCES importacoes_log(id)
                END
            `);
            log.success('FK medicoes -> importacoes_log criada');
        } catch (e) {
            log.warn('FK já existe ou não pôde ser criada');
        }
        
        log.title('MIGRAÇÃO CONCLUÍDA COM SUCESSO');
        
        // Listar tabelas
        const [tabelas] = await sequelize.query(`
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_TYPE = 'BASE TABLE' 
            ORDER BY TABLE_NAME
        `);
        
        log.info(`${tabelas.length} tabelas no banco de dados:`);
        tabelas.forEach(t => console.log(`   - ${t.TABLE_NAME}`));
        
    } catch (error) {
        log.error(`Erro na migração: ${error.message}`);
        console.error(error);
    } finally {
        await sequelize.close();
    }
}

executarMigracao();
