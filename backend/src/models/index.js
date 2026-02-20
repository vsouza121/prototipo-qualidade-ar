const Usuario = require('./Usuario');
const Unidade = require('./Unidade');
const Estacao = require('./Estacao');
const Parametro = require('./Parametro');
const Medicao = require('./Medicao');
const Alerta = require('./Alerta');
const ImportacaoLog = require('./ImportacaoLog');
const MedicaoHoraria = require('./MedicaoHoraria');
const MedicaoDiaria = require('./MedicaoDiaria');
const Configuracao = require('./Configuracao');

// ==========================================
// Definição das Relações entre os Modelos
// ==========================================

// Unidade -> Estações (1:N)
Unidade.hasMany(Estacao, {
  foreignKey: 'unidade_id',
  as: 'estacoes'
});
Estacao.belongsTo(Unidade, {
  foreignKey: 'unidade_id',
  as: 'unidade'
});

// Estação -> Medições (1:N)
Estacao.hasMany(Medicao, {
  foreignKey: 'estacao_id',
  as: 'medicoes'
});
Medicao.belongsTo(Estacao, {
  foreignKey: 'estacao_id',
  as: 'estacao'
});

// Parâmetro -> Medições (1:N)
Parametro.hasMany(Medicao, {
  foreignKey: 'parametro_id',
  as: 'medicoes'
});
Medicao.belongsTo(Parametro, {
  foreignKey: 'parametro_id',
  as: 'parametro'
});

// Usuário -> Medições (validação) (1:N)
Usuario.hasMany(Medicao, {
  foreignKey: 'validado_por',
  as: 'medicoes_validadas'
});
Medicao.belongsTo(Usuario, {
  foreignKey: 'validado_por',
  as: 'validador'
});

// Medição -> ImportacaoLog (N:1)
ImportacaoLog.hasMany(Medicao, {
  foreignKey: 'importacao_id',
  as: 'medicoes'
});
Medicao.belongsTo(ImportacaoLog, {
  foreignKey: 'importacao_id',
  as: 'importacao'
});

// Estação -> Alertas (1:N)
Estacao.hasMany(Alerta, {
  foreignKey: 'estacao_id',
  as: 'alertas'
});
Alerta.belongsTo(Estacao, {
  foreignKey: 'estacao_id',
  as: 'estacao'
});

// Parâmetro -> Alertas (1:N)
Parametro.hasMany(Alerta, {
  foreignKey: 'parametro_id',
  as: 'alertas'
});
Alerta.belongsTo(Parametro, {
  foreignKey: 'parametro_id',
  as: 'parametro'
});

// Usuário -> Alertas (leitura/resolução)
Usuario.hasMany(Alerta, {
  foreignKey: 'lido_por',
  as: 'alertas_lidos'
});
Usuario.hasMany(Alerta, {
  foreignKey: 'resolvido_por',
  as: 'alertas_resolvidos'
});

// Usuário -> ImportacaoLog (1:N)
Usuario.hasMany(ImportacaoLog, {
  foreignKey: 'usuario_id',
  as: 'importacoes'
});
ImportacaoLog.belongsTo(Usuario, {
  foreignKey: 'usuario_id',
  as: 'usuario'
});

// Estação -> Medições Horárias (1:N)
Estacao.hasMany(MedicaoHoraria, {
  foreignKey: 'estacao_id',
  as: 'medicoes_horarias'
});
MedicaoHoraria.belongsTo(Estacao, {
  foreignKey: 'estacao_id',
  as: 'estacao'
});

// Parâmetro -> Medições Horárias (1:N)
Parametro.hasMany(MedicaoHoraria, {
  foreignKey: 'parametro_id',
  as: 'medicoes_horarias'
});
MedicaoHoraria.belongsTo(Parametro, {
  foreignKey: 'parametro_id',
  as: 'parametro'
});

// Estação -> Medições Diárias (1:N)
Estacao.hasMany(MedicaoDiaria, {
  foreignKey: 'estacao_id',
  as: 'medicoes_diarias'
});
MedicaoDiaria.belongsTo(Estacao, {
  foreignKey: 'estacao_id',
  as: 'estacao'
});

// Parâmetro -> Medições Diárias (1:N)
Parametro.hasMany(MedicaoDiaria, {
  foreignKey: 'parametro_id',
  as: 'medicoes_diarias'
});
MedicaoDiaria.belongsTo(Parametro, {
  foreignKey: 'parametro_id',
  as: 'parametro'
});

module.exports = {
  Usuario,
  Unidade,
  Estacao,
  Parametro,
  Medicao,
  Alerta,
  ImportacaoLog,
  MedicaoHoraria,
  MedicaoDiaria,
  Configuracao
};
