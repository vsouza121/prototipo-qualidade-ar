-- ============================================================
-- SCRIPT DE STORED PROCEDURES
-- Processamento de medições, validação e alertas
-- ============================================================

USE qualidade_ar;
GO

-- ============================================================
-- 1. PROCEDURE: Inserir medição com validação automática
-- ============================================================
IF OBJECT_ID('dbo.sp_inserir_medicao', 'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_inserir_medicao;
GO

CREATE PROCEDURE dbo.sp_inserir_medicao
    @estacao_id INT,
    @parametro_codigo VARCHAR(20),
    @valor DECIMAL(12, 4),
    @data_hora DATETIME = NULL,
    @medicao_id BIGINT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @parametro_id INT;
    DECLARE @valor_minimo DECIMAL(10, 2);
    DECLARE @valor_maximo DECIMAL(10, 2);
    DECLARE @flag VARCHAR(15) = 'pending';
    DECLARE @motivo_flag VARCHAR(255) = NULL;
    DECLARE @iqar INT;
    DECLARE @classificacao VARCHAR(20);
    
    -- Definir data/hora se não fornecida
    IF @data_hora IS NULL
        SET @data_hora = GETDATE();
    
    -- Obter ID e limites do parâmetro
    SELECT 
        @parametro_id = id,
        @valor_minimo = valor_minimo,
        @valor_maximo = valor_maximo
    FROM parametros
    WHERE codigo = @parametro_codigo AND ativo = 1;
    
    IF @parametro_id IS NULL
    BEGIN
        RAISERROR('Parâmetro não encontrado: %s', 16, 1, @parametro_codigo);
        RETURN;
    END
    
    -- Validação automática de limites físicos
    IF @valor < @valor_minimo OR @valor > @valor_maximo
    BEGIN
        SET @flag = 'auto_invalid';
        SET @motivo_flag = 'Valor fora dos limites físicos: ' + CAST(@valor AS VARCHAR) + 
                          ' (min: ' + CAST(@valor_minimo AS VARCHAR) + 
                          ', max: ' + CAST(@valor_maximo AS VARCHAR) + ')';
    END
    
    -- Calcular IQAr
    SET @iqar = dbo.fn_calcular_iqar(@valor, @parametro_codigo);
    SET @classificacao = dbo.fn_classificacao_iqar(@iqar);
    
    -- Inserir medição
    INSERT INTO medicoes (
        estacao_id, parametro_id, valor, data_hora,
        flag, motivo_flag, iqar_calculado, classificacao_iqar,
        criado_em, atualizado_em
    )
    VALUES (
        @estacao_id, @parametro_id, @valor, @data_hora,
        @flag, @motivo_flag, @iqar, @classificacao,
        GETDATE(), GETDATE()
    );
    
    SET @medicao_id = SCOPE_IDENTITY();
    
    -- Atualizar última comunicação da estação
    UPDATE estacoes
    SET ultima_comunicacao = @data_hora,
        status = 'online',
        atualizado_em = GETDATE()
    WHERE id = @estacao_id;
    
    -- Verificar se precisa gerar alerta
    EXEC dbo.sp_verificar_alerta_medicao @medicao_id;
END;
GO

-- ============================================================
-- 2. PROCEDURE: Inserir lote de medições (para sensores)
-- ============================================================
IF OBJECT_ID('dbo.sp_inserir_medicoes_lote', 'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_inserir_medicoes_lote;
GO

CREATE PROCEDURE dbo.sp_inserir_medicoes_lote
    @estacao_codigo VARCHAR(30),
    @data_hora DATETIME,
    @pm25 DECIMAL(12, 4) = NULL,
    @pm10 DECIMAL(12, 4) = NULL,
    @o3 DECIMAL(12, 4) = NULL,
    @no2 DECIMAL(12, 4) = NULL,
    @so2 DECIMAL(12, 4) = NULL,
    @co DECIMAL(12, 4) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @estacao_id INT;
    DECLARE @medicao_id BIGINT;
    
    -- Obter ID da estação
    SELECT @estacao_id = id
    FROM estacoes
    WHERE codigo = @estacao_codigo AND ativo = 1;
    
    IF @estacao_id IS NULL
    BEGIN
        RAISERROR('Estação não encontrada: %s', 16, 1, @estacao_codigo);
        RETURN;
    END
    
    -- Inserir cada parâmetro se fornecido
    IF @pm25 IS NOT NULL
        EXEC dbo.sp_inserir_medicao @estacao_id, 'PM25', @pm25, @data_hora, @medicao_id OUTPUT;
    
    IF @pm10 IS NOT NULL
        EXEC dbo.sp_inserir_medicao @estacao_id, 'PM10', @pm10, @data_hora, @medicao_id OUTPUT;
    
    IF @o3 IS NOT NULL
        EXEC dbo.sp_inserir_medicao @estacao_id, 'O3', @o3, @data_hora, @medicao_id OUTPUT;
    
    IF @no2 IS NOT NULL
        EXEC dbo.sp_inserir_medicao @estacao_id, 'NO2', @no2, @data_hora, @medicao_id OUTPUT;
    
    IF @so2 IS NOT NULL
        EXEC dbo.sp_inserir_medicao @estacao_id, 'SO2', @so2, @data_hora, @medicao_id OUTPUT;
    
    IF @co IS NOT NULL
        EXEC dbo.sp_inserir_medicao @estacao_id, 'CO', @co, @data_hora, @medicao_id OUTPUT;
    
    SELECT 'OK' AS status, @estacao_codigo AS estacao, @data_hora AS data_hora;
END;
GO

-- ============================================================
-- 3. PROCEDURE: Verificar e criar alerta para medição
-- ============================================================
IF OBJECT_ID('dbo.sp_verificar_alerta_medicao', 'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_verificar_alerta_medicao;
GO

CREATE PROCEDURE dbo.sp_verificar_alerta_medicao
    @medicao_id BIGINT
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @estacao_id INT;
    DECLARE @parametro_id INT;
    DECLARE @valor DECIMAL(12, 4);
    DECLARE @iqar INT;
    DECLARE @classificacao VARCHAR(20);
    DECLARE @parametro_nome VARCHAR(100);
    DECLARE @estacao_codigo VARCHAR(30);
    DECLARE @limite_ruim DECIMAL(10, 2);
    DECLARE @nivel VARCHAR(10);
    
    -- Obter dados da medição
    SELECT 
        @estacao_id = m.estacao_id,
        @parametro_id = m.parametro_id,
        @valor = m.valor,
        @iqar = m.iqar_calculado,
        @classificacao = m.classificacao_iqar,
        @parametro_nome = p.nome,
        @estacao_codigo = e.codigo,
        @limite_ruim = p.limite_ruim
    FROM medicoes m
    INNER JOIN parametros p ON m.parametro_id = p.id
    INNER JOIN estacoes e ON m.estacao_id = e.id
    WHERE m.id = @medicao_id;
    
    IF @iqar IS NULL
        RETURN;
    
    -- Determinar nível do alerta
    IF @classificacao = 'Péssimo'
        SET @nivel = 'critical';
    ELSE IF @classificacao IN ('Ruim', 'Muito Ruim')
        SET @nivel = 'warning';
    ELSE
        RETURN; -- Não criar alerta para 'Bom' ou 'Moderado'
    
    -- Verificar se já existe alerta similar nas últimas 2 horas
    IF EXISTS (
        SELECT 1 FROM alertas
        WHERE estacao_id = @estacao_id
          AND parametro_id = @parametro_id
          AND tipo = 'ULTRAPASSAGEM_LIMITE'
          AND resolvido = 0
          AND criado_em >= DATEADD(HOUR, -2, GETDATE())
    )
        RETURN;
    
    -- Criar alerta
    INSERT INTO alertas (
        estacao_id, parametro_id, tipo, nivel,
        titulo, mensagem, valor_detectado, valor_limite,
        criado_em, atualizado_em
    )
    VALUES (
        @estacao_id, @parametro_id, 'ULTRAPASSAGEM_LIMITE', @nivel,
        'Ultrapassagem de Limite - ' + @parametro_nome,
        @estacao_codigo + ': Concentração de ' + @parametro_nome + 
        ' está em nível ' + @classificacao + ' (' + CAST(@valor AS VARCHAR) + 
        ' µg/m³). IQAr: ' + CAST(@iqar AS VARCHAR),
        @valor, @limite_ruim,
        GETDATE(), GETDATE()
    );
END;
GO

-- ============================================================
-- 4. PROCEDURE: Verificar estações offline
-- ============================================================
IF OBJECT_ID('dbo.sp_verificar_estacoes_offline', 'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_verificar_estacoes_offline;
GO

CREATE PROCEDURE dbo.sp_verificar_estacoes_offline
    @minutos_limite INT = 30
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @estacao_id INT;
    DECLARE @estacao_codigo VARCHAR(30);
    DECLARE @ultima_comunicacao DATETIME;
    
    DECLARE cur_estacoes CURSOR FOR
        SELECT id, codigo, ultima_comunicacao
        FROM estacoes
        WHERE ativo = 1
          AND status != 'manutencao'
          AND (ultima_comunicacao IS NULL OR ultima_comunicacao < DATEADD(MINUTE, -@minutos_limite, GETDATE()));
    
    OPEN cur_estacoes;
    FETCH NEXT FROM cur_estacoes INTO @estacao_id, @estacao_codigo, @ultima_comunicacao;
    
    WHILE @@FETCH_STATUS = 0
    BEGIN
        -- Atualizar status da estação
        UPDATE estacoes
        SET status = 'offline',
            atualizado_em = GETDATE()
        WHERE id = @estacao_id;
        
        -- Verificar se já existe alerta ativo
        IF NOT EXISTS (
            SELECT 1 FROM alertas
            WHERE estacao_id = @estacao_id
              AND tipo = 'ESTACAO_OFFLINE'
              AND resolvido = 0
        )
        BEGIN
            -- Criar alerta
            INSERT INTO alertas (
                estacao_id, tipo, nivel, titulo, mensagem,
                criado_em, atualizado_em
            )
            VALUES (
                @estacao_id, 'ESTACAO_OFFLINE', 'critical',
                'Estação Offline',
                @estacao_codigo + ': Sem comunicação há mais de ' + 
                CAST(@minutos_limite AS VARCHAR) + ' minutos. Última comunicação: ' +
                ISNULL(CONVERT(VARCHAR, @ultima_comunicacao, 120), 'Nunca'),
                GETDATE(), GETDATE()
            );
        END
        
        FETCH NEXT FROM cur_estacoes INTO @estacao_id, @estacao_codigo, @ultima_comunicacao;
    END
    
    CLOSE cur_estacoes;
    DEALLOCATE cur_estacoes;
END;
GO

-- ============================================================
-- 5. PROCEDURE: Verificar disponibilidade baixa
-- ============================================================
IF OBJECT_ID('dbo.sp_verificar_disponibilidade', 'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_verificar_disponibilidade;
GO

CREATE PROCEDURE dbo.sp_verificar_disponibilidade
    @limite_minimo DECIMAL(5, 2) = 80.00
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @estacao_id INT;
    DECLARE @estacao_codigo VARCHAR(30);
    DECLARE @disponibilidade DECIMAL(5, 2);
    
    DECLARE cur_estacoes CURSOR FOR
        SELECT id, codigo FROM estacoes WHERE ativo = 1;
    
    OPEN cur_estacoes;
    FETCH NEXT FROM cur_estacoes INTO @estacao_id, @estacao_codigo;
    
    WHILE @@FETCH_STATUS = 0
    BEGIN
        SET @disponibilidade = dbo.fn_disponibilidade_estacao(@estacao_id, 24);
        
        IF @disponibilidade < @limite_minimo
        BEGIN
            -- Verificar se já existe alerta ativo
            IF NOT EXISTS (
                SELECT 1 FROM alertas
                WHERE estacao_id = @estacao_id
                  AND tipo = 'DISPONIBILIDADE_BAIXA'
                  AND resolvido = 0
                  AND criado_em >= DATEADD(HOUR, -6, GETDATE())
            )
            BEGIN
                -- Criar alerta
                INSERT INTO alertas (
                    estacao_id, tipo, nivel, titulo, mensagem,
                    valor_detectado, valor_limite,
                    criado_em, atualizado_em
                )
                VALUES (
                    @estacao_id, 'DISPONIBILIDADE_BAIXA', 'warning',
                    'Disponibilidade de Dados Baixa',
                    @estacao_codigo + ': Disponibilidade de dados em ' + 
                    CAST(@disponibilidade AS VARCHAR) + '% (mínimo: ' +
                    CAST(@limite_minimo AS VARCHAR) + '%)',
                    @disponibilidade, @limite_minimo,
                    GETDATE(), GETDATE()
                );
            END
        END
        
        FETCH NEXT FROM cur_estacoes INTO @estacao_id, @estacao_codigo;
    END
    
    CLOSE cur_estacoes;
    DEALLOCATE cur_estacoes;
END;
GO

-- ============================================================
-- 6. PROCEDURE: Validar medições automaticamente
-- ============================================================
IF OBJECT_ID('dbo.sp_validar_medicoes_auto', 'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_validar_medicoes_auto;
GO

CREATE PROCEDURE dbo.sp_validar_medicoes_auto
    @horas INT = 1
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Validar medições que estão dentro dos limites normais
    UPDATE medicoes
    SET flag = 'valid',
        atualizado_em = GETDATE()
    WHERE flag = 'pending'
      AND data_hora >= DATEADD(HOUR, -@horas, GETDATE())
      AND iqar_calculado IS NOT NULL
      AND iqar_calculado <= 80  -- Apenas 'Bom' e 'Moderado'
      AND motivo_flag IS NULL;
    
    SELECT @@ROWCOUNT AS medicoes_validadas;
END;
GO

-- ============================================================
-- 7. PROCEDURE: Obter resumo do Dashboard
-- ============================================================
IF OBJECT_ID('dbo.sp_dashboard_resumo', 'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_dashboard_resumo;
GO

CREATE PROCEDURE dbo.sp_dashboard_resumo
    @unidade_id INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Estações
    SELECT 
        COUNT(*) AS total_estacoes,
        SUM(CASE WHEN status = 'online' THEN 1 ELSE 0 END) AS online,
        SUM(CASE WHEN status = 'offline' THEN 1 ELSE 0 END) AS offline,
        SUM(CASE WHEN status = 'manutencao' THEN 1 ELSE 0 END) AS manutencao
    FROM estacoes
    WHERE ativo = 1
      AND (@unidade_id IS NULL OR unidade_id = @unidade_id);
    
    -- IQAr médio por estação
    SELECT 
        e.id,
        e.codigo,
        e.nome,
        dbo.fn_iqar_estacao(e.id) AS iqar,
        dbo.fn_classificacao_iqar(dbo.fn_iqar_estacao(e.id)) AS classificacao,
        dbo.fn_cor_iqar(dbo.fn_iqar_estacao(e.id)) AS cor,
        dbo.fn_disponibilidade_estacao(e.id, 24) AS disponibilidade,
        dbo.fn_poluente_predominante(e.id) AS poluente_predominante
    FROM estacoes e
    WHERE e.ativo = 1
      AND (@unidade_id IS NULL OR e.unidade_id = @unidade_id)
    ORDER BY dbo.fn_iqar_estacao(e.id) DESC;
    
    -- Alertas ativos
    SELECT COUNT(*) AS alertas_ativos
    FROM alertas
    WHERE resolvido = 0
      AND (@unidade_id IS NULL OR estacao_id IN (
          SELECT id FROM estacoes WHERE unidade_id = @unidade_id
      ));
    
    -- Medições hoje
    SELECT COUNT(*) AS medicoes_hoje
    FROM medicoes
    WHERE CAST(data_hora AS DATE) = CAST(GETDATE() AS DATE)
      AND (@unidade_id IS NULL OR estacao_id IN (
          SELECT id FROM estacoes WHERE unidade_id = @unidade_id
      ));
END;
GO

PRINT 'Stored Procedures criadas com sucesso!';
GO
