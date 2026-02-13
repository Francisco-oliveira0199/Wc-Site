// =============================================================================
// PROJETO: Wild Clash - Sistema de Acesso por Código
// ARQUIVO: acesso.js (para modal na index.html e página acesso.html)
// DESCRIÇÃO: Validação de códigos de acesso via Storage
// =============================================================================

const ACCESS_STORAGE_KEY = 'wildclash_access_token';

document.addEventListener('DOMContentLoaded', function() {
    console.log('Sistema de acesso inicializado');
    
    // Aguardar storage carregar
    setTimeout(() => {
        // Verificar em qual página estamos
        if (document.getElementById('access-code-modal')) {
            initializeModalAccess();
        } else if (document.getElementById('access-code')) {
            initializeAccessPage();
        }
        
        checkExistingAccess();
    }, 100);
});

// ========== FUNÇÕES PARA MODAL (index.html) ==========
function initializeModalAccess() {
    const accessCodeInput = document.getElementById('access-code-modal');
    const btnVerificar = document.getElementById('btn-verificar-modal');
    const btnLimpar = document.getElementById('btn-limpar-codigo-modal');
    const codeError = document.getElementById('code-error-modal');
    const accessStatus = document.getElementById('access-status-modal');
    
    if (!accessCodeInput || !btnVerificar) return;
    
    btnVerificar.addEventListener('click', verificarCodigoModal);
    btnLimpar?.addEventListener('click', () => {
        accessCodeInput.value = '';
        clearModalMessages();
        accessCodeInput.focus();
    });
    
    accessCodeInput.addEventListener('keypress', (e) => e.key === 'Enter' && verificarCodigoModal());
    accessCodeInput.addEventListener('input', () => {
        accessCodeInput.classList.remove('error');
        if (codeError) {
            codeError.textContent = '';
            codeError.classList.remove('show');
        }
    });
    
    async function verificarCodigoModal() {
        const codigo = accessCodeInput.value.trim();
        clearModalMessages();
        
        if (!codigo) {
            showModalError('Por favor, digite um código de acesso');
            return;
        }
        
        // Admin code
        if (codigo === window.WildClashStorage.ADMIN_CODE) {
            showModalSuccess(' Código de administrador válido! Redirecionando para o painel...');
            // Salvar token de acesso admin
            const accessData = {
                codigo: window.WildClashStorage.ADMIN_CODE,
                team_name: 'Administrador',
                validoAte: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 1 dia
                code_id: 1,
                isAdmin: true,
                timestamp: new Date().toISOString()
            };
            localStorage.setItem(ACCESS_STORAGE_KEY, JSON.stringify(accessData));
            setTimeout(() => window.location.href = 'admin-panel.html', 1500);
            return;
        }
        
        // Test code
        if (codigo === window.WildClashStorage.TEST_CODE) {
            showModalSuccess(' Código de teste válido! Redirecionando para o formulário...');
            const accessData = {
                codigo: window.WildClashStorage.TEST_CODE,
                team_name: 'Equipe Teste',
                coach_name: 'Coach Teste',
                coach_email: 'teste@email.com',
                validoAte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                code_id: 2,
                timestamp: new Date().toISOString()
            };
            localStorage.setItem(ACCESS_STORAGE_KEY, JSON.stringify(accessData));
            setTimeout(() => window.location.href = 'inscricoes.html', 1500);
            return;
        }
        
        if (codigo.length < 8) {
            showModalError('Código inválido. O código deve ter pelo menos 8 caracteres.');
            return;
        }
        
        btnVerificar.disabled = true;
        btnVerificar.innerHTML = '<span class="loading-spinner"></span> Verificando...';
        
        try {
            const validation = window.WildClashStorage.validateCode(codigo);
            if (!validation.success) throw new Error(validation.error || 'Código inválido');
            
            const accessData = {
                codigo: validation.data.code,
                team_name: validation.data.team_name,
                coach_name: validation.data.coach_name,
                coach_email: validation.data.coach_email,
                validoAte: validation.data.expires_at,
                code_id: validation.data.id,
                timestamp: new Date().toISOString()
            };
            
            localStorage.setItem(ACCESS_STORAGE_KEY, JSON.stringify(accessData));
            showModalSuccess(' Código válido! Redirecionando para o formulário...');
            setTimeout(() => window.location.href = 'inscricoes.html', 1500);
            
        } catch (error) {
            showModalError(error.message);
            accessCodeInput.classList.add('error');
            btnVerificar.disabled = false;
            btnVerificar.textContent = 'Verificar Código';
        }
    }
    
    function showModalError(mensagem) {
        if (codeError) {
            codeError.textContent = mensagem;
            codeError.classList.add('show');
        }
        if (accessStatus) {
            accessStatus.innerHTML = `<div class="message error" style="margin-top:15px;">✗ ${mensagem}</div>`;
            accessStatus.style.display = 'block';
        }
    }
    
    function showModalSuccess(mensagem) {
        if (accessStatus) {
            accessStatus.innerHTML = `<div class="message success" style="margin-top:15px;">${mensagem}</div>`;
            accessStatus.style.display = 'block';
        }
        if (btnVerificar) {
            btnVerificar.disabled = true;
            btnVerificar.innerHTML = '<span class="loading-spinner"></span> Redirecionando...';
        }
    }
    
    function clearModalMessages() {
        if (codeError) {
            codeError.textContent = '';
            codeError.classList.remove('show');
        }
        if (accessStatus) {
            accessStatus.innerHTML = '';
            accessStatus.style.display = 'none';
        }
        if (accessCodeInput) accessCodeInput.classList.remove('error');
    }
}

