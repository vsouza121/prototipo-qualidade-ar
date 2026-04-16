// ===== Inicialização do Mapa =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM carregado - iniciando componentes...');
    
    // Verificar se as bibliotecas estão disponíveis
    if (typeof L !== 'undefined') {
        initMap();
        console.log('Mapa inicializado com sucesso');
    } else {
        console.warn('Leaflet não carregado - mapa não disponível');
        const mapContainer = document.getElementById('map');
        if (mapContainer) {
            mapContainer.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;background:#f1f5f9;color:#64748b;font-size:14px;"><i class="fas fa-map" style="margin-right:8px;"></i>Mapa requer conexão com internet</div>';
        }
    }
    
    // NÃO inicializa gráfico automaticamente - cada página controla seu próprio gráfico
    // As páginas Dashboard e Evolução Temporal têm gráficos dinâmicos via API
    
    initInteractions();
});

function initMap() {
    try {
        // Criar mapa centrado no Rio de Janeiro (onde estão a maioria das estações)
        const map = L.map('map').setView([-22.9068, -43.1729], 10);
    
        // Adicionar camada do OpenStreetMap
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap'
        }).addTo(map);
        
        // Exportar mapa para uso global
        window.map = map;
        
        // Função global para criar ícones de marcadores
        // Online (ativo) = verde, Offline (inativo) = cinza
        window.getIcon = function(status) {
            // Normalizar status para verificação
            const statusNormalizado = (status || '').toLowerCase();
            
            // Determinar se está online (verde) ou offline (cinza)
            const isOnline = ['normal', 'ativo', 'online', 'active'].includes(statusNormalizado);
            const color = isOnline ? '#10b981' : '#6b7280';
            
            return L.divIcon({
                className: 'custom-marker',
                html: `<div style="
                    background-color: ${color};
                    width: 28px;
                    height: 28px;
                    border-radius: 50%;
                    border: 3px solid white;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                ">
                    <i class="fas fa-broadcast-tower" style="color: white; font-size: 12px;"></i>
                </div>`,
                iconSize: [28, 28],
                iconAnchor: [14, 14]
            });
        };
        
        console.log('Mapa base inicializado - aguardando dados da API');
    } catch (error) {
        console.error('Erro ao inicializar mapa:', error);
    }
}

function initChart() {
    try {
    const ctx = document.getElementById('evolutionChart');
    if (!ctx) {
        console.warn('Elemento evolutionChart não encontrado');
        return;
    }
    
    // Dados de demonstração (gráficos dinâmicos usam API real)
    const labels = [];
    const now = new Date();
    for (let i = 23; i >= 0; i--) {
        const hour = new Date(now - i * 3600000);
        labels.push(hour.getHours() + ':00');
    }
    
    // Dados de exemplo para visualização inicial
    const data = {
        labels: labels,
        datasets: [
            {
                label: 'REPLAN-01',
                data: generateRandomData(24, 10, 25),
                borderColor: '#00263A',
                backgroundColor: 'rgba(0, 38, 58, 0.1)',
                fill: true,
                tension: 0.4
            },
            {
                label: 'REDUC-01',
                data: generateRandomData(24, 15, 35),
                borderColor: '#00A19A',
                backgroundColor: 'rgba(0, 161, 154, 0.1)',
                fill: true,
                tension: 0.4
            },
            {
                label: 'REFAP-01',
                data: generateRandomData(24, 25, 50),
                borderColor: '#ef4444',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                fill: true,
                tension: 0.4
            }
        ]
    };
    
    const config = {
        type: 'line',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 20
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    titleColor: '#1e293b',
                    bodyColor: '#64748b',
                    borderColor: '#e2e8f0',
                    borderWidth: 1,
                    padding: 12,
                    boxPadding: 6
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#94a3b8',
                        maxRotation: 0
                    }
                },
                y: {
                    grid: {
                        color: '#f1f5f9'
                    },
                    ticks: {
                        color: '#94a3b8'
                    },
                    title: {
                        display: true,
                        text: 'PM2.5 (µg/m³)',
                        color: '#64748b'
                    }
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            }
        }
    };
    
    new Chart(ctx.getContext('2d'), config);
    } catch (error) {
        console.error('Erro ao inicializar gráfico:', error);
    }
}

