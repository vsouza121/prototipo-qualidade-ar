-- ============================================================
-- SCRIPT DE SEED - DADOS INICIAIS
-- Parâmetros CONAMA 491/2018 e dados de teste
-- VERSÃO 2.0 - Usando MERGE para UPSERT (evita duplicatas)
-- ============================================================

USE qualidade_ar;
GO

-- ============================================================
-- 1. INSERIR/ATUALIZAR PARÂMETROS PADRÃO CONAMA 491/2018
-- ============================================================
PRINT 'Inserindo/Atualizando parâmetros padrão CONAMA...';

-- PM2.5 (Material Particulado Fino)
MERGE parametros AS target
USING (VALUES ('PM25', 'PM2.5', 'Material Particulado Fino', 'µg/m³', 'poluente',
    25, 50, 75, 125, 250, 0, 500, 'Partículas com diâmetro aerodinâmico menor que 2,5 micrômetros', '#FF6B6B', 1, '24horas')) 
AS source (codigo, nome, nome_cientifico, unidade_medida, tipo, limite_bom, limite_moderado, limite_ruim, limite_muito_ruim, limite_pessimo, valor_minimo, valor_maximo, descricao, cor, ordem_exibicao, tipo_media)
ON target.codigo = source.codigo
WHEN MATCHED THEN
    UPDATE SET 
        nome = source.nome,
        nome_cientifico = source.nome_cientifico,
        unidade_medida = source.unidade_medida,
        tipo = source.tipo,
        limite_bom = source.limite_bom,
        limite_moderado = source.limite_moderado,
        limite_ruim = source.limite_ruim,
        limite_muito_ruim = source.limite_muito_ruim,
        limite_pessimo = source.limite_pessimo,
        valor_minimo = source.valor_minimo,
        valor_maximo = source.valor_maximo,
        descricao = source.descricao,
        cor = source.cor,
        ordem_exibicao = source.ordem_exibicao,
        tipo_media = source.tipo_media,
        atualizado_em = GETDATE()
WHEN NOT MATCHED THEN
    INSERT (codigo, nome, nome_cientifico, unidade_medida, tipo, limite_bom, limite_moderado, limite_ruim, limite_muito_ruim, limite_pessimo, valor_minimo, valor_maximo, descricao, cor, ordem_exibicao, tipo_media, ativo, criado_em, atualizado_em)
    VALUES (source.codigo, source.nome, source.nome_cientifico, source.unidade_medida, source.tipo, source.limite_bom, source.limite_moderado, source.limite_ruim, source.limite_muito_ruim, source.limite_pessimo, source.valor_minimo, source.valor_maximo, source.descricao, source.cor, source.ordem_exibicao, source.tipo_media, 1, GETDATE(), GETDATE());

-- PM10 (Material Particulado Inalável)
MERGE parametros AS target
USING (VALUES ('PM10', 'PM10', 'Material Particulado Inalável', 'µg/m³', 'poluente',
    50, 100, 150, 250, 420, 0, 800, 'Partículas com diâmetro aerodinâmico menor que 10 micrômetros', '#FFA94D', 2, '24horas')) 
AS source (codigo, nome, nome_cientifico, unidade_medida, tipo, limite_bom, limite_moderado, limite_ruim, limite_muito_ruim, limite_pessimo, valor_minimo, valor_maximo, descricao, cor, ordem_exibicao, tipo_media)
ON target.codigo = source.codigo
WHEN MATCHED THEN
    UPDATE SET nome = source.nome, nome_cientifico = source.nome_cientifico, unidade_medida = source.unidade_medida, tipo = source.tipo,
        limite_bom = source.limite_bom, limite_moderado = source.limite_moderado, limite_ruim = source.limite_ruim, 
        limite_muito_ruim = source.limite_muito_ruim, limite_pessimo = source.limite_pessimo, valor_minimo = source.valor_minimo, 
        valor_maximo = source.valor_maximo, descricao = source.descricao, cor = source.cor, ordem_exibicao = source.ordem_exibicao, 
        tipo_media = source.tipo_media, atualizado_em = GETDATE()
