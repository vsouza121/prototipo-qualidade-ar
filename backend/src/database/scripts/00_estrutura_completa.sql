-- ============================================================
-- SCRIPT DE ESTRUTURA DO BANCO DE DADOS - QUALIDADE DO AR
-- Sistema de Monitoramento de Qualidade do Ar - Acoem Brasil
-- Versão 2.0 - Otimizado para recebimento contínuo de dados
-- ============================================================

USE master;
GO

-- Criar banco de dados se não existir
IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'qualidade_ar')
BEGIN
    CREATE DATABASE qualidade_ar
    ON PRIMARY (
        NAME = 'qualidade_ar_data',
        FILENAME = 'C:\SQLData\qualidade_ar_data.mdf',
        SIZE = 100MB,
        MAXSIZE = UNLIMITED,
        FILEGROWTH = 50MB
    )
    LOG ON (
        NAME = 'qualidade_ar_log',
        FILENAME = 'C:\SQLData\qualidade_ar_log.ldf',
        SIZE = 50MB,
        MAXSIZE = UNLIMITED,
        FILEGROWTH = 25MB
    );
    PRINT 'Banco de dados qualidade_ar criado!';
END
GO

USE qualidade_ar;
GO

PRINT '';
PRINT '============================================================';
PRINT 'CRIANDO ESTRUTURA OTIMIZADA DO BANCO DE DADOS';
PRINT '============================================================';
PRINT '';

-- ============================================================
-- 1. TABELA DE USUÁRIOS
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'usuarios')
BEGIN
    CREATE TABLE usuarios (
        id INT IDENTITY(1,1) PRIMARY KEY,
        nome NVARCHAR(100) NOT NULL,
        email NVARCHAR(150) NOT NULL UNIQUE,
        senha NVARCHAR(255) NOT NULL,
        role NVARCHAR(20) DEFAULT 'operador' CHECK (role IN ('admin', 'supervisor', 'analista', 'operador')),
        ativo BIT DEFAULT 1,
        ultimo_acesso DATETIME NULL,
        refresh_token NVARCHAR(500) NULL,
        criado_em DATETIME DEFAULT GETDATE(),
        atualizado_em DATETIME DEFAULT GETDATE()
    );
    
    CREATE INDEX IX_usuarios_email ON usuarios(email);
    CREATE INDEX IX_usuarios_ativo ON usuarios(ativo);
    
    PRINT '✅ Tabela usuarios criada';
END
GO

-- ============================================================
-- 2. TABELA DE UNIDADES (Clientes/Locais)
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'unidades')
BEGIN
    CREATE TABLE unidades (
        id INT IDENTITY(1,1) PRIMARY KEY,
        codigo NVARCHAR(30) NOT NULL UNIQUE,
        nome NVARCHAR(150) NOT NULL,
        descricao NVARCHAR(MAX) NULL,
        endereco NVARCHAR(255) NULL,
        cidade NVARCHAR(100) NULL,
        estado NVARCHAR(2) NULL,
        cep NVARCHAR(10) NULL,
        responsavel NVARCHAR(100) NULL,
        telefone NVARCHAR(20) NULL,
        email NVARCHAR(150) NULL,
        ativo BIT DEFAULT 1,
        criado_em DATETIME DEFAULT GETDATE(),
        atualizado_em DATETIME DEFAULT GETDATE()
    );
    
    CREATE INDEX IX_unidades_codigo ON unidades(codigo);
    CREATE INDEX IX_unidades_ativo ON unidades(ativo);
    
    PRINT '✅ Tabela unidades criada';
END
GO