function generateRandomData(count, min, max) {
    const data = [];
    let prev = (min + max) / 2;
    
    for (let i = 0; i < count; i++) {
        const change = (Math.random() - 0.5) * 10;
        prev = Math.max(min, Math.min(max, prev + change));
        data.push(Math.round(prev * 10) / 10);
    }
    
    return data;
}

function initInteractions() {
    // Toggle sidebar no mobile
    const menuToggle = document.querySelector('.menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    
    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });
    }
    
    // Fechar alerta banner
    const alertClose = document.querySelector('.alert-close');
    const alertBanner = document.querySelector('.alert-banner');
    
    if (alertClose && alertBanner) {
        alertClose.addEventListener('click', () => {
            alertBanner.style.display = 'none';
        });
    }
    
    // Tela cheia
    const fullscreenBtn = document.querySelector('.header-btn[title="Tela Cheia"]');
    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen();
            } else {
                document.exitFullscreen();
            }
        });
    }
    
    // REMOVIDO: updateRealTimeData que interferia na tabela de medições
    // A atualização em tempo real agora é gerenciada pelo módulo MedicoesTempoReal
}

// Função updateRealTimeData REMOVIDA - causava conflito com a tabela de medições
// A última coluna era sobrescrita com datas incorretamente

// ===== Notificações do navegador =====
function requestNotificationPermission() {
    if ('Notification' in window) {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                console.log('Notificações habilitadas');
            }
        });
    }
}

function showNotification(title, body) {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, {
            body: body,
            icon: '/favicon.ico'
        });
    }
}

// Solicitar permissão ao carregar
requestNotificationPermission();

// ===== Assistente IA - Chat =====
const AI_CONFIG = {
    // COLOQUE SUA API KEY DO GEMINI AQUI
    apiKey: '', // Exemplo: 'AIzaSy...'
    model: 'gemini-2.0-flash', // Modelo gratuito do Gemini
    systemPrompt: `Você é um assistente especializado em qualidade do ar para o Sistema de Gestão de Qualidade do Ar da Acoem Brasil.

Contexto do Sistema:
- Sistema monitora estações de qualidade do ar em refinarias (REPLAN, REDUC, RLAM, REFAP, etc.)
- Parâmetros monitorados: PM2.5, PM10, O₃ (Ozônio), NO₂, SO₂, CO
- Índice de Qualidade do Ar (IQAr): Bom (0-40), Moderado (41-80), Ruim (81-120), Muito Ruim (121-200), Péssimo (>200)

Dados Atuais (exemplo):
- 46 estações ativas, 94.7% de disponibilidade
- Alertas: REFAP-01 com SO₂ elevado (180.2 µg/m³)
- IQAr: REPLAN-01 (42-Bom), REDUC-03 (78-Moderado), RLAM-02 (35-Bom), REFAP-01 (156-Ruim)

Regras:
1. Responda em português brasileiro
2. Seja conciso e técnico
3. Cite normas CONAMA quando relevante
4. Sugira ações quando houver alertas
5. Use emojis moderadamente para clareza`
};

// Inicializar chat quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', initAIChat);

