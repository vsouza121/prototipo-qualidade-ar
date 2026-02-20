# 📋 Divisão de Tarefas - Backend

## Sistema de Gestão de Qualidade do Ar - Acoem Brasil

**Data:** 12/02/2026  
**Time:** 3 desenvolvedores backend  
**Tecnologias Sugeridas:** Node.js/Python, PostgreSQL, Redis, JWT, WebSocket

---

## 👤 DESENVOLVEDOR 1 - Core & Autenticação

### Responsabilidades
Responsável pela base da aplicação, segurança e gerenciamento de usuários.

---

### 📌 Tarefa 1.1: Configuração do Projeto e Banco de Dados
**Prioridade:** 🔴 ALTA | **Estimativa:** 3 dias

**O que fazer:**
1. Criar estrutura do projeto backend (pastas, configs, Docker)
2. Configurar banco de dados PostgreSQL
3. Criar migrations para todas as tabelas:
   - `usuarios` (id, nome, email, senha_hash, role, ativo, criado_em, atualizado_em)
   - `estacoes` (id, nome, codigo, latitude, longitude, unidade_id, ativo, criado_em)
   - `unidades` (id, nome, codigo, endereco, cidade, estado)
   - `parametros` (id, nome, unidade_medida, limite_bom, limite_moderado, limite_ruim, limite_pessimo)
   - `medicoes` (id, estacao_id, parametro_id, valor, data_hora, validado, validado_por, flag)
   - `alertas` (id, estacao_id, tipo, mensagem, nivel, lido, criado_em)
   - `logs_auditoria` (id, usuario_id, acao, tabela, registro_id, dados_anteriores, dados_novos, ip, criado_em)
4. Configurar Redis para cache e sessões
5. Criar seeds com dados iniciais (usuário admin, parâmetros padrão)

**Entregáveis:**
- [ ] Docker-compose com PostgreSQL e Redis
- [ ] Todas as migrations criadas e testadas
- [ ] Documentação do schema do banco
- [ ] Seeds com dados iniciais

---

### 📌 Tarefa 1.2: Sistema de Autenticação
**Prioridade:** 🔴 ALTA | **Estimativa:** 4 dias

**O que fazer:**
1. **Endpoints de autenticação:**
   - `POST /api/auth/login` - Login com email/senha
   - `POST /api/auth/logout` - Logout (invalidar token)
   - `POST /api/auth/refresh` - Renovar token JWT
   - `POST /api/auth/forgot-password` - Solicitar recuperação
   - `POST /api/auth/reset-password` - Definir nova senha
   - `POST /api/auth/verify-2fa` - Verificar código 2FA (se habilitado)

2. **Implementar:**
   - JWT com access token (15min) + refresh token (7 dias)
   - Hash de senhas com bcrypt (salt rounds: 12)
   - Rate limiting para prevenir brute force (5 tentativas/15min)
   - Blacklist de tokens invalidados (Redis)
   - Validação de força da senha (min 8 chars, maiúscula, número, especial)

3. **Middleware de autenticação:**
   - Verificar JWT em rotas protegidas
   - Extrair e disponibilizar dados do usuário na request
   - Log de todas as tentativas de login (sucesso/falha)

**Entregáveis:**
- [ ] Todos os endpoints funcionando
- [ ] Middleware de autenticação
- [ ] Testes unitários com cobertura > 80%
- [ ] Documentação da API (Swagger/OpenAPI)

---

### 📌 Tarefa 1.3: Gerenciamento de Usuários (CRUD)
**Prioridade:** 🟡 MÉDIA | **Estimativa:** 3 dias

**O que fazer:**
1. **Endpoints CRUD:**
   - `GET /api/usuarios` - Listar usuários (admin) com paginação e filtros
   - `GET /api/usuarios/:id` - Buscar usuário por ID
   - `POST /api/usuarios` - Criar novo usuário (admin)
   - `PUT /api/usuarios/:id` - Atualizar usuário
   - `DELETE /api/usuarios/:id` - Desativar usuário (soft delete)
   - `GET /api/usuarios/me` - Dados do usuário logado
   - `PUT /api/usuarios/me` - Atualizar próprio perfil
   - `PUT /api/usuarios/me/password` - Alterar própria senha

