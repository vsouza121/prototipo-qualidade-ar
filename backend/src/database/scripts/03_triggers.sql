-- ============================================================
-- SCRIPT DE TRIGGERS
-- Processamento automático de eventos no banco
-- ============================================================

USE qualidade_ar;
GO

-- ============================================================
-- 1. TRIGGER: Calcular IQAr ao inserir medição
-- ============================================================
IF OBJECT_ID('dbo.tr_medicao_calcular_iqar', 'TR') IS NOT NULL
    DROP TRIGGER dbo.tr_medicao_calcular_iqar;
GO

CREATE TRIGGER dbo.tr_medicao_calcular_iqar
ON medicoes
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Atualizar IQAr para medições inseridas que não têm IQAr calculado
    UPDATE m
    SET 
        iqar_calculado = dbo.fn_calcular_iqar(i.valor, p.codigo),
        classificacao_iqar = dbo.fn_classificacao_iqar(dbo.fn_calcular_iqar(i.valor, p.codigo)),
        atualizado_em = GETDATE()
    FROM medicoes m
    INNER JOIN inserted i ON m.id = i.id
    INNER JOIN parametros p ON m.parametro_id = p.id
    WHERE m.iqar_calculado IS NULL;
END;
GO

-- ============================================================
-- 2. TRIGGER: Atualizar status da estação ao receber medição
-- ============================================================
IF OBJECT_ID('dbo.tr_medicao_atualizar_estacao', 'TR') IS NOT NULL
    DROP TRIGGER dbo.tr_medicao_atualizar_estacao;
GO

CREATE TRIGGER dbo.tr_medicao_atualizar_estacao
ON medicoes
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Atualizar última comunicação e status das estações
    UPDATE e
    SET 
        ultima_comunicacao = i.max_data_hora,
        status = CASE WHEN e.status = 'manutencao' THEN 'manutencao' ELSE 'online' END,
        atualizado_em = GETDATE()
    FROM estacoes e
    INNER JOIN (
        SELECT estacao_id, MAX(data_hora) AS max_data_hora
        FROM inserted
        GROUP BY estacao_id
    ) i ON e.id = i.estacao_id;
END;
GO

-- ============================================================
-- 3. TRIGGER: Gerar alerta automático ao inserir medição ruim
-- ============================================================
IF OBJECT_ID('dbo.tr_medicao_gerar_alerta', 'TR') IS NOT NULL
    DROP TRIGGER dbo.tr_medicao_gerar_alerta;
GO

CREATE TRIGGER dbo.tr_medicao_gerar_alerta
ON medicoes
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Gerar alertas apenas para medições com IQAr alto
    INSERT INTO alertas (
        estacao_id, parametro_id, tipo, nivel,
        titulo, mensagem, valor_detectado, valor_limite,
        criado_em, atualizado_em
    )
    SELECT 
        i.estacao_id,
        i.parametro_id,
        'ULTRAPASSAGEM_LIMITE',
        CASE 
            WHEN i.classificacao_iqar = 'Péssimo' THEN 'critical'
            WHEN i.classificacao_iqar = 'Muito Ruim' THEN 'critical'
            WHEN i.classificacao_iqar = 'Ruim' THEN 'warning'
            ELSE 'info'
        END,
        'Ultrapassagem de Limite - ' + p.nome,
        e.codigo + ': Concentração de ' + p.nome + 
        ' está em nível ' + i.classificacao_iqar + 
        ' (' + CAST(i.valor AS VARCHAR(20)) + ' ' + p.unidade_medida + 
        '). IQAr: ' + CAST(i.iqar_calculado AS VARCHAR(10)),
        i.valor,
        p.limite_ruim,
        GETDATE(),
        GETDATE()
    FROM inserted i
    INNER JOIN parametros p ON i.parametro_id = p.id
    INNER JOIN estacoes e ON i.estacao_id = e.id
    WHERE i.classificacao_iqar IN ('Ruim', 'Muito Ruim', 'Péssimo')
      AND i.iqar_calculado IS NOT NULL
      -- Não criar alerta se já existe um similar nas últimas 2 horas
      AND NOT EXISTS (
          SELECT 1 FROM alertas a
          WHERE a.estacao_id = i.estacao_id
            AND a.parametro_id = i.parametro_id
            AND a.tipo = 'ULTRAPASSAGEM_LIMITE'
            AND a.resolvido = 0
            AND a.criado_em >= DATEADD(HOUR, -2, GETDATE())
      );
