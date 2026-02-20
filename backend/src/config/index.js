require('dotenv').config();

module.exports = {
  // Servidor
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,

  // Banco de Dados SQL Server
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 1433,
    name: process.env.DB_NAME || 'qualidade_ar',
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || '',
    dialect: 'mssql',
    dialectOptions: {
      options: {
        encrypt: false, // true para Azure
        trustServerCertificate: true, // desenvolvimento local
        enableArithAbort: true
      }
    },
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    logging: process.env.NODE_ENV === 'development' ? console.log : false
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'default_secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'default_refresh_secret',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000, // 15 minutos
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100
  },

  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:5500', 'http://localhost:8080', 'http://127.0.0.1:5500', 'http://127.0.0.1:8080', 'null']
  },

  // Email
  email: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },

  // Gemini API
  gemini: {
    apiKey: process.env.GEMINI_API_KEY
  }
};
