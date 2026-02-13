// =============================================================================
// PROJETO: Wild Clash - Painel Administrativo (Offline / Storage)
// ARQUIVO: admin.js
// DESCRIÇÃO: Painel administrativo sem login, integrado ao storage.js
// VERSÃO: 1.2.8 - DEFINITIVA (TOTALMENTE SEM TACHADO)
// =============================================================================

const SYSTEM_CONFIG = {
    settingsKey: 'wildclash_settings_v2',
    version: '1.2.8'
};

let codes = [];
let settings = {};
let currentTab = 'available-tab';
let currentPageNumbers = {
    available: 1,
    used: 1,
    expired: 1,
    all: 1
};
const itemsPerPage = 10;
let pendingAction = null;

// ========== VERIFICAÇÃO DE ACESSO ADMIN ==========
function checkAdminAccess() {
    const accessData = localStorage.getItem('wildclash_access_token');
    if (!accessData) {
        alert('Acesso negado. Você precisa usar o código de administrador primeiro.');
        window.location.href = 'index.html';
        return false;
    }
    
    try {
        const data = JSON.parse(accessData);
        if (data.codigo !== window.WildClashStorage.ADMIN_CODE) {
            alert('Acesso negado. Código de administrador inválido.');
            window.location.href = 'index.html';
            return false;
        }
        
        const expira = new Date(data.validoAte);
        if (expira < new Date()) {
            alert('Sessão de administrador expirada. Faça login novamente.');
            localStorage.removeItem('wildclash_access_token');
            window.location.href = 'index.html';
            return false;
        }
        
        return true;
    } catch (e) {
        console.error('Erro ao verificar acesso:', e);
        window.location.href = 'index.html';
        return false;
    }
}

// ========== INICIALIZAÇÃO ==========
document.addEventListener('DOMContentLoaded', function() {
    console.log('Wild Clash Admin - Iniciando...');
    
    if (!window.WildClashStorage) {
        console.error('Storage não carregado!');
        alert('Erro crítico: storage.js não foi carregado.');
        return;
    }
    
    if (!checkAdminAccess()) return;
    
    initSystem();
    loadAllData();
    setupEventListeners();
    
    setInterval(() => {
        loadCodes();
        updateStats();
        if (document.querySelector('.tab-content.active')?.id.includes('tab')) {
            const activeTab = currentTab;
            renderTable(activeTab.replace('-tab', ''));
        }
    }, 30000);
});

function initSystem() {
    const modeIndicator = document.getElementById('modeIndicator');
    if (modeIndicator) {
        modeIndicator.className = 'mode-indicator mode-offline';
        modeIndicator.innerHTML = ' Modo OFFLINE';
    }
    
    loadSettings();
    
    const systemVersion = document.getElementById('systemVersion');
    const systemMode = document.getElementById('systemMode');
    const systemTotalCodes = document.getElementById('systemTotalCodes');
    const systemLastBackup = document.getElementById('systemLastBackup');
    
    if (systemVersion) systemVersion.textContent = SYSTEM_CONFIG.version;
    if (systemMode) systemMode.textContent = 'OFFLINE';
    if (systemTotalCodes) systemTotalCodes.textContent = window.WildClashStorage.getStats().total;
    if (systemLastBackup) systemLastBackup.textContent = settings.lastBackup 
        ? new Date(settings.lastBackup).toLocaleDateString('pt-BR') 
        : 'Nunca';
    
    const configDefaultDays = document.getElementById('configDefaultDays');
    const configDefaultUses = document.getElementById('configDefaultUses');
    const configCodePrefix = document.getElementById('configCodePrefix');
    const configAutoExpire = document.getElementById('configAutoExpire');
    
    if (configDefaultDays) configDefaultDays.value = settings.defaultDays || 7;
    if (configDefaultUses) configDefaultUses.value = settings.defaultUses || 1;
    if (configCodePrefix) configCodePrefix.value = settings.codePrefix || 'WILDCLASH';
    if (configAutoExpire) configAutoExpire.value = settings.autoExpire ? 'true' : 'false';
}

function loadAllData() {
    loadCodes();
    updateStats();
    renderAllTables();
}