WHEN NOT MATCHED THEN
    INSERT (codigo, nome, nome_cientifico, unidade_medida, tipo, limite_bom, limite_moderado, limite_ruim, limite_muito_ruim, limite_pessimo, valor_minimo, valor_maximo, descricao, cor, ordem_exibicao, tipo_media, ativo, criado_em, atualizado_em)
    VALUES (source.codigo, source.nome, source.nome_cientifico, source.unidade_medida, source.tipo, source.limite_bom, source.limite_moderado, source.limite_ruim, source.limite_muito_ruim, source.limite_pessimo, source.valor_minimo, source.valor_maximo, source.descricao, source.cor, source.ordem_exibicao, source.tipo_media, 1, GETDATE(), GETDATE());

-- O3 (Ozônio)
MERGE parametros AS target
USING (VALUES ('O3', 'O₃', 'Ozônio', 'µg/m³', 'poluente',
    100, 130, 160, 200, 400, 0, 600, 'Ozônio troposférico - média de 8 horas', '#74C0FC', 3, '8horas')) 
AS source (codigo, nome, nome_cientifico, unidade_medida, tipo, limite_bom, limite_moderado, limite_ruim, limite_muito_ruim, limite_pessimo, valor_minimo, valor_maximo, descricao, cor, ordem_exibicao, tipo_media)
ON target.codigo = source.codigo
WHEN MATCHED THEN
    UPDATE SET nome = source.nome, nome_cientifico = source.nome_cientifico, unidade_medida = source.unidade_medida, tipo = source.tipo,
        limite_bom = source.limite_bom, limite_moderado = source.limite_moderado, limite_ruim = source.limite_ruim, 
        limite_muito_ruim = source.limite_muito_ruim, limite_pessimo = source.limite_pessimo, valor_minimo = source.valor_minimo, 
        valor_maximo = source.valor_maximo, descricao = source.descricao, cor = source.cor, ordem_exibicao = source.ordem_exibicao, 
        tipo_media = source.tipo_media, atualizado_em = GETDATE()
WHEN NOT MATCHED THEN
    INSERT (codigo, nome, nome_cientifico, unidade_medida, tipo, limite_bom, limite_moderado, limite_ruim, limite_muito_ruim, limite_pessimo, valor_minimo, valor_maximo, descricao, cor, ordem_exibicao, tipo_media, ativo, criado_em, atualizado_em)
    VALUES (source.codigo, source.nome, source.nome_cientifico, source.unidade_medida, source.tipo, source.limite_bom, source.limite_moderado, source.limite_ruim, source.limite_muito_ruim, source.limite_pessimo, source.valor_minimo, source.valor_maximo, source.descricao, source.cor, source.ordem_exibicao, source.tipo_media, 1, GETDATE(), GETDATE());

-- NO2 (Dióxido de Nitrogênio)
MERGE parametros AS target
USING (VALUES ('NO2', 'NO₂', 'Dióxido de Nitrogênio', 'µg/m³', 'poluente',
    200, 240, 320, 1130, 2260, 0, 3000, 'Dióxido de nitrogênio - média de 1 hora', '#A9E34B', 4, 'horaria')) 
AS source (codigo, nome, nome_cientifico, unidade_medida, tipo, limite_bom, limite_moderado, limite_ruim, limite_muito_ruim, limite_pessimo, valor_minimo, valor_maximo, descricao, cor, ordem_exibicao, tipo_media)
ON target.codigo = source.codigo
WHEN MATCHED THEN
    UPDATE SET nome = source.nome, nome_cientifico = source.nome_cientifico, unidade_medida = source.unidade_medida, tipo = source.tipo,
        limite_bom = source.limite_bom, limite_moderado = source.limite_moderado, limite_ruim = source.limite_ruim, 
        limite_muito_ruim = source.limite_muito_ruim, limite_pessimo = source.limite_pessimo, valor_minimo = source.valor_minimo, 
        valor_maximo = source.valor_maximo, descricao = source.descricao, cor = source.cor, ordem_exibicao = source.ordem_exibicao, 
        tipo_media = source.tipo_media, atualizado_em = GETDATE()
