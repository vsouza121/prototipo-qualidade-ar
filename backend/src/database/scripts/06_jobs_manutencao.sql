-- ============================================================
-- SCRIPT DE JOBS DE MANUTENÇÃO
-- Tarefas automáticas periódicas
-- ============================================================

USE qualidade_ar;
GO

-- ============================================================
-- 1. PROCEDURE: Job de manutenção geral (executar a cada 5 min)
-- ============================================================
IF OBJECT_ID('dbo.sp_job_manutencao', 'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_job_manutencao;
GO

CREATE PROCEDURE dbo.sp_job_manutencao
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @result TABLE (operacao VARCHAR(100), registros INT);
    
    -- 1. Verificar estações offline
    EXEC dbo.sp_verificar_estacoes_offline @minutos_limite = 30;
    
    -- 2. Verificar disponibilidade baixa
    EXEC dbo.sp_verificar_disponibilidade @limite_minimo = 80;
    
    -- 3. Calcular IQAr para medições sem cálculo
    UPDATE m
    SET 
        iqar_calculado = dbo.fn_calcular_iqar(m.valor, p.codigo),
        classificacao_iqar = dbo.fn_classificacao_iqar(dbo.fn_calcular_iqar(m.valor, p.codigo)),
        atualizado_em = GETDATE()
    FROM medicoes m
    INNER JOIN parametros p ON m.parametro_id = p.id
    WHERE m.iqar_calculado IS NULL
      AND m.data_hora >= DATEADD(HOUR, -24, GETDATE());
    
    INSERT INTO @result VALUES ('IQAr calculado', @@ROWCOUNT);
    
    -- 4. Auto-validar medições boas recentes
    UPDATE medicoes
    SET flag = 'valid',
        atualizado_em = GETDATE()
    WHERE flag = 'pending'
      AND iqar_calculado IS NOT NULL
      AND iqar_calculado <= 40
      AND motivo_flag IS NULL
      AND data_hora >= DATEADD(HOUR, -1, GETDATE());
    
    INSERT INTO @result VALUES ('Medições auto-validadas', @@ROWCOUNT);
    
    -- 5. Resolver alertas antigos automaticamente
    UPDATE alertas
    SET resolvido = 1,
        atualizado_em = GETDATE()
    WHERE resolvido = 0
      AND criado_em < DATEADD(DAY, -7, GETDATE())
      AND tipo NOT IN ('ESTACAO_OFFLINE', 'SISTEMA');
    
    INSERT INTO @result VALUES ('Alertas resolvidos', @@ROWCOUNT);
    
    -- Retornar resultado
    SELECT * FROM @result;
END;
GO

-- ============================================================
-- 2. PROCEDURE: Limpeza de dados antigos (executar diariamente)
-- ============================================================
IF OBJECT_ID('dbo.sp_limpeza_dados_antigos', 'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_limpeza_dados_antigos;
GO

CREATE PROCEDURE dbo.sp_limpeza_dados_antigos
    @dias_retencao_medicoes INT = 365,      -- 1 ano de medições
    @dias_retencao_alertas INT = 90,        -- 3 meses de alertas
    @dias_retencao_logs INT = 30            -- 1 mês de logs
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @data_limite_medicoes DATE = DATEADD(DAY, -@dias_retencao_medicoes, GETDATE());
    DECLARE @data_limite_alertas DATE = DATEADD(DAY, -@dias_retencao_alertas, GETDATE());
    
    -- Limpar medições antigas
    DELETE FROM medicoes
    WHERE data_hora < @data_limite_medicoes;
    
    PRINT 'Medições removidas: ' + CAST(@@ROWCOUNT AS VARCHAR);
    
    -- Limpar alertas antigos resolvidos
    DELETE FROM alertas
    WHERE criado_em < @data_limite_alertas
      AND resolvido = 1;
    
    PRINT 'Alertas removidos: ' + CAST(@@ROWCOUNT AS VARCHAR);
END;
GO

-- ============================================================
-- 3. PROCEDURE: Agregação de dados horários (executar a cada hora)
-- ============================================================
IF OBJECT_ID('dbo.sp_agregar_dados_horarios', 'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_agregar_dados_horarios;
GO

-- Criar tabela de agregação se não existir
IF OBJECT_ID('dbo.medicoes_agregadas_hora', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.medicoes_agregadas_hora (
        id BIGINT IDENTITY(1,1) PRIMARY KEY,
        estacao_id INT NOT NULL,
        parametro_id INT NOT NULL,
        data_hora_inicio DATETIME NOT NULL,
        total_medicoes INT,
        media DECIMAL(12, 4),
        minimo DECIMAL(12, 4),
        maximo DECIMAL(12, 4),
        desvio_padrao DECIMAL(12, 4),
        percentil_95 DECIMAL(12, 4),
        media_iqar INT,
        criado_em DATETIME DEFAULT GETDATE(),
        CONSTRAINT UK_agregada_hora UNIQUE (estacao_id, parametro_id, data_hora_inicio)
    );
    
    CREATE INDEX IX_agregada_hora_estacao ON medicoes_agregadas_hora (estacao_id, data_hora_inicio);
    CREATE INDEX IX_agregada_hora_parametro ON medicoes_agregadas_hora (parametro_id, data_hora_inicio);
END
GO

CREATE PROCEDURE dbo.sp_agregar_dados_horarios
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @hora_anterior DATETIME = DATEADD(HOUR, DATEDIFF(HOUR, 0, DATEADD(HOUR, -1, GETDATE())), 0);
    DECLARE @hora_fim DATETIME = DATEADD(HOUR, 1, @hora_anterior);
    
    -- Agregar dados da hora anterior
    INSERT INTO medicoes_agregadas_hora (
        estacao_id, parametro_id, data_hora_inicio,
        total_medicoes, media, minimo, maximo, desvio_padrao, media_iqar
    )
    SELECT 
        estacao_id,
        parametro_id,
        @hora_anterior,
        COUNT(*),
        AVG(valor),
        MIN(valor),
        MAX(valor),
        STDEV(valor),
        AVG(CAST(iqar_calculado AS DECIMAL(10, 2)))
    FROM medicoes
    WHERE data_hora >= @hora_anterior
      AND data_hora < @hora_fim
      AND flag IN ('valid', 'pending')
    GROUP BY estacao_id, parametro_id
    -- Não inserir se já existe
    HAVING NOT EXISTS (
        SELECT 1 FROM medicoes_agregadas_hora mah
        WHERE mah.estacao_id = medicoes.estacao_id
          AND mah.parametro_id = medicoes.parametro_id
          AND mah.data_hora_inicio = @hora_anterior
    );
    
    SELECT @@ROWCOUNT AS registros_agregados, @hora_anterior AS hora_processada;
END;
GO

-- ============================================================
-- 4. PROCEDURE: Relatório diário de qualidade do ar
-- ============================================================
IF OBJECT_ID('dbo.sp_relatorio_diario', 'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_relatorio_diario;
GO

CREATE PROCEDURE dbo.sp_relatorio_diario
    @data DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    IF @data IS NULL
        SET @data = CAST(DATEADD(DAY, -1, GETDATE()) AS DATE);
    
    -- Resumo geral do dia
    SELECT 
        @data AS data_relatorio,
        COUNT(DISTINCT m.estacao_id) AS estacoes_com_dados,
        COUNT(*) AS total_medicoes,
        SUM(CASE WHEN m.flag = 'valid' THEN 1 ELSE 0 END) AS medicoes_validadas,
        SUM(CASE WHEN m.flag = 'pending' THEN 1 ELSE 0 END) AS medicoes_pendentes,
        SUM(CASE WHEN m.flag IN ('invalid', 'auto_invalid') THEN 1 ELSE 0 END) AS medicoes_invalidas,
        AVG(CASE WHEN m.flag = 'valid' THEN dbo.fn_disponibilidade_estacao(m.estacao_id, 24) END) AS disponibilidade_media
    FROM medicoes m
    WHERE CAST(m.data_hora AS DATE) = @data;
    
    -- IQAr por estação
    SELECT 
        e.codigo AS estacao,
        e.nome,
        AVG(m.iqar_calculado) AS iqar_medio,
        MAX(m.iqar_calculado) AS iqar_maximo,
        dbo.fn_classificacao_iqar(AVG(m.iqar_calculado)) AS classificacao_media,
        dbo.fn_poluente_predominante(e.id) AS poluente_critico
    FROM medicoes m
    INNER JOIN estacoes e ON m.estacao_id = e.id
    WHERE CAST(m.data_hora AS DATE) = @data
      AND m.flag IN ('valid', 'pending')
    GROUP BY e.id, e.codigo, e.nome
    ORDER BY AVG(m.iqar_calculado) DESC;
    
    -- Alertas do dia
    SELECT 
        COUNT(*) AS total_alertas,
        SUM(CASE WHEN nivel = 'critical' THEN 1 ELSE 0 END) AS criticos,
        SUM(CASE WHEN nivel = 'warning' THEN 1 ELSE 0 END) AS avisos,
        SUM(CASE WHEN resolvido = 1 THEN 1 ELSE 0 END) AS resolvidos
    FROM alertas
    WHERE CAST(criado_em AS DATE) = @data;
END;
GO

-- ============================================================
-- 5. PROCEDURE: Recalcular todos os IQAr (uso emergencial)
-- ============================================================
IF OBJECT_ID('dbo.sp_recalcular_iqar', 'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_recalcular_iqar;
GO

CREATE PROCEDURE dbo.sp_recalcular_iqar
    @dias INT = 30
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @total INT;
    
    UPDATE m
    SET 
        iqar_calculado = dbo.fn_calcular_iqar(m.valor, p.codigo),
        classificacao_iqar = dbo.fn_classificacao_iqar(dbo.fn_calcular_iqar(m.valor, p.codigo)),
        atualizado_em = GETDATE()
    FROM medicoes m
    INNER JOIN parametros p ON m.parametro_id = p.id
    WHERE m.data_hora >= DATEADD(DAY, -@dias, GETDATE());
    
    SET @total = @@ROWCOUNT;
    
    SELECT @total AS medicoes_recalculadas, @dias AS dias_processados;
END;
GO

PRINT 'Jobs de manutenção criados com sucesso!';
GO

-- ============================================================
-- NOTA: Para agendar os jobs no SQL Server Agent:
-- ============================================================
/*
-- Job de manutenção (a cada 5 minutos):
EXEC dbo.sp_job_manutencao;

-- Agregação horária (a cada hora):
EXEC dbo.sp_agregar_dados_horarios;

-- Limpeza diária (uma vez por dia, de madrugada):
EXEC dbo.sp_limpeza_dados_antigos @dias_retencao_medicoes = 365, @dias_retencao_alertas = 90;

-- Relatório diário (uma vez por dia, de manhã):
EXEC dbo.sp_relatorio_diario;
*/
