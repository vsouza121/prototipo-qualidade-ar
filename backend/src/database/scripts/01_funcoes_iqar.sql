-- ============================================================
-- SCRIPT DE FUNÇÕES PARA CÁLCULO DE IQAr
-- Banco de Dados: qualidade_ar (SQL Server)
-- Padrão: CONAMA 491/2018
-- ============================================================

USE qualidade_ar;
GO

-- ============================================================
-- 1. FUNÇÃO: Calcular IQAr para um valor específico de parâmetro
-- ============================================================
IF OBJECT_ID('dbo.fn_calcular_iqar', 'FN') IS NOT NULL
    DROP FUNCTION dbo.fn_calcular_iqar;
GO

CREATE FUNCTION dbo.fn_calcular_iqar
(
    @valor DECIMAL(12, 4),
    @parametro_codigo VARCHAR(20)
)
RETURNS INT
AS
BEGIN
    DECLARE @iqar INT;
    DECLARE @limite_bom DECIMAL(10,2), @limite_moderado DECIMAL(10,2);
    DECLARE @limite_ruim DECIMAL(10,2), @limite_muito_ruim DECIMAL(10,2);
    DECLARE @limite_pessimo DECIMAL(10,2);

    -- Obter limites do parâmetro
    SELECT 
        @limite_bom = limite_bom,
        @limite_moderado = limite_moderado,
        @limite_ruim = limite_ruim,
        @limite_muito_ruim = limite_muito_ruim,
        @limite_pessimo = limite_pessimo
    FROM parametros
    WHERE codigo = @parametro_codigo AND ativo = 1;

    -- Se parâmetro não encontrado, retornar NULL
    IF @limite_bom IS NULL
        RETURN NULL;

    -- Calcular IQAr baseado nas faixas CONAMA
    -- Bom: 0-40, Moderado: 41-80, Ruim: 81-120, Muito Ruim: 121-200, Péssimo: >200
    IF @valor <= @limite_bom
        SET @iqar = CAST((@valor / @limite_bom) * 40 AS INT);
    ELSE IF @valor <= @limite_moderado
        SET @iqar = 40 + CAST(((@valor - @limite_bom) / (@limite_moderado - @limite_bom)) * 40 AS INT);
    ELSE IF @valor <= @limite_ruim
        SET @iqar = 80 + CAST(((@valor - @limite_moderado) / (@limite_ruim - @limite_moderado)) * 40 AS INT);
    ELSE IF @valor <= @limite_muito_ruim
        SET @iqar = 120 + CAST(((@valor - @limite_ruim) / (@limite_muito_ruim - @limite_ruim)) * 80 AS INT);
    ELSE
        SET @iqar = 200 + CAST(((@valor - @limite_muito_ruim) / (@limite_pessimo - @limite_muito_ruim)) * 100 AS INT);

    -- Limitar máximo em 400
    IF @iqar > 400
        SET @iqar = 400;

    RETURN @iqar;
END;
GO

-- ============================================================
-- 2. FUNÇÃO: Obter classificação do IQAr
-- ============================================================
IF OBJECT_ID('dbo.fn_classificacao_iqar', 'FN') IS NOT NULL
    DROP FUNCTION dbo.fn_classificacao_iqar;
GO

CREATE FUNCTION dbo.fn_classificacao_iqar
(
    @iqar INT
)
RETURNS VARCHAR(20)
AS
BEGIN
    DECLARE @resultado VARCHAR(20);

    IF @iqar IS NULL
        SET @resultado = NULL;
    ELSE IF @iqar <= 40
        SET @resultado = 'Bom';
    ELSE IF @iqar <= 80
        SET @resultado = 'Moderado';
    ELSE IF @iqar <= 120
        SET @resultado = 'Ruim';
    ELSE IF @iqar <= 200
        SET @resultado = 'Muito Ruim';
    ELSE
        SET @resultado = 'Péssimo';

    RETURN @resultado;
END;
GO

-- ============================================================
-- 3. FUNÇÃO: Obter cor do IQAr
-- ============================================================
IF OBJECT_ID('dbo.fn_cor_iqar', 'FN') IS NOT NULL
    DROP FUNCTION dbo.fn_cor_iqar;
GO

CREATE FUNCTION dbo.fn_cor_iqar
(
    @iqar INT
)
RETURNS VARCHAR(7)
AS
BEGIN
   
    DECLARE @cor VARCHAR(7);

    IF @iqar IS NULL
        SET @cor = '#9E9E9E';
    ELSE IF @iqar <= 40
        SET @cor = '#00E400';
    ELSE IF @iqar <= 80
        SET @cor = '#FFFF00';
    ELSE IF @iqar <= 120
        SET @cor = '#FF7E00';
    ELSE IF @iqar <= 200
        SET @cor = '#FF0000';
    ELSE
        SET @cor = '#8F3F97';

    RETURN @cor;
END;
GO

