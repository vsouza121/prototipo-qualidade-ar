-- ============================================================
-- SCRIPT DE VIEWS
-- Views para Dashboard, Relatórios e Consultas
-- ============================================================

USE qualidade_ar;
GO

-- ============================================================
-- 1. VIEW: Medições em tempo real por estação
-- ============================================================
IF OBJECT_ID('dbo.vw_medicoes_tempo_real', 'V') IS NOT NULL
    DROP VIEW dbo.vw_medicoes_tempo_real;
GO

CREATE VIEW dbo.vw_medicoes_tempo_real
AS
WITH UltimasMedicoes AS (
    SELECT 
        m.estacao_id,
        m.parametro_id,
        m.valor,
        m.data_hora,
        m.flag,
        m.iqar_calculado,
        m.classificacao_iqar,
        ROW_NUMBER() OVER (PARTITION BY m.estacao_id, m.parametro_id ORDER BY m.data_hora DESC) AS rn
    FROM medicoes m
    WHERE m.data_hora >= DATEADD(HOUR, -24, GETDATE())
      AND m.flag IN ('valid', 'pending')
)
SELECT 
    e.id AS estacao_id,
    e.codigo AS estacao_codigo,
    e.nome AS estacao_nome,
    u.nome AS unidade_nome,
    p.codigo AS parametro_codigo,
    p.nome AS parametro_nome,
    p.unidade_medida,
    um.valor,
    um.data_hora,
    um.flag,
    um.iqar_calculado,
    um.classificacao_iqar,
    dbo.fn_cor_iqar(um.iqar_calculado) AS cor_iqar,
    e.latitude,
    e.longitude,
    e.status AS estacao_status
FROM UltimasMedicoes um
INNER JOIN estacoes e ON um.estacao_id = e.id
INNER JOIN unidades u ON e.unidade_id = u.id
INNER JOIN parametros p ON um.parametro_id = p.id
WHERE um.rn = 1
  AND e.ativo = 1;
GO

-- ============================================================
-- 2. VIEW: Resumo IQAr por estação
-- ============================================================
IF OBJECT_ID('dbo.vw_iqar_estacoes', 'V') IS NOT NULL
    DROP VIEW dbo.vw_iqar_estacoes;
GO

CREATE VIEW dbo.vw_iqar_estacoes
AS
SELECT 
    e.id,
    e.codigo,
    e.nome,
    u.id AS unidade_id,
    u.nome AS unidade_nome,
    e.latitude,
    e.longitude,
    e.status,
    e.ultima_comunicacao,
    dbo.fn_iqar_estacao(e.id) AS iqar,
    dbo.fn_classificacao_iqar(dbo.fn_iqar_estacao(e.id)) AS classificacao,
    dbo.fn_cor_iqar(dbo.fn_iqar_estacao(e.id)) AS cor,
    dbo.fn_poluente_predominante(e.id) AS poluente_predominante,
    dbo.fn_disponibilidade_estacao(e.id, 24) AS disponibilidade_24h
FROM estacoes e
INNER JOIN unidades u ON e.unidade_id = u.id
WHERE e.ativo = 1;
GO

-- ============================================================
-- 3. VIEW: Disponibilidade de dados por estação
-- ============================================================
IF OBJECT_ID('dbo.vw_disponibilidade_estacoes', 'V') IS NOT NULL
    DROP VIEW dbo.vw_disponibilidade_estacoes;
GO

CREATE VIEW dbo.vw_disponibilidade_estacoes
AS
SELECT 
    e.id AS estacao_id,
    e.codigo,
    e.nome,
    u.nome AS unidade_nome,
    e.status,
    e.intervalo_coleta,
    dbo.fn_disponibilidade_estacao(e.id, 24) AS disponibilidade_24h,
    dbo.fn_disponibilidade_estacao(e.id, 168) AS disponibilidade_7d,
    dbo.fn_disponibilidade_estacao(e.id, 720) AS disponibilidade_30d,
    (SELECT COUNT(*) FROM medicoes WHERE estacao_id = e.id AND CAST(data_hora AS DATE) = CAST(GETDATE() AS DATE)) AS medicoes_hoje,
    (SELECT MAX(data_hora) FROM medicoes WHERE estacao_id = e.id) AS ultima_medicao