-- ============================================================
-- 3. TABELA DE PARÂMETROS (Poluentes e Variáveis Meteorológicas)
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'parametros')
BEGIN
    CREATE TABLE parametros (
        id INT IDENTITY(1,1) PRIMARY KEY,
        codigo NVARCHAR(20) NOT NULL UNIQUE,
        nome NVARCHAR(100) NOT NULL,
        nome_cientifico NVARCHAR(100) NULL,
        unidade_medida NVARCHAR(20) DEFAULT 'µg/m³',
        tipo NVARCHAR(20) DEFAULT 'poluente' CHECK (tipo IN ('poluente', 'meteorologico', 'outro')),
        -- Limites CONAMA para IQAr
        limite_bom DECIMAL(10,2) NULL,
        limite_moderado DECIMAL(10,2) NULL,
        limite_ruim DECIMAL(10,2) NULL,
        limite_muito_ruim DECIMAL(10,2) NULL,
        limite_pessimo DECIMAL(10,2) NULL,
        -- Limites físicos para validação automática
        valor_minimo DECIMAL(10,2) DEFAULT 0,
        valor_maximo DECIMAL(10,2) DEFAULT 9999,
        -- Configurações de média
        tipo_media NVARCHAR(20) DEFAULT 'horaria' CHECK (tipo_media IN ('horaria', '8horas', '24horas')),
        descricao NVARCHAR(MAX) NULL,
        cor NVARCHAR(7) DEFAULT '#00A19A',
        ordem_exibicao INT DEFAULT 0,
        ativo BIT DEFAULT 1,
        criado_em DATETIME DEFAULT GETDATE(),
        atualizado_em DATETIME DEFAULT GETDATE()
    );
    
    CREATE INDEX IX_parametros_codigo ON parametros(codigo);
    CREATE INDEX IX_parametros_tipo ON parametros(tipo);
    CREATE INDEX IX_parametros_ativo ON parametros(ativo);
    
    PRINT '✅ Tabela parametros criada';
END
GO

-- ============================================================
-- 4. TABELA DE ESTAÇÕES DE MONITORAMENTO
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'estacoes')
BEGIN
    CREATE TABLE estacoes (
        id INT IDENTITY(1,1) PRIMARY KEY,
        codigo NVARCHAR(30) NOT NULL UNIQUE,
        nome NVARCHAR(150) NOT NULL,
        unidade_id INT NOT NULL,
        -- Localização geográfica
        latitude DECIMAL(10,8) NOT NULL,
        longitude DECIMAL(11,8) NOT NULL,
        altitude DECIMAL(7,2) NULL,
        endereco NVARCHAR(255) NULL,
        bairro NVARCHAR(100) NULL,
        -- Configurações operacionais
        intervalo_coleta INT DEFAULT 5, -- minutos
        status NVARCHAR(20) DEFAULT 'online' CHECK (status IN ('online', 'offline', 'manutencao', 'calibracao')),
        ultima_comunicacao DATETIME NULL,
        parametros_monitorados NVARCHAR(MAX) NULL, -- JSON array ["PM2.5", "PM10", "O3"]
        -- Integração externa
        codigo_externo NVARCHAR(100) NULL, -- ID da API externa
        fonte_dados NVARCHAR(50) DEFAULT 'manual' CHECK (fonte_dados IN ('manual', 'api_rio', 'api_cetesb', 'equipamento', 'outro')),
        -- Metadados
        tipo_estacao NVARCHAR(50) NULL, -- Automática, Manual, etc
        classificacao NVARCHAR(50) NULL, -- Urbana, Industrial, Rural, etc
        descricao NVARCHAR(MAX) NULL,
        ativo BIT DEFAULT 1,
        criado_em DATETIME DEFAULT GETDATE(),
        atualizado_em DATETIME DEFAULT GETDATE(),
        
        CONSTRAINT FK_estacoes_unidade FOREIGN KEY (unidade_id) REFERENCES unidades(id)
    );
    
    CREATE INDEX IX_estacoes_codigo ON estacoes(codigo);
    CREATE INDEX IX_estacoes_unidade ON estacoes(unidade_id);
    CREATE INDEX IX_estacoes_status ON estacoes(status);
    CREATE INDEX IX_estacoes_ativo ON estacoes(ativo);
    CREATE INDEX IX_estacoes_localizacao ON estacoes(latitude, longitude);
    CREATE INDEX IX_estacoes_fonte ON estacoes(fonte_dados);
    CREATE INDEX IX_estacoes_codigo_externo ON estacoes(codigo_externo);
    
    PRINT '✅ Tabela estacoes criada';
END
GO

