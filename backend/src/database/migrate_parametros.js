/**
 * Migração: Adicionar campos tipo e calcula_iqar na tabela parametros
 * 
 * Isso permite diferenciar parâmetros meteorológicos de poluentes
 * e controlar quais parâmetros entram no cálculo de IQAr
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
    log.title('MIGRAÇÃO: PARÂMETROS - TIPO E CALCULA_IQAR');
    
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
        
        // ========================
        // MIGRAÇÃO: Tabela parametros
        // ========================
        log.info('Atualizando tabela parametros...');
        
        // Adicionar coluna tipo
        if (!(await colunaExiste('parametros', 'tipo'))) {
            await sequelize.query(`ALTER TABLE parametros ADD tipo NVARCHAR(20) DEFAULT 'poluente'`);
            log.success('Coluna parametros.tipo adicionada');
        } else {
            log.warn('Coluna parametros.tipo já existe');
        }
        
        // Adicionar coluna calcula_iqar
        if (!(await colunaExiste('parametros', 'calcula_iqar'))) {
            await sequelize.query(`ALTER TABLE parametros ADD calcula_iqar BIT DEFAULT 1`);
            log.success('Coluna parametros.calcula_iqar adicionada');
        } else {
            log.warn('Coluna parametros.calcula_iqar já existe');
        }
        
        // Adicionar coluna tipo_media
        if (!(await colunaExiste('parametros', 'tipo_media'))) {
            await sequelize.query(`ALTER TABLE parametros ADD tipo_media NVARCHAR(20) DEFAULT 'horaria'`);
            log.success('Coluna parametros.tipo_media adicionada');
        } else {
            log.warn('Coluna parametros.tipo_media já existe');
        }
        
        // Adicionar coluna ordem_exibicao
        if (!(await colunaExiste('parametros', 'ordem_exibicao'))) {
            await sequelize.query(`ALTER TABLE parametros ADD ordem_exibicao INT DEFAULT 0`);
            log.success('Coluna parametros.ordem_exibicao adicionada');
        } else {
            log.warn('Coluna parametros.ordem_exibicao já existe');
        }
        
        // ========================
        // ATUALIZAR: Parâmetros existentes
        // ========================
        log.info('Atualizando parâmetros existentes...');
        
        // Poluentes - marcados como calcula_iqar = true
        const poluentes = ['PM25', 'PM2.5', 'PM10', 'O3', 'NO2', 'SO2', 'CO'];
        for (const codigo of poluentes) {
            try {
                await sequelize.query(`
                    UPDATE parametros 
                    SET tipo = 'poluente', calcula_iqar = 1 
                    WHERE codigo = '${codigo}'
                `);
            } catch (e) { /* ignore */ }
        }
        log.success('Poluentes atualizados');
        
        // Meteorológicos - marcados como calcula_iqar = false
        const meteorologicos = ['TEMP', 'UR', 'PRESS', 'VV', 'DV', 'CHUVA', 'RAD', 'CH'];
        for (const codigo of meteorologicos) {
            try {
                await sequelize.query(`
                    UPDATE parametros 
                    SET tipo = 'meteorologico', calcula_iqar = 0 
                    WHERE codigo = '${codigo}'
                `);
            } catch (e) { /* ignore */ }
        }
        log.success('Parâmetros meteorológicos atualizados');
        
        // Atualizar tipo_media dos parâmetros específicos
        await sequelize.query(`UPDATE parametros SET tipo_media = '24horas' WHERE codigo IN ('PM25', 'PM2.5', 'PM10', 'SO2')`);
        await sequelize.query(`UPDATE parametros SET tipo_media = '8horas' WHERE codigo IN ('O3', 'CO')`);
        await sequelize.query(`UPDATE parametros SET tipo_media = 'horaria' WHERE codigo = 'NO2'`);
        log.success('Tipo de média atualizado');
        
        // ========================
        // INSERIR: Parâmetros meteorológicos que podem estar faltando
        // ========================
        log.info('Verificando parâmetros meteorológicos...');
        
        const parametrosMeteo = [
            { codigo: 'TEMP', nome: 'Temperatura', nome_cientifico: 'Temperatura do Ar', unidade_medida: '°C', valor_minimo: -10, valor_maximo: 50, cor: '#FF9F43', ordem: 10 },
            { codigo: 'UR', nome: 'Umidade Relativa', nome_cientifico: 'Umidade Relativa do Ar', unidade_medida: '%', valor_minimo: 0, valor_maximo: 100, cor: '#54A0FF', ordem: 11 },
            { codigo: 'PRESS', nome: 'Pressão', nome_cientifico: 'Pressão Atmosférica', unidade_medida: 'hPa', valor_minimo: 900, valor_maximo: 1100, cor: '#5F27CD', ordem: 12 },
            { codigo: 'VV', nome: 'Velocidade Vento', nome_cientifico: 'Velocidade do Vento', unidade_medida: 'm/s', valor_minimo: 0, valor_maximo: 50, cor: '#00D2D3', ordem: 13 },
            { codigo: 'DV', nome: 'Direção Vento', nome_cientifico: 'Direção do Vento', unidade_medida: '°', valor_minimo: 0, valor_maximo: 360, cor: '#10AC84', ordem: 14 },
            { codigo: 'CHUVA', nome: 'Precipitação', nome_cientifico: 'Precipitação Acumulada', unidade_medida: 'mm', valor_minimo: 0, valor_maximo: 500, cor: '#2E86DE', ordem: 15 },
            { codigo: 'RAD', nome: 'Radiação Solar', nome_cientifico: 'Radiação Solar Global', unidade_medida: 'W/m²', valor_minimo: 0, valor_maximo: 1500, cor: '#F9CA24', ordem: 16 }
        ];
        
        for (const param of parametrosMeteo) {
            try {
                // Verificar se existe
                const [existe] = await sequelize.query(`SELECT COUNT(*) as count FROM parametros WHERE codigo = '${param.codigo}'`);
                
                if (existe[0].count === 0) {
                    await sequelize.query(`
                        INSERT INTO parametros (codigo, nome, nome_cientifico, unidade_medida, tipo, calcula_iqar, tipo_media, valor_minimo, valor_maximo, cor, ordem_exibicao, ativo, criado_em, atualizado_em)
                        VALUES ('${param.codigo}', '${param.nome}', '${param.nome_cientifico}', '${param.unidade_medida}', 'meteorologico', 0, 'horaria', ${param.valor_minimo}, ${param.valor_maximo}, '${param.cor}', ${param.ordem}, 1, GETDATE(), GETDATE())
                    `);
                    log.success(`Parâmetro ${param.codigo} inserido`);
                }
            } catch (e) {
                log.warn(`Erro ao processar ${param.codigo}: ${e.message}`);
            }
        }
        
        // ========================
        // CRIAR ÍNDICES
        // ========================
        log.info('Criando índices...');
        
        const indices = [
            { nome: 'IX_parametros_tipo', colunas: 'tipo' },
            { nome: 'IX_parametros_calcula_iqar', colunas: 'calcula_iqar' }
        ];
        
        for (const idx of indices) {
            try {
                const [result] = await sequelize.query(`
                    SELECT COUNT(*) as count 
                    FROM sys.indexes 
                    WHERE name = '${idx.nome}' AND object_id = OBJECT_ID('parametros')
                `);
                
                if (result[0].count === 0) {
                    await sequelize.query(`CREATE INDEX ${idx.nome} ON parametros(${idx.colunas})`);
                    log.success(`Índice ${idx.nome} criado`);
                }
            } catch (e) {
                log.warn(`Índice ${idx.nome} já existe ou não pôde ser criado`);
            }
        }
        
        // ========================
        // RESUMO
        // ========================
        log.title('MIGRAÇÃO CONCLUÍDA');
        
        // Listar parâmetros
        const [parametros] = await sequelize.query(`
            SELECT codigo, nome, tipo, calcula_iqar, tipo_media 
            FROM parametros 
            ORDER BY ordem_exibicao, codigo
        `);
        
        log.info('Parâmetros configurados:');
        console.log('');
        console.log('  POLUENTES (calculam IQAr):');
        parametros.filter(p => p.tipo === 'poluente').forEach(p => {
            console.log(`    - ${p.codigo}: ${p.nome} (média ${p.tipo_media})`);
        });
        console.log('');
        console.log('  METEOROLÓGICOS (não calculam IQAr):');
        parametros.filter(p => p.tipo === 'meteorologico').forEach(p => {
            console.log(`    - ${p.codigo}: ${p.nome}`);
        });
        console.log('');
        
    } catch (error) {
        log.error(`Erro na migração: ${error.message}`);
        console.error(error);
    } finally {
        await sequelize.close();
    }
}

executarMigracao();