FROM estacoes e
INNER JOIN unidades u ON e.unidade_id = u.id
WHERE e.ativo = 1;
GO

-- ============================================================
-- 4. VIEW: Alertas ativos com detalhes
-- ============================================================
IF OBJECT_ID('dbo.vw_alertas_ativos', 'V') IS NOT NULL
    DROP VIEW dbo.vw_alertas_ativos;
GO

CREATE VIEW dbo.vw_alertas_ativos
AS
SELECT 
    a.id,
    a.tipo,
    a.nivel,
    a.titulo,
    a.mensagem,
    a.valor_detectado,
    a.valor_limite,
    a.lido,
    a.criado_em,
    e.codigo AS estacao_codigo,
    e.nome AS estacao_nome,
    u.nome AS unidade_nome,
    p.codigo AS parametro_codigo,
    p.nome AS parametro_nome,
    DATEDIFF(MINUTE, a.criado_em, GETDATE()) AS minutos_atras
FROM alertas a
LEFT JOIN estacoes e ON a.estacao_id = e.id
LEFT JOIN unidades u ON e.unidade_id = u.id
LEFT JOIN parametros p ON a.parametro_id = p.id
WHERE a.resolvido = 0
ORDER BY 
    CASE a.nivel WHEN 'critical' THEN 1 WHEN 'warning' THEN 2 ELSE 3 END,
    a.criado_em DESC
OFFSET 0 ROWS;
GO

-- ============================================================
-- 5. VIEW: Estatísticas diárias por parâmetro
-- ============================================================
IF OBJECT_ID('dbo.vw_estatisticas_diarias', 'V') IS NOT NULL
    DROP VIEW dbo.vw_estatisticas_diarias;
GO

CREATE VIEW dbo.vw_estatisticas_diarias
AS
SELECT 
    CAST(m.data_hora AS DATE) AS data,
    e.id AS estacao_id,
    e.codigo AS estacao_codigo,
    p.codigo AS parametro_codigo,
    p.nome AS parametro_nome,
    COUNT(*) AS total_medicoes,
    AVG(m.valor) AS media,
    MIN(m.valor) AS minimo,
    MAX(m.valor) AS maximo,
    STDEV(m.valor) AS desvio_padrao,
    AVG(CAST(m.iqar_calculado AS FLOAT)) AS media_iqar,
    SUM(CASE WHEN m.flag = 'valid' THEN 1 ELSE 0 END) AS validados,
    SUM(CASE WHEN m.flag = 'pending' THEN 1 ELSE 0 END) AS pendentes,
    SUM(CASE WHEN m.flag IN ('invalid', 'auto_invalid') THEN 1 ELSE 0 END) AS invalidos
FROM medicoes m
INNER JOIN estacoes e ON m.estacao_id = e.id
INNER JOIN parametros p ON m.parametro_id = p.id
WHERE m.data_hora >= DATEADD(DAY, -90, GETDATE())
GROUP BY 
    CAST(m.data_hora AS DATE),
    e.id,
    e.codigo,
    p.codigo,
    p.nome;
GO

-- ============================================================
-- 6. VIEW: Histórico horário de medições
-- ============================================================
IF OBJECT_ID('dbo.vw_historico_horario', 'V') IS NOT NULL
    DROP VIEW dbo.vw_historico_horario;
GO

CREATE VIEW dbo.vw_historico_horario
AS
SELECT 
    CAST(m.data_hora AS DATE) AS data,
    DATEPART(HOUR, m.data_hora) AS hora,
    e.id AS estacao_id,
    e.codigo AS estacao_codigo,
    p.codigo AS parametro_codigo,
    COUNT(*) AS total_medicoes,
    AVG(m.valor) AS media,
    MIN(m.valor) AS minimo,
    MAX(m.valor) AS maximo,
    AVG(CAST(m.iqar_calculado AS FLOAT)) AS media_iqar
FROM medicoes m
INNER JOIN estacoes e ON m.estacao_id = e.id
INNER JOIN parametros p ON m.parametro_id = p.id
WHERE m.data_hora >= DATEADD(DAY, -7, GETDATE())
  AND m.flag IN ('valid', 'pending')