2. **Sistema de roles:**
   - `admin` - Acesso total ao sistema
   - `supervisor` - Gerenciar estações e validar dados
   - `analista` - Visualizar e exportar dados
   - `operador` - Apenas visualização

3. **Funcionalidades:**
   - Paginação (limit, offset)
   - Filtros (nome, email, role, ativo, unidade)
   - Ordenação (nome, criado_em)
   - Validação de email único
   - Envio de email ao criar usuário com senha temporária

**Entregáveis:**
- [ ] Todos os endpoints CRUD
- [ ] Sistema de roles implementado
- [ ] Middleware de autorização por role
- [ ] Testes de integração

---

### 📌 Tarefa 1.4: Configurações do Sistema
**Prioridade:** 🟢 BAIXA | **Estimativa:** 2 dias

**O que fazer:**
1. **Endpoints:**
   - `GET /api/configuracoes` - Buscar configurações
   - `PUT /api/configuracoes` - Atualizar configurações (admin)
   - `GET /api/configuracoes/parametros` - Listar parâmetros de qualidade do ar
   - `PUT /api/configuracoes/parametros/:id` - Atualizar limites de parâmetro

2. **Configurações gerenciáveis:**
   - Intervalo de coleta de dados (minutos)
   - Tempo de retenção de dados (dias)
   - Limites de alertas por parâmetro
   - Configurações de email (SMTP)
   - Timezone padrão
   - Logo e nome customizado

3. **Tabela `configuracoes`:**
   - chave (VARCHAR UNIQUE)
   - valor (JSONB)
   - descricao (TEXT)
   - atualizado_em (TIMESTAMP)

**Entregáveis:**
- [ ] Endpoints de configuração
- [ ] Cache de configurações em Redis
- [ ] Documentação das configurações disponíveis

---

### 📌 Tarefa 1.5: Sistema de Auditoria e Logs
**Prioridade:** 🟡 MÉDIA | **Estimativa:** 2 dias

**O que fazer:**
1. **Middleware de auditoria automática:**
   - Interceptar todas as operações de escrita (POST, PUT, DELETE)
   - Registrar usuário, ação, dados anteriores e novos
   - Registrar IP e user-agent

2. **Endpoints:**
   - `GET /api/auditoria` - Listar logs (admin)
   - `GET /api/auditoria/:tabela/:id` - Histórico de um registro específico

3. **Dashboard de segurança:**
   - Últimos logins
   - Tentativas de login falhas
   - Ações administrativas recentes

**Entregáveis:**
- [ ] Middleware de auditoria
- [ ] Endpoints de consulta
- [ ] Relatório de atividades

---

## 👤 DESENVOLVEDOR 2 - Estações & Dados de Medição

### Responsabilidades
Responsável pelo gerenciamento de estações, coleta e processamento de dados de medição.

---

### 📌 Tarefa 2.1: CRUD de Estações de Monitoramento
**Prioridade:** 🔴 ALTA | **Estimativa:** 3 dias

**O que fazer:**
1. **Endpoints CRUD:**
   - `GET /api/estacoes` - Listar estações com filtros
   - `GET /api/estacoes/:id` - Detalhes da estação
   - `POST /api/estacoes` - Criar nova estação
   - `PUT /api/estacoes/:id` - Atualizar estação
   - `DELETE /api/estacoes/:id` - Desativar estação
   - `GET /api/estacoes/:id/status` - Status atual (online/offline)
   - `GET /api/estacoes/mapa` - Dados para o mapa georreferenciado

2. **Campos da estação:**
   ```json
   {
     "codigo": "REPLAN-01",
     "nome": "REPLAN - Estação 01",
     "unidade_id": 1,
     "latitude": -22.7604,
     "longitude": -47.1411,
     "altitude": 580,
     "parametros_monitorados": ["PM2.5", "PM10", "O3", "NO2", "SO2", "CO"],
     "intervalo_coleta": 5,
     "ativo": true
   }
   ```