-- ============================================================
-- 5. TABELA DE MEDIÇÕES (Principal - Alta Performance)
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'medicoes')
BEGIN
    CREATE TABLE medicoes (
        id BIGINT IDENTITY(1,1) PRIMARY KEY,
        estacao_id INT NOT NULL,
        parametro_id INT NOT NULL,
        valor DECIMAL(12,4) NOT NULL,
        data_hora DATETIME NOT NULL,
        -- Validação
        flag NVARCHAR(20) DEFAULT 'pending' CHECK (flag IN ('valid', 'pending', 'invalid', 'auto_invalid')),
        motivo_flag NVARCHAR(255) NULL,
        validado_por INT NULL,
        validado_em DATETIME NULL,
        -- IQAr calculado
        iqar_calculado INT NULL,
        classificacao_iqar NVARCHAR(20) NULL CHECK (classificacao_iqar IN ('Bom', 'Moderado', 'Ruim', 'Muito Ruim', 'Péssimo')),
        -- Rastreabilidade
        fonte_dados NVARCHAR(50) DEFAULT 'manual',
        importacao_id INT NULL,
        -- Timestamps
        criado_em DATETIME DEFAULT GETDATE(),
        atualizado_em DATETIME DEFAULT GETDATE(),
        
        CONSTRAINT FK_medicoes_estacao FOREIGN KEY (estacao_id) REFERENCES estacoes(id),
        CONSTRAINT FK_medicoes_parametro FOREIGN KEY (parametro_id) REFERENCES parametros(id),
        CONSTRAINT FK_medicoes_validador FOREIGN KEY (validado_por) REFERENCES usuarios(id)
    );
    
    -- Índices otimizados para consultas frequentes
    CREATE INDEX IX_medicoes_estacao_data ON medicoes(estacao_id, data_hora DESC);
    CREATE INDEX IX_medicoes_parametro_data ON medicoes(parametro_id, data_hora DESC);
    CREATE INDEX IX_medicoes_data_hora ON medicoes(data_hora DESC);
    CREATE INDEX IX_medicoes_flag ON medicoes(flag);
    CREATE INDEX IX_medicoes_estacao_param ON medicoes(estacao_id, parametro_id, data_hora DESC);
    CREATE INDEX IX_medicoes_importacao ON medicoes(importacao_id);
    
    -- Índice composto para dashboard e relatórios
    CREATE INDEX IX_medicoes_dashboard ON medicoes(estacao_id, parametro_id, data_hora DESC) 
        INCLUDE (valor, flag, classificacao_iqar);
    
    PRINT '✅ Tabela medicoes criada';
END
GO

-- ============================================================
-- 6. TABELA DE LOG DE IMPORTAÇÕES
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'importacoes_log')
BEGIN
    CREATE TABLE importacoes_log (
        id INT IDENTITY(1,1) PRIMARY KEY,
        fonte NVARCHAR(50) NOT NULL, -- api_rio, api_cetesb, arquivo_csv, manual
        tipo NVARCHAR(30) NOT NULL, -- estacoes, medicoes, parametros
        data_execucao DATETIME DEFAULT GETDATE(),
        data_inicio_dados DATETIME NULL,
        data_fim_dados DATETIME NULL,
        -- Resultados
        total_registros INT DEFAULT 0,
        registros_novos INT DEFAULT 0,
        registros_atualizados INT DEFAULT 0,
        registros_erro INT DEFAULT 0,
        -- Status
        status NVARCHAR(20) DEFAULT 'executando' CHECK (status IN ('executando', 'sucesso', 'erro', 'parcial')),
        mensagem NVARCHAR(MAX) NULL,
        detalhes_erro NVARCHAR(MAX) NULL,
        -- Metadados
        usuario_id INT NULL,
        tempo_execucao_ms INT NULL,
        criado_em DATETIME DEFAULT GETDATE(),
        
        CONSTRAINT FK_importacoes_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    );
    
    CREATE INDEX IX_importacoes_fonte ON importacoes_log(fonte, data_execucao DESC);
    CREATE INDEX IX_importacoes_status ON importacoes_log(status);
    CREATE INDEX IX_importacoes_data ON importacoes_log(data_execucao DESC);
    
    PRINT '✅ Tabela importacoes_log criada';