WHEN NOT MATCHED THEN
    INSERT (codigo, nome, nome_cientifico, unidade_medida, tipo, limite_bom, limite_moderado, limite_ruim, limite_muito_ruim, limite_pessimo, valor_minimo, valor_maximo, descricao, cor, ordem_exibicao, tipo_media, ativo, criado_em, atualizado_em)
    VALUES (source.codigo, source.nome, source.nome_cientifico, source.unidade_medida, source.tipo, source.limite_bom, source.limite_moderado, source.limite_ruim, source.limite_muito_ruim, source.limite_pessimo, source.valor_minimo, source.valor_maximo, source.descricao, source.cor, source.ordem_exibicao, source.tipo_media, 1, GETDATE(), GETDATE());

-- SO2 (Dióxido de Enxofre)
MERGE parametros AS target
USING (VALUES ('SO2', 'SO₂', 'Dióxido de Enxofre', 'µg/m³', 'poluente',
    20, 40, 365, 800, 1600, 0, 2000, 'Dióxido de enxofre - média de 24 horas', '#DA77F2', 5, '24horas')) 
AS source (codigo, nome, nome_cientifico, unidade_medida, tipo, limite_bom, limite_moderado, limite_ruim, limite_muito_ruim, limite_pessimo, valor_minimo, valor_maximo, descricao, cor, ordem_exibicao, tipo_media)
ON target.codigo = source.codigo
WHEN MATCHED THEN
    UPDATE SET nome = source.nome, nome_cientifico = source.nome_cientifico, unidade_medida = source.unidade_medida, tipo = source.tipo,
        limite_bom = source.limite_bom, limite_moderado = source.limite_moderado, limite_ruim = source.limite_ruim, 
        limite_muito_ruim = source.limite_muito_ruim, limite_pessimo = source.limite_pessimo, valor_minimo = source.valor_minimo, 
        valor_maximo = source.valor_maximo, descricao = source.descricao, cor = source.cor, ordem_exibicao = source.ordem_exibicao, 
        tipo_media = source.tipo_media, atualizado_em = GETDATE()
WHEN NOT MATCHED THEN
    INSERT (codigo, nome, nome_cientifico, unidade_medida, tipo, limite_bom, limite_moderado, limite_ruim, limite_muito_ruim, limite_pessimo, valor_minimo, valor_maximo, descricao, cor, ordem_exibicao, tipo_media, ativo, criado_em, atualizado_em)
    VALUES (source.codigo, source.nome, source.nome_cientifico, source.unidade_medida, source.tipo, source.limite_bom, source.limite_moderado, source.limite_ruim, source.limite_muito_ruim, source.limite_pessimo, source.valor_minimo, source.valor_maximo, source.descricao, source.cor, source.ordem_exibicao, source.tipo_media, 1, GETDATE(), GETDATE());

-- CO (Monóxido de Carbono)
MERGE parametros AS target
USING (VALUES ('CO', 'CO', 'Monóxido de Carbono', 'ppm', 'poluente',
    9, 11, 13, 15, 50, 0, 100, 'Monóxido de carbono - média de 8 horas', '#69DB7C', 6, '8horas')) 
AS source (codigo, nome, nome_cientifico, unidade_medida, tipo, limite_bom, limite_moderado, limite_ruim, limite_muito_ruim, limite_pessimo, valor_minimo, valor_maximo, descricao, cor, ordem_exibicao, tipo_media)
ON target.codigo = source.codigo
WHEN MATCHED THEN
    UPDATE SET nome = source.nome, nome_cientifico = source.nome_cientifico, unidade_medida = source.unidade_medida, tipo = source.tipo,
        limite_bom = source.limite_bom, limite_moderado = source.limite_moderado, limite_ruim = source.limite_ruim, 
        limite_muito_ruim = source.limite_muito_ruim, limite_pessimo = source.limite_pessimo, valor_minimo = source.valor_minimo, 
        valor_maximo = source.valor_maximo, descricao = source.descricao, cor = source.cor, ordem_exibicao = source.ordem_exibicao, 
        tipo_media = source.tipo_media, atualizado_em = GETDATE()
