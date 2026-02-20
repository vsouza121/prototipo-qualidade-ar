/**
 * Seeds - Dados iniciais do sistema
 * Execute com: npm run db:seed
 */

const { sequelize, testConnection } = require('../connection');
const { Usuario, Unidade, Estacao, Parametro, Alerta } = require('../../models');

// Parâmetros de qualidade do ar (conforme CONAMA)
const parametrosData = [
  {
    codigo: 'PM2.5',
    nome: 'Material Particulado 2.5',
    nome_cientifico: 'Particulate Matter 2.5',
    unidade_medida: 'µg/m³',
    limite_bom: 25,
    limite_moderado: 50,
    limite_ruim: 75,
    limite_muito_ruim: 125,
    limite_pessimo: 125.01,
    valor_minimo: 0,
    valor_maximo: 500,
    descricao: 'Partículas inaláveis finas com diâmetro menor que 2.5 micrômetros',
    cor: '#3B82F6'
  },
  {
    codigo: 'PM10',
    nome: 'Material Particulado 10',
    nome_cientifico: 'Particulate Matter 10',
    unidade_medida: 'µg/m³',
    limite_bom: 50,
    limite_moderado: 100,
    limite_ruim: 150,
    limite_muito_ruim: 250,
    limite_pessimo: 250.01,
    valor_minimo: 0,
    valor_maximo: 600,
    descricao: 'Partículas inaláveis com diâmetro menor que 10 micrômetros',
    cor: '#8B5CF6'
  },
  {
    codigo: 'O3',
    nome: 'Ozônio',
    nome_cientifico: 'Ozone',
    unidade_medida: 'µg/m³',
    limite_bom: 100,
    limite_moderado: 130,
    limite_ruim: 160,
    limite_muito_ruim: 200,
    limite_pessimo: 200.01,
    valor_minimo: 0,
    valor_maximo: 400,
    descricao: 'Gás oxidante formado por reações fotoquímicas',
    cor: '#F59E0B'
  },
  {
    codigo: 'NO2',
    nome: 'Dióxido de Nitrogênio',
    nome_cientifico: 'Nitrogen Dioxide',
    unidade_medida: 'µg/m³',
    limite_bom: 200,
    limite_moderado: 240,
    limite_ruim: 320,
    limite_muito_ruim: 1130,
    limite_pessimo: 1130.01,
    valor_minimo: 0,
    valor_maximo: 2000,
    descricao: 'Gás tóxico produto de combustão',
    cor: '#EF4444'
  },
  {
    codigo: 'SO2',
    nome: 'Dióxido de Enxofre',
    nome_cientifico: 'Sulfur Dioxide',
    unidade_medida: 'µg/m³',
    limite_bom: 20,
    limite_moderado: 40,
    limite_ruim: 365,
    limite_muito_ruim: 800,
    limite_pessimo: 800.01,
    valor_minimo: 0,
    valor_maximo: 1500,
    descricao: 'Gás irritante e corrosivo',
    cor: '#EC4899'
  },
  {
    codigo: 'CO',
    nome: 'Monóxido de Carbono',
    nome_cientifico: 'Carbon Monoxide',
    unidade_medida: 'ppm',
    limite_bom: 9,
    limite_moderado: 11,
    limite_ruim: 13,
    limite_muito_ruim: 15,
    limite_pessimo: 15.01,
    valor_minimo: 0,
    valor_maximo: 50,
    descricao: 'Gás inodoro e asfixiante',
    cor: '#6B7280'
  }
];

// Unidades (refinarias)
const unidadesData = [
  { codigo: 'REPLAN', nome: 'Refinaria de Paulínia', cidade: 'Paulínia', estado: 'SP', latitude: -22.7604, longitude: -47.1411 },
  { codigo: 'REDUC', nome: 'Refinaria Duque de Caxias', cidade: 'Duque de Caxias', estado: 'RJ', latitude: -22.7856, longitude: -43.3117 },
  { codigo: 'RLAM', nome: 'Refinaria Landulpho Alves', cidade: 'São Francisco do Conde', estado: 'BA', latitude: -12.6361, longitude: -38.6783 },
  { codigo: 'REFAP', nome: 'Refinaria Alberto Pasqualini', cidade: 'Canoas', estado: 'RS', latitude: -29.9015, longitude: -51.1739 },
  { codigo: 'RECAP', nome: 'Refinaria de Capuava', cidade: 'Mauá', estado: 'SP', latitude: -23.6678, longitude: -46.4614 },
  { codigo: 'REGAP', nome: 'Refinaria Gabriel Passos', cidade: 'Betim', estado: 'MG', latitude: -19.9675, longitude: -44.2013 },
  { codigo: 'REVAP', nome: 'Refinaria Henrique Lage', cidade: 'São José dos Campos', estado: 'SP', latitude: -23.1896, longitude: -45.8478 },
  { codigo: 'REPAR', nome: 'Refinaria Presidente Getúlio Vargas', cidade: 'Araucária', estado: 'PR', latitude: -25.5935, longitude: -49.4058 }
];