function loadCodes() {
    try {
        codes = window.WildClashStorage.getAllCodes();
    } catch (error) {
        console.error('Erro ao carregar códigos:', error);
        codes = [];
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

// ========== ESTATÍSTICAS ==========
function updateStats() {
    const stats = window.WildClashStorage.getStats();
    
    const availableCount = document.getElementById('availableCount');
    const usedCount = document.getElementById('usedCount');
    const expiredCount = document.getElementById('expiredCount');
    const totalCount = document.getElementById('totalCount');
    const systemTotalCodes = document.getElementById('systemTotalCodes');
    
    if (availableCount) availableCount.textContent = stats.available;
    if (usedCount) usedCount.textContent = stats.used;
    if (expiredCount) expiredCount.textContent = stats.expired;
    if (totalCount) totalCount.textContent = stats.total;
    if (systemTotalCodes) systemTotalCodes.textContent = stats.total;
}

// ========== GERENCIAMENTO DE CÓDIGOS ==========
function generateCode(formData) {
    const teamName = formData.get('team_name');
    if (!teamName) {
        showAlert(' Digite o nome do time!', 'error');
        return null;
    }

    const validity = parseInt(formData.get('expires_in_days')) || settings.defaultDays || 7;
    const maxUses = parseInt(formData.get('max_uses')) || settings.defaultUses || 1;
    
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
        const addedCode = window.WildClashStorage.addCode(newCode);
        loadCodes();
        updateStats();
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
                <p><strong>Código:</strong> <span style="font-size: 1.2em; font-weight: bold; text-decoration: none !important;">${code.code}</span></p>
                <p><strong>Time:</strong> ${code.team_name}</p>
                <p><strong>Coach:</strong> ${code.coach_name || '-'}</p>
                <p><strong>Email:</strong> ${code.coach_email || '-'}</p>
                <p><strong>Telefone:</strong> ${code.coach_phone || '-'}</p>
            </div>
            <div style="margin-bottom: 20px;">
                <h4 style="color: var(--primary-color);">Configurações</h4>
                <p><strong>Dias de Validade:</strong> ${code.validity_days}</p>
                <p><strong>Usos:</strong> ${code.current_uses}/${code.max_uses}</p>
                <p><strong>Criado em:</strong> ${created.toLocaleDateString('pt-BR')}</p>
                <p><strong>Expira em:</strong> ${expires.toLocaleDateString('pt-BR')}</p>
                <p><strong>Status:</strong> <span class="status-badge ${getStatusClass(code.status)}">
                    ${getStatusText(code.status)}</span></p>
            </div>
            ${code.notes ? `<div><h4 style="color: var(--primary-color);">Observações</h4><p>${code.notes}</p></div>` : ''}
            <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-top: 20px;">
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

function useCode(codeId) {
    const code = codes.find(c => c.id === codeId);
    if (code) {
        const result = window.WildClashStorage.useCode(code.code);
        if (result.success) {
            loadCodes();
            updateStats();
            renderAllTables();
            showAlert(' Código marcado como usado!', 'success');
        }
    }
}

// ========== RENDERIZAÇÃO DAS TABELAS (SEM NENHUMA CLASSE) ==========
function renderTable(type) {
    const now = new Date();
    let filteredCodes = [];
    
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
    
    const searchInput = document.getElementById(`search${type.charAt(0).toUpperCase() + type.slice(1)}`);
    if (searchInput && searchInput.value) {
        const term = searchInput.value.toLowerCase();
        filteredCodes = filteredCodes.filter(c => 
            c.code.toLowerCase().includes(term) ||
            c.team_name.toLowerCase().includes(term) ||
            (c.coach_name && c.coach_name.toLowerCase().includes(term))
        );
    }
    
    const page = currentPageNumbers[type] || 1;
    const start = (page - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const paginated = filteredCodes.slice(start, end);
    const totalPages = Math.ceil(filteredCodes.length / itemsPerPage);
    
    const tbody = document.getElementById(`${type}TableBody`);
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (paginated.length === 0) {
        const colSpan = type === 'all' ? 8 : (type === 'available' ? 7 : 6);
        tbody.innerHTML = `<tr><td colspan="${colSpan}" style="text-align: center; padding: 40px;">Nenhum código encontrado</td></tr>`;
    } else {
        paginated.forEach(code => {
            const row = createTableRow(code, type);
            tbody.appendChild(row);
        });
    }
    
    renderPagination(type, page, totalPages);
    
    // Garantia extra: após renderizar a tabela, remove qualquer traço remanescente
    setTimeout(() => cleanAllStrikethrough(), 10);
}

function createTableRow(code, type) {
    const row = document.createElement('tr');
    const created = new Date(code.created_at);
    const expires = new Date(code.expires_at);
    
    // ========== NENHUMA CLASSE, APENAS ESTILO INLINE COM !IMPORTANT ==========
    const codeSpan = `<span style="font-family: monospace; font-weight: 500; text-decoration: none !important; text-decoration-line: none !important; border-bottom: none !important; border: none !important; outline: none !important; box-shadow: none !important;">${code.code}</span>`;
    
    switch(type) {
        case 'available':
            row.innerHTML = `
                <td>${codeSpan}</td>
                <td>${code.team_name}</td>
                <td>${code.validity_days}</td>
                <td>${code.current_uses}/${code.max_uses}</td>
                <td>${expires.toLocaleDateString('pt-BR')}</td>
                <td>${created.toLocaleDateString('pt-BR')}</td>
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
            row.innerHTML = `
                <td>${codeSpan}</td>
                <td>${code.team_name}</td>
                <td>${code.coach_name || '-'}</td>
                <td>${code.current_uses}/${code.max_uses}</td>
                <td>${code.current_uses > 0 ? new Date().toLocaleDateString('pt-BR') : '-'}</td>
                <td>${created.toLocaleDateString('pt-BR')}</td>
                <td><button class="btn" onclick="viewCode('${code.id}')"><i class="fas fa-history"></i> Detalhes</button></td>
            `;
            break;
        case 'expired':
            row.innerHTML = `
                <td>${codeSpan}</td>
                <td>${code.team_name}</td>
                <td>${code.coach_name || '-'}</td>
                <td>${code.validity_days}</td>
                <td>${expires.toLocaleDateString('pt-BR')}</td>
                <td>${created.toLocaleDateString('pt-BR')}</td>
                <td class="actions-cell">
                    <button class="action-btn view" onclick="viewCode('${code.id}')"><i class="fas fa-eye"></i></button>
                    <button class="action-btn delete" onclick="deleteCode('${code.id}')"><i class="fas fa-trash"></i></button>
                </td>
            `;
            break;
        case 'all':
            row.innerHTML = `
                <td>${codeSpan}</td>
                <td>${code.team_name}</td>
                <td><span class="status-badge ${getStatusClass(code.status)}">${getStatusText(code.status)}</span></td>
                <td>${code.current_uses}/${code.max_uses}</td>
                <td>${code.validity_days} dias</td>
                <td>${created.toLocaleDateString('pt-BR')}</td>
                <td>${expires.toLocaleDateString('pt-BR')}</td>
                <td class="actions-cell">
                    <button class="action-btn view" onclick="viewCode('${code.id}')"><i class="fas fa-eye"></i></button>
                    <button class="action-btn delete" onclick="deleteCode('${code.id}')"><i class="fas fa-trash"></i></button>
                </td>
            `;
            break;
    }
    return row;
}

// ========== FUNÇÃO RADICAL: REMOVE QUALQUER TRAÇO DE TODA A PÁGINA ==========
function cleanAllStrikethrough() {
    document.querySelectorAll('td:first-child span').forEach(el => {
        el.setAttribute('style', 
            'font-family: monospace !important; ' +
            'font-weight: 500 !important; ' +
            'text-decoration: none !important; ' +
            'text-decoration-line: none !important; ' +
            'border-bottom: none !important; ' +
            'border: none !important; ' +
            'outline: none !important; ' +
            'box-shadow: none !important;'
        );
        el.className = ''; // remove qualquer classe residual
    });
}

function renderPagination(type, currentPage, totalPages) {
    const pagination = document.getElementById(`${type}Pagination`);
    if (!pagination || totalPages <= 1) {
        if (pagination) pagination.innerHTML = '';
        return;
    }
    
    let html = '';
    html += `<button class="page-btn" ${currentPage <= 1 ? 'disabled' : ''} onclick="changePage('${type}', ${currentPage - 1})">&laquo;</button>`;
    
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
            html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="changePage('${type}', ${i})">${i}</button>`;
        } else if (i === currentPage - 3 || i === currentPage + 3) {
            html += `<span class="page-btn">...</span>`;
        }
    }
    
    html += `<button class="page-btn" ${currentPage >= totalPages ? 'disabled' : ''} onclick="changePage('${type}', ${currentPage + 1})">&raquo;</button>`;
    pagination.innerHTML = html;
}

function changePage(type, page) {
    currentPageNumbers[type] = page;
    renderTable(type);
}

function renderAllTables() {
    renderTable('all');
    renderTable('available');
    renderTable('used');
    renderTable('expired');
}

function searchCodes(type) {
    currentPageNumbers[type] = 1;
    renderTable(type);
}

function refreshAll() {
    loadCodes();
    updateStats();
    renderAllTables();
    showAlert('🔄 Dados atualizados!', 'success');
}

// ========== FUNÇÕES DE INTERFACE ==========
function openTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
    
    document.getElementById(tabId).classList.add('active');
    if (event?.target) event.target.classList.add('active');
    
    currentTab = tabId;
    const type = tabId.replace('-tab', '');
    if (['all', 'available', 'used', 'expired'].includes(type)) {
        renderTable(type);
    }
}

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
    if (!container) container = document.body;
    
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.innerHTML = `
        ${message}
        <span class="close" onclick="this.parentElement.remove()">&times;</span>
    `;
    container.appendChild(alert);
    
    setTimeout(() => alert.remove(), 5000);
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showAlert(' Código copiado!', 'success');
    }).catch(() => {
        showAlert(' Erro ao copiar', 'error');
    });
}