function initAIChat() {
    const aiBtn = document.getElementById('aiAssistantBtn');
    const aiModal = document.getElementById('aiChatModal');
    const aiClose = document.getElementById('aiChatClose');
    const aiInput = document.getElementById('aiChatInput');
    const aiSendBtn = document.getElementById('aiSendBtn');
    const aiMessages = document.getElementById('aiChatMessages');
    const suggestions = document.querySelectorAll('.ai-suggestion');

    if (!aiBtn || !aiModal) return;

    // Abrir/Fechar chat
    aiBtn.addEventListener('click', () => {
        aiModal.classList.toggle('active');
        if (aiModal.classList.contains('active')) {
            aiInput.focus();
        }
    });

    aiClose.addEventListener('click', () => {
        aiModal.classList.remove('active');
    });

    // Enviar mensagem
    aiSendBtn.addEventListener('click', sendMessage);
    aiInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    // Sugestões rápidas
    suggestions.forEach(btn => {
        btn.addEventListener('click', () => {
            const message = btn.dataset.message;
            aiInput.value = message;
            sendMessage();
        });
    });

    async function sendMessage() {
        const message = aiInput.value.trim();
        if (!message) return;

        // Adicionar mensagem do usuário
        addMessage(message, 'user');
        aiInput.value = '';
        aiSendBtn.disabled = true;

        // Mostrar indicador de digitação
        const typingEl = addTypingIndicator();

        try {
            let response;
            
            if (AI_CONFIG.apiKey) {
                // Usar API do Gemini
                response = await callGeminiAPI(message);
            } else {
                // Modo demo - respostas simuladas
                response = await getSimulatedResponse(message);
            }

            // Remover indicador e mostrar resposta
            typingEl.remove();
            addMessage(response, 'bot');
        } catch (error) {
            typingEl.remove();
            addMessage('Desculpe, ocorreu um erro ao processar sua pergunta. Tente novamente.', 'bot');
            console.error('AI Error:', error);
        }

        aiSendBtn.disabled = false;
        aiMessages.scrollTop = aiMessages.scrollHeight;
    }

    function addMessage(content, type) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `ai-message ${type}`;
        
        const avatarIcon = type === 'bot' 
            ? '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/></svg>'
            : '<i class="fas fa-user"></i>';

        messageDiv.innerHTML = `
            <div class="ai-message-avatar">${avatarIcon}</div>
            <div class="ai-message-content"><p>${formatMessage(content)}</p></div>
        `;
        
        aiMessages.appendChild(messageDiv);
        aiMessages.scrollTop = aiMessages.scrollHeight;
    }

    function addTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'ai-message bot';
        typingDiv.innerHTML = `
            <div class="ai-message-avatar">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/></svg>
            </div>
            <div class="ai-message-content">
                <div class="ai-typing">
                    <span></span><span></span><span></span>
                </div>
            </div>
        `;
        aiMessages.appendChild(typingDiv);
        aiMessages.scrollTop = aiMessages.scrollHeight;
        return typingDiv;
    }

    function formatMessage(text) {
        // Converter markdown básico para HTML
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>');
    }
}

// ===== API do Gemini =====
async function callGeminiAPI(userMessage) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${AI_CONFIG.model}:generateContent?key=${AI_CONFIG.apiKey}`;
    
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            contents: [{
                parts: [{
                    text: `${AI_CONFIG.systemPrompt}\n\nUsuário: ${userMessage}`
                }]
            }],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 1024,
            }
        })
    });

    if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
}

// ===== Respostas Simuladas (Demo) =====
async function getSimulatedResponse(message) {
    // Simular delay de rede
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
    
    const lowerMessage = message.toLowerCase();
    
    // Respostas baseadas em palavras-chave
    if (lowerMessage.includes('status') || lowerMessage.includes('atual')) {
        return `📊 **Status Atual do Sistema:**

• **46 estações** monitorando em tempo real
• **Disponibilidade:** 94.7%
• **Dados coletados hoje:** 12.458 registros

⚠️ **Alertas Ativos:**
• REFAP-01: SO₂ acima do limite (180.2 µg/m³)
• REPLAN-02: 48 dados pendentes de validação

A maioria das estações opera normalmente. Recomendo verificar a estação REFAP-01 com urgência.`;
    }
    
    if (lowerMessage.includes('iqar') || lowerMessage.includes('índice') || lowerMessage.includes('níveis')) {
        return `🌡️ **Índice de Qualidade do Ar (IQAr):**