WHEN NOT MATCHED THEN
    INSERT (codigo, nome, nome_cientifico, unidade_medida, tipo, limite_bom, limite_moderado, limite_ruim, limite_muito_ruim, limite_pessimo, valor_minimo, valor_maximo, descricao, cor, ordem_exibicao, tipo_media, ativo, criado_em, atualizado_em)
    VALUES (source.codigo, source.nome, source.nome_cientifico, source.unidade_medida, source.tipo, source.limite_bom, source.limite_moderado, source.limite_ruim, source.limite_muito_ruim, source.limite_pessimo, source.valor_minimo, source.valor_maximo, source.descricao, source.cor, source.ordem_exibicao, source.tipo_media, 1, GETDATE(), GETDATE());

PRINT '✅ Parâmetros processados com sucesso!';
GO

-- ============================================================
-- 2. INSERIR/ATUALIZAR UNIDADES
-- ============================================================
PRINT 'Inserindo/Atualizando unidades...';

MERGE unidades AS target
USING (VALUES 
    ('REPLAN', 'REPLAN - Paulínia', 'Refinaria de Paulínia', 'Paulínia', 'SP'),
    ('REDUC', 'REDUC - Duque de Caxias', 'Refinaria Duque de Caxias', 'Duque de Caxias', 'RJ'),
    ('RLAM', 'RLAM - Mataripe', 'Refinaria Landulpho Alves', 'São Francisco do Conde', 'BA'),
    ('REFAP', 'REFAP - Canoas', 'Refinaria Alberto Pasqualini', 'Canoas', 'RS')
) AS source (codigo, nome, descricao, cidade, estado)
ON target.codigo = source.codigo
WHEN MATCHED THEN
    UPDATE SET 
        nome = source.nome,
        descricao = source.descricao,
        cidade = source.cidade,
        estado = source.estado,
        atualizado_em = GETDATE()
WHEN NOT MATCHED THEN
    INSERT (codigo, nome, descricao, cidade, estado, ativo, criado_em, atualizado_em)
    VALUES (source.codigo, source.nome, source.descricao, source.cidade, source.estado, 1, GETDATE(), GETDATE());

PRINT '✅ Unidades processadas com sucesso!';
GO

-- ============================================================
-- 3. INSERIR/ATUALIZAR ESTAÇÕES (UPSERT por código)
-- ============================================================
PRINT 'Inserindo/Atualizando estações...';

-- Lista de códigos válidos (apenas os que queremos manter)
-- Se você renomear uma estação, o código antigo será removido automaticamente
DECLARE @codigos_validos TABLE (codigo VARCHAR(50));
INSERT INTO @codigos_validos VALUES 
    ('REPLAN-01'), ('REPLAN-02'), ('REDUC-01'), ('RLAM-01'), ('REFAP-01');

-- Remover estações que não estão mais na lista de seeds
-- ATENÇÃO: Isso também remove as medições associadas (CASCADE)
-- Se quiser manter histórico, comente este bloco
DELETE FROM estacoes 
WHERE codigo NOT IN (SELECT codigo FROM @codigos_validos)
  AND codigo NOT LIKE 'API-%';  -- Preserva estações importadas de APIs externas

PRINT 'Estações antigas removidas (se houver)';

-- Obter IDs das unidades
DECLARE @unidade_replan INT, @unidade_reduc INT, @unidade_rlam INT, @unidade_refap INT;

SELECT @unidade_replan = id FROM unidades WHERE codigo = 'REPLAN';
SELECT @unidade_reduc = id FROM unidades WHERE codigo = 'REDUC';
SELECT @unidade_rlam = id FROM unidades WHERE codigo = 'RLAM';
SELECT @unidade_refap = id FROM unidades WHERE codigo = 'REFAP';

