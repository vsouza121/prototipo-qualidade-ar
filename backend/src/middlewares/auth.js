const jwt = require('jsonwebtoken');
const config = require('../config');
const { Usuario } = require('../models');

/**
 * Middleware de Autenticação JWT
 * Verifica se o usuário está autenticado
 */
const autenticar = async (req, res, next) => {
  try {
    // Buscar token no header Authorization
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        sucesso: false,
        mensagem: 'Token de autenticação não fornecido'
      });
    }

    // Formato esperado: "Bearer <token>"
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({
        sucesso: false,
        mensagem: 'Formato de token inválido. Use: Bearer <token>'
      });
    }

    const token = parts[1];

    // Verificar e decodificar token
    const decoded = jwt.verify(token, config.jwt.secret);

    // Buscar usuário no banco
    const usuario = await Usuario.findByPk(decoded.id);

    if (!usuario) {
      return res.status(401).json({
        sucesso: false,
        mensagem: 'Usuário não encontrado'
      });
    }

    if (!usuario.ativo) {
      return res.status(401).json({
        sucesso: false,
        mensagem: 'Usuário desativado. Entre em contato com o administrador.'
      });
    }

    // Adicionar usuário à requisição
    req.usuario = usuario;
    req.usuarioId = usuario.id;

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        sucesso: false,
        mensagem: 'Token expirado. Faça login novamente.',
        codigo: 'TOKEN_EXPIRED'
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        sucesso: false,
        mensagem: 'Token inválido'
      });
    }

    console.error('Erro na autenticação:', error);
    return res.status(500).json({
      sucesso: false,
      mensagem: 'Erro interno no servidor'
    });
  }
};

/**
 * Middleware de Autorização por Role
 * Verifica se o usuário tem permissão para acessar o recurso
 * @param  {...string} rolesPermitidas - Roles que podem acessar (admin, supervisor, analista, operador)
 */
const autorizar = (...rolesPermitidas) => {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({
        sucesso: false,
        mensagem: 'Usuário não autenticado'
      });
    }

    if (!rolesPermitidas.includes(req.usuario.role)) {
      return res.status(403).json({
        sucesso: false,
        mensagem: 'Você não tem permissão para acessar este recurso',
        role_atual: req.usuario.role,
        roles_permitidas: rolesPermitidas
      });
    }

    next();
  };
};

/**
 * Middleware opcional de autenticação
 * Se tiver token, autentica. Se não tiver, continua sem usuário.
 */
const autenticarOpcional = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return next();
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return next();
    }

    const token = parts[1];
    const decoded = jwt.verify(token, config.jwt.secret);
    const usuario = await Usuario.findByPk(decoded.id);

    if (usuario && usuario.ativo) {
      req.usuario = usuario;
      req.usuarioId = usuario.id;
    }

    next();
  } catch (error) {
    // Se o token for inválido, continua sem autenticar
    next();
  }
};

module.exports = {
  autenticar,
  autorizar,
  autenticarOpcional
};
