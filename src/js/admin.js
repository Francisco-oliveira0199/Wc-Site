// =============================================================================
// PROJETO: Wild Clash - Painel Administrativo
// ARQUIVO: admin.js
// DESCRIÇÃO: Lógica do painel administrativo com login fixo
// =============================================================================

// Configurações da API
const API_URL = 'http://localhost:3001/api';
let authToken = localStorage.getItem('wildclash_admin_token');
let currentPage = 'dashboard';
let currentPageNumber = 1;
const itemsPerPage = 10;

// Credenciais fixas para login
const FIXED_CREDENTIALS = {
    username: 'admin123',
    password: 'admin123'
};

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

// Verificar se já está logado
if (authToken) {
    checkAuth();
}

// Login MODIFICADO com credenciais fixas
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
        return;
    }
    
    // Se as credenciais fixas falharem, tentar API (opcional)
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        // Se a API não existir ou falhar, mostrar erro
        if (!response.ok) {
            throw new Error('Credenciais inválidas ou servidor indisponível');
        }
        
        const data = await response.json();
        
        if (data.success) {
            authToken = data.token;
            localStorage.setItem('wildclash_admin_token', authToken);
            localStorage.setItem('wildclash_admin_user', JSON.stringify(data.user));
            
            showAlert(loginAlert, 'Login realizado com sucesso!', 'success');
            setTimeout(() => {
                showDashboard();
                loadDashboardStats();
            }, 1000);
        } else {
            showAlert(loginAlert, data.error || 'Credenciais inválidas', 'error');
        }
    } catch (error) {
        showAlert(loginAlert, ' Credenciais inválidas. Use: admin123 / admin123', 'error');
    }
});

// Logout
logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('wildclash_admin_token');
    localStorage.removeItem('wildclash_admin_user');
    authToken = null;
    showLogin();
    showAlert(loginAlert, ' Logout realizado com sucesso!', 'success');
});

// Navegação
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

// Botão de ação rápida
document.getElementById('quickGenerateBtn')?.addEventListener('click', () => {
    showPage('generate');
});

