-- ============================================================
-- SCRIPT MASTER - EXECUTAR TODOS OS SCRIPTS
-- Este script deve ser executado no SQL Server Management Studio
-- ============================================================

USE master;
GO

-- Criar banco de dados se não existir
IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'qualidade_ar')
BEGIN
    CREATE DATABASE qualidade_ar;
    PRINT 'Banco de dados qualidade_ar criado!';
END
ELSE
BEGIN
    PRINT 'Banco de dados qualidade_ar já existe.';
END
GO

USE qualidade_ar;
GO

PRINT '';
PRINT '============================================================';
PRINT 'INICIANDO CRIAÇÃO DE ESTRUTURAS DO BANCO';
PRINT '============================================================';
PRINT '';

-- ============================================================
-- NOTA: Execute cada script separadamente na ordem abaixo
-- ou use :r para incluir os arquivos (modo SQLCMD)
-- ============================================================

/*
INSTRUÇÕES:
1. Execute este script primeiro para criar o banco de dados
2. Em seguida, execute os scripts na seguinte ordem:
   - 01_funcoes_iqar.sql      (Funções de cálculo de IQAr)
   - 02_procedures.sql        (Stored Procedures)
   - 03_triggers.sql          (Triggers automáticos)
   - 04_views.sql             (Views para consultas)
   - 05_seed_dados.sql        (Dados iniciais e de teste)
   - 06_jobs_manutencao.sql   (Jobs de manutenção)

Ou, se estiver usando modo SQLCMD no SSMS, ative-o em:
Query > SQLCMD Mode

E execute as linhas abaixo removendo os comentários:
*/

-- :r "01_funcoes_iqar.sql"
-- :r "02_procedures.sql"
-- :r "03_triggers.sql"
-- :r "04_views.sql"
-- :r "05_seed_dados.sql"
-- :r "06_jobs_manutencao.sql"

PRINT '============================================================';
PRINT 'ESTRUTURAS DE APOIO PRONTAS PARA CRIAÇÃO';
PRINT '============================================================';
PRINT '';
PRINT 'Execute os scripts 01 a 06 na ordem para completar a configuração.';
PRINT '';
GO