3. **Filtros disponíveis:**
   - Por unidade (REPLAN, REDUC, RLAM, etc.)
   - Por status (ativo/inativo, online/offline)
   - Por parâmetro monitorado
   - Por região (raio de km a partir de coordenada)

**Entregáveis:**
- [ ] CRUD completo de estações
- [ ] Endpoint para mapa com dados de geolocalização
- [ ] Validação de coordenadas geográficas
- [ ] Testes unitários

---

### 📌 Tarefa 2.2: API de Dados de Medição
**Prioridade:** 🔴 ALTA | **Estimativa:** 5 dias

**O que fazer:**
1. **Endpoints de medições:**
   - `GET /api/medicoes` - Listar medições com filtros avançados
   - `GET /api/medicoes/estacao/:id` - Medições de uma estação
   - `GET /api/medicoes/tempo-real` - Últimas medições de todas estações
   - `POST /api/medicoes` - Registrar nova medição (usado pelos sensores)
   - `POST /api/medicoes/batch` - Registrar múltiplas medições
   - `GET /api/medicoes/estatisticas` - Estatísticas agregadas

2. **Filtros de consulta:**
   ```
   ?estacao_id=1
   &parametro=PM2.5
   &data_inicio=2026-02-01
   &data_fim=2026-02-12
   &validado=true
   &flag=valid,pending
   &agregacao=hora|dia|semana|mes
   &limit=100
   &offset=0
   ```

3. **Agregações e cálculos:**
   - Média, mínimo, máximo, desvio padrão
   - Médias horárias, diárias, mensais
   - Percentis (P50, P90, P95, P99)
   - Disponibilidade de dados (% de dados válidos)

4. **Otimizações:**
   - Índices no banco para consultas frequentes
   - Cache de dados recentes em Redis (TTL: 5min)
   - Particionamento de tabela por mês (para histórico)

**Entregáveis:**
- [ ] Todos os endpoints de medições
- [ ] Sistema de agregação funcionando
- [ ] Cache implementado
- [ ] Query otimizada para grandes volumes

---

### 📌 Tarefa 2.3: Cálculo do Índice de Qualidade do Ar (IQAr)
**Prioridade:** 🔴 ALTA | **Estimativa:** 3 dias

**O que fazer:**
1. **Endpoint:**
   - `GET /api/iqar/estacao/:id` - IQAr atual de uma estação
   - `GET /api/iqar/todas` - IQAr de todas as estações
   - `GET /api/iqar/historico/:id` - Histórico de IQAr

2. **Implementar cálculo conforme CONAMA:**
   ```
   IQAr = ((Imax - Imin) / (Cmax - Cmin)) × (C - Cmin) + Imin
   
   Faixas:
   - Bom: 0-40 (verde)
   - Moderado: 41-80 (amarelo)
   - Ruim: 81-120 (laranja)
   - Muito Ruim: 121-200 (vermelho)
   - Péssimo: >200 (roxo)
   ```

3. **Parâmetros e limites (µg/m³):**
   | Parâmetro | Bom | Moderado | Ruim | Muito Ruim | Péssimo |
   |-----------|-----|----------|------|------------|---------|
   | PM2.5     | 0-25 | 26-50 | 51-75 | 76-125 | >125 |
   | PM10      | 0-50 | 51-100 | 101-150 | 151-250 | >250 |
   | O₃        | 0-100 | 101-130 | 131-160 | 161-200 | >200 |
   | NO₂       | 0-200 | 201-240 | 241-320 | 321-1130 | >1130 |
   | SO₂       | 0-20 | 21-40 | 41-365 | 366-800 | >800 |
   | CO (ppm)  | 0-9 | 9.1-11 | 11.1-13 | 13.1-15 | >15 |

