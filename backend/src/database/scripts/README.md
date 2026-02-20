# Scripts de Banco de Dados - Sistema de Qualidade do Ar

## Visão Geral

Este diretório contém todos os scripts SQL necessários para configurar o banco de dados SQL Server com funções, procedures, triggers e views para o sistema de monitoramento de qualidade do ar.

## Pré-requisitos

- SQL Server 2016 ou superior
- Banco de dados `qualidade_ar` criado
- Tabelas do Sequelize sincronizadas (execute `npm run dev` primeiro)

## Ordem de Execução

Execute os scripts na seguinte ordem:

| # | Script | Descrição |
|---|--------|-----------|
| 00 | `00_master.sql` | Cria o banco de dados (se não existir) |
| 01 | `01_funcoes_iqar.sql` | Funções para cálculo de IQAr |
| 02 | `02_procedures.sql` | Stored Procedures principais |
| 03 | `03_triggers.sql` | Triggers automáticos |
| 04 | `04_views.sql` | Views para consultas e relatórios |
| 05 | `05_seed_dados.sql` | Dados iniciais (parâmetros CONAMA, unidades, estações de exemplo) |
| 06 | `06_jobs_manutencao.sql` | Jobs de manutenção automática |

## Detalhamento dos Scripts

### 01_funcoes_iqar.sql

Funções para cálculo do Índice de Qualidade do Ar (IQAr):

| Função | Descrição |
|--------|-----------|
| `fn_calcular_iqar(valor, parametro_codigo)` | Calcula o IQAr baseado no valor e limites CONAMA |
| `fn_classificacao_iqar(iqar)` | Retorna classificação: Bom, Moderado, Ruim, Muito Ruim, Péssimo |
| `fn_cor_iqar(iqar)` | Retorna cor hexadecimal para o IQAr |
| `fn_iqar_estacao(estacao_id)` | Calcula IQAr geral da estação (pior caso) |
| `fn_disponibilidade_estacao(estacao_id, horas)` | Calcula % de disponibilidade de dados |
| `fn_poluente_predominante(estacao_id)` | Retorna poluente com maior IQAr |

### 02_procedures.sql

Stored Procedures para processamento de dados:

| Procedure | Descrição |
|-----------|-----------|
| `sp_inserir_medicao` | Insere medição com validação automática e cálculo de IQAr |
| `sp_inserir_medicoes_lote` | Insere lote de medições de uma estação |
| `sp_verificar_alerta_medicao` | Verifica se medição precisa gerar alerta |
| `sp_verificar_estacoes_offline` | Detecta estações sem comunicação |
| `sp_verificar_disponibilidade` | Verifica estações com baixa disponibilidade |
| `sp_validar_medicoes_auto` | Auto-valida medições dentro dos limites |
| `sp_dashboard_resumo` | Retorna dados resumidos para dashboard |

### 03_triggers.sql

Triggers para processamento automático:

| Trigger | Evento | Descrição |
|---------|--------|-----------|
| `tr_medicao_calcular_iqar` | AFTER INSERT | Calcula IQAr automaticamente |
| `tr_medicao_atualizar_estacao` | AFTER INSERT | Atualiza última comunicação da estação |
| `tr_medicao_gerar_alerta` | AFTER INSERT/UPDATE | Gera alertas para valores críticos |
| `tr_resolver_alertas_automatico` | AFTER INSERT | Resolve alertas quando valores melhoram |
| `tr_medicao_validacao_auto` | AFTER INSERT | Valida/invalida medições automaticamente |
| `tr_alerta_auditoria` | AFTER UPDATE | Registra quando alerta é lido |

### 04_views.sql

Views para consultas e relatórios:

| View | Descrição |
|------|-----------|
| `vw_medicoes_tempo_real` | Última medição de cada parâmetro por estação |
| `vw_iqar_estacoes` | IQAr e classificação de todas as estações |
| `vw_disponibilidade_estacoes` | Disponibilidade de dados (24h, 7d, 30d) |
| `vw_alertas_ativos` | Alertas não resolvidos com detalhes |
| `vw_estatisticas_diarias` | Estatísticas diárias por estação/parâmetro |
| `vw_historico_horario` | Médias horárias dos últimos 7 dias |
| `vw_dashboard_resumo` | Resumo geral para dashboard |
| `vw_medicoes_pivot` | Medições em formato pivotado (PM2.5, PM10, etc.) |

