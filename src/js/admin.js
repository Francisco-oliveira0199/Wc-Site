// =============================================================================
// PROJETO: Wild Clash - Painel Administrativo (Versão Offline Completa)
// ARQUIVO: admin.js
// DESCRIÇÃO: Painel administrativo offline com validação de códigos integrada
// =============================================================================

// Configurações
const FIXED_CREDENTIALS = {
    username: 'admin123',
    password: 'admin123'
};

const SYSTEM_CONFIG = {
    storageKey: 'wildclash_codes_v2',
    settingsKey: 'wildclash_settings_v2',
    backupKey: 'wildclash_backups_v2',
    adminPassword: 'admin123',
    version: '1.2.0'
};

// Variáveis globais
let authToken = localStorage.getItem('wildclash_admin_token');
let currentPage = 'dashboard';
let currentTab = 'available-tab';
let currentPageNumbers = {
    available: 1,
    used: 1,
    expired: 1,
    all: 1
};
const itemsPerPage = 10;
let codes = [];
let settings = {};
let pendingAction = null;

// Elementos DOM
const loginPage = document.getElementById('loginPage');
const dashboard = document.getElementById('dashboard');
const loginForm = document.getElementById('loginForm');
const loginAlert = document.getElementById('loginAlert');
const logoutBtn = document.getElementById('logoutBtn');
const welcomeUser = document.getElementById('welcomeUser');
const pageTitle = document.getElementById('pageTitle');
const pageContent = document.getElementById('pageContent');
const navLinks = document.querySelectorAll('.nav-link');
const modeIndicator = document.getElementById('modeIndicator');

// ========== INICIALIZAÇÃO ==========
document.addEventListener('DOMContentLoaded', function() {
    console.log('Wild Clash Admin - Modo OFFLINE iniciado');
    
    // Verificar autenticação
    checkAuthentication();
    
    // Inicializar sistema
    initSystem();
    
    // Carregar todos os dados
    loadAllData();
    
    // Configurar event listeners
    setupEventListeners();
    
    // Verificar expiração de códigos a cada minuto
    setInterval(checkExpiredCodes, 60000);
    
    // Auto-save a cada 30 segundos
    setInterval(saveAllData, 30000);
    
    // Log de inicialização
    console.log(`
╔══════════════════════════════════════════════╗
║      PAINEL ADMIN WILD CLASH INICIALIZADO    ║
╠══════════════════════════════════════════════╣
║ Login: ${FIXED_CREDENTIALS.username}/${FIXED_CREDENTIALS.password} ║
║ Modo: OFFLINE                                ║
║ Versão: ${SYSTEM_CONFIG.version}                       ║
║ Códigos: ${codes.length}                               ║
╚══════════════════════════════════════════════╝
    `);
});

// ========== AUTENTICAÇÃO ==========
function checkAuthentication() {
    if (window.location.pathname.includes('admin-panel.html')) {
        const isAuthenticated = localStorage.getItem('wildclash_authenticated') === 'true';
        
        if (!isAuthenticated) {
            const password = prompt('Digite a senha de administrador:');
            if (password === SYSTEM_CONFIG.adminPassword) {
                localStorage.setItem('wildclash_authenticated', 'true');
                showAlert(' Autenticado com sucesso!', 'success');
            } else {
                alert('Senha incorreta! Redirecionando...');
                window.location.href = 'index.html';
            }
        }
    } else {
        // Para login.html
        if (authToken && authToken.includes('admin_fixed_token')) {
            showDashboard();
            loadDashboardStats();
        } else {
            showLogin();
        }
    }
}

function showLogin() {
    if (loginPage) loginPage.style.display = 'flex';
    if (dashboard) dashboard.style.display = 'none';
}

function showDashboard() {
    if (loginPage) loginPage.style.display = 'none';
    if (dashboard) dashboard.style.display = 'flex';
    
    const user = JSON.parse(localStorage.getItem('wildclash_admin_user') || '{}');
    if (welcomeUser) welcomeUser.textContent = `Bem-vindo, ${user.username || 'Admin'}`;
    
    showPage(currentPage);
}

// Login MODIFICADO com credenciais fixas
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        // Limpar alerta anterior
        clearAlert(loginAlert);
        
        // Verificação de credenciais fixas
        if (username === FIXED_CREDENTIALS.username && password === FIXED_CREDENTIALS.password) {
            // Login bem-sucedido com credenciais fixas
            authToken = 'admin_fixed_token_' + Date.now();
            localStorage.setItem('wildclash_admin_token', authToken);
            localStorage.setItem('wildclash_admin_user', JSON.stringify({
                username: username,
                role: 'admin',
                login_time: new Date().toISOString()
            }));
            
            showAlert(loginAlert, ' Login realizado com sucesso!', 'success');
            setTimeout(() => {
                showDashboard();
                loadDashboardStats();
            }, 1000);
        } else {
            showAlert(loginAlert, ' Credenciais inválidas. Use: admin123 / admin123', 'error');
        }
    });
}