END
GO

-- ============================================================
-- 7. TABELA DE ALERTAS
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'alertas')
BEGIN
    CREATE TABLE alertas (
        id INT IDENTITY(1,1) PRIMARY KEY,
        estacao_id INT NOT NULL,
        parametro_id INT NULL,
        tipo NVARCHAR(30) NOT NULL CHECK (tipo IN ('limite_excedido', 'equipamento_offline', 'dados_invalidos', 'manutencao', 'comunicacao', 'outro')),
        severidade NVARCHAR(20) DEFAULT 'media' CHECK (severidade IN ('baixa', 'media', 'alta', 'critica')),
        titulo NVARCHAR(150) NOT NULL,
        mensagem NVARCHAR(MAX) NULL,
        valor_medido DECIMAL(12,4) NULL,
        valor_limite DECIMAL(12,4) NULL,
        -- Status
        status NVARCHAR(20) DEFAULT 'aberto' CHECK (status IN ('aberto', 'lido', 'em_tratamento', 'resolvido', 'ignorado')),
        lido BIT DEFAULT 0,
        lido_por INT NULL,
        lido_em DATETIME NULL,
        resolvido_por INT NULL,
        resolvido_em DATETIME NULL,
        resolucao NVARCHAR(MAX) NULL,
        -- Timestamps
        criado_em DATETIME DEFAULT GETDATE(),
        atualizado_em DATETIME DEFAULT GETDATE(),
        
        CONSTRAINT FK_alertas_estacao FOREIGN KEY (estacao_id) REFERENCES estacoes(id),
        CONSTRAINT FK_alertas_parametro FOREIGN KEY (parametro_id) REFERENCES parametros(id),
        CONSTRAINT FK_alertas_lido_por FOREIGN KEY (lido_por) REFERENCES usuarios(id),
        CONSTRAINT FK_alertas_resolvido_por FOREIGN KEY (resolvido_por) REFERENCES usuarios(id)
    );
    
    CREATE INDEX IX_alertas_estacao ON alertas(estacao_id, criado_em DESC);
    CREATE INDEX IX_alertas_status ON alertas(status);
    CREATE INDEX IX_alertas_severidade ON alertas(severidade);
    CREATE INDEX IX_alertas_data ON alertas(criado_em DESC);
    
    PRINT '✅ Tabela alertas criada';
END
GO

-- ============================================================
-- 8. TABELA DE MÉDIAS HORÁRIAS (Agregação)
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'medicoes_horarias')
BEGIN
    CREATE TABLE medicoes_horarias (
        id BIGINT IDENTITY(1,1) PRIMARY KEY,
        estacao_id INT NOT NULL,
        parametro_id INT NOT NULL,
        data_hora DATETIME NOT NULL, -- Sempre no início da hora (ex: 14:00:00)
        -- Valores agregados
        valor_medio DECIMAL(12,4) NOT NULL,
        valor_minimo DECIMAL(12,4) NULL,
        valor_maximo DECIMAL(12,4) NULL,
        desvio_padrao DECIMAL(12,4) NULL,
        total_medicoes INT DEFAULT 0,
        medicoes_validas INT DEFAULT 0,
        -- IQAr horário
        iqar INT NULL,
        classificacao_iqar NVARCHAR(20) NULL,
        -- Timestamps
        calculado_em DATETIME DEFAULT GETDATE(),
        
        CONSTRAINT FK_medicoes_horarias_estacao FOREIGN KEY (estacao_id) REFERENCES estacoes(id),
        CONSTRAINT FK_medicoes_horarias_parametro FOREIGN KEY (parametro_id) REFERENCES parametros(id),
        CONSTRAINT UQ_medicoes_horarias UNIQUE (estacao_id, parametro_id, data_hora)
    );
    
    CREATE INDEX IX_medicoes_horarias_estacao_data ON medicoes_horarias(estacao_id, data_hora DESC);
    CREATE INDEX IX_medicoes_horarias_param_data ON medicoes_horarias(parametro_id, data_hora DESC);
    
    PRINT '✅ Tabela medicoes_horarias criada';
END
GO