### 05_seed_dados.sql

Dados iniciais:

- **Parâmetros CONAMA 491/2018**: PM2.5, PM10, O₃, NO₂, SO₂, CO com limites oficiais
- **Unidades de exemplo**: REPLAN, REDUC, RLAM, REFAP
- **Estações de exemplo**: 5 estações com coordenadas reais
- **Medições de teste**: 24 horas de dados simulados
- **Alertas de exemplo**: Para visualização inicial

### 06_jobs_manutencao.sql

Procedures para manutenção:

| Procedure | Frequência | Descrição |
|-----------|------------|-----------|
| `sp_job_manutencao` | 5 minutos | Verifica offline, disponibilidade, calcula IQAr |
| `sp_agregar_dados_horarios` | 1 hora | Agrega medições em tabela de histórico |
| `sp_limpeza_dados_antigos` | 1 dia | Remove dados antigos (configurável) |
| `sp_relatorio_diario` | 1 dia | Gera relatório do dia anterior |
| `sp_recalcular_iqar` | Manual | Recalcula IQAr de medições (emergência) |

## Exemplo de Uso

### Inserir medição via Procedure

```sql
DECLARE @medicao_id BIGINT;
EXEC sp_inserir_medicao 
    @estacao_id = 1,
    @parametro_codigo = 'PM25',
    @valor = 25.5,
    @data_hora = '2026-02-14 10:00:00',
    @medicao_id = @medicao_id OUTPUT;

SELECT @medicao_id AS nova_medicao;
```

### Inserir lote de medições (de sensor)

```sql
EXEC sp_inserir_medicoes_lote 
    @estacao_codigo = 'REPLAN-01',
    @data_hora = '2026-02-14 10:05:00',
    @pm25 = 18.2,
    @pm10 = 35.4,
    @o3 = 45.0,
    @no2 = 22.1,
    @so2 = 8.5,
    @co = 0.4;
```

### Consultar medições em tempo real

```sql
SELECT * FROM vw_medicoes_tempo_real 
WHERE unidade_nome = 'REPLAN - Paulínia'
ORDER BY estacao_codigo, parametro_codigo;
```

### Consultar IQAr das estações

```sql
SELECT * FROM vw_iqar_estacoes ORDER BY iqar DESC;
```

### Verificar disponibilidade

```sql
SELECT * FROM vw_disponibilidade_estacoes
WHERE disponibilidade_24h < 90
ORDER BY disponibilidade_24h;
```

### Dashboard resumo

```sql
SELECT * FROM vw_dashboard_resumo;
```

## Configuração de Jobs no SQL Server Agent

```sql
-- A cada 5 minutos
EXEC dbo.sp_job_manutencao;

-- A cada hora
EXEC dbo.sp_agregar_dados_horarios;

-- Uma vez por dia (00:30)
EXEC dbo.sp_limpeza_dados_antigos;

-- Uma vez por dia (06:00)
EXEC dbo.sp_relatorio_diario;
```

## Limites CONAMA 491/2018

| Parâmetro | Bom | Moderado | Ruim | Muito Ruim | Péssimo | Unidade |
|-----------|-----|----------|------|------------|---------|---------|
| PM2.5 | 0-25 | 26-50 | 51-75 | 76-125 | >125 | µg/m³ |
| PM10 | 0-50 | 51-100 | 101-150 | 151-250 | >250 | µg/m³ |
| O₃ | 0-100 | 101-130 | 131-160 | 161-200 | >200 | µg/m³ |
| NO₂ | 0-200 | 201-240 | 241-320 | 321-1130 | >1130 | µg/m³ |
| SO₂ | 0-20 | 21-40 | 41-365 | 366-800 | >800 | µg/m³ |
| CO | 0-9 | 9-11 | 11-13 | 13-15 | >15 | ppm |

## Faixas de IQAr

| Faixa | Classificação | Cor |
|-------|---------------|-----|
| 0-40 | Bom | Verde (#00E400) |
| 41-80 | Moderado | Amarelo (#FFFF00) |
| 81-120 | Ruim | Laranja (#FF7E00) |
| 121-200 | Muito Ruim | Vermelho (#FF0000) |
| >200 | Péssimo | Roxo (#8F3F97) |