// Logout
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('wildclash_admin_token');
        localStorage.removeItem('wildclash_admin_user');
        localStorage.removeItem('wildclash_authenticated');
        authToken = null;
        
        if (window.location.pathname.includes('admin-panel.html')) {
            window.location.href = 'index.html';
        } else {
            showLogin();
            showAlert(loginAlert, ' Logout realizado com sucesso!', 'success');
        }
    });
}

// ========== SISTEMA OFFLINE ==========
function initSystem() {
    // Carregar configurações
    loadSettings();
    
    // Configurar modo offline
    if (modeIndicator) {
        modeIndicator.className = 'mode-indicator mode-offline';
        modeIndicator.innerHTML = ' Modo OFFLINE';
    }
    
    // Atualizar informações do sistema
    const systemVersion = document.getElementById('systemVersion');
    const systemMode = document.getElementById('systemMode');
    
    if (systemVersion) systemVersion.textContent = SYSTEM_CONFIG.version;
    if (systemMode) systemMode.textContent = 'OFFLINE';
}

function loadAllData() {
    loadCodes();
    loadSettings();
    updateStats();
    
    // Renderizar tabelas se existirem
    if (document.getElementById('allTableBody')) {
        renderAllTables();
    }
}

function saveAllData() {
    saveCodes();
    saveSettings();
}

// ========== GERENCIAMENTO DE CÓDIGOS ==========
function loadCodes() {
    try {
        // Carregar códigos do storage
        codes = window.WildClashStorage.getAllCodes();
        console.log(`${codes.length} códigos carregados do storage`);
    } catch (error) {
        console.error('Erro ao carregar códigos:', error);
        codes = [];
    }
}

function saveCodes() {
    try {
        // O storage já gerencia a persistência
        console.log('Códigos gerenciados pelo storage');
    } catch (error) {
        console.error('Erro ao salvar códigos:', error);
        showAlert(' Erro ao salvar códigos!', 'error');
    }
}

function loadSettings() {
    try {
        const saved = localStorage.getItem(SYSTEM_CONFIG.settingsKey);
        settings = saved ? JSON.parse(saved) : {
            defaultDays: 7,
            defaultUses: 1,
            codePrefix: 'WILDCLASH',
            autoExpire: true,
            lastBackup: null
        };
    } catch (error) {
        console.error('Erro ao carregar configurações:', error);
        settings = {};
    }
}

function saveSettings() {
    try {
        localStorage.setItem(SYSTEM_CONFIG.settingsKey, JSON.stringify(settings));
    } catch (error) {
        console.error('Erro ao salvar configurações:', error);
    }
}

// ========== FUNÇÕES DE VALIDAÇÃO OFFLINE ==========
function validateCodeOffline(code) {
    return window.WildClashStorage.validateCode(code);
}

function useCodeOffline(code) {
    return window.WildClashStorage.useCode(code);
}

// ========== FUNÇÕES DO PAINEL ==========
function generateCode(formData) {
    const teamName = formData.get('team_name');
    if (!teamName) {
        showAlert(' Digite o nome do time!', 'error');
        return null;
    }

    const validity = parseInt(formData.get('expires_in_days')) || settings.defaultDays || 7;
    const maxUses = parseInt(formData.get('max_uses')) || settings.defaultUses || 1;
    
    // Gerar código único usando o storage
    const codeValue = window.WildClashStorage.generateUniqueCode(settings.codePrefix || 'WILDCLASH');

    const newCode = {
        code: codeValue,
        team_name: teamName,
        coach_name: formData.get('coach_name') || '',
        coach_email: formData.get('coach_email') || '',
        coach_phone: formData.get('coach_phone') || '',
        validity_days: validity,
        max_uses: maxUses,
        notes: formData.get('notes') || ''
    };

    try {
        // Adicionar código usando o storage
        const addedCode = window.WildClashStorage.addCode(newCode);
        
        // Atualizar lista local
        loadCodes();
        updateStats();
        
        // Renderizar tabelas se estiverem visíveis
        renderAllTables();
        
        showAlert(' Código gerado com sucesso!', 'success');
        return addedCode;
    } catch (error) {
        showAlert(' Erro ao gerar código: ' + error.message, 'error');
        return null;
    }
}

function generateMultipleCodes(quantity, prefix, validity, maxUses) {
    const generated = [];
    for (let i = 1; i <= quantity; i++) {
        const teamName = prefix ? `${prefix}${i}` : `Time ${i}`;
        const codeValue = window.WildClashStorage.generateUniqueCode();
        
        const code = {
            code: codeValue,
            team_name: teamName,
            coach_name: '',
            coach_email: '',
            coach_phone: '',
            validity_days: validity,
            max_uses: maxUses,
            notes: `Código ${i} de ${quantity}`
        };
        
        try {
            const addedCode = window.WildClashStorage.addCode(code);
            generated.push(addedCode);
        } catch (error) {
            console.error(`Erro ao gerar código ${i}:`, error);
        }
    }
    
    // Atualizar lista local
    loadCodes();
    updateStats();
    renderAllTables();
    
    return generated;
}