GROUP BY 
    CAST(m.data_hora AS DATE),
    DATEPART(HOUR, m.data_hora),
    e.id,
    e.codigo,
    p.codigo;
GO

-- ============================================================
-- 7. VIEW: Dashboard resumo geral
-- ============================================================
IF OBJECT_ID('dbo.vw_dashboard_resumo', 'V') IS NOT NULL
    DROP VIEW dbo.vw_dashboard_resumo;
GO

CREATE VIEW dbo.vw_dashboard_resumo
AS
SELECT 
    (SELECT COUNT(*) FROM estacoes WHERE ativo = 1) AS total_estacoes,
    (SELECT COUNT(*) FROM estacoes WHERE ativo = 1 AND status = 'online') AS estacoes_online,
    (SELECT COUNT(*) FROM estacoes WHERE ativo = 1 AND status = 'offline') AS estacoes_offline,
    (SELECT COUNT(*) FROM estacoes WHERE ativo = 1 AND status = 'manutencao') AS estacoes_manutencao,
    (SELECT COUNT(*) FROM alertas WHERE resolvido = 0) AS alertas_ativos,
    (SELECT COUNT(*) FROM alertas WHERE resolvido = 0 AND nivel = 'critical') AS alertas_criticos,
    (SELECT COUNT(*) FROM medicoes WHERE CAST(data_hora AS DATE) = CAST(GETDATE() AS DATE)) AS medicoes_hoje,
    (SELECT COUNT(*) FROM medicoes WHERE CAST(data_hora AS DATE) = CAST(GETDATE() AS DATE) AND flag = 'pending') AS pendentes_validacao,
    (SELECT AVG(dbo.fn_disponibilidade_estacao(id, 24)) FROM estacoes WHERE ativo = 1) AS disponibilidade_media;
GO

-- ============================================================
-- 8. VIEW: Pivot de medições por estação (última leitura)
-- ============================================================
IF OBJECT_ID('dbo.vw_medicoes_pivot', 'V') IS NOT NULL
    DROP VIEW dbo.vw_medicoes_pivot;
GO

CREATE VIEW dbo.vw_medicoes_pivot
AS
WITH UltimasMedicoes AS (
    SELECT 
        m.estacao_id,
        p.codigo AS param,
        m.valor,
        m.data_hora,
        m.iqar_calculado,
        m.classificacao_iqar,
        ROW_NUMBER() OVER (PARTITION BY m.estacao_id, m.parametro_id ORDER BY m.data_hora DESC) AS rn
    FROM medicoes m
    INNER JOIN parametros p ON m.parametro_id = p.id
    WHERE m.data_hora >= DATEADD(HOUR, -24, GETDATE())
      AND m.flag IN ('valid', 'pending')
)
SELECT 
    e.id AS estacao_id,
    e.codigo AS estacao_codigo,
    e.nome AS estacao_nome,
    u.nome AS unidade_nome,
    MAX(CASE WHEN um.param = 'PM25' THEN um.valor END) AS PM25,
    MAX(CASE WHEN um.param = 'PM10' THEN um.valor END) AS PM10,
    MAX(CASE WHEN um.param = 'O3' THEN um.valor END) AS O3,
    MAX(CASE WHEN um.param = 'NO2' THEN um.valor END) AS NO2,
    MAX(CASE WHEN um.param = 'SO2' THEN um.valor END) AS SO2,
    MAX(CASE WHEN um.param = 'CO' THEN um.valor END) AS CO,
    MAX(um.data_hora) AS ultima_atualizacao,
    dbo.fn_iqar_estacao(e.id) AS iqar_geral,
    dbo.fn_classificacao_iqar(dbo.fn_iqar_estacao(e.id)) AS classificacao_geral,
    dbo.fn_cor_iqar(dbo.fn_iqar_estacao(e.id)) AS cor_iqar
FROM estacoes e
INNER JOIN unidades u ON e.unidade_id = u.id
LEFT JOIN UltimasMedicoes um ON e.id = um.estacao_id AND um.rn = 1
WHERE e.ativo = 1
GROUP BY e.id, e.codigo, e.nome, u.nome;
GO

PRINT 'Views criadas com sucesso!';
GO
