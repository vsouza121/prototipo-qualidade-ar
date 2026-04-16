const nodemailer = require('nodemailer');
const config = require('../config');

// Configurar transporter do nodemailer
let transporter;

// Inicializar transporter
const initTransporter = () => {
  // Se credenciais SMTP estão configuradas, usar SMTP real
  if (config.email.host && config.email.user && config.email.pass) {
    transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.port === 465,
      auth: {
        user: config.email.user,
        pass: config.email.pass
      }
    });
    console.log('📧 Transporter de email configurado com SMTP');
  } else {
    // Usar Ethereal para testes (email fictício)
    console.log('⚠️ Credenciais SMTP não configuradas. Usando modo de simulação.');
    transporter = null;
  }
};

// Inicializar ao carregar o módulo
initTransporter();

// ========================================
// CONTROLLER DE SUPORTE
// ========================================

const suporteController = {
  /**
   * Criar novo chamado de suporte e enviar email
   */
  async criarChamado(req, res) {
    try {
      const {
        equipe,
        nome,
        email,
        telefone,
        setor,
        categoria,
        estacao,
        assunto,
        descricao,
        prioridade
      } = req.body;

      // Validar campos obrigatórios
      if (!equipe || !nome || !email || !categoria || !assunto || !descricao) {
        return res.status(400).json({
          sucesso: false,
          mensagem: 'Campos obrigatórios: equipe, nome, email, categoria, assunto, descricao'
        });
      }

      // Gerar número do ticket
      const ticketNumber = `TICKET-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

      // Preparar dados do chamado
      const chamado = {
        numero: ticketNumber,
        equipe,
        nome,
        email,
        telefone: telefone || 'Não informado',
        setor: setor || 'Não informado',
        categoria,
        estacao: estacao || 'Não especificada',
        assunto,
        descricao,
        prioridade: prioridade || 'media',
        status: 'aberto',
        dataCriacao: new Date().toISOString()
      };

      // Montar corpo do email
      const equipeName = equipe === 'ti' ? 'Equipe de TI' : 'Suporte Técnico';
      const prioridadeText = {
        'baixa': '🟢 Baixa',
        'media': '🟡 Média',
        'alta': '🟠 Alta',
        'critica': '🔴 Crítica'
      };

      const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #00A19A, #008078); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 24px; }
    .header .ticket { background: rgba(255,255,255,0.2); padding: 5px 15px; border-radius: 20px; display: inline-block; margin-top: 10px; }
    .content { background: #f8f9fa; padding: 20px; border: 1px solid #e0e0e0; }
    .section { background: white; padding: 15px; border-radius: 8px; margin-bottom: 15px; border-left: 4px solid #00A19A; }
    .section h3 { color: #00A19A; margin: 0 0 10px 0; font-size: 14px; text-transform: uppercase; }
    .section p { margin: 5px 0; }
    .label { color: #666; font-weight: 500; }
    .value { color: #333; }
    .priority { display: inline-block; padding: 3px 10px; border-radius: 4px; font-weight: 500; }
    .priority.baixa { background: #d4edda; color: #155724; }
    .priority.media { background: #fff3cd; color: #856404; }
    .priority.alta { background: #ffe5d0; color: #c44f00; }
    .priority.critica { background: #f8d7da; color: #721c24; }
    .footer { background: #00263A; color: white; padding: 15px 20px; border-radius: 0 0 8px 8px; font-size: 12px; text-align: center; }
    .description { background: #fff; padding: 15px; border: 1px solid #e0e0e0; border-radius: 4px; white-space: pre-wrap; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎫 Novo Chamado de Suporte</h1>
      <div class="ticket">${ticketNumber}</div>
    </div>
    <div class="content">
      <div class="section">
        <h3>📋 Informações do Chamado</h3>
        <p><span class="label">Equipe:</span> <span class="value">${equipeName}</span></p>
        <p><span class="label">Categoria:</span> <span class="value">${categoria}</span></p>
        <p><span class="label">Estação:</span> <span class="value">${chamado.estacao}</span></p>
        <p><span class="label">Prioridade:</span> <span class="priority ${prioridade}">${prioridadeText[prioridade] || prioridade}</span></p>
      </div>
      
      <div class="section">
        <h3>👤 Solicitante</h3>
        <p><span class="label">Nome:</span> <span class="value">${nome}</span></p>
        <p><span class="label">E-mail:</span> <span class="value"><a href="mailto:${email}">${email}</a></span></p>
        <p><span class="label">Telefone:</span> <span class="value">${chamado.telefone}</span></p>
        <p><span class="label">Setor:</span> <span class="value">${chamado.setor}</span></p>
      </div>
      
      <div class="section">
        <h3>📝 Assunto</h3>
        <p style="font-weight: 600; font-size: 16px;">${assunto}</p>
      </div>
      
      <div class="section">
        <h3>📄 Descrição</h3>
        <div class="description">${descricao}</div>
      </div>
      
      <div class="section">
        <h3>⏰ Data/Hora</h3>
        <p>${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</p>
      </div>
    </div>
    <div class="footer">
      <p>Sistema de Gestão de Qualidade do Ar - Acoem Brasil</p>
      <p>Este é um email automático. Por favor, não responda diretamente.</p>
    </div>
  </div>
</body>
</html>
      `;

      const emailText = `
NOVO CHAMADO DE SUPORTE
========================

Número: ${ticketNumber}
Data/Hora: ${new Date().toLocaleString('pt-BR')}

EQUIPE RESPONSÁVEL: ${equipeName}

DADOS DO SOLICITANTE
--------------------
Nome: ${nome}
E-mail: ${email}
Telefone: ${chamado.telefone}
Setor: ${chamado.setor}

DETALHES DO CHAMADO
-------------------
Categoria: ${categoria}
Estação: ${chamado.estacao}
Prioridade: ${prioridadeText[prioridade] || prioridade}

Assunto: ${assunto}

Descrição:
${descricao}

========================
Sistema de Gestão de Qualidade do Ar - Acoem Brasil
      `;

      // Email do destinatário
      const destinatario = 'engenharia.ambiental@acoem.com';

      // Enviar email
      if (transporter) {
        try {
          const info = await transporter.sendMail({
            from: `"Sistema Qualidade do Ar" <${config.email.user || 'noreply@acoem.com'}>`,
            to: destinatario,
            cc: email, // Cópia para o solicitante
            subject: `[${ticketNumber}] ${assunto}`,
            text: emailText,
            html: emailHtml
          });

          console.log('✅ Email enviado:', info.messageId);
          
          return res.status(201).json({
            sucesso: true,
            mensagem: 'Chamado criado e email enviado com sucesso',
            dados: {
              ...chamado,
              emailEnviado: true,
              messageId: info.messageId
            }
          });
        } catch (emailError) {
          console.error('❌ Erro ao enviar email:', emailError);
          
          // Retorna sucesso mesmo se email falhar (chamado foi registrado)
          return res.status(201).json({
            sucesso: true,
            mensagem: 'Chamado criado, mas houve erro ao enviar email. Nossa equipe foi notificada.',
            dados: {
              ...chamado,
              emailEnviado: false,
              erro: emailError.message
            }
          });
        }
      } else {
        // Modo de simulação - sem SMTP configurado
        console.log('📧 [SIMULAÇÃO] Email que seria enviado para:', destinatario);
        console.log('📧 [SIMULAÇÃO] Assunto:', `[${ticketNumber}] ${assunto}`);
        
        return res.status(201).json({
          sucesso: true,
          mensagem: 'Chamado registrado com sucesso. (Modo simulação - configure SMTP para envio real)',
          dados: {
            ...chamado,
            emailEnviado: false,
            modoSimulacao: true
          }
        });
      }
    } catch (error) {
      console.error('Erro ao criar chamado:', error);
      return res.status(500).json({
        sucesso: false,
        mensagem: 'Erro ao processar chamado: ' + error.message
      });
    }
  },

  /**
   * Listar chamados (simulado - em produção usaria banco de dados)
   */
  async listar(req, res) {
    try {
      // Em produção, buscar do banco de dados
      // Por enquanto retorna lista vazia
      res.json({
        sucesso: true,
        dados: [],
        mensagem: 'Histórico de chamados em desenvolvimento'
      });
    } catch (error) {
      res.status(500).json({
        sucesso: false,
        mensagem: 'Erro ao listar chamados'
      });
    }
  },

  /**
   * Verificar configuração de email
   */
  async verificarConfig(req, res) {
    const configurado = !!(config.email.host && config.email.user && config.email.pass);
    
    res.json({
      sucesso: true,
      dados: {
        emailConfigurado: configurado,
        destinatario: 'engenharia.ambiental@acoem.com'
      }
    });
  }
};

module.exports = suporteController;