function deleteCode(codeId) {
    showConfirm('Excluir Código', 'Tem certeza que deseja excluir este código?\nEsta ação não pode ser desfeita.', () => {
        const success = window.WildClashStorage.deleteCode(codeId);
        if (success) {
            loadCodes();
            updateStats();
            renderAllTables();
            showAlert(' Código excluído com sucesso!', 'success');
        } else {
            showAlert(' Erro ao excluir código!', 'error');
        }
    });
}

function useCode(codeId) {
    const code = codes.find(c => c.id === codeId);
    if (code) {
        code.current_uses++;
        if (code.current_uses >= code.max_uses) {
            code.status = 'used';
        }
        window.WildClashStorage.updateCode(code);
        loadCodes();
        updateStats();
        renderAllTables();
        showAlert(' Código marcado como usado!', 'success');
    }
}

function viewCode(codeId) {
    const code = codes.find(c => c.id === codeId);
    if (!code) return;
    
    const details = document.getElementById('codeDetails');
    const created = new Date(code.created_at);
    const expires = new Date(code.expires_at);
    const now = new Date();
    const isExpired = expires < now;
    const isUsed = code.current_uses >= code.max_uses;
    
    if (details) {
        details.innerHTML = `
            <div style="margin-bottom: 20px;">
                <h4 style="color: var(--primary-color);">Informações do Código</h4>
                <p><strong>Código:</strong> <span style="font-size: 1.2em; font-weight: bold;">${code.code}</span></p>
                <p><strong>Time:</strong> ${code.team_name}</p>
                <p><strong>Coach:</strong> ${code.coach_name || '-'}</p>
                <p><strong>Email:</strong> ${code.coach_email || '-'}</p>
                <p><strong>Telefone:</strong> ${code.coach_phone || '-'}</p>
            </div>
            
            <div style="margin-bottom: 20px;">
                <h4 style="color: var(--primary-color);">Configurações</h4>
                <p><strong>Dias de Validade:</strong> ${code.validity_days}</p>
                <p><strong>Usos:</strong> ${code.current_uses}/${code.max_uses}</p>
                <p><strong>Criado em:</strong> ${formatDate(created)}</p>
                <p><strong>Expira em:</strong> ${formatDate(expires)}</p>
                <p><strong>Status:</strong> <span class="status-badge ${getStatusClass(code.status)}">
                    ${getStatusText(code.status)}</span></p>
            </div>
            
            ${code.notes ? `
            <div style="margin-bottom: 20px;">
                <h4 style="color: var(--primary-color);">Observações</h4>
                <p>${code.notes}</p>
            </div>
            ` : ''}
            
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                <button class="btn btn-primary" onclick="copyToClipboard('${code.code}')">
                    <i class="fas fa-copy"></i> Copiar Código
                </button>
                ${!isUsed && !isExpired ? `
                <button class="btn btn-success" onclick="useCode('${code.id}'); closeModal('viewModal');">
                    <i class="fas fa-check"></i> Marcar como Usado
                </button>
                ` : ''}
                <button class="btn" onclick="closeModal('viewModal')">
                    <i class="fas fa-times"></i> Fechar
                </button>
            </div>
        `;
        
        showModal('viewModal');
    }
}

// ========== NAVEGAÇÃO E INTERFACE ==========
function showPage(page) {
    currentPage = page;
    
    // Esconder todas as páginas
    document.querySelectorAll('#pageContent > div').forEach(div => {
        div.style.display = 'none';
    });
    
    // Mostrar página atual
    const pageElement = document.getElementById(`${page}Page`);
    if (pageElement) pageElement.style.display = 'block';
    
    // Atualizar título
    const titles = {
        dashboard: 'Dashboard',
        generate: 'Gerar Códigos',
        codes: 'Gerenciar Códigos',
        stats: 'Estatísticas'
    };
    if (pageTitle) pageTitle.textContent = titles[page] || 'Dashboard';
    
    // Carregar dados da página
    switch(page) {
        case 'dashboard':
            loadDashboardStats();
            break;
        case 'codes':
            loadCodesPage();
            break;
        case 'stats':
            loadStats();
            break;
    }
}

function openTab(tabId) {
    // Esconder todas as tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remover active de todos os botões
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Mostrar tab selecionada
    document.getElementById(tabId).classList.add('active');
    
    // Ativar botão correspondente
    if (event && event.target) {
        event.target.classList.add('active');
    }
    
    // Atualizar dados da tab
    currentTab = tabId;
    const type = tabId.replace('-tab', '');
    if (type === 'all' || type === 'available' || type === 'used' || type === 'expired') {
        renderTable(type);
    }
}

function loadCodesPage() {
    renderTable('all');
}