// ========== FUNÇÕES PARA PÁGINA ACESSO.HTML ==========
function initializeAccessPage() {
    const accessCodeInput = document.getElementById('access-code');
    const btnVerificar = document.getElementById('btn-verificar');
    const btnLimpar = document.getElementById('btn-limpar-codigo');
    const accessStatus = document.getElementById('access-status');
    const codeError = document.getElementById('code-error');
    
    if (!accessCodeInput || !btnVerificar) return;
    
    btnVerificar.addEventListener('click', verificarCodigoPage);
    btnLimpar?.addEventListener('click', () => {
        accessCodeInput.value = '';
        clearPageMessages();
        accessCodeInput.focus();
    });
    
    accessCodeInput.addEventListener('keypress', (e) => e.key === 'Enter' && verificarCodigoPage());
    accessCodeInput.addEventListener('input', () => {
        accessCodeInput.classList.remove('error');
        if (codeError) {
            codeError.textContent = '';
            codeError.style.display = 'none';
        }
    });
    
    async function verificarCodigoPage() {
        const codigo = accessCodeInput.value.trim();
        clearPageMessages();
        
        if (!codigo) {
            showPageError('Por favor, digite um código de acesso');
            return;
        }
        
        // Admin code
        if (codigo === window.WildClashStorage.ADMIN_CODE) {
            showPageSuccess(' Código de administrador válido! Redirecionando para o painel...');
            const accessData = {
                codigo: window.WildClashStorage.ADMIN_CODE,
                team_name: 'Administrador',
                validoAte: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                code_id: 1,
                isAdmin: true,
                timestamp: new Date().toISOString()
            };
            localStorage.setItem(ACCESS_STORAGE_KEY, JSON.stringify(accessData));
            setTimeout(() => window.location.href = 'admin-panel.html', 1500);
            return;
        }
        
        // Test code
        if (codigo === window.WildClashStorage.TEST_CODE) {
            showPageSuccess(' Código de teste válido! Redirecionando para o formulário...');
            const accessData = {
                codigo: window.WildClashStorage.TEST_CODE,
                team_name: 'Equipe Teste',
                coach_name: 'Coach Teste',
                coach_email: 'teste@email.com',
                validoAte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                code_id: 2,
                timestamp: new Date().toISOString()
            };
            localStorage.setItem(ACCESS_STORAGE_KEY, JSON.stringify(accessData));
            setTimeout(() => window.location.href = 'inscricoes.html', 1500);
            return;
        }
        
        if (codigo.length < 8) {
            showPageError('Código inválido. O código deve ter pelo menos 8 caracteres.');
            return;
        }
        
        btnVerificar.disabled = true;
        btnVerificar.innerHTML = '<span class="loading-spinner"></span> Verificando...';
        
        try {
            const validation = window.WildClashStorage.validateCode(codigo);
            if (!validation.success) throw new Error(validation.error || 'Código inválido');
            
            const accessData = {
                codigo: validation.data.code,
                team_name: validation.data.team_name,
                coach_name: validation.data.coach_name,
                coach_email: validation.data.coach_email,
                validoAte: validation.data.expires_at,
                code_id: validation.data.id,
                timestamp: new Date().toISOString()
            };
            
            localStorage.setItem(ACCESS_STORAGE_KEY, JSON.stringify(accessData));
            showPageSuccess(' Código válido! Redirecionando para o formulário...');
            updateNavigation();
            setTimeout(() => window.location.href = 'inscricoes.html', 1500);
            
        } catch (error) {
            showPageError(error.message);
            accessCodeInput.classList.add('error');
            btnVerificar.disabled = false;
            btnVerificar.textContent = 'Verificar Código';
        }
    }
    
    function showPageError(mensagem) {
        if (codeError) {
            codeError.textContent = mensagem;
            codeError.style.display = 'block';
        }
        if (accessStatus) {
            accessStatus.innerHTML = `<div class="message error">✗ ${mensagem}</div>`;
            accessStatus.style.display = 'block';
        }
    }
    
    function showPageSuccess(mensagem) {
        if (accessStatus) {
            accessStatus.innerHTML = `<div class="message success">${mensagem}</div>`;
            accessStatus.style.display = 'block';
        }
        if (btnVerificar) {
            btnVerificar.disabled = true;
            btnVerificar.innerHTML = '<span class="loading-spinner"></span> Redirecionando...';
        }
    }
    
    function clearPageMessages() {
        if (codeError) {
            codeError.textContent = '';
            codeError.style.display = 'none';
        }
        if (accessStatus) {
            accessStatus.innerHTML = '';
            accessStatus.style.display = 'none';
        }
        if (accessCodeInput) accessCodeInput.classList.remove('error');
    }
}

