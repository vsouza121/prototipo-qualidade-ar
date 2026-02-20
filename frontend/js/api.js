// ===== Serviço de API - Integração com Backend =====

const API_BASE_URL = 'http://localhost:3000/api';

// ===== Utilitários de Autenticação =====
const AuthService = {
    getToken() {
        return localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
    },

    getRefreshToken() {
        return localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken');
    },

    getUsuario() {
        const usuario = localStorage.getItem('usuario') || sessionStorage.getItem('usuario');
        return usuario ? JSON.parse(usuario) : null;
    },

    isLoggedIn() {
        return !!this.getToken();
    },

    async refreshToken() {
        const refreshToken = this.getRefreshToken();
        if (!refreshToken) return false;

        try {
            const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.sucesso) {
                    const storage = localStorage.getItem('accessToken') ? localStorage : sessionStorage;
                    storage.setItem('accessToken', data.dados.accessToken);
                    return true;
                }
            }
            return false;
        } catch (error) {
            console.error('Erro ao renovar token:', error);
            return false;
        }
    },

    logout() {
        const token = this.getToken();
        if (token) {
            // Enviar logout para o backend (opcional)
            fetch(`${API_BASE_URL}/auth/logout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            }).catch(() => {});
        }

        // Limpar storage
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('usuario');
        sessionStorage.removeItem('accessToken');
        sessionStorage.removeItem('refreshToken');
        sessionStorage.removeItem('usuario');

        // Redirecionar para login
        window.location.href = 'login.html';
    },

    checkAuth() {
        if (!this.isLoggedIn()) {
            window.location.href = 'login.html';
            return false;
        }
        return true;
    }
};

// ===== Cliente HTTP com autenticação =====
const ApiClient = {
    async request(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        const token = AuthService.getToken();

        const config = {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        };

        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }

        try {
            let response = await fetch(url, config);

            // Se receber 401, tentar renovar o token
            if (response.status === 401) {
                const refreshed = await AuthService.refreshToken();
                if (refreshed) {
                    config.headers['Authorization'] = `Bearer ${AuthService.getToken()}`;
                    response = await fetch(url, config);
                } else {
                    AuthService.logout();
                    return null;
                }
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error(`Erro na requisição ${endpoint}:`, error);
            throw error;
        }
    },

    get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    },

    post(endpoint, body) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(body)
        });
    },

    put(endpoint, body) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(body)
        });
    },

    delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }
};

// ===== Serviços da API =====

// Dashboard
const DashboardService = {
    async getResumo() {
        return ApiClient.get('/dashboard');
    },
    
    async getDashboard() {
        return ApiClient.get('/dashboard');
    },

    async getIQAr(estacaoId) {
        const endpoint = estacaoId ? `/iqar/estacao/${estacaoId}` : '/iqar';
        return ApiClient.get(endpoint);
    }
};

// Estações
const EstacoesService = {
    async listar(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const endpoint = queryString ? `/estacoes?${queryString}` : '/estacoes';
        return ApiClient.get(endpoint);
    },

    async buscarPorId(id) {
        return ApiClient.get(`/estacoes/${id}`);
    },

    async criar(estacao) {
        return ApiClient.post('/estacoes', estacao);
    },

    async atualizar(id, estacao) {
        return ApiClient.put(`/estacoes/${id}`, estacao);
    },

    async excluir(id) {
        return ApiClient.delete(`/estacoes/${id}`);
    },

    async getMapa() {
        return ApiClient.get('/estacoes/mapa');
    }
};

// Medições
const MedicoesService = {
    async listar(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const endpoint = queryString ? `/medicoes?${queryString}` : '/medicoes';
        return ApiClient.get(endpoint);
    },

    async buscarPorId(id) {
        return ApiClient.get(`/medicoes/${id}`);
    },

    async criar(medicao) {
        return ApiClient.post('/medicoes', medicao);
    },

    async atualizar(id, medicao) {
        return ApiClient.put(`/medicoes/${id}`, medicao);
    },

    async validar(id, dadosValidacao) {
        return ApiClient.put(`/medicoes/${id}/validar`, dadosValidacao);
    },

    async getTempoReal(estacaoId) {
        return ApiClient.get(`/medicoes/tempo-real/${estacaoId}`);
    },

    async getEstatisticas(estacaoId, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const endpoint = queryString 
            ? `/medicoes/estatisticas/${estacaoId}?${queryString}` 
            : `/medicoes/estatisticas/${estacaoId}`;
        return ApiClient.get(endpoint);
    }
};

// Alertas
const AlertasService = {
    async listar(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const endpoint = queryString ? `/alertas?${queryString}` : '/alertas';
        return ApiClient.get(endpoint);
    },

    async buscarPorId(id) {
        return ApiClient.get(`/alertas/${id}`);
    },

    async criar(alerta) {
        return ApiClient.post('/alertas', alerta);
    },

    async atualizar(id, alerta) {
        return ApiClient.put(`/alertas/${id}`, alerta);
    },

    async resolver(id, dadosResolucao) {
        return ApiClient.put(`/alertas/${id}/resolver`, dadosResolucao);
    },

    async getAtivos() {
        return ApiClient.get('/alertas/ativos/todos');
    }
};

// Usuários
const UsuariosService = {
    async listar(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const endpoint = queryString ? `/usuarios?${queryString}` : '/usuarios';
        return ApiClient.get(endpoint);
    },

    async buscarPorId(id) {
        return ApiClient.get(`/usuarios/${id}`);
    },

    async criar(usuario) {
        return ApiClient.post('/usuarios', usuario);
    },

    async atualizar(id, usuario) {
        return ApiClient.put(`/usuarios/${id}`, usuario);
    },

    async alterarSenha(id, senhas) {
        return ApiClient.put(`/usuarios/${id}/senha`, senhas);
    },

    async alterarStatus(id, ativo) {
        return ApiClient.put(`/usuarios/${id}/status`, { ativo });
    },

    async excluir(id) {
        return ApiClient.delete(`/usuarios/${id}`);
    }
};

// ===== Exportar para uso global =====
window.AuthService = AuthService;
window.ApiClient = ApiClient;
window.DashboardService = DashboardService;
window.EstacoesService = EstacoesService;
window.MedicoesService = MedicoesService;
window.AlertasService = AlertasService;
window.UsuariosService = UsuariosService;

// Alias para uso simplificado
window.api = ApiClient;