function renderTable(type) {
    let filteredCodes = [];
    const now = new Date();
    
    switch(type) {
        case 'available':
            filteredCodes = codes.filter(c => 
                c.status === 'active' && 
                new Date(c.expires_at) > now &&
                c.current_uses < c.max_uses &&
                c.is_active === true
            );
            break;
            
        case 'used':
            filteredCodes = codes.filter(c => 
                (c.status === 'used' || c.current_uses >= c.max_uses) &&
                c.is_active === true
            );
            break;
            
        case 'expired':
            filteredCodes = codes.filter(c => 
                (c.status === 'expired' || new Date(c.expires_at) <= now) &&
                c.is_active === true
            );
            break;
            
        case 'all':
            filteredCodes = codes.filter(c => c.is_active === true);
            break;
    }
    
    // Aplicar busca
    const searchInput = document.getElementById(`search${type.charAt(0).toUpperCase() + type.slice(1)}`);
    if (searchInput && searchInput.value) {
        const searchTerm = searchInput.value.toLowerCase();
        filteredCodes = filteredCodes.filter(code => 
            code.code.toLowerCase().includes(searchTerm) ||
            code.team_name.toLowerCase().includes(searchTerm) ||
            (code.coach_name && code.coach_name.toLowerCase().includes(searchTerm))
        );
    }
    
    // Paginação
    const page = currentPageNumbers[type] || 1;
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedCodes = filteredCodes.slice(startIndex, endIndex);
    const totalPages = Math.ceil(filteredCodes.length / itemsPerPage);
    
    // Renderizar tabela
    const tbody = document.getElementById(`${type}TableBody`);
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (paginatedCodes.length === 0) {
        const colSpan = type === 'all' ? 8 : (type === 'available' ? 7 : 6);
        tbody.innerHTML = `<tr><td colspan="${colSpan}" style="text-align: center; padding: 40px;">Nenhum código encontrado</td></tr>`;
    } else {
        paginatedCodes.forEach(code => {
            const row = createTableRow(code, type);
            tbody.appendChild(row);
        });
    }
    
    // Renderizar paginação
    renderPagination(type, page, totalPages);
}

function renderAllTables() {
    renderTable('all');
    renderTable('available');
    renderTable('used');
    renderTable('expired');
}

function createTableRow(code, type) {
    const row = document.createElement('tr');
    const created = new Date(code.created_at);
    const expires = new Date(code.expires_at);
    
    switch(type) {
        case 'available':
            row.innerHTML = `
                <td><strong>${code.code}</strong></td>
                <td>${code.team_name}</td>
                <td>${code.validity_days}</td>
                <td>${code.current_uses}/${code.max_uses}</td>
                <td>${formatDate(expires)}</td>
                <td>${formatDate(created)}</td>
                <td class="actions-cell">
                    <button class="action-btn view" onclick="viewCode('${code.id}')" title="Visualizar">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn delete" onclick="deleteCode('${code.id}')" title="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            break;
            
        case 'used':
            const usedDate = code.current_uses > 0 ? new Date() : '-';
            row.innerHTML = `
                <td><strong>${code.code}</strong></td>
                <td>${code.team_name}</td>
                <td>${code.coach_name || '-'}</td>
                <td>${code.current_uses}/${code.max_uses}</td>
                <td>${code.current_uses > 0 ? formatDate(usedDate) : '-'}</td>
                <td>${formatDate(created)}</td>
                <td>
                    <button class="btn" onclick="viewCode('${code.id}')">
                        <i class="fas fa-history"></i> Detalhes
                    </button>
                </td>
            `;
            break;
            
        case 'expired':
            row.innerHTML = `
                <td><strong>${code.code}</strong></td>
                <td>${code.team_name}</td>
                <td>${code.coach_name || '-'}</td>
                <td>${code.validity_days}</td>
                <td>${formatDate(expires)}</td>
                <td>${formatDate(created)}</td>
                <td class="actions-cell">
                    <button class="action-btn view" onclick="viewCode('${code.id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn delete" onclick="deleteCode('${code.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            break;
            
        case 'all':
            row.innerHTML = `
                <td><strong>${code.code}</strong></td>
                <td>${code.team_name}</td>
                <td><span class="status-badge ${getStatusClass(code.status)}">${getStatusText(code.status)}</span></td>
                <td>${code.current_uses}/${code.max_uses}</td>
                <td>${code.validity_days} dias</td>
                <td>${formatDate(created)}</td>
                <td>${formatDate(expires)}</td>
                <td class="actions-cell">
                    <button class="action-btn view" onclick="viewCode('${code.id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn delete" onclick="deleteCode('${code.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            break;
    }
    
    return row;
}

function renderPagination(type, currentPage, totalPages) {
    const pagination = document.getElementById(`${type}Pagination`);
    if (!pagination || totalPages <= 1) {
        if (pagination) pagination.innerHTML = '';
        return;
    }
    
    let html = '';
    
    // Botão anterior
    html += `<button class="page-btn" ${currentPage <= 1 ? 'disabled' : ''} 
             onclick="changePage('${type}', ${currentPage - 1})">&laquo;</button>`;
    
    // Números das páginas
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
            html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" 
                     onclick="changePage('${type}', ${i})">${i}</button>`;
        } else if (i === currentPage - 3 || i === currentPage + 3) {
            html += `<span class="page-btn">...</span>`;
        }
    }
    
    // Botão próximo
    html += `<button class="page-btn" ${currentPage >= totalPages ? 'disabled' : ''} 
             onclick="changePage('${type}', ${currentPage + 1})">&raquo;</button>`;
    
    pagination.innerHTML = html;
}