// Estações de monitoramento
const estacoesData = [
  { codigo: 'REPLAN-01', nome: 'REPLAN - Estação 01', unidade_codigo: 'REPLAN', latitude: -22.7604, longitude: -47.1411, altitude: 580, parametros: ['PM2.5', 'PM10', 'O3', 'NO2', 'SO2', 'CO'] },
  { codigo: 'REPLAN-02', nome: 'REPLAN - Estação 02', unidade_codigo: 'REPLAN', latitude: -22.7620, longitude: -47.1390, altitude: 575, parametros: ['PM2.5', 'PM10', 'O3', 'NO2'] },
  { codigo: 'REDUC-01', nome: 'REDUC - Estação 01', unidade_codigo: 'REDUC', latitude: -22.7856, longitude: -43.3117, altitude: 25, parametros: ['PM2.5', 'PM10', 'O3', 'NO2', 'SO2', 'CO'] },
  { codigo: 'REDUC-02', nome: 'REDUC - Estação 02', unidade_codigo: 'REDUC', latitude: -22.7870, longitude: -43.3100, altitude: 30, parametros: ['PM2.5', 'PM10', 'SO2'] },
  { codigo: 'REDUC-03', nome: 'REDUC - Estação 03', unidade_codigo: 'REDUC', latitude: -22.7840, longitude: -43.3130, altitude: 22, parametros: ['O3', 'NO2', 'CO'] },
  { codigo: 'RLAM-01', nome: 'RLAM - Estação 01', unidade_codigo: 'RLAM', latitude: -12.6361, longitude: -38.6783, altitude: 15, parametros: ['PM2.5', 'PM10', 'O3', 'NO2', 'SO2', 'CO'] },
  { codigo: 'RLAM-02', nome: 'RLAM - Estação 02', unidade_codigo: 'RLAM', latitude: -12.6380, longitude: -38.6760, altitude: 18, parametros: ['PM2.5', 'PM10', 'SO2'] },
  { codigo: 'REFAP-01', nome: 'REFAP - Estação 01', unidade_codigo: 'REFAP', latitude: -29.9015, longitude: -51.1739, altitude: 32, parametros: ['PM2.5', 'PM10', 'O3', 'NO2', 'SO2', 'CO'] },
  { codigo: 'RECAP-01', nome: 'RECAP - Estação 01', unidade_codigo: 'RECAP', latitude: -23.6678, longitude: -46.4614, altitude: 750, parametros: ['PM2.5', 'PM10', 'O3', 'NO2', 'SO2', 'CO'] },
  { codigo: 'REGAP-01', nome: 'REGAP - Estação 01', unidade_codigo: 'REGAP', latitude: -19.9675, longitude: -44.2013, altitude: 820, parametros: ['PM2.5', 'PM10', 'O3', 'NO2', 'SO2', 'CO'] },
  { codigo: 'REVAP-01', nome: 'REVAP - Estação 01', unidade_codigo: 'REVAP', latitude: -23.1896, longitude: -45.8478, altitude: 600, parametros: ['PM2.5', 'PM10', 'O3', 'NO2', 'SO2', 'CO'] },
  { codigo: 'REPAR-01', nome: 'REPAR - Estação 01', unidade_codigo: 'REPAR', latitude: -25.5935, longitude: -49.4058, altitude: 920, parametros: ['PM2.5', 'PM10', 'O3', 'NO2', 'SO2', 'CO'] }
];

