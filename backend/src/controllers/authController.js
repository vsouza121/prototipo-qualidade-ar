const jwt = require('jsonwebtoken');
const config = require('../config');
const { Usuario } = require('../models');

/**
 * Gerar tokens JWT
 */
const gerarTokens = (usuario) => {
  const payload = {
    id: usuario.id,
    email: usuario.email,
    role: usuario.role
  };

  const accessToken = jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn
  });

  const refreshToken = jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn
  });

  return { accessToken, refreshToken };
};

/**
 * POST /api/auth/login
 * Login do usuário
 */
const login = async (req, res) => {
  try {
    const { email, senha } = req.body;

    // Validações básicas
    if (!email || !senha) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'Email e senha são obrigatórios'
      });
    }

    // Buscar usuário
    const usuario = await Usuario.findOne({ where: { email } });

    if (!usuario) {
      return res.status(401).json({
        sucesso: false,
        mensagem: 'Email ou senha incorretos'
      });
    }

    // Verificar se usuário está ativo
    if (!usuario.ativo) {
      return res.status(401).json({
        sucesso: false,
        mensagem: 'Usuário desativado. Entre em contato com o administrador.'
      });
    }

    // Verificar senha
    const senhaValida = await usuario.verificarSenha(senha);
    if (!senhaValida) {
      return res.status(401).json({
        sucesso: false,
        mensagem: 'Email ou senha incorretos'
      });
    }

    // Gerar tokens
    const { accessToken, refreshToken } = gerarTokens(usuario);

    // Atualizar último login e refresh token
    await usuario.update({
      ultimo_login: new Date(),
      refresh_token: refreshToken
    });

    res.json({
      sucesso: true,
      mensagem: 'Login realizado com sucesso',
      dados: {
        usuario: usuario.toJSON(),
        accessToken,
        refreshToken,
        expiresIn: config.jwt.expiresIn
      }
    });

  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({
      sucesso: false,
      mensagem: 'Erro interno no servidor'
    });
  }
};

/**
 * POST /api/auth/refresh
 * Renovar access token usando refresh token
 */
const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'Refresh token é obrigatório'
      });
    }

    // Verificar refresh token
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);
    } catch (error) {
      return res.status(401).json({
        sucesso: false,
        mensagem: 'Refresh token inválido ou expirado'
      });
    }

    // Buscar usuário
    const usuario = await Usuario.findByPk(decoded.id);

    if (!usuario || !usuario.ativo) {
      return res.status(401).json({
        sucesso: false,
        mensagem: 'Usuário não encontrado ou desativado'
      });
    }

    // Verificar se o refresh token salvo é o mesmo
    if (usuario.refresh_token !== refreshToken) {
      return res.status(401).json({
        sucesso: false,
        mensagem: 'Refresh token não corresponde. Faça login novamente.'
      });
    }

    // Gerar novos tokens
    const tokens = gerarTokens(usuario);

    // Atualizar refresh token no banco
    await usuario.update({ refresh_token: tokens.refreshToken });

    res.json({
      sucesso: true,
      mensagem: 'Token renovado com sucesso',
      dados: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: config.jwt.expiresIn
      }
    });

  } catch (error) {
    console.error('Erro no refresh:', error);
    res.status(500).json({
      sucesso: false,
      mensagem: 'Erro interno no servidor'
    });
  }
};

/**
 * POST /api/auth/logout
 * Logout do usuário
 */
const logout = async (req, res) => {
  try {
    // Limpar refresh token do usuário
    await req.usuario.update({ refresh_token: null });

    res.json({
      sucesso: true,
      mensagem: 'Logout realizado com sucesso'
    });

  } catch (error) {
    console.error('Erro no logout:', error);
    res.status(500).json({
      sucesso: false,
      mensagem: 'Erro interno no servidor'
    });
  }
};

/**
 * GET /api/auth/me
 * Retorna dados do usuário autenticado
 */
const me = async (req, res) => {
  try {
    res.json({
      sucesso: true,
      dados: req.usuario.toJSON()
    });
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    res.status(500).json({
      sucesso: false,
      mensagem: 'Erro interno no servidor'
    });
  }
};

/**
 * PUT /api/auth/alterar-senha
 * Alterar senha do usuário autenticado
 */
const alterarSenha = async (req, res) => {
  try {
    const { senhaAtual, novaSenha } = req.body;

    if (!senhaAtual || !novaSenha) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'Senha atual e nova senha são obrigatórias'
      });
    }

    if (novaSenha.length < 6) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'Nova senha deve ter no mínimo 6 caracteres'
      });
    }

    // Verificar senha atual
    const senhaValida = await req.usuario.verificarSenha(senhaAtual);
    if (!senhaValida) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'Senha atual incorreta'
      });
    }

    // Atualizar senha
    await req.usuario.update({ senha_hash: novaSenha });

    res.json({
      sucesso: true,
      mensagem: 'Senha alterada com sucesso'
    });

  } catch (error) {
    console.error('Erro ao alterar senha:', error);
    res.status(500).json({
      sucesso: false,
      mensagem: 'Erro interno no servidor'
    });
  }
};

module.exports = {
  login,
  refresh,
  logout,
  me,
  alterarSenha
};