function changePage(type, page) {
    currentPageNumbers[type] = page;
    renderTable(type);
}

function searchCodes(type) {
    renderTable(type);
}

// ========== DASHBOARD E ESTATÍSTICAS ==========
function loadDashboardStats() {
    const data = getLocalStats();
    updateStatsUI(data);
}

function getLocalStats() {
    return window.WildClashStorage.getStats();
}

function updateStats() {
    const stats = getLocalStats();
    
    // Atualizar dashboard admin.html
    const elements = {
        totalCodes: document.getElementById('totalCodes'),
        usedCodes: document.getElementById('usedCodes'),
        availableCodes: document.getElementById('availableCodes'),
        expiredCodes: document.getElementById('expiredCodes')
    };
    
    if (elements.totalCodes) elements.totalCodes.textContent = stats.total || 0;
    if (elements.usedCodes) elements.usedCodes.textContent = stats.used || 0;
    if (elements.availableCodes) elements.availableCodes.textContent = stats.available || 0;
    if (elements.expiredCodes) elements.expiredCodes.textContent = stats.expired || 0;
    
    // Atualizar admin-panel.html
    const panelElements = {
        totalCount: document.getElementById('totalCount'),
        availableCount: document.getElementById('availableCount'),
        usedCount: document.getElementById('usedCount'),
        expiredCount: document.getElementById('expiredCount'),
        systemTotalCodes: document.getElementById('systemTotalCodes')
    };
    
    if (panelElements.totalCount) panelElements.totalCount.textContent = stats.total;
    if (panelElements.availableCount) panelElements.availableCount.textContent = stats.available;
    if (panelElements.usedCount) panelElements.usedCount.textContent = stats.used;
    if (panelElements.expiredCount) panelElements.expiredCount.textContent = stats.expired;
    if (panelElements.systemTotalCodes) panelElements.systemTotalCodes.textContent = stats.total;
}

function updateStatsUI(stats) {
    const elements = {
        totalCodes: document.getElementById('totalCodes'),
        usedCodes: document.getElementById('usedCodes'),
        availableCodes: document.getElementById('availableCodes'),
        expiredCodes: document.getElementById('expiredCodes')
    };
    
    if (elements.totalCodes) elements.totalCodes.textContent = stats.total || 0;
    if (elements.usedCodes) elements.usedCodes.textContent = stats.used || 0;
    if (elements.availableCodes) elements.availableCodes.textContent = stats.available || 0;
    if (elements.expiredCodes) elements.expiredCodes.textContent = stats.expired || 0;
}

function loadStats() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    // Cálculos
    const totalUses = codes.reduce((sum, code) => sum + (code.current_uses || 0), 0);
    const totalCodes = codes.length;
    const usageRate = totalCodes > 0 ? Math.round((totalUses / (totalCodes * 3)) * 100) : 0;
    
    const todayCodes = codes.filter(code => {
        const created = new Date(code.created_at);
        return created >= today;
    }).length;
    
    const weekCodes = codes.filter(code => {
        const created = new Date(code.created_at);
        return created >= weekAgo;
    }).length;
    
    // Atualizar UI
    const totalUsesEl = document.getElementById('totalUses');
    const usageRateEl = document.getElementById('usageRate');
    const todayCodesEl = document.getElementById('todayCodes');
    const weekCodesEl = document.getElementById('weekCodes');
    
    if (totalUsesEl) totalUsesEl.textContent = totalUses;
    if (usageRateEl) usageRateEl.textContent = `${usageRate}%`;
    if (todayCodesEl) todayCodesEl.textContent = todayCodes;
    if (weekCodesEl) weekCodesEl.textContent = weekCodes;
}

// ========== FUNÇÕES UTILITÁRIAS ==========
function formatDate(date) {
    if (!date || isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('pt-BR');
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

function generateUniqueCode() {
    const prefix = settings.codePrefix || 'WILDCLASH';
    let code;
    do {
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        code = `${prefix}-${random}`;
    } while (codes.some(c => c.code === code));
    return code;
}

function getStatusClass(status) {
    switch(status) {
        case 'active': return 'status-active';
        case 'used': return 'status-used';
        case 'expired': return 'status-expired';
        case 'cancelled': return 'status-cancelled';
        default: return '';
    }
}

function getStatusText(status) {
    switch(status) {
        case 'active': return 'Ativo';
        case 'used': return 'Usado';
        case 'expired': return 'Expirado';
        case 'cancelled': return 'Cancelado';
        default: return status;
    }
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showAlert(' Código copiado para área de transferência!', 'success');
    }).catch(err => {
        showAlert(' Erro ao copiar código', 'error');
    });
}

// ========== MODAIS E ALERTAS ==========
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('active');
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
}

function showConfirm(title, message, callback) {
    const confirmTitle = document.getElementById('confirmTitle');
    const confirmMessage = document.getElementById('confirmMessage');
    
    if (confirmTitle && confirmMessage) {
        confirmTitle.textContent = title;
        confirmMessage.textContent = message;
        pendingAction = callback;
        showModal('confirmModal');
    }
}