function getStatusClass(status) {
    switch(status) {
        case 'active': return 'status-active';
        case 'used': return 'status-used';
        case 'expired': return 'status-expired';
        default: return '';
    }
}

function getStatusText(status) {
    switch(status) {
        case 'active': return 'Ativo';
        case 'used': return 'Usado';
        case 'expired': return 'Expirado';
        default: return status;
    }
}

// ========== CONFIGURAÇÕES ==========
function saveSettings() {
    const configDefaultDays = document.getElementById('configDefaultDays');
    const configDefaultUses = document.getElementById('configDefaultUses');
    const configCodePrefix = document.getElementById('configCodePrefix');
    const configAutoExpire = document.getElementById('configAutoExpire');
    
    if (configDefaultDays) settings.defaultDays = parseInt(configDefaultDays.value) || 7;
    if (configDefaultUses) settings.defaultUses = parseInt(configDefaultUses.value) || 1;
    if (configCodePrefix) settings.codePrefix = configCodePrefix.value || 'WILDCLASH';
    if (configAutoExpire) settings.autoExpire = configAutoExpire.value === 'true';
    
    saveSettings();
    showAlert(' Configurações salvas!', 'success');
}

// ========== EXPORTAÇÃO / IMPORTAÇÃO ==========
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
        `"${new Date(code.created_at).toLocaleDateString('pt-BR')}"`,
        `"${new Date(code.expires_at).toLocaleDateString('pt-BR')}"`
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wildclash-codes-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showAlert(' Códigos exportados!', 'success');
}

function importFromFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const imported = JSON.parse(ev.target.result);
                if (imported.codes && Array.isArray(imported.codes)) {
                    imported.codes.forEach(newCode => {
                        if (!codes.some(c => c.code === newCode.code)) {
                            window.WildClashStorage.addCode({
                                ...newCode,
                                id: undefined
                            });
                        }
                    });
                    loadCodes();
                    updateStats();
                    renderAllTables();
                    showAlert(` ${imported.codes.length} códigos importados!`, 'success');
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
    a.click();
    URL.revokeObjectURL(url);
    
    settings.lastBackup = new Date().toISOString();
    saveSettings();
    
    const systemLastBackup = document.getElementById('systemLastBackup');
    if (systemLastBackup) systemLastBackup.textContent = new Date().toLocaleDateString('pt-BR');
    showAlert(' Backup realizado!', 'success');
}

function resetData() {
    showConfirm(' Resetar Dados', 'ATENÇÃO: Esta ação apagará TODOS os códigos e configurações. Tem certeza?', () => {
        const allCodes = window.WildClashStorage.getAllCodes();
        allCodes.forEach(c => window.WildClashStorage.deleteCode(c.id));
        
        window.WildClashStorage.addCode({
            code: window.WildClashStorage.ADMIN_CODE,
            team_name: 'Administrador',
            coach_name: 'Nitto',
            coach_email: 'nittocoach@gmail.com',
            validity_days: 365,
            max_uses: 9999,
            notes: 'Código de administrador'
        });
        window.WildClashStorage.addCode({
            code: window.WildClashStorage.TEST_CODE,
            team_name: 'Equipe Teste',
            coach_name: 'Coach Teste',
            coach_email: 'teste@email.com',
            validity_days: 7,
            max_uses: 1,
            notes: 'Código de teste'
        });
        
        settings = {
            defaultDays: 7,
            defaultUses: 1,
            codePrefix: 'WILDCLASH',
            autoExpire: true,
            lastBackup: null
        };
        saveSettings();
        
        loadCodes();
        updateStats();
        renderAllTables();
        showAlert(' Dados resetados com sucesso!', 'success');
    });
}