4. **Resposta esperada:**
   ```json
   {
     "estacao": "REPLAN-01",
     "iqar": 42,
     "classificacao": "Bom",
     "cor": "#00A651",
     "poluente_predominante": "PM2.5",
     "valor_poluente": "12 µg/m³",
     "data_calculo": "2026-02-12T14:30:00Z",
     "detalhes": {
       "PM2.5": { "valor": 12, "iqar": 42, "classificacao": "Bom" },
       "PM10": { "valor": 28, "iqar": 35, "classificacao": "Bom" },
       ...
     }
   }
   ```

**Entregáveis:**
- [ ] Cálculo de IQAr seguindo normas CONAMA
- [ ] Cache de IQAr (atualizar a cada nova medição)
- [ ] Histórico de IQAr
- [ ] Testes com casos de borda

---

### 📌 Tarefa 2.4: Dados Meteorológicos (Rosa dos Ventos)
**Prioridade:** 🟡 MÉDIA | **Estimativa:** 3 dias

**O que fazer:**
1. **Endpoints:**
   - `GET /api/meteorologia/estacao/:id` - Dados atuais
   - `GET /api/meteorologia/rosa-ventos/:id` - Dados para rosa dos ventos
   - `GET /api/meteorologia/historico/:id` - Histórico meteorológico

2. **Dados meteorológicos:**
   - Velocidade do vento (m/s)
   - Direção do vento (graus 0-360)
   - Temperatura (°C)
   - Umidade relativa (%)
   - Pressão atmosférica (hPa)
   - Precipitação (mm)
   - Radiação solar (W/m²)

3. **Rosa dos Ventos:**
   - Dividir em 16 direções (N, NNE, NE, ENE, E, ESE, SE, SSE, S, SSW, SW, WSW, W, WNW, NW, NNW)
   - Calcular frequência de ocorrência por direção
   - Calcular velocidade média por direção
   - Período configurável (24h, 7 dias, 30 dias)

4. **Resposta da Rosa dos Ventos:**
   ```json
   {
     "estacao": "REPLAN-01",
     "periodo": "24h",
     "velocidade_media": 3.2,
     "direcao_predominante": "NE",
     "dados": [
       { "direcao": "N", "frequencia": 8.5, "velocidade_media": 2.8 },
       { "direcao": "NNE", "frequencia": 12.3, "velocidade_media": 3.5 },
       ...
     ]
   }
   ```

**Entregáveis:**
- [ ] Endpoints meteorológicos
- [ ] Cálculo da rosa dos ventos
- [ ] Suporte a diferentes períodos de análise

---

### 📌 Tarefa 2.5: WebSocket para Dados em Tempo Real
**Prioridade:** 🟡 MÉDIA | **Estimativa:** 3 dias

**O que fazer:**
1. **Implementar WebSocket:**
   - Servidor WebSocket (Socket.io ou ws)
   - Autenticação via JWT no handshake
   - Rooms por estação e por unidade

2. **Canais de eventos:**
   - `medicao:nova` - Nova medição recebida
   - `alerta:novo` - Novo alerta gerado
   - `estacao:status` - Mudança de status da estação
   - `iqar:atualizado` - IQAr recalculado

3. **Exemplo de uso:**
   ```javascript
   // Cliente se conecta
   socket.emit('subscribe', { estacoes: ['REPLAN-01', 'REDUC-01'] });
   
   // Cliente recebe atualizações
   socket.on('medicao:nova', (data) => {
     // { estacao: 'REPLAN-01', parametro: 'PM2.5', valor: 12.4, timestamp: '...' }
   });
   ```

**Entregáveis:**
- [ ] Servidor WebSocket funcionando
- [ ] Sistema de rooms/canais
- [ ] Documentação de eventos
- [ ] Exemplo de cliente

---

## 👤 DESENVOLVEDOR 3 - Alertas, Relatórios & Integrações

### Responsabilidades
Responsável pelo sistema de alertas, geração de relatórios e integrações externas.

---

### 📌 Tarefa 3.1: Sistema de Alertas
**Prioridade:** 🔴 ALTA | **Estimativa:** 4 dias