END;
GO

-- ============================================================
-- 4. TRIGGER: Auto-resolver alertas quando qualidade melhora
-- ============================================================
IF OBJECT_ID('dbo.tr_resolver_alertas_automatico', 'TR') IS NOT NULL
    DROP TRIGGER dbo.tr_resolver_alertas_automatico;
GO

CREATE TRIGGER dbo.tr_resolver_alertas_automatico
ON medicoes
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Resolver alertas de ultrapassagem quando valores voltam ao normal
    UPDATE a
    SET 
        resolvido = 1,
        atualizado_em = GETDATE()
    FROM alertas a
    INNER JOIN inserted i ON a.estacao_id = i.estacao_id 
                          AND a.parametro_id = i.parametro_id
    WHERE a.tipo = 'ULTRAPASSAGEM_LIMITE'
      AND a.resolvido = 0
      AND i.classificacao_iqar IN ('Bom', 'Moderado');
    
    -- Resolver alertas de estação offline
    UPDATE a
    SET 
        resolvido = 1,
        atualizado_em = GETDATE()
    FROM alertas a
    INNER JOIN (SELECT DISTINCT estacao_id FROM inserted) i ON a.estacao_id = i.estacao_id
    WHERE a.tipo = 'ESTACAO_OFFLINE'
      AND a.resolvido = 0;
END;
GO

-- ============================================================
-- 5. TRIGGER: Validação automática de dados
-- ============================================================
IF OBJECT_ID('dbo.tr_medicao_validacao_auto', 'TR') IS NOT NULL
    DROP TRIGGER dbo.tr_medicao_validacao_auto;
GO

CREATE TRIGGER dbo.tr_medicao_validacao_auto
ON medicoes
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Invalidar automaticamente valores fora dos limites físicos
    UPDATE m
    SET 
        flag = 'auto_invalid',
        motivo_flag = 'Valor fora dos limites físicos: ' + CAST(i.valor AS VARCHAR) + 
                      ' (min: ' + CAST(p.valor_minimo AS VARCHAR) + 
                      ', max: ' + CAST(p.valor_maximo AS VARCHAR) + ')',
        atualizado_em = GETDATE()
    FROM medicoes m
    INNER JOIN inserted i ON m.id = i.id
    INNER JOIN parametros p ON m.parametro_id = p.id
    WHERE (i.valor < p.valor_minimo OR i.valor > p.valor_maximo)
      AND m.flag = 'pending';
    
    -- Auto-validar valores bons (IQAr <= 40)
    UPDATE m
    SET 
        flag = 'valid',
        atualizado_em = GETDATE()
    FROM medicoes m
    INNER JOIN inserted i ON m.id = i.id
    WHERE m.flag = 'pending'
      AND m.iqar_calculado IS NOT NULL
      AND m.iqar_calculado <= 40
      AND m.motivo_flag IS NULL;
END;
GO

-- ============================================================
-- 6. TRIGGER: Log de auditoria em alertas
-- ============================================================
IF OBJECT_ID('dbo.tr_alerta_auditoria', 'TR') IS NOT NULL
    DROP TRIGGER dbo.tr_alerta_auditoria;
GO

CREATE TRIGGER dbo.tr_alerta_auditoria
ON alertas
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Registrar data/hora quando alerta é lido
    UPDATE a
    SET lido_em = GETDATE()
    FROM alertas a
    INNER JOIN inserted i ON a.id = i.id
    INNER JOIN deleted d ON i.id = d.id
    WHERE i.lido = 1 AND d.lido = 0
      AND a.lido_em IS NULL;
END;
GO

PRINT 'Triggers criados com sucesso!';
GO