// Formulário de geração de código
const generateForm = document.getElementById('generateForm');
const generateAlert = document.getElementById('generateAlert');
const generatedCodeSection = document.getElementById('generatedCodeSection');
const generatedCodeInput = document.getElementById('generatedCode');

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
            showAlert(generateAlert, ' Nome do time é obrigatório', 'error');
            return;
        }
        
        try {
            // Tentar API primeiro
            let response;
            try {
                response = await fetch(`${API_URL}/codes/generate`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`
                    },
                    body: JSON.stringify(codeData)
                });
            } catch (apiError) {
                // Se API falhar, gerar código localmente
                console.log('API não disponível, gerando código localmente...');
                response = { ok: false };
            }
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    showAlert(generateAlert, ' Código gerado com sucesso!', 'success');
                    generatedCodeInput.value = data.data.code;
                    generatedCodeSection.style.display = 'block';
                    generateForm.reset();
                    
                    // Atualizar estatísticas
                    loadDashboardStats();
                } else {
                    throw new Error(data.error || 'Erro ao gerar código');
                }
            } else {
                // Gerar código localmente
                const code = generateRandomCode();
                const generatedData = {
                    id: Date.now(),
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
                    is_max_used: false
                };
                
                // Salvar no localStorage
                saveCodeToLocalStorage(generatedData);
                
                showAlert(generateAlert, ' Código gerado localmente com sucesso!', 'success');
                generatedCodeInput.value = code;
                generatedCodeSection.style.display = 'block';
                generateForm.reset();
                
                // Atualizar estatísticas
                loadDashboardStats();
                // Recarregar lista de códigos se estiver na página
                if (currentPage === 'codes') {
                    loadCodes(1);
                }
            }
        } catch (error) {
            showAlert(generateAlert, ` ${error.message}`, 'error');
        }
    });
}

// Busca de códigos
document.getElementById('searchCodes')?.addEventListener('input', debounce(() => {
    currentPageNumber = 1;
    loadCodes(1);
}, 500));

// Paginação
document.getElementById('prevPage')?.addEventListener('click', () => {
    if (currentPageNumber > 1) {
        currentPageNumber--;
        loadCodes(currentPageNumber);
    }
});

document.getElementById('nextPage')?.addEventListener('click', () => {
    currentPageNumber++;
    loadCodes(currentPageNumber);
});

// ========== FUNÇÕES PRINCIPAIS ==========

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
            loadCodes(1);
            break;
        case 'stats':
            loadStats();
            break;
    }
}

async function checkAuth() {
    // Com login fixo, basta verificar se existe o token
    if (authToken && authToken.includes('admin_fixed_token')) {
        showDashboard();
        loadDashboardStats();
    } else {
        showLogin();
    }
}

// ========== FUNÇÕES DO DASHBOARD ==========

async function loadDashboardStats() {
    try {
        // Tentar API primeiro
        let data;
        try {
            const response = await fetch(`${API_URL}/codes/list?limit=1`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            if (response.ok) {
                const result = await response.json();
                if (result.success && result.stats) {
                    data = result.stats;
                }
            }
        } catch (apiError) {
            // Se API falhar, usar dados locais
            data = getLocalStats();
        }
        
        // Usar dados locais se API não retornou
        if (!data) {
            data = getLocalStats();
        }
        
        // Atualizar UI
        updateStatsUI(data);
        
    } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
        // Usar dados locais em caso de erro
        const localStats = getLocalStats();
        updateStatsUI(localStats);
    }
}

function getLocalStats() {
    const codes = getCodesFromLocalStorage();
    const now = new Date();
    
    const totalCodes = codes.length;
    const usedCodes = codes.filter(code => code.current_uses >= code.max_uses).length;
    const expiredCodes = codes.filter(code => new Date(code.expires_at) < now).length;
    const availableCodes = codes.filter(code => 
        code.current_uses < code.max_uses && 
        new Date(code.expires_at) >= now
    ).length;
    
    return {
        total_codes: totalCodes,
        used_codes: usedCodes,
        expired_codes: expiredCodes,
        available_codes: availableCodes
    };
}

function updateStatsUI(stats) {
    const elements = {
        totalCodes: document.getElementById('totalCodes'),
        usedCodes: document.getElementById('usedCodes'),
        availableCodes: document.getElementById('availableCodes'),
        expiredCodes: document.getElementById('expiredCodes')
    };
    
    if (elements.totalCodes) elements.totalCodes.textContent = stats.total_codes || 0;
    if (elements.usedCodes) elements.usedCodes.textContent = stats.used_codes || 0;
    if (elements.availableCodes) elements.availableCodes.textContent = stats.available_codes || 0;
    if (elements.expiredCodes) elements.expiredCodes.textContent = stats.expired_codes || 0;
}

// ========== FUNÇÕES DE GERENCIAMENTO DE CÓDIGOS ==========

async function loadCodes(page = 1) {
    try {
        const search = document.getElementById('searchCodes')?.value || '';
        let codes = [];
        
        // Tentar API primeiro
        try {
            let url = `${API_URL}/codes/list?page=${page}&limit=${itemsPerPage}`;
            if (search) {
                url += `&search=${encodeURIComponent(search)}`;
            }
            
            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    codes = data.data;
                    // Atualizar paginação
                    if (data.pagination) {
                        updatePagination(data.pagination);
                    }
                }
            }
        } catch (apiError) {
            // Se API falhar, usar dados locais
            codes = getCodesFromLocalStorage();
            
            // Aplicar busca local
            if (search) {
                const searchLower = search.toLowerCase();
                codes = codes.filter(code => 
                    code.code.toLowerCase().includes(searchLower) ||
                    code.team_name.toLowerCase().includes(searchLower) ||
                    (code.coach_name && code.coach_name.toLowerCase().includes(searchLower)) ||
                    (code.coach_email && code.coach_email.toLowerCase().includes(searchLower))
                );
            }
            
            // Paginação local
            const startIndex = (page - 1) * itemsPerPage;
            const endIndex = startIndex + itemsPerPage;
            const paginatedCodes = codes.slice(startIndex, endIndex);
            
            updatePagination({
                page: page,
                total: codes.length,
                has_next: endIndex < codes.length,
                has_prev: page > 1
            });
            
            codes = paginatedCodes;
        }
        
        // Renderizar tabela
        renderCodesTable(codes);
        
    } catch (error) {
        console.error('Erro ao carregar códigos:', error);
        showAlert(document.getElementById('generateAlert') || loginAlert, 'Erro ao carregar códigos', 'error');
    }
}

function renderCodesTable(codes) {
    const tbody = document.getElementById('codesTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (codes.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 30px; color: var(--admin-gray);">
                    Nenhum código encontrado
                </td>
            </tr>
        `;
        return;
    }
    
    codes.forEach(code => {
        const row = document.createElement('tr');
        
        // Determinar status
        let status = '';
        let badgeClass = '';
        const now = new Date();
        const expiresAt = new Date(code.expires_at);
        
        if (code.current_uses >= code.max_uses) {
            status = 'USADO';
            badgeClass = 'badge-success';
        } else if (expiresAt < now) {
            status = 'EXPIRADO';
            badgeClass = 'badge-danger';
        } else {
            status = 'DISPONÍVEL';
            badgeClass = 'badge-info';
        }
        
        // Formatar data de expiração
        const formattedDate = expiresAt.toLocaleDateString('pt-BR');
        
        row.innerHTML = `
            <td><strong>${code.code}</strong></td>
            <td>${code.team_name || '-'}</td>
            <td>${code.coach_name || '-'}</td>
            <td><span class="badge ${badgeClass}">${status}</span></td>
            <td>${formattedDate}</td>
            <td>${code.current_uses || 0}/${code.max_uses || 1}</td>
            <td>
                <button class="btn" onclick="deleteCode(${code.id})" title="Deletar">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

function updatePagination(pagination) {
    const pageInfo = document.getElementById('pageInfo');
    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');
    
    if (pageInfo) {
        const totalPages = Math.ceil(pagination.total / itemsPerPage);
        pageInfo.textContent = `Página ${pagination.page} de ${totalPages || 1}`;
    }
    
    if (prevBtn) {
        prevBtn.disabled = !pagination.has_prev && pagination.page <= 1;
    }
    
    if (nextBtn) {
        nextBtn.disabled = !pagination.has_next;
    }
}

// ========== FUNÇÕES DE ESTATÍSTICAS ==========

async function loadStats() {
    try {
        const codes = getCodesFromLocalStorage();
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        // Cálculos
        const totalUses = codes.reduce((sum, code) => sum + (code.current_uses || 0), 0);
        const totalCodes = codes.length;
        const usageRate = totalCodes > 0 ? Math.round((totalUses / (totalCodes * 3)) * 100) : 0; // Estimativa
        
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
        
    } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
    }
}

// ========== FUNÇÕES DE CRUD LOCAL ==========

function generateRandomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 12; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
        if ((i + 1) % 4 === 0 && i < 11) {
            code += '-';
        }
    }
    return code;
}

function saveCodeToLocalStorage(codeData) {
    const codes = getCodesFromLocalStorage();
    codes.push(codeData);
    localStorage.setItem('wildclash_admin_codes', JSON.stringify(codes));
    return codeData;
}

function getCodesFromLocalStorage() {
    const codesJson = localStorage.getItem('wildclash_admin_codes');
    return codesJson ? JSON.parse(codesJson) : [];
}

function deleteCodeFromLocalStorage(codeId) {
    const codes = getCodesFromLocalStorage();
    const filteredCodes = codes.filter(code => code.id !== codeId);
    localStorage.setItem('wildclash_admin_codes', JSON.stringify(filteredCodes));
    return true;
}

// ========== FUNÇÕES DE CONTROLE ==========

async function deleteCode(codeId) {
    if (!confirm('Tem certeza que deseja deletar este código?\nEsta ação não pode ser desfeita.')) {
        return;
    }
    
    try {
        // Tentar deletar na API
        let deleted = false;
        try {
            const response = await fetch(`${API_URL}/codes/${codeId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    deleted = true;
                }
            }
        } catch (apiError) {
            console.log('API não disponível, deletando localmente...');
        }
        
        // Se API não deletou ou falhou, deletar localmente
        if (!deleted) {
            deleteCodeFromLocalStorage(codeId);
        }
        
        // Recarregar dados
        loadDashboardStats();
        loadCodes(currentPageNumber);
        
        showAlert(generateAlert || loginAlert, ' Código deletado com sucesso!', 'success');
        
    } catch (error) {
        showAlert(generateAlert || loginAlert, ' Erro ao deletar código', 'error');
    }
}