// ========== EVENT LISTENERS ==========
function setupEventListeners() {
    const generateForm = document.getElementById('generateCodeForm');
    if (generateForm) {
        generateForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(generateForm);
            const generated = generateCode(formData);
            if (generated) {
                const resultDiv = document.getElementById('generatedCodeResult');
                const codeResult = document.getElementById('codeResult');
                if (resultDiv && codeResult) {
                    codeResult.innerHTML = `
                        <p><strong>Código:</strong> <span style="font-size:1.2em; font-weight:bold; text-decoration: none !important;">${generated.code}</span></p>
                        <p><strong>Time:</strong> ${generated.team_name}</p>
                        <p><strong>Validade:</strong> ${generated.validity_days} dias</p>
                        <p><strong>Usos:</strong> ${generated.max_uses}</p>
                        <p><strong>Expira em:</strong> ${new Date(generated.expires_at).toLocaleDateString('pt-BR')}</p>
                        <button class="btn btn-primary" onclick="copyToClipboard('${generated.code}')" style="margin-top:10px;">
                            <i class="fas fa-copy"></i> Copiar Código
                        </button>
                    `;
                    resultDiv.style.display = 'block';
                    generateForm.reset();
                }
            }
        });
    }
    
    const btnMultiple = document.getElementById('btn-generate-multiple');
    if (btnMultiple) {
        btnMultiple.addEventListener('click', () => {
            const quantity = parseInt(document.getElementById('multipleQuantity').value) || 5;
            const prefix = document.getElementById('multiplePrefix').value;
            const validity = parseInt(document.getElementById('multipleValidity').value) || 7;
            const maxUses = parseInt(document.getElementById('multipleUses').value) || 1;
            
            const generated = generateMultipleCodes(quantity, prefix, validity, maxUses);
            closeModal('multipleModal');
            showAlert(` ${quantity} códigos gerados!`, 'success');
            exportGeneratedCodes(generated);
        });
    }
    
    const debounce = (fn, delay) => {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn(...args), delay);
        };
    };
    
    ['available', 'used', 'expired', 'all'].forEach(type => {
        const input = document.getElementById(`search${type.charAt(0).toUpperCase() + type.slice(1)}`);
        if (input) {
            input.addEventListener('input', debounce(() => {
                currentPageNumbers[type] = 1;
                renderTable(type);
            }, 500));
        }
    });
}

function generateMultiple() {
    showModal('multipleModal');
}

function exportGeneratedCodes(generated) {
    const text = generated.map(g => `${g.code} - ${g.team_name}`).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wildclash-codes-gerados-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
}

function logout() {
    localStorage.removeItem('wildclash_access_token');
    window.location.href = 'index.html';
}

// ========== DEBUG ==========
window.AdminDebug = {
    clearAllData: () => {
        if (confirm('Limpar todos os dados do painel?')) {
            localStorage.removeItem('wildclash_access_token');
            localStorage.removeItem(SYSTEM_CONFIG.settingsKey);
            const allCodes = window.WildClashStorage.getAllCodes();
            allCodes.forEach(c => window.WildClashStorage.deleteCode(c.id));
            alert(' Dados limpos! A página será recarregada.');
            location.reload();
        }
    },
    generateTestCodes: (count = 5) => {
        const teams = ['Dragões', 'Águias', 'Tigres', 'Leões', 'Serpentes'];
        const coaches = ['Carlos', 'Ana', 'Pedro', 'Mariana', 'Ricardo'];
        for (let i = 0; i < count; i++) {
            window.WildClashStorage.addCode({
                code: window.WildClashStorage.generateUniqueCode(),
                team_name: `${teams[i % teams.length]} ${i+1}`,
                coach_name: coaches[i % coaches.length],
                coach_email: `coach${i+1}@email.com`,
                validity_days: 7,
                max_uses: 1,
                notes: 'Código de teste'
            });
        }
        loadCodes();
        updateStats();
        renderAllTables();
        alert(` ${count} códigos de teste gerados!`);
    },
    viewLocalData: () => {
        console.log(' Códigos:', codes);
        console.log(' Configurações:', settings);
        alert('Verifique o console (F12)');
    }
};

console.log(`
╔══════════════════════════════════════════════╗
║      PAINEL ADMIN WILD CLASH ATIVO           ║
╠══════════════════════════════════════════════╣
║ Modo: OFFLINE                                ║
║ Códigos: ${codes.length}                               ║
║ Admin Code: ${window.WildClashStorage?.ADMIN_CODE}      ║
╚══════════════════════════════════════════════╝
`);