-- ============================================================
-- 4. FUNÇÃO: Calcular IQAr geral de uma estação
-- Retorna o maior IQAr entre todos os parâmetros (pior caso)
-- ============================================================
IF OBJECT_ID('dbo.fn_iqar_estacao', 'FN') IS NOT NULL
    DROP FUNCTION dbo.fn_iqar_estacao;
GO

CREATE FUNCTION dbo.fn_iqar_estacao
(
    @estacao_id INT
)
RETURNS INT
AS
BEGIN
    DECLARE @iqar_max INT = 0;
    DECLARE @iqar_atual INT;

    -- Buscar última medição de cada parâmetro e calcular IQAr
    SELECT @iqar_max = MAX(dbo.fn_calcular_iqar(m.valor, p.codigo))
    FROM (
        SELECT estacao_id, parametro_id, valor,
               ROW_NUMBER() OVER (PARTITION BY parametro_id ORDER BY data_hora DESC) as rn
        FROM medicoes
        WHERE estacao_id = @estacao_id
          AND data_hora >= DATEADD(HOUR, -24, GETDATE())
          AND flag IN ('valid', 'pending')
    ) m
    INNER JOIN parametros p ON m.parametro_id = p.id
    WHERE m.rn = 1;

    RETURN ISNULL(@iqar_max, 0);
END;
GO

-- ============================================================
-- 5. FUNÇÃO: Calcular disponibilidade de dados da estação
-- Retorna percentual de dados recebidos nas últimas 24h
-- ============================================================
IF OBJECT_ID('dbo.fn_disponibilidade_estacao', 'FN') IS NOT NULL
    DROP FUNCTION dbo.fn_disponibilidade_estacao;
GO

CREATE FUNCTION dbo.fn_disponibilidade_estacao
(
    @estacao_id INT,
    @horas INT = 24
)
RETURNS DECIMAL(5, 2)
AS
BEGIN
    DECLARE @intervalo_coleta INT;
    DECLARE @medicoes_esperadas INT;
    DECLARE @medicoes_recebidas INT;
    DECLARE @num_parametros INT;
    DECLARE @disponibilidade DECIMAL(5, 2);

    -- Obter intervalo de coleta da estação (em minutos)
    SELECT @intervalo_coleta = ISNULL(intervalo_coleta, 5)
    FROM estacoes
    WHERE id = @estacao_id;

    -- Contar parâmetros monitorados pela estação
    SELECT @num_parametros = COUNT(DISTINCT parametro_id)
    FROM medicoes
    WHERE estacao_id = @estacao_id
      AND data_hora >= DATEADD(DAY, -7, GETDATE());

    IF @num_parametros = 0
        SET @num_parametros = 6; -- Padrão: 6 parâmetros

    -- Calcular medições esperadas
    SET @medicoes_esperadas = (@horas * 60 / @intervalo_coleta) * @num_parametros;

    -- Contar medições recebidas (válidas ou pendentes)
    SELECT @medicoes_recebidas = COUNT(*)
    FROM medicoes
    WHERE estacao_id = @estacao_id
      AND data_hora >= DATEADD(HOUR, -@horas, GETDATE())
      AND flag IN ('valid', 'pending');

    -- Calcular disponibilidade
    IF @medicoes_esperadas > 0
        SET @disponibilidade = CAST(@medicoes_recebidas AS DECIMAL(10, 2)) / @medicoes_esperadas * 100;
    ELSE
        SET @disponibilidade = 0;

    -- Limitar a 100%
    IF @disponibilidade > 100
        SET @disponibilidade = 100;

    RETURN @disponibilidade;
END;
GO

-- ============================================================
-- 6. FUNÇÃO: Obter poluente predominante da estação
-- ============================================================
IF OBJECT_ID('dbo.fn_poluente_predominante', 'FN') IS NOT NULL
    DROP FUNCTION dbo.fn_poluente_predominante;
GO

CREATE FUNCTION dbo.fn_poluente_predominante
(
    @estacao_id INT
)
RETURNS VARCHAR(20)
AS
BEGIN
    DECLARE @poluente VARCHAR(20);

    -- Buscar parâmetro com maior IQAr nas últimas 24h
    SELECT TOP 1 @poluente = p.codigo
    FROM (
        SELECT parametro_id, valor,
               ROW_NUMBER() OVER (PARTITION BY parametro_id ORDER BY data_hora DESC) as rn
        FROM medicoes
        WHERE estacao_id = @estacao_id
          AND data_hora >= DATEADD(HOUR, -24, GETDATE())
          AND flag IN ('valid', 'pending')
    ) m
    INNER JOIN parametros p ON m.parametro_id = p.id
    WHERE m.rn = 1
    ORDER BY dbo.fn_calcular_iqar(m.valor, p.codigo) DESC;

    RETURN @poluente;
END;
GO

PRINT 'Funções de IQAr criadas com sucesso!';
GO