**O que fazer:**
1. **Endpoints:**
   - `GET /api/alertas` - Listar alertas com filtros
   - `GET /api/alertas/ativos` - Alertas não resolvidos
   - `GET /api/alertas/:id` - Detalhes do alerta
   - `PUT /api/alertas/:id/ler` - Marcar como lido
   - `PUT /api/alertas/:id/resolver` - Resolver alerta
   - `POST /api/alertas/configurar` - Configurar regras de alerta

2. **Tipos de alerta:**
   - `ULTRAPASSAGEM_LIMITE` - Valor acima do limite legal
   - `DADOS_PENDENTES` - Dados aguardando validação
   - `ESTACAO_OFFLINE` - Estação sem comunicar
   - `MANUTENCAO_PROGRAMADA` - Lembrete de manutenção
   - `DISPONIBILIDADE_BAIXA` - % de dados abaixo do esperado
   - `TENDENCIA_ALTA` - Tendência de aumento detectada

3. **Níveis de severidade:**
   - `info` - Informativo (azul)
   - `warning` - Atenção (amarelo)
   - `critical` - Crítico (vermelho)

4. **Motor de regras:**
   - Verificar medições em tempo real
   - Gerar alerta quando regra é acionada
   - Evitar alertas duplicados (cooldown de 1h)
   - Escalar alerta se não resolvido em X horas

5. **Notificações:**
   - Salvar no banco
   - Enviar via WebSocket
   - Enviar email (alertas críticos)
   - Preparar para push notification (futuro)

**Entregáveis:**
- [ ] CRUD de alertas
- [ ] Motor de regras funcionando
- [ ] Integração com email
- [ ] Integração com WebSocket

---

### 📌 Tarefa 3.2: Validação de Dados
**Prioridade:** 🔴 ALTA | **Estimativa:** 4 dias

**O que fazer:**
1. **Endpoints:**
   - `GET /api/validacao/pendentes` - Dados aguardando validação
   - `PUT /api/validacao/validar` - Validar um ou mais registros
   - `PUT /api/validacao/invalidar` - Marcar como inválido
   - `GET /api/validacao/estatisticas` - Estatísticas de validação
   - `POST /api/validacao/regras` - Configurar regras automáticas
   - `GET /api/validacao/historico` - Histórico de validações

2. **Flags de dados:**
   - `valid` - Dado válido (verde)
   - `pending` - Aguardando validação (amarelo)
   - `invalid` - Invalidado manualmente (vermelho)
   - `auto-invalid` - Invalidado automaticamente (rosa)

3. **Validação automática:**
   - Valor fora do range possível (ex: PM2.5 negativo ou > 1000)
   - Variação brusca (> 50% em 5 minutos)
   - Valor repetido por muito tempo (sensor travado)
   - Dados meteorológicos inconsistentes

4. **Validação manual:**
   - Selecionar múltiplos registros
   - Validar em lote
   - Justificar invalidação
   - Registrar quem validou e quando

5. **Resposta de pendentes:**
   ```json
   {
     "total": 156,
     "por_estacao": {
       "REPLAN-02": 48,
       "REDUC-01": 32,
       ...
     },
     "dados": [
       {
         "id": 12345,
         "estacao": "REPLAN-02",
         "parametro": "PM2.5",
         "valor": 89.5,
         "data_hora": "2026-02-12T14:30:00Z",
         "flag": "pending",
         "motivo_flag": "Valor acima da média móvel",
         "sugestao": "Verificar sensor"
       }
     ]
   }
   ```

**Entregáveis:**
- [ ] Endpoints de validação
- [ ] Sistema de validação automática
- [ ] Interface de validação em lote
- [ ] Relatório de qualidade de dados

---

### 📌 Tarefa 3.3: Geração de Relatórios
**Prioridade:** 🟡 MÉDIA | **Estimativa:** 5 dias

**O que fazer:**
1. **Endpoints:**
   - `POST /api/relatorios/gerar` - Gerar relatório
   - `GET /api/relatorios` - Listar relatórios gerados
   - `GET /api/relatorios/:id/download` - Baixar relatório
   - `DELETE /api/relatorios/:id` - Excluir relatório