function confirmAction(proceed) {
    closeModal('confirmModal');
    if (proceed && pendingAction) {
        pendingAction();
    }
    pendingAction = null;
}

function showAlert(message, type = 'info') {
    let container = document.getElementById('alertContainer');
    if (!container) {
        container = document.getElementById('loginAlert')?.parentElement;
    }
    
    if (!container) {
        console.log(message);
        return;
    }
    
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.innerHTML = `
        ${message}
        <span class="close" onclick="this.parentElement.remove()">&times;</span>
    `;
    container.appendChild(alert);
    
    // Remover automaticamente após 5 segundos
    setTimeout(() => {
        if (alert.parentElement) {
            alert.remove();
        }
    }, 5000);
}

function clearAlert(element) {
    if (!element) return;
    element.textContent = '';
    element.style.display = 'none';
}

// ========== EXPORTAÇÃO/IMPORTAÇÃO ==========
function exportToCSV() {
    const headers = ['Código', 'Time', 'Coach', 'Email', 'Telefone', 'Validade (dias)', 'Usos', 'Máx Usos', 'Status', 'Criado em', 'Expira em'];
    const rows = codes.map(code => [
        `"${code.code}"`,
        `"${code.team_name}"`,
        `"${code.coach_name || ''}"`,
        `"${code.coach_email || ''}"`,
        `"${code.coach_phone || ''}"`,
        code.validity_days,
        code.current_uses,
        code.max_uses,
        code.status,
        `"${formatDate(new Date(code.created_at))}"`,
        `"${formatDate(new Date(code.expires_at))}"`
    ]);
    
    const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wildclash-codes-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showAlert(' Códigos exportados em CSV!', 'success');
}

function exportGeneratedCodes(generatedCodes) {
    const text = generatedCodes.map(code => `${code.code} - ${code.team_name}`).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wildclash-codes-gerados-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function importFromFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.csv,.txt';
    
    input.onchange = function(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const content = e.target.result;
                
                if (file.name.endsWith('.json')) {
                    const imported = JSON.parse(content);
                    if (imported.codes && Array.isArray(imported.codes)) {
                        // Mesclar códigos
                        imported.codes.forEach(newCode => {
                            if (!codes.some(c => c.code === newCode.code)) {
                                codes.push({
                                    ...newCode,
                                    id: newCode.id || generateId()
                                });
                            }
                        });
                        
                        saveCodes();
                        updateStats();
                        renderAllTables();
                        showAlert(` ${imported.codes.length} códigos importados!`, 'success');
                    }
                } else if (file.name.endsWith('.csv')) {
                    // Implementar importação CSV se necessário
                    showAlert(' Importação CSV em desenvolvimento', 'warning');
                } else {
                    showAlert(' Formato de arquivo não suportado', 'error');
                }
            } catch (error) {
                showAlert(' Erro ao importar arquivo!', 'error');
            }
        };
        reader.readAsText(file);
    };
    
    input.click();
}

function backupData() {
    const backup = {
        codes: codes,
        settings: settings,
        backupDate: new Date().toISOString(),
        version: SYSTEM_CONFIG.version
    };
    
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wildclash-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    settings.lastBackup = new Date().toISOString();
    saveSettings();
    
    const systemLastBackup = document.getElementById('systemLastBackup');
    if (systemLastBackup) systemLastBackup.textContent = formatDate(new Date());
    showAlert(' Backup realizado com sucesso!', 'success');
}

function resetData() {
    showConfirm('Resetar Dados', ' ATENÇÃO: Esta ação apagará TODOS os códigos e configurações. Tem certeza?', () => {
        codes = [];
        settings = {
            defaultDays: 7,
            defaultUses: 1,
            codePrefix: 'WILDCLASH',
            autoExpire: true,
            lastBackup: null
        };
        
        saveCodes();
        saveSettings();
        updateStats();
        renderAllTables();
        
        showAlert(' Todos os dados foram resetados!', 'success');
    });
}

// ========== CONFIGURAÇÕES ==========
function saveSettings() {
    const configDefaultDays = document.getElementById('configDefaultDays');
    const configDefaultUses = document.getElementById('configDefaultUses');
    const configCodePrefix = document.getElementById('configCodePrefix');
    const configAutoExpire = document.getElementById('configAutoExpire');
    const configPassword = document.getElementById('configPassword');
    
    if (configDefaultDays) settings.defaultDays = parseInt(configDefaultDays.value) || 7;
    if (configDefaultUses) settings.defaultUses = parseInt(configDefaultUses.value) || 1;
    if (configCodePrefix) settings.codePrefix = configCodePrefix.value || 'WILDCLASH';
    if (configAutoExpire) settings.autoExpire = configAutoExpire.value === 'true';
    
    if (configPassword && configPassword.value) {
        SYSTEM_CONFIG.adminPassword = configPassword.value;
        configPassword.value = '';
        showAlert(' Senha alterada com sucesso!', 'success');
    }
    
    saveAllData();
    showAlert(' Configurações salvas!', 'success');
}