-- Estação REPLAN-01
MERGE estacoes AS target
USING (VALUES (
    'REPLAN-01',                    -- codigo
    'Estação Norte',                -- nome
    @unidade_replan,                -- unidade_id
    -22.7569,                       -- latitude
    -47.1329,                       -- longitude
    580,                            -- altitude
    'PM25,PM10,O3,NO2,SO2,CO',      -- parametros_monitorados
    5,                              -- intervalo_coleta
    'online',                       -- status
    1,                              -- ativo
    'Estação de monitoramento zona norte da refinaria',  -- descricao
    'Rodovia SP-332, Km 132',       -- endereco
    'Área Industrial',              -- bairro
    NULL,                           -- codigo_externo
    'SEED',                         -- fonte_dados
    'industrial',                   -- tipo_estacao
    'urbana'                        -- classificacao
)) AS source (codigo, nome, unidade_id, latitude, longitude, altitude, parametros_monitorados, intervalo_coleta, status, ativo, descricao, endereco, bairro, codigo_externo, fonte_dados, tipo_estacao, classificacao)
ON target.codigo = source.codigo
WHEN MATCHED THEN
    UPDATE SET 
        nome = source.nome, unidade_id = source.unidade_id, latitude = source.latitude, longitude = source.longitude, 
        altitude = source.altitude, parametros_monitorados = source.parametros_monitorados, intervalo_coleta = source.intervalo_coleta,
        status = source.status, ativo = source.ativo, descricao = source.descricao, endereco = source.endereco, bairro = source.bairro,
        codigo_externo = source.codigo_externo, fonte_dados = source.fonte_dados, tipo_estacao = source.tipo_estacao, 
        classificacao = source.classificacao, atualizado_em = GETDATE()
WHEN NOT MATCHED THEN
    INSERT (codigo, nome, unidade_id, latitude, longitude, altitude, parametros_monitorados, intervalo_coleta, status, ativo, descricao, endereco, bairro, codigo_externo, fonte_dados, tipo_estacao, classificacao, criado_em, atualizado_em)
    VALUES (source.codigo, source.nome, source.unidade_id, source.latitude, source.longitude, source.altitude, source.parametros_monitorados, source.intervalo_coleta, source.status, source.ativo, source.descricao, source.endereco, source.bairro, source.codigo_externo, source.fonte_dados, source.tipo_estacao, source.classificacao, GETDATE(), GETDATE());

-- Estação REPLAN-02
MERGE estacoes AS target
USING (VALUES (
    'REPLAN-02', 'Estação Sul', @unidade_replan, -22.7612, -47.1356, 575,
    'PM25,PM10,O3,NO2,SO2,CO', 5, 'online', 1,
    'Estação de monitoramento zona sul da refinaria',
    'Rodovia SP-332, Km 135', 'Área Industrial', NULL, 'SEED', 'industrial', 'urbana'
)) AS source (codigo, nome, unidade_id, latitude, longitude, altitude, parametros_monitorados, intervalo_coleta, status, ativo, descricao, endereco, bairro, codigo_externo, fonte_dados, tipo_estacao, classificacao)
ON target.codigo = source.codigo
WHEN MATCHED THEN
    UPDATE SET 
        nome = source.nome, unidade_id = source.unidade_id, latitude = source.latitude, longitude = source.longitude, 
        altitude = source.altitude, parametros_monitorados = source.parametros_monitorados, intervalo_coleta = source.intervalo_coleta,
        status = source.status, ativo = source.ativo, descricao = source.descricao, endereco = source.endereco, bairro = source.bairro,
        codigo_externo = source.codigo_externo, fonte_dados = source.fonte_dados, tipo_estacao = source.tipo_estacao, 
        classificacao = source.classificacao, atualizado_em = GETDATE()
WHEN NOT MATCHED THEN
    INSERT (codigo, nome, unidade_id, latitude, longitude, altitude, parametros_monitorados, intervalo_coleta, status, ativo, descricao, endereco, bairro, codigo_externo, fonte_dados, tipo_estacao, classificacao, criado_em, atualizado_em)
    VALUES (source.codigo, source.nome, source.unidade_id, source.latitude, source.longitude, source.altitude, source.parametros_monitorados, source.intervalo_coleta, source.status, source.ativo, source.descricao, source.endereco, source.bairro, source.codigo_externo, source.fonte_dados, source.tipo_estacao, source.classificacao, GETDATE(), GETDATE());