2. **Tipos de relatório:**
   - **Estatístico:** Médias, máximos, mínimos, percentis por período
   - **IQAr:** Evolução do índice de qualidade do ar
   - **Ultrapassagens:** Relatório de ultrapassagens de limites
   - **Disponibilidade:** Taxa de disponibilidade de dados
   - **Comparativo:** Comparação entre estações
   - **Meteorológico:** Dados meteorológicos e rosa dos ventos

3. **Formatos de exportação:**
   - PDF (relatório formatado)
   - Excel (.xlsx)
   - CSV
   - JSON

4. **Parâmetros de geração:**
   ```json
   {
     "tipo": "estatistico",
     "estacoes": ["REPLAN-01", "REDUC-01"],
     "parametros": ["PM2.5", "PM10", "O3"],
     "data_inicio": "2026-01-01",
     "data_fim": "2026-02-12",
     "agregacao": "diaria",
     "formato": "pdf"
   }
   ```

5. **Processamento:**
   - Fila de processamento (Bull/BullMQ)
   - Progresso via WebSocket
   - Armazenamento temporário (S3 ou local)
   - Limpeza automática após 7 dias

**Entregáveis:**
- [ ] Geração de todos os tipos de relatório
- [ ] Exportação em PDF, Excel, CSV
- [ ] Fila de processamento
- [ ] Templates de relatório PDF

---

### 📌 Tarefa 3.4: Importação e Exportação de Dados
**Prioridade:** 🟡 MÉDIA | **Estimativa:** 3 dias

**O que fazer:**
1. **Endpoints de importação:**
   - `POST /api/dados/importar` - Importar arquivo
   - `GET /api/dados/importar/template` - Baixar template
   - `GET /api/dados/importar/historico` - Histórico de importações

2. **Formatos suportados:**
   - CSV (padrão do sistema)
   - Excel (.xlsx)
   - JSON

3. **Fluxo de importação:**
   - Upload do arquivo
   - Validação do formato
   - Preview das primeiras linhas
   - Mapeamento de colunas (se necessário)
   - Processamento em background
   - Notificação ao concluir

4. **Endpoints de exportação:**
   - `POST /api/dados/exportar` - Solicitar exportação
   - `GET /api/dados/exportar/:id/download` - Baixar arquivo

5. **Configurações:**
   - Filtros (período, estações, parâmetros)
   - Formato de saída
   - Incluir/excluir dados invalidados
   - Agregação (bruto, horário, diário)

**Entregáveis:**
- [ ] Upload e processamento de arquivos
- [ ] Exportação em múltiplos formatos
- [ ] Validação e tratamento de erros
- [ ] Templates de importação

---

### 📌 Tarefa 3.5: Integração com Assistente IA
**Prioridade:** 🟢 BAIXA | **Estimativa:** 2 dias

**O que fazer:**
1. **Endpoint:**
   - `POST /api/assistente/chat` - Enviar mensagem para IA

2. **Contexto para a IA:**
   - Buscar dados atuais do sistema
   - IQAr atual de todas estações
   - Alertas ativos
   - Estatísticas recentes

3. **Integração com Google Gemini:**
   - Montar prompt com contexto do sistema
   - Enviar para API do Gemini
   - Retornar resposta formatada

4. **Request esperado:**
   ```json
   {
     "mensagem": "Qual o status da qualidade do ar hoje?",
     "contexto_adicional": true
   }
   ```

5. **Tratamentos:**
   - Rate limiting por usuário
   - Sanitização de entrada
   - Log de conversas (opcional)
   - Fallback para respostas pré-definidas se API indisponível

**Entregáveis:**
- [ ] Endpoint de chat
- [ ] Integração com Gemini API
- [ ] Sistema de contexto automático
- [ ] Respostas de fallback

---

### 📌 Tarefa 3.6: Dashboard e Estatísticas
**Prioridade:** 🟡 MÉDIA | **Estimativa:** 2 dias

**O que fazer:**
1. **Endpoint:**
   - `GET /api/dashboard` - Dados consolidados do dashboard