O IQAr é calculado conforme Resolução CONAMA 491/2018:

• **Bom (0-40):** Qualidade satisfatória
• **Moderado (41-80):** Aceitável para população geral
• **Ruim (81-120):** Grupos sensíveis podem ser afetados
• **Muito Ruim (121-200):** Efeitos à saúde da população
• **Péssimo (>200):** Emergência ambiental

**Status das estações:**
✅ REPLAN-01: 42 (Bom)
🟡 REDUC-03: 78 (Moderado)  
✅ RLAM-02: 35 (Bom)
🔴 REFAP-01: 156 (Muito Ruim)`;
    }
    
    if (lowerMessage.includes('alerta') || lowerMessage.includes('crítico')) {
        return `⚠️ **Alertas Ativos no Sistema:**

🔴 **CRÍTICO - REFAP-01**
• Parâmetro: SO₂ (Dióxido de Enxofre)
• Valor: 180.2 µg/m³
• Limite: 125 µg/m³ (24h - CONAMA 491)
• Ação: Notificar equipe de operação

🟡 **ATENÇÃO - REPLAN-02**
• Tipo: Dados pendentes de validação
• Quantidade: 48 registros
• Ação: Revisar dados no módulo de validação

💡 **Recomendação:** Priorize a verificação da estação REFAP-01 para identificar causa da elevação de SO₂.`;
    }
    
    if (lowerMessage.includes('pm2.5') || lowerMessage.includes('pm10') || lowerMessage.includes('particulado')) {
        return `📈 **Análise de Material Particulado:**

**PM2.5 (Partículas finas < 2.5µm):**
• REPLAN-01: 12.4 µg/m³ ✅
• REPLAN-02: 15.1 µg/m³ ✅
• REFAP-01: 42.5 µg/m³ ⚠️

**Limite CONAMA:** 25 µg/m³ (24h)

**PM10 (Partículas < 10µm):**
• Valores entre 22.3 e 78.9 µg/m³
• REFAP-01 acima do padrão (78.9 µg/m³)

💡 Os níveis em REFAP-01 indicam possível correlação com emissões industriais. Sugiro cruzar com dados meteorológicos.`;
    }
    
    if (lowerMessage.includes('so2') || lowerMessage.includes('enxofre')) {
        return `🔬 **Análise de SO₂ (Dióxido de Enxofre):**

**Valores Atuais:**
• REPLAN-01: 8.3 µg/m³ ✅
• REDUC-01: 15.2 µg/m³ ✅
• RLAM-01: 6.1 µg/m³ ✅
• **REFAP-01: 180.2 µg/m³** 🔴

**Padrões CONAMA 491/2018:**
• 125 µg/m³ (24 horas)
• 20 µg/m³ (média anual)

⚠️ **REFAP-01 está 44% acima do limite!**

**Possíveis causas:**
• Queima de combustíveis com alto teor de enxofre
• Falha em sistema de dessulfurização
• Condições meteorológicas de estagnação

**Ações recomendadas:**
1. Verificar processos industriais
2. Checar equipamentos de controle
3. Analisar dispersão atmosférica`;
    }
    
    // Resposta padrão
    return `Entendi sua pergunta sobre "${message}".

Como assistente do Sistema de Qualidade do Ar da Acoem, posso ajudar com:

• 📊 Análise de dados de poluentes (PM2.5, PM10, O₃, NO₂, SO₂, CO)
• 🌡️ Interpretação de índices IQAr
• ⚠️ Verificação de alertas e limites legais (CONAMA)
• 📈 Tendências e padrões de qualidade do ar
• 🔧 Orientações sobre o sistema

Poderia reformular sua pergunta ou escolher um dos tópicos acima?

💡 **Dica:** Quando a API do Gemini estiver configurada, terei respostas mais completas e contextualizadas!`;
}