function checkExpiredCodes() {
    if (!settings.autoExpire) return;
    
    const now = new Date();
    let updated = false;
    
    codes.forEach(code => {
        if (code.status === 'active' && new Date(code.expires_at) <= now) {
            code.status = 'expired';
            updated = true;
        }
    });
    
    if (updated) {
        saveCodes();
        updateStats();
        renderAllTables();
    }
}

// ========== EVENT LISTENERS ==========
function setupEventListeners() {
    // Navegação
    if (navLinks) {
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                
                // Remover classe active de todos
                navLinks.forEach(l => l.classList.remove('active'));
                // Adicionar ao clicado
                link.classList.add('active');
                
                // Mostrar página correspondente
                const page = link.getAttribute('data-page');
                showPage(page);
            });
        });
    }
    
    // Botão de ação rápida
    const quickGenerateBtn = document.getElementById('quickGenerateBtn');
    if (quickGenerateBtn) {
        quickGenerateBtn.addEventListener('click', () => {
            showPage('generate');
        });
    }
    
    // Formulário de geração de código (admin.html)
    const generateForm = document.getElementById('generateForm');
    if (generateForm) {
        generateForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const codeData = {
                team_name: document.getElementById('teamName').value,
                coach_name: document.getElementById('coachName').value || null,
                coach_email: document.getElementById('coachEmail').value || null,
                expires_in_days: parseInt(document.getElementById('expiryDays').value),
                max_uses: parseInt(document.getElementById('maxUses').value),
                notes: document.getElementById('notes').value || null
            };
            
            // Validação básica
            if (!codeData.team_name) {
                showAlert(' Nome do time é obrigatório', 'error');
                return;
            }
            
            // Gerar código localmente
            const code = window.WildClashStorage.generateUniqueCode();
            const generatedData = {
                id: generateId(),
                code: code,
                team_name: codeData.team_name,
                coach_name: codeData.coach_name,
                coach_email: codeData.coach_email,
                created_at: new Date().toISOString(),
                expires_at: new Date(Date.now() + (codeData.expires_in_days * 24 * 60 * 60 * 1000)).toISOString(),
                max_uses: codeData.max_uses,
                current_uses: 0,
                notes: codeData.notes,
                is_expired: false,
                is_max_used: false,
                status: 'active',
                is_active: true
            };
            
            // Salvar usando storage
            window.WildClashStorage.addCode(generatedData);
            
            showAlert(' Código gerado localmente com sucesso!', 'success');
            
            const generatedCodeInput = document.getElementById('generatedCode');
            const generatedCodeSection = document.getElementById('generatedCodeSection');
            
            if (generatedCodeInput) generatedCodeInput.value = code;
            if (generatedCodeSection) generatedCodeSection.style.display = 'block';
            generateForm.reset();
            
            // Atualizar estatísticas
            updateStats();
            
            // Recarregar lista de códigos se estiver na página
            if (currentPage === 'codes') {
                renderTable('all');
            }
        });
    }
    
    // Formulário de geração (admin-panel.html)
    const generateCodeForm = document.getElementById('generateCodeForm');
    if (generateCodeForm) {
        generateCodeForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const generatedCode = generateCode(formData);
            
            if (generatedCode) {
                // Mostrar resultado
                const resultDiv = document.getElementById('generatedCodeResult');
                const codeResult = document.getElementById('codeResult');
                
                if (resultDiv && codeResult) {
                    codeResult.innerHTML = `
                        <p><strong>Código:</strong> <span style="font-size: 1.2em; font-weight: bold;">${generatedCode.code}</span></p>
                        <p><strong>Time:</strong> ${generatedCode.team_name}</p>
                        <p><strong>Validade:</strong> ${generatedCode.validity_days} dias</p>
                        <p><strong>Usos:</strong> ${generatedCode.max_uses}</p>
                        <p><strong>Expira em:</strong> ${formatDate(new Date(generatedCode.expires_at))}</p>
                        <button class="btn btn-primary" onclick="copyToClipboard('${generatedCode.code}')" style="margin-top: 10px;">
                            <i class="fas fa-copy"></i> Copiar Código
                        </button>
                    `;
                    
                    resultDiv.style.display = 'block';
                    this.reset();
                    showAlert(' Código gerado com sucesso!', 'success');
                }
            }
        });
    }
    
    // Botão de gerar múltiplos (modal)
    const generateMultipleBtn = document.getElementById('btn-generate-multiple');
    if (generateMultipleBtn) {
        generateMultipleBtn.addEventListener('click', function() {
            const quantity = parseInt(document.getElementById('multipleQuantity').value) || 5;
            const prefix = document.getElementById('multiplePrefix').value;
            const validity = parseInt(document.getElementById('multipleValidity').value) || 7;
            const maxUses = parseInt(document.getElementById('multipleUses').value) || 1;
            
            const generated = generateMultipleCodes(quantity, prefix, validity, maxUses);
            closeModal('multipleModal');
            showAlert(` ${quantity} códigos gerados com sucesso!`, 'success');
            exportGeneratedCodes(generated);
        });
    }
    
    // Busca de códigos (admin-panel.html)
    const searchAvailable = document.getElementById('searchAvailable');
    const searchUsed = document.getElementById('searchUsed');
    const searchExpired = document.getElementById('searchExpired');
    const searchAll = document.getElementById('searchAll');
    
    if (searchAvailable) {
        searchAvailable.addEventListener('input', debounce(() => {
            currentPageNumbers.available = 1;
            renderTable('available');
        }, 500));
    }
    
    if (searchUsed) {
        searchUsed.addEventListener('input', debounce(() => {
            currentPageNumbers.used = 1;
            renderTable('used');
        }, 500));
    }
    
    if (searchExpired) {
        searchExpired.addEventListener('input', debounce(() => {
            currentPageNumbers.expired = 1;
            renderTable('expired');
        }, 500));
    }
    
    if (searchAll) {
        searchAll.addEventListener('input', debounce(() => {
            currentPageNumbers.all = 1;
            renderTable('all');
        }, 500));
    }
    
    // Busca de códigos (admin.html)
    const searchCodesInput = document.getElementById('searchCodes');
    if (searchCodesInput) {
        searchCodesInput.addEventListener('input', debounce(() => {
            currentPageNumbers.all = 1;
            renderTable('all');
        }, 500));
    }
    
    // Atalhos de teclado para debug
    document.addEventListener('keydown', function(e) {
        // Ctrl+Shift+L - Limpar dados
        if (e.ctrlKey && e.shiftKey && e.key === 'L') {
            e.preventDefault();
            if (confirm('Limpar todos os dados do painel?')) {
                window.AdminDebug.clearAllData();
            }
        }
        
        // Ctrl+Shift+G - Gerar códigos de teste
        if (e.ctrlKey && e.shiftKey && e.key === 'G') {
            e.preventDefault();
            window.AdminDebug.generateTestCodes(3);
        }
    });
}