2. **Dados retornados:**
   ```json
   {
     "estacoes_ativas": 46,
     "dados_coletados_hoje": 12458,
     "disponibilidade_geral": 94.7,
     "alertas_ativos": 3,
     "iqar_resumo": [
       { "estacao": "REPLAN-01", "iqar": 42, "classificacao": "Bom" },
       ...
     ],
     "ultimas_medicoes": [...],
     "alertas_recentes": [...],
     "disponibilidade_por_estacao": [...]
   }
   ```

3. **Cache:**
   - Cache agressivo (1 minuto)
   - Invalidar ao receber nova medição

**Entregáveis:**
- [ ] Endpoint consolidado do dashboard
- [ ] Cache otimizado
- [ ] Documentação dos dados

---

## 📊 Cronograma Geral

| Semana | Dev 1 | Dev 2 | Dev 3 |
|--------|-------|-------|-------|
| 1 | Setup + BD + Auth | CRUD Estações | Sistema de Alertas |
| 2 | Auth + Usuários | API Medições | Validação de Dados |
| 3 | Usuários + Configs | Cálculo IQAr | Relatórios |
| 4 | Auditoria + Logs | Meteorologia + WS | Import/Export + IA |
| 5 | Testes + Correções | Testes + Correções | Testes + Correções |

---

## 📁 Estrutura de Pastas Sugerida

```
backend/
├── src/
│   ├── config/
│   │   ├── database.js
│   │   ├── redis.js
│   │   └── jwt.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── usuariosController.js
│   │   ├── estacoesController.js
│   │   ├── medicoesController.js
│   │   ├── alertasController.js
│   │   ├── validacaoController.js
│   │   ├── relatoriosController.js
│   │   └── dashboardController.js
│   ├── middlewares/
│   │   ├── auth.js
│   │   ├── roles.js
│   │   ├── rateLimit.js
│   │   └── auditoria.js
│   ├── models/
│   │   ├── Usuario.js
│   │   ├── Estacao.js
│   │   ├── Medicao.js
│   │   ├── Alerta.js
│   │   └── ...
│   ├── services/
│   │   ├── iqarService.js
│   │   ├── alertaService.js
│   │   ├── relatorioService.js
│   │   ├── emailService.js
│   │   └── geminiService.js
│   ├── routes/
│   │   └── index.js
│   ├── utils/
│   │   ├── validators.js
│   │   └── helpers.js
│   └── app.js
├── migrations/
├── seeds/
├── tests/
├── docs/
│   └── swagger.yaml
├── docker-compose.yml
├── .env.example
└── package.json
```

---

## ✅ Checklist de Entrega Final

### Dev 1 - Core & Auth
- [ ] Banco de dados configurado com todas as tabelas
- [ ] Sistema de autenticação completo (login, logout, JWT, refresh)
- [ ] CRUD de usuários com sistema de roles
- [ ] Middleware de autorização
- [ ] Sistema de auditoria
- [ ] Configurações do sistema

### Dev 2 - Estações & Dados
- [ ] CRUD de estações
- [ ] API de medições com filtros avançados
- [ ] Cálculo de IQAr seguindo CONAMA
- [ ] Dados meteorológicos e rosa dos ventos
- [ ] WebSocket para tempo real

### Dev 3 - Alertas & Relatórios
- [ ] Sistema de alertas com motor de regras
- [ ] Validação manual e automática de dados
- [ ] Geração de relatórios em PDF/Excel/CSV
- [ ] Importação e exportação de dados
- [ ] Integração com Gemini
- [ ] Endpoint consolidado do dashboard

---

## 🔗 Integrações Entre as Partes

1. **Auth → Todos:** Middleware de autenticação usado em todas as rotas
2. **Medições → Alertas:** Nova medição dispara verificação de regras
3. **Medições → IQAr:** Nova medição recalcula IQAr
4. **Alertas → WebSocket:** Novo alerta envia notificação em tempo real
5. **Validação → Medições:** Atualiza flag de validação nas medições
6. **Dashboard → Todos:** Consolida dados de todas as APIs

---

**Observação:** Manter reuniões diárias (15min) para sincronizar o progresso e resolver dependências entre as tarefas.