-- Estação REDUC-01
MERGE estacoes AS target
USING (VALUES (
    'REDUC-01', 'Estação Principal', @unidade_reduc, -22.7083, -43.2519, 15,
    'PM25,PM10,O3,NO2,SO2,CO', 5, 'online', 1,
    'Estação principal de monitoramento REDUC',
    'Av. Washington Luiz, s/n', 'Campos Elíseos', NULL, 'SEED', 'industrial', 'urbana'
)) AS source (codigo, nome, unidade_id, latitude, longitude, altitude, parametros_monitorados, intervalo_coleta, status, ativo, descricao, endereco, bairro, codigo_externo, fonte_dados, tipo_estacao, classificacao)
ON target.codigo = source.codigo
WHEN MATCHED THEN
    UPDATE SET 
        nome = source.nome, unidade_id = source.unidade_id, latitude = source.latitude, longitude = source.longitude, 
        altitude = source.altitude, parametros_monitorados = source.parametros_monitorados, intervalo_coleta = source.intervalo_coleta,
        status = source.status, ativo = source.ativo, descricao = source.descricao, endereco = source.endereco, bairro = source.bairro,
        codigo_externo = source.codigo_externo, fonte_dados = source.fonte_dados, tipo_estacao = source.tipo_estacao, 
        classificacao = source.classificacao, atualizado_em = GETDATE()
WHEN NOT MATCHED THEN
    INSERT (codigo, nome, unidade_id, latitude, longitude, altitude, parametros_monitorados, intervalo_coleta, status, ativo, descricao, endereco, bairro, codigo_externo, fonte_dados, tipo_estacao, classificacao, criado_em, atualizado_em)
    VALUES (source.codigo, source.nome, source.unidade_id, source.latitude, source.longitude, source.altitude, source.parametros_monitorados, source.intervalo_coleta, source.status, source.ativo, source.descricao, source.endereco, source.bairro, source.codigo_externo, source.fonte_dados, source.tipo_estacao, source.classificacao, GETDATE(), GETDATE());

-- Estação RLAM-01
MERGE estacoes AS target
USING (VALUES (
    'RLAM-01', 'Estação Costeira', @unidade_rlam, -12.7167, -38.5667, 5,
    'PM25,PM10,O3,NO2,SO2,CO', 5, 'online', 1,
    'Estação costeira de monitoramento RLAM',
    'Rodovia BA-523, Km 4', 'São Francisco do Conde', NULL, 'SEED', 'industrial', 'costeira'
)) AS source (codigo, nome, unidade_id, latitude, longitude, altitude, parametros_monitorados, intervalo_coleta, status, ativo, descricao, endereco, bairro, codigo_externo, fonte_dados, tipo_estacao, classificacao)
ON target.codigo = source.codigo
WHEN MATCHED THEN
    UPDATE SET 
        nome = source.nome, unidade_id = source.unidade_id, latitude = source.latitude, longitude = source.longitude, 
        altitude = source.altitude, parametros_monitorados = source.parametros_monitorados, intervalo_coleta = source.intervalo_coleta,
        status = source.status, ativo = source.ativo, descricao = source.descricao, endereco = source.endereco, bairro = source.bairro,
        codigo_externo = source.codigo_externo, fonte_dados = source.fonte_dados, tipo_estacao = source.tipo_estacao, 
        classificacao = source.classificacao, atualizado_em = GETDATE()
WHEN NOT MATCHED THEN
    INSERT (codigo, nome, unidade_id, latitude, longitude, altitude, parametros_monitorados, intervalo_coleta, status, ativo, descricao, endereco, bairro, codigo_externo, fonte_dados, tipo_estacao, classificacao, criado_em, atualizado_em)
    VALUES (source.codigo, source.nome, source.unidade_id, source.latitude, source.longitude, source.altitude, source.parametros_monitorados, source.intervalo_coleta, source.status, source.ativo, source.descricao, source.endereco, source.bairro, source.codigo_externo, source.fonte_dados, source.tipo_estacao, source.classificacao, GETDATE(), GETDATE());

-- Estação REFAP-01
MERGE estacoes AS target
USING (VALUES (
    'REFAP-01', 'Estação Centro', @unidade_refap, -29.9214, -51.1853, 20,
    'PM25,PM10,O3,NO2,SO2,CO', 5, 'online', 1,
    'Estação central de monitoramento REFAP',
    'Av. Getúlio Vargas, 11001', 'Brigadeira', NULL, 'SEED', 'industrial', 'urbana'
)) AS source (codigo, nome, unidade_id, latitude, longitude, altitude, parametros_monitorados, intervalo_coleta, status, ativo, descricao, endereco, bairro, codigo_externo, fonte_dados, tipo_estacao, classificacao)
ON target.codigo = source.codigo
WHEN MATCHED THEN
    UPDATE SET 
        nome = source.nome, unidade_id = source.unidade_id, latitude = source.latitude, longitude = source.longitude, 
        altitude = source.altitude, parametros_monitorados = source.parametros_monitorados, intervalo_coleta = source.intervalo_coleta,
        status = source.status, ativo = source.ativo, descricao = source.descricao, endereco = source.endereco, bairro = source.bairro,
        codigo_externo = source.codigo_externo, fonte_dados = source.fonte_dados, tipo_estacao = source.tipo_estacao, 
        classificacao = source.classificacao, atualizado_em = GETDATE()