function generateMultiple() {
    showModal('multipleModal');
}

function refreshAll() {
    updateStats();
    renderAllTables();
    showAlert(' Dados atualizados!', 'success');
}

function logout() {
    localStorage.removeItem('wildclash_authenticated');
    window.location.href = 'index.html';
}

// ========== FUNÇÕES DE DEBUG ==========
window.AdminDebug = {
    clearAllData: function() {
        localStorage.removeItem('wildclash_admin_token');
        localStorage.removeItem('wildclash_admin_user');
        localStorage.removeItem('wildclash_admin_codes');
        localStorage.removeItem(SYSTEM_CONFIG.storageKey);
        localStorage.removeItem(SYSTEM_CONFIG.settingsKey);
        localStorage.removeItem('wildclash_authenticated');
        alert(' Todos os dados foram limpos!\nA página será recarregada.');
        location.reload();
    },
    
    generateTestCodes: function(count = 5) {
        const teams = ['Dragões de Fogo', 'Águias da Tempestade', 'Tigres de Aço', 'Leões da Montanha', 'Serpentes da Noite'];
        const coaches = ['Carlos Silva', 'Ana Santos', 'Pedro Costa', 'Mariana Lima', 'Ricardo Alves'];
        
        for (let i = 0; i < count; i++) {
            const codeData = {
                id: generateId(),
                code: window.WildClashStorage.generateUniqueCode(),
                team_name: teams[i % teams.length],
                coach_name: coaches[i % coaches.length],
                coach_email: `coach${i+1}@email.com`,
                coach_phone: `(11) 9${Math.floor(Math.random() * 9000) + 1000}-${Math.floor(Math.random() * 9000) + 1000}`,
                created_at: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
                expires_at: new Date(Date.now() + (7 + i) * 24 * 60 * 60 * 1000).toISOString(),
                validity_days: 7 + i,
                max_uses: Math.floor(Math.random() * 5) + 1,
                current_uses: Math.floor(Math.random() * 3),
                notes: `Código de teste ${i+1}`,
                status: Math.random() > 0.7 ? 'used' : 'active',
                is_active: true
            };
            
            window.WildClashStorage.addCode(codeData);
        }
        
        loadCodes();
        
        alert(` ${count} códigos de teste gerados!\nRecarregando dashboard...`);
        updateStats();
        renderAllTables();
    },
    
    viewLocalData: function() {
        const data = {
            token: localStorage.getItem('wildclash_admin_token'),
            user: JSON.parse(localStorage.getItem('wildclash_admin_user') || '{}'),
            codes: codes,
            settings: settings
        };
        console.log(' Dados locais:', data);
        alert('Verifique o console do navegador (F12) para ver os dados locais.');
    },
    
    testValidation: function() {
        const testCode = prompt('Digite um código para testar a validação:');
        if (testCode) {
            const result = window.WildClashStorage.validateCode(testCode);
            alert(`Resultado da validação: ${JSON.stringify(result, null, 2)}`);
        }
    }
};

// ========== FUNÇÕES AUXILIARES ==========
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ========== EXPORTAÇÃO PARA USO EM OUTROS ARQUIVOS ==========
window.WildClashAdmin = {
    validateCode: validateCodeOffline,
    useCode: useCodeOffline,
    getCodes: () => codes,
    getStats: getLocalStats,
    generateCode: generateCode,
    generateUniqueCode: generateUniqueCode
};