// ========== FUNÇÕES COMPARTILHADAS ==========
function checkExistingAccess() {
    const accessData = localStorage.getItem(ACCESS_STORAGE_KEY);
    if (!accessData) return;
    
    try {
        const data = JSON.parse(accessData);
        const expira = new Date(data.validoAte);
        const hoje = new Date();
        
        if (expira > hoje) {
            console.log('Acesso válido encontrado:', data.team_name);
            
            // Se estiver na página de acesso, redirecionar automaticamente
            if (window.location.pathname.includes('acesso.html')) {
                const msg = data.isAdmin 
                    ? ' Você já tem acesso de administrador. Redirecionando...' 
                    : ` Você já tem acesso até ${expira.toLocaleDateString('pt-BR')}. Redirecionando...`;
                
                const accessStatus = document.getElementById('access-status');
                if (accessStatus) {
                    accessStatus.innerHTML = `<div class="message success">${msg}</div>`;
                    accessStatus.style.display = 'block';
                }
                
                const btn = document.getElementById('btn-verificar');
                if (btn) {
                    btn.disabled = true;
                    btn.textContent = 'Acesso já concedido';
                }
                
                setTimeout(() => {
                    if (data.isAdmin) window.location.href = 'admin-panel.html';
                    else window.location.href = 'inscricoes.html';
                }, 1500);
            }
        } else {
            localStorage.removeItem(ACCESS_STORAGE_KEY);
            console.log('Acesso expirado removido');
        }
    } catch (e) {
        localStorage.removeItem(ACCESS_STORAGE_KEY);
    }
}

function updateNavigation() {
    document.querySelectorAll('.nav-link').forEach(link => {
        if (link.getAttribute('href') === 'acesso.html') {
            link.textContent = 'Formulário';
            link.href = 'inscricoes.html';
        }
    });
}

// ========== DEBUG ==========
window.AccessDebug = {
    testAccessCode: (code = window.WildClashStorage?.TEST_CODE) => {
        if (!window.WildClashStorage) return alert('Storage não carregado!');
        const accessData = {
            codigo: code,
            team_name: 'Equipe Teste',
            coach_name: 'Coach Teste',
            coach_email: 'teste@email.com',
            validoAte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            code_id: 999,
            timestamp: new Date().toISOString()
        };
        localStorage.setItem(ACCESS_STORAGE_KEY, JSON.stringify(accessData));
        alert(' Código de teste configurado! Redirecionando...');
        setTimeout(() => window.location.href = 'inscricoes.html', 1000);
    },
    testAdminCode: () => {
        if (!window.WildClashStorage) return alert('Storage não carregado!');
        alert(' Usando código admin para acessar o painel...');
        const accessData = {
            codigo: window.WildClashStorage.ADMIN_CODE,
            team_name: 'Administrador',
            validoAte: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            code_id: 1,
            isAdmin: true,
            timestamp: new Date().toISOString()
        };
        localStorage.setItem(ACCESS_STORAGE_KEY, JSON.stringify(accessData));
        window.location.href = 'admin-panel.html';
    },
    clearAccess: () => {
        localStorage.removeItem(ACCESS_STORAGE_KEY);
        alert(' Acesso removido');
        if (window.location.pathname.includes('acesso.html')) location.reload();
    },
    viewAccessData: () => {
        const data = localStorage.getItem(ACCESS_STORAGE_KEY);
        if (data) {
            console.log(' Dados de acesso:', JSON.parse(data));
            alert(' Verifique o console (F12)');
        } else alert(' Nenhum código armazenado');
    }
};

console.log(`
╔══════════════════════════════════════════════╗
║           SISTEMA DE ACESSO ATIVO            ║
╠══════════════════════════════════════════════╣
║ Admin Code: ${window.WildClashStorage?.ADMIN_CODE || 'N/A'}   ║
║ Test Code:  ${window.WildClashStorage?.TEST_CODE || 'N/A'}   ║
╚══════════════════════════════════════════════╝
`);