// Copiar código para área de transferência
function copyToClipboard() {
    const code = generatedCodeInput?.value;
    if (!code) return;
    
    navigator.clipboard.writeText(code).then(() => {
        alert(' Código copiado para a área de transferência!');
    }).catch(err => {
        console.error('Erro ao copiar:', err);
        alert(' Erro ao copiar código');
    });
}

// ========== FUNÇÕES UTILITÁRIAS ==========

function showAlert(element, message, type = 'info') {
    if (!element) return;
    
    element.textContent = message;
    element.className = `alert alert-${type}`;
    element.style.display = 'block';
    
    // Auto-ocultar após 5 segundos para mensagens de sucesso/info
    if (type === 'success' || type === 'info') {
        setTimeout(() => {
            element.style.display = 'none';
        }, 5000);
    }
}

function clearAlert(element) {
    if (!element) return;
    element.textContent = '';
    element.style.display = 'none';
}

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

// ========== INICIALIZAÇÃO ==========

// Inicializar debug helpers
window.AdminDebug = {
    clearAllData: function() {
        localStorage.removeItem('wildclash_admin_token');
        localStorage.removeItem('wildclash_admin_user');
        localStorage.removeItem('wildclash_admin_codes');
        alert(' Todos os dados foram limpos!\nA página será recarregada.');
        location.reload();
    },
    
    generateTestCodes: function(count = 5) {
        const teams = ['Dragões de Fogo', 'Águias da Tempestade', 'Tigres de Aço', 'Leões da Montanha', 'Serpentes da Noite'];
        const coaches = ['Carlos Silva', 'Ana Santos', 'Pedro Costa', 'Mariana Lima', 'Ricardo Alves'];
        
        for (let i = 0; i < count; i++) {
            const codeData = {
                id: Date.now() + i,
                code: generateRandomCode(),
                team_name: teams[i % teams.length],
                coach_name: coaches[i % coaches.length],
                coach_email: `coach${i+1}@email.com`,
                created_at: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
                expires_at: new Date(Date.now() + (7 + i) * 24 * 60 * 60 * 1000).toISOString(),
                max_uses: Math.floor(Math.random() * 5) + 1,
                current_uses: Math.floor(Math.random() * 3),
                notes: `Código de teste ${i+1}`,
                is_expired: false,
                is_max_used: false
            };
            
            saveCodeToLocalStorage(codeData);
        }
        
        alert(` ${count} códigos de teste gerados!\nRecarregando dashboard...`);
        loadDashboardStats();
        if (currentPage === 'codes') loadCodes(1);
        if (currentPage === 'stats') loadStats();
    },
    
    viewLocalData: function() {
        const data = {
            token: localStorage.getItem('wildclash_admin_token'),
            user: JSON.parse(localStorage.getItem('wildclash_admin_user') || '{}'),
            codes: getCodesFromLocalStorage()
        };
        console.log(' Dados locais:', data);
        alert('Verifique o console do navegador (F12) para ver os dados locais.');
    }
};

// Log de inicialização
console.log(`
╔══════════════════════════════════════════════╗
║      PAINEL ADMIN WILD CLASH INICIALIZADO    ║
╠══════════════════════════════════════════════╣
║ Login: ${FIXED_CREDENTIALS.username}/${FIXED_CREDENTIALS.password}          ║
║ Token: ${authToken ? '✅ Presente' : '❌ Ausente'}                    ║
║ Página: ${currentPage}                                 ║
║ Códigos Locais: ${getCodesFromLocalStorage().length}             ║
╚══════════════════════════════════════════════╝
`);

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