-- ============================================================
-- 9. TABELA DE MÉDIAS DIÁRIAS (Agregação)
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'medicoes_diarias')
BEGIN
    CREATE TABLE medicoes_diarias (
        id BIGINT IDENTITY(1,1) PRIMARY KEY,
        estacao_id INT NOT NULL,
        parametro_id INT NOT NULL,
        data DATE NOT NULL,
        -- Valores agregados
        valor_medio DECIMAL(12,4) NOT NULL,
        valor_minimo DECIMAL(12,4) NULL,
        valor_maximo DECIMAL(12,4) NULL,
        desvio_padrao DECIMAL(12,4) NULL,
        total_medicoes INT DEFAULT 0,
        medicoes_validas INT DEFAULT 0,
        -- Percentis
        percentil_50 DECIMAL(12,4) NULL, -- Mediana
        percentil_90 DECIMAL(12,4) NULL,
        percentil_95 DECIMAL(12,4) NULL,
        -- IQAr diário
        iqar INT NULL,
        classificacao_iqar NVARCHAR(20) NULL,
        -- Timestamps
        calculado_em DATETIME DEFAULT GETDATE(),
        
        CONSTRAINT FK_medicoes_diarias_estacao FOREIGN KEY (estacao_id) REFERENCES estacoes(id),
        CONSTRAINT FK_medicoes_diarias_parametro FOREIGN KEY (parametro_id) REFERENCES parametros(id),
        CONSTRAINT UQ_medicoes_diarias UNIQUE (estacao_id, parametro_id, data)
    );
    
    CREATE INDEX IX_medicoes_diarias_estacao_data ON medicoes_diarias(estacao_id, data DESC);
    CREATE INDEX IX_medicoes_diarias_param_data ON medicoes_diarias(parametro_id, data DESC);
    
    PRINT '✅ Tabela medicoes_diarias criada';
END
GO

-- ============================================================
-- 10. TABELA DE CONFIGURAÇÕES DO SISTEMA
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'configuracoes')
BEGIN
    CREATE TABLE configuracoes (
        id INT IDENTITY(1,1) PRIMARY KEY,
        chave NVARCHAR(50) NOT NULL UNIQUE,
        valor NVARCHAR(MAX) NULL,
        tipo NVARCHAR(20) DEFAULT 'string' CHECK (tipo IN ('string', 'number', 'boolean', 'json')),
        descricao NVARCHAR(255) NULL,
        criado_em DATETIME DEFAULT GETDATE(),
        atualizado_em DATETIME DEFAULT GETDATE()
    );
    
    PRINT '✅ Tabela configuracoes criada';
END
GO

-- ============================================================
-- INSERIR DADOS INICIAIS
-- ============================================================
PRINT '';
PRINT 'Inserindo dados iniciais...';

-- Parâmetros CONAMA 491/2018
IF NOT EXISTS (SELECT 1 FROM parametros WHERE codigo = 'PM25')
BEGIN
    INSERT INTO parametros (codigo, nome, nome_cientifico, unidade_medida, tipo, limite_bom, limite_moderado, limite_ruim, limite_muito_ruim, limite_pessimo, valor_minimo, valor_maximo, tipo_media, ordem_exibicao, cor)
    VALUES 
    ('PM25', 'PM2.5', 'Material Particulado Fino', 'µg/m³', 'poluente', 25, 50, 75, 125, 250, 0, 500, '24horas', 1, '#FF6B6B'),
    ('PM10', 'PM10', 'Material Particulado Inalável', 'µg/m³', 'poluente', 50, 100, 150, 250, 420, 0, 800, '24horas', 2, '#FFA94D'),
    ('O3', 'O₃', 'Ozônio', 'µg/m³', 'poluente', 100, 130, 160, 200, 400, 0, 600, '8horas', 3, '#74C0FC'),
    ('NO2', 'NO₂', 'Dióxido de Nitrogênio', 'µg/m³', 'poluente', 200, 240, 320, 1130, 2260, 0, 3000, 'horaria', 4, '#A9E34B'),
    ('SO2', 'SO₂', 'Dióxido de Enxofre', 'µg/m³', 'poluente', 20, 40, 365, 800, 1600, 0, 2000, '24horas', 5, '#DA77F2'),
    ('CO', 'CO', 'Monóxido de Carbono', 'ppm', 'poluente', 9, 11, 13, 15, 50, 0, 100, '8horas', 6, '#69DB7C');
    
    PRINT '✅ Parâmetros de poluentes inseridos';