WHEN NOT MATCHED THEN
    INSERT (codigo, nome, unidade_id, latitude, longitude, altitude, parametros_monitorados, intervalo_coleta, status, ativo, descricao, endereco, bairro, codigo_externo, fonte_dados, tipo_estacao, classificacao, criado_em, atualizado_em)
    VALUES (source.codigo, source.nome, source.unidade_id, source.latitude, source.longitude, source.altitude, source.parametros_monitorados, source.intervalo_coleta, source.status, source.ativo, source.descricao, source.endereco, source.bairro, source.codigo_externo, source.fonte_dados, source.tipo_estacao, source.classificacao, GETDATE(), GETDATE());

PRINT '✅ Estações processadas com sucesso!';
GO

-- ============================================================
-- 4. GERAR MEDIÇÕES DE EXEMPLO (últimas 24 horas)
-- ============================================================
PRINT 'Gerando medições de exemplo...';

DECLARE @estacao_id INT;
DECLARE @parametro_id INT;
DECLARE @data_hora DATETIME;
DECLARE @valor DECIMAL(12, 4);
DECLARE @i INT;
DECLARE @hora INT;

-- Cursor para estações
DECLARE cur_estacoes CURSOR FOR
    SELECT id FROM estacoes WHERE ativo = 1;

OPEN cur_estacoes;
FETCH NEXT FROM cur_estacoes INTO @estacao_id;

WHILE @@FETCH_STATUS = 0
BEGIN
    -- Para cada parâmetro
    DECLARE cur_parametros CURSOR FOR
        SELECT id FROM parametros WHERE ativo = 1;
    
    OPEN cur_parametros;
    FETCH NEXT FROM cur_parametros INTO @parametro_id;
    
    WHILE @@FETCH_STATUS = 0
    BEGIN
        -- Gerar medições das últimas 24 horas (a cada 5 minutos)
        SET @i = 0;
        WHILE @i < 288  -- 24 horas * 12 medições por hora
        BEGIN
            SET @data_hora = DATEADD(MINUTE, -(@i * 5), GETDATE());
            
            -- Gerar valor baseado no parâmetro
            SELECT @valor = CASE codigo
                WHEN 'PM25' THEN 8 + (RAND(CHECKSUM(NEWID())) * 30)
                WHEN 'PM10' THEN 20 + (RAND(CHECKSUM(NEWID())) * 50)
                WHEN 'O3' THEN 30 + (RAND(CHECKSUM(NEWID())) * 80)
                WHEN 'NO2' THEN 10 + (RAND(CHECKSUM(NEWID())) * 40)
                WHEN 'SO2' THEN 5 + (RAND(CHECKSUM(NEWID())) * 25)
                WHEN 'CO' THEN 0.2 + (RAND(CHECKSUM(NEWID())) * 0.8)
                ELSE 10
            END
            FROM parametros WHERE id = @parametro_id;
            
            -- Verificar se já existe medição nessa data/hora
            IF NOT EXISTS (
                SELECT 1 FROM medicoes 
                WHERE estacao_id = @estacao_id 
                  AND parametro_id = @parametro_id 
                  AND data_hora = @data_hora
            )
            BEGIN
                INSERT INTO medicoes (estacao_id, parametro_id, valor, data_hora, flag, criado_em, atualizado_em)
                VALUES (@estacao_id, @parametro_id, @valor, @data_hora, 'pending', GETDATE(), GETDATE());
            END
            
            SET @i = @i + 1;
        END
        
        FETCH NEXT FROM cur_parametros INTO @parametro_id;
    END
    
    CLOSE cur_parametros;
    DEALLOCATE cur_parametros;
    
    FETCH NEXT FROM cur_estacoes INTO @estacao_id;
END