const runSeeds = async () => {
  console.log('🌱 Iniciando seeds do banco de dados...\n');

  try {
    const connected = await testConnection();
    if (!connected) {
      console.error('❌ Não foi possível conectar ao banco de dados.');
      process.exit(1);
    }

    // 1. Criar usuário admin
    console.log('👤 Criando usuário administrador...');
    const [adminUser, adminCreated] = await Usuario.findOrCreate({
      where: { email: 'admin@acoem.com.br' },
      defaults: {
        nome: 'Administrador',
        email: 'admin@acoem.com.br',
        senha_hash: 'admin123', // será hasheado pelo hook
        role: 'admin',
        cargo: 'Administrador do Sistema',
        ativo: true
      }
    });
    console.log(adminCreated ? '   ✅ Usuário admin criado' : '   ℹ️ Usuário admin já existe');

    // Criar usuário de exemplo
    const [analista, analistaCreated] = await Usuario.findOrCreate({
      where: { email: 'analista@acoem.com.br' },
      defaults: {
        nome: 'Marcos Vinicius',
        email: 'analista@acoem.com.br',
        senha_hash: '123456',
        role: 'analista',
        cargo: 'Analista Ambiental',
        ativo: true
      }
    });
    console.log(analistaCreated ? '   ✅ Usuário analista criado' : '   ℹ️ Usuário analista já existe');

    // 2. Criar parâmetros
    console.log('\n📊 Criando parâmetros de qualidade do ar...');
    for (const param of parametrosData) {
      const [p, created] = await Parametro.findOrCreate({
        where: { codigo: param.codigo },
        defaults: param
      });
      console.log(`   ${created ? '✅' : 'ℹ️'} ${param.codigo} - ${param.nome}`);
    }

    // 3. Criar unidades
    console.log('\n🏭 Criando unidades (refinarias)...');
    const unidadesMap = {};
    for (const unid of unidadesData) {
      const [u, created] = await Unidade.findOrCreate({
        where: { codigo: unid.codigo },
        defaults: unid
      });
      unidadesMap[unid.codigo] = u.id;
      console.log(`   ${created ? '✅' : 'ℹ️'} ${unid.codigo} - ${unid.nome}`);
    }

    // 4. Criar estações
    console.log('\n📡 Criando estações de monitoramento...');
    for (const est of estacoesData) {
      const [e, created] = await Estacao.findOrCreate({
        where: { codigo: est.codigo },
        defaults: {
          codigo: est.codigo,
          nome: est.nome,
          unidade_id: unidadesMap[est.unidade_codigo],
          latitude: est.latitude,
          longitude: est.longitude,
          altitude: est.altitude,
          parametros_monitorados: est.parametros,
          intervalo_coleta: 5,
          status: 'online',
          ultima_comunicacao: new Date()
        }
      });
      console.log(`   ${created ? '✅' : 'ℹ️'} ${est.codigo}`);
    }

    // 5. Criar alguns alertas de exemplo
    console.log('\n🚨 Criando alertas de exemplo...');
    const refapEstacao = await Estacao.findOne({ where: { codigo: 'REFAP-01' } });
    const so2Param = await Parametro.findOne({ where: { codigo: 'SO2' } });

    if (refapEstacao && so2Param) {
      await Alerta.findOrCreate({
        where: { 
          estacao_id: refapEstacao.id, 
          tipo: 'ULTRAPASSAGEM_LIMITE',
          resolvido: false
        },
        defaults: {
          estacao_id: refapEstacao.id,
          parametro_id: so2Param.id,
          tipo: 'ULTRAPASSAGEM_LIMITE',
          nivel: 'critical',
          titulo: 'Ultrapassagem de Limite - SO₂',
          mensagem: 'REFAP-01: Concentração de SO₂ acima do limite permitido (180.2 µg/m³)',
          valor_detectado: 180.2,
          valor_limite: 40
        }
      });
      console.log('   ✅ Alerta de exemplo criado');
    }

    console.log('\n✅ Seeds executados com sucesso!');
    console.log('\n📋 Resumo:');
    console.log(`   - Usuários: 2 (admin@acoem.com.br / admin123)`);
    console.log(`   - Parâmetros: ${parametrosData.length}`);
    console.log(`   - Unidades: ${unidadesData.length}`);
    console.log(`   - Estações: ${estacoesData.length}`);
    console.log('\n🚀 Sistema pronto para uso!');

  } catch (error) {
    console.error('❌ Erro ao executar seeds:', error.message);
    console.error(error);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
};

runSeeds();