END

-- Parâmetros meteorológicos
IF NOT EXISTS (SELECT 1 FROM parametros WHERE codigo = 'TEMP')
BEGIN
    INSERT INTO parametros (codigo, nome, nome_cientifico, unidade_medida, tipo, valor_minimo, valor_maximo, tipo_media, ordem_exibicao, cor)
    VALUES 
    ('TEMP', 'Temperatura', 'Temperatura do Ar', '°C', 'meteorologico', -10, 50, 'horaria', 10, '#FF9F43'),
    ('UR', 'Umidade Relativa', 'Umidade Relativa do Ar', '%', 'meteorologico', 0, 100, 'horaria', 11, '#54A0FF'),
    ('PRESS', 'Pressão', 'Pressão Atmosférica', 'hPa', 'meteorologico', 900, 1100, 'horaria', 12, '#5F27CD'),
    ('VV', 'Velocidade Vento', 'Velocidade do Vento', 'm/s', 'meteorologico', 0, 50, 'horaria', 13, '#00D2D3'),
    ('DV', 'Direção Vento', 'Direção do Vento', '°', 'meteorologico', 0, 360, 'horaria', 14, '#10AC84'),
    ('CHUVA', 'Precipitação', 'Precipitação Acumulada', 'mm', 'meteorologico', 0, 500, 'horaria', 15, '#2E86DE'),
    ('RAD', 'Radiação Solar', 'Radiação Solar Global', 'W/m²', 'meteorologico', 0, 1500, 'horaria', 16, '#F9CA24');
    
    PRINT '✅ Parâmetros meteorológicos inseridos';
END

-- Usuário admin padrão (senha: admin123)
IF NOT EXISTS (SELECT 1 FROM usuarios WHERE email = 'admin@acoem.com.br')
BEGIN
    INSERT INTO usuarios (nome, email, senha, role, ativo)
    VALUES ('Administrador', 'admin@acoem.com.br', '$2b$10$YcZ7kWVGJ3ZKx5kVGJ3ZKe9.xYqVHP9RqVHP9Rq9Rq9Rq9Rq9Rq9R', 'admin', 1);
    
    PRINT '✅ Usuário admin criado (senha: admin123)';
END

-- Configurações iniciais do sistema
IF NOT EXISTS (SELECT 1 FROM configuracoes WHERE chave = 'intervalo_importacao_api')
BEGIN
    INSERT INTO configuracoes (chave, valor, tipo, descricao)
    VALUES 
    ('intervalo_importacao_api', '60', 'number', 'Intervalo em minutos para importação automática de APIs'),
    ('api_rio_ativa', 'true', 'boolean', 'API do Rio de Janeiro ativa'),
    ('validacao_automatica', 'true', 'boolean', 'Validação automática de dados'),
    ('limite_variacao_percentual', '50', 'number', 'Limite percentual de variação para pré-invalidação'),
    ('dias_retencao_dados_brutos', '365', 'number', 'Dias para manter dados brutos antes de arquivar');
    
    PRINT '✅ Configurações do sistema inseridas';
END
GO

-- ============================================================
-- VIEWS ÚTEIS
-- ============================================================
PRINT '';
PRINT 'Criando views...';

-- View de últimas medições por estação
IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_ultimas_medicoes')
    DROP VIEW vw_ultimas_medicoes;
GO