CLOSE cur_estacoes;
DEALLOCATE cur_estacoes;

PRINT 'Medições de exemplo geradas!';
GO

-- ============================================================
-- 5. ATUALIZAR IQAr E CLASSIFICAÇÃO DAS MEDIÇÕES
-- ============================================================
PRINT 'Calculando IQAr para todas as medições...';

UPDATE m
SET 
    iqar_calculado = dbo.fn_calcular_iqar(m.valor, p.codigo),
    classificacao_iqar = dbo.fn_classificacao_iqar(dbo.fn_calcular_iqar(m.valor, p.codigo)),
    atualizado_em = GETDATE()
FROM medicoes m
INNER JOIN parametros p ON m.parametro_id = p.id
WHERE m.iqar_calculado IS NULL;

-- Auto-validar medições boas
UPDATE medicoes
SET flag = 'valid',
    atualizado_em = GETDATE()
WHERE flag = 'pending'
  AND iqar_calculado IS NOT NULL
  AND iqar_calculado <= 80;

PRINT 'IQAr calculado e medições validadas!';
GO

-- ============================================================
-- 6. ATUALIZAR ÚLTIMA COMUNICAÇÃO DAS ESTAÇÕES
-- ============================================================
UPDATE e
SET ultima_comunicacao = (
    SELECT MAX(data_hora) FROM medicoes WHERE estacao_id = e.id
)
FROM estacoes e;

PRINT 'Última comunicação das estações atualizada!';
GO

-- ============================================================
-- 7. CRIAR ALGUNS ALERTAS DE EXEMPLO
-- ============================================================
PRINT 'Criando alertas de exemplo...';

-- Verificar se há medições com IQAr alto para gerar alertas
INSERT INTO alertas (estacao_id, parametro_id, tipo, nivel, titulo, mensagem, valor_detectado, valor_limite, criado_em, atualizado_em)
SELECT TOP 3
    m.estacao_id,
    m.parametro_id,
    'ULTRAPASSAGEM_LIMITE',
    CASE 
        WHEN m.iqar_calculado > 200 THEN 'critical'
        WHEN m.iqar_calculado > 120 THEN 'warning'
        ELSE 'info'
    END,
    'Ultrapassagem de Limite - ' + p.nome,
    e.codigo + ': Concentração de ' + p.nome + ' está em nível ' + m.classificacao_iqar,
    m.valor,
    p.limite_ruim,
    DATEADD(MINUTE, -5, GETDATE()),
    DATEADD(MINUTE, -5, GETDATE())
FROM medicoes m
INNER JOIN parametros p ON m.parametro_id = p.id
INNER JOIN estacoes e ON m.estacao_id = e.id
WHERE m.iqar_calculado > 80
  AND m.data_hora >= DATEADD(HOUR, -24, GETDATE())
  AND NOT EXISTS (
      SELECT 1 FROM alertas a 
      WHERE a.estacao_id = m.estacao_id 
        AND a.parametro_id = m.parametro_id
        AND a.tipo = 'ULTRAPASSAGEM_LIMITE'
  )
ORDER BY m.iqar_calculado DESC;

-- Alerta de dados pendentes
IF NOT EXISTS (SELECT 1 FROM alertas WHERE tipo = 'DADOS_PENDENTES')
BEGIN
    INSERT INTO alertas (estacao_id, tipo, nivel, titulo, mensagem, criado_em, atualizado_em)
    SELECT TOP 1
        e.id,
        'DADOS_PENDENTES',
        'warning',
        'Dados Pendentes de Validação',
        e.codigo + ': ' + CAST((SELECT COUNT(*) FROM medicoes WHERE estacao_id = e.id AND flag = 'pending') AS VARCHAR) + ' registros aguardando validação',
        DATEADD(MINUTE, -15, GETDATE()),
        DATEADD(MINUTE, -15, GETDATE())
    FROM estacoes e
    WHERE EXISTS (SELECT 1 FROM medicoes WHERE estacao_id = e.id AND flag = 'pending');
END

PRINT 'Alertas criados com sucesso!';
GO

PRINT '';
PRINT '============================================================';
PRINT 'SEED CONCLUÍDO COM SUCESSO!';
PRINT '============================================================';
PRINT '';
GO