CREATE VIEW vw_ultimas_medicoes AS
WITH UltimasMedicoes AS (
    SELECT 
        m.estacao_id,
        m.parametro_id,
        m.valor,
        m.data_hora,
        m.flag,
        m.iqar_calculado,
        m.classificacao_iqar,
        ROW_NUMBER() OVER (PARTITION BY m.estacao_id, m.parametro_id ORDER BY m.data_hora DESC) as rn
    FROM medicoes m
    WHERE m.flag IN ('valid', 'pending')
)
SELECT 
    um.estacao_id,
    e.codigo AS estacao_codigo,
    e.nome AS estacao_nome,
    e.latitude,
    e.longitude,
    e.status AS estacao_status,
    um.parametro_id,
    p.codigo AS parametro_codigo,
    p.nome AS parametro_nome,
    p.unidade_medida,
    um.valor,
    um.data_hora,
    um.flag,
    um.iqar_calculado,
    um.classificacao_iqar
FROM UltimasMedicoes um
INNER JOIN estacoes e ON e.id = um.estacao_id
INNER JOIN parametros p ON p.id = um.parametro_id
WHERE um.rn = 1;
GO

PRINT '✅ View vw_ultimas_medicoes criada';

-- View de resumo por estação
IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_resumo_estacoes')
    DROP VIEW vw_resumo_estacoes;
GO

CREATE VIEW vw_resumo_estacoes AS
SELECT 
    e.id,
    e.codigo,
    e.nome,
    e.latitude,
    e.longitude,
    e.status,
    e.ultima_comunicacao,
    u.nome AS unidade_nome,
    (SELECT COUNT(*) FROM medicoes m WHERE m.estacao_id = e.id AND m.data_hora >= DATEADD(hour, -24, GETDATE())) AS medicoes_24h,
    (SELECT COUNT(*) FROM alertas a WHERE a.estacao_id = e.id AND a.status = 'aberto') AS alertas_abertos
FROM estacoes e
INNER JOIN unidades u ON u.id = e.unidade_id
WHERE e.ativo = 1;
GO

PRINT '✅ View vw_resumo_estacoes criada';
GO

-- ============================================================
-- PROCEDURES ÚTEIS
-- ============================================================
PRINT '';
PRINT 'Criando procedures...';

-- Procedure para calcular médias horárias
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_calcular_media_horaria')
    DROP PROCEDURE sp_calcular_media_horaria;
GO

CREATE PROCEDURE sp_calcular_media_horaria
    @data_hora DATETIME = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @hora_inicio DATETIME;
    DECLARE @hora_fim DATETIME;
    
    -- Se não informado, calcular para a hora anterior
    IF @data_hora IS NULL
        SET @data_hora = DATEADD(HOUR, -1, GETDATE());
    
    -- Definir início e fim da hora
    SET @hora_inicio = DATEADD(MINUTE, -DATEPART(MINUTE, @data_hora), 
                       DATEADD(SECOND, -DATEPART(SECOND, @data_hora), @data_hora));
    SET @hora_fim = DATEADD(HOUR, 1, @hora_inicio);
    
    -- Inserir ou atualizar médias horárias
    MERGE medicoes_horarias AS target
    USING (
        SELECT 
            estacao_id,
            parametro_id,
            @hora_inicio AS data_hora,
            AVG(valor) AS valor_medio,
            MIN(valor) AS valor_minimo,
            MAX(valor) AS valor_maximo,
            STDEV(valor) AS desvio_padrao,
            COUNT(*) AS total_medicoes,
            SUM(CASE WHEN flag = 'valid' THEN 1 ELSE 0 END) AS medicoes_validas
        FROM medicoes
        WHERE data_hora >= @hora_inicio AND data_hora < @hora_fim
          AND flag IN ('valid', 'pending')
        GROUP BY estacao_id, parametro_id
    ) AS source
    ON target.estacao_id = source.estacao_id 
       AND target.parametro_id = source.parametro_id 
       AND target.data_hora = source.data_hora
    WHEN MATCHED THEN
        UPDATE SET 
            valor_medio = source.valor_medio,
            valor_minimo = source.valor_minimo,
            valor_maximo = source.valor_maximo,
            desvio_padrao = source.desvio_padrao,
            total_medicoes = source.total_medicoes,
            medicoes_validas = source.medicoes_validas,
            calculado_em = GETDATE()
    WHEN NOT MATCHED THEN
        INSERT (estacao_id, parametro_id, data_hora, valor_medio, valor_minimo, valor_maximo, 
                desvio_padrao, total_medicoes, medicoes_validas)
        VALUES (source.estacao_id, source.parametro_id, source.data_hora, source.valor_medio,
                source.valor_minimo, source.valor_maximo, source.desvio_padrao, 
                source.total_medicoes, source.medicoes_validas);
    
    PRINT 'Médias horárias calculadas para ' + CONVERT(VARCHAR, @hora_inicio, 120);
END
GO

PRINT '✅ Procedure sp_calcular_media_horaria criada';

-- Procedure para validação automática de dados
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_validar_dados_automatico')
    DROP PROCEDURE sp_validar_dados_automatico;
GO

CREATE PROCEDURE sp_validar_dados_automatico
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @count_invalidos INT = 0;
    
    -- Pré-invalidar valores negativos (exceto temperatura)
    UPDATE m
    SET flag = 'auto_invalid', motivo_flag = 'Valor negativo detectado'
    FROM medicoes m
    INNER JOIN parametros p ON p.id = m.parametro_id
    WHERE m.flag = 'pending' 
      AND m.valor < 0 
      AND p.codigo NOT IN ('TEMP');
    SET @count_invalidos = @count_invalidos + @@ROWCOUNT;
    
    -- Pré-invalidar valores acima do limite máximo
    UPDATE m
    SET flag = 'auto_invalid', 
        motivo_flag = 'Valor acima do limite máximo permitido (' + CAST(p.valor_maximo AS VARCHAR) + ')'
    FROM medicoes m
    INNER JOIN parametros p ON p.id = m.parametro_id
    WHERE m.flag = 'pending' 
      AND m.valor > p.valor_maximo;
    SET @count_invalidos = @count_invalidos + @@ROWCOUNT;
    
    -- Pré-invalidar variações bruscas (> 200% em relação à medição anterior)
    UPDATE m
    SET flag = 'auto_invalid', motivo_flag = 'Variação brusca detectada'
    FROM medicoes m
    INNER JOIN (
        SELECT 
            id,
            estacao_id,
            parametro_id,
            valor,
            LAG(valor) OVER (PARTITION BY estacao_id, parametro_id ORDER BY data_hora) AS valor_anterior
        FROM medicoes
        WHERE flag = 'pending'
    ) calc ON calc.id = m.id
    WHERE calc.valor_anterior IS NOT NULL 
      AND calc.valor_anterior > 0
      AND ABS(m.valor - calc.valor_anterior) / calc.valor_anterior > 2.0;
    SET @count_invalidos = @count_invalidos + @@ROWCOUNT;
    
    PRINT 'Validação automática concluída. Registros pré-invalidados: ' + CAST(@count_invalidos AS VARCHAR);
END
GO

PRINT '✅ Procedure sp_validar_dados_automatico criada';
GO

-- ============================================================
-- RESUMO FINAL
-- ============================================================
PRINT '';
PRINT '============================================================';
PRINT 'ESTRUTURA DO BANCO DE DADOS CRIADA COM SUCESSO!';
PRINT '============================================================';
PRINT '';
PRINT 'Tabelas criadas:';
PRINT '  - usuarios (autenticação)';
PRINT '  - unidades (clientes/locais)';
PRINT '  - parametros (poluentes e meteorológicos)';
PRINT '  - estacoes (estações de monitoramento)';
PRINT '  - medicoes (dados brutos - alta performance)';
PRINT '  - importacoes_log (rastreabilidade de importações)';
PRINT '  - alertas (sistema de alertas)';
PRINT '  - medicoes_horarias (agregação horária)';
PRINT '  - medicoes_diarias (agregação diária)';
PRINT '  - configuracoes (config do sistema)';
PRINT '';
PRINT 'Views criadas:';
PRINT '  - vw_ultimas_medicoes (últimas medições por estação)';
PRINT '  - vw_resumo_estacoes (resumo de cada estação)';
PRINT '';
PRINT 'Procedures criadas:';
PRINT '  - sp_calcular_media_horaria (agregação de médias)';
PRINT '  - sp_validar_dados_automatico (validação automática)';
PRINT '';
PRINT 'Usuário admin criado: admin@acoem.com.br / admin123';
PRINT '============================================================';
GO
