// =============================================================================
// PROJETO: Wild Clash - Sistema de Acesso por Código
// ARQUIVO: acesso.js (para modal na index.html e página acesso.html)
// DESCRIÇÃO: Validação de códigos de acesso via API
// =============================================================================

// Configuração da API - ALTERE PARA SEU DOMÍNIO EM PRODUÇÃO
const API_URL = 'http://localhost:3001/api';
const STORAGE_KEY = 'wildclash_access_token';
const ADMIN_CODE = 'ADMIN123'; // Código especial para acessar o painel admin
const TEST_CODE = 'TESTE123';  // Código de teste para inscrições

document.addEventListener('DOMContentLoaded', function() {
    console.log('Sistema de acesso inicializado');
    
    // Verificar em qual página estamos
    if (document.getElementById('access-code-modal')) {
        // Estamos no modal da index.html
        initializeModalAccess();
    } else if (document.getElementById('access-code')) {
        // Estamos na página acesso.html
        initializeAccessPage();
    }
    
    // Verificar acesso existente em ambas as páginas
    checkExistingAccess();
});

// ========== FUNÇÕES PARA MODAL (index.html) ==========
function initializeModalAccess() {
    const accessCodeInput = document.getElementById('access-code-modal');
    const btnVerificar = document.getElementById('btn-verificar-modal');
    const btnLimpar = document.getElementById('btn-limpar-codigo-modal');
    const codeError = document.getElementById('code-error-modal');
    const accessStatus = document.getElementById('access-status-modal');
    
    if (!accessCodeInput || !btnVerificar) {
        console.log('Elementos do modal não encontrados');
        return;
    }
    
    // Event Listeners para o modal
    if (btnVerificar) {
        btnVerificar.addEventListener('click', verificarCodigoModal);
    }
    
    if (btnLimpar) {
        btnLimpar.addEventListener('click', function() {
            accessCodeInput.value = '';
            clearModalMessages();
            accessCodeInput.focus();
        });
    }
    
    if (accessCodeInput) {
        accessCodeInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                verificarCodigoModal();
            }
        });
        
        // Remover classe de erro ao digitar
        accessCodeInput.addEventListener('input', function() {
            this.classList.remove('error');
            if (codeError) {
                codeError.textContent = '';
                codeError.classList.remove('show');
            }
        });
    }
    
    async function verificarCodigoModal() {
        const codigo = accessCodeInput.value.trim().toUpperCase();
        
        clearModalMessages();
        
        if (!codigo) {
            showModalError('Por favor, digite um código de acesso');
            return;
        }
        
        // Verificar se é o código ADMIN
        if (codigo === ADMIN_CODE) {
            showModalSuccess(' Código de administrador válido! Redirecionando para o painel...');
            setTimeout(() => {
                window.location.href = 'admin-panel.html';
            }, 1500);
            return;
        }
        
        // Verificar se é o código de teste para inscrições
        if (codigo === TEST_CODE) {
            showModalSuccess(' Código de teste válido! Redirecionando para o formulário...');
            
            // Criar dados de acesso de teste
            const accessData = {
                codigo: TEST_CODE,
                team_name: 'Equipe Teste',
                coach_name: 'Coach Teste',
                coach_email: 'teste@email.com',
                validoAte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                code_id: 999,
                timestamp: new Date().toISOString()
            };
            
            localStorage.setItem(STORAGE_KEY, JSON.stringify(accessData));
            
            setTimeout(() => {
                window.location.href = 'inscricoes.html';
            }, 1500);
            return;
        }
        
        if (codigo.length < 8) {
            showModalError('Código inválido. O código deve ter pelo menos 8 caracteres.');
            return;
        }
        
        // Mostrar loading
        if (btnVerificar) {
            btnVerificar.disabled = true;
            btnVerificar.innerHTML = '<span class="loading-spinner"></span> Verificando...';
        }
        
        try {
            // Chamar API para validar código
            const response = await fetch(`${API_URL}/codes/validate/${codigo}`);
            
            if (!response.ok) {
                throw new Error('Erro na conexão com o servidor');
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Código inválido');
            }
            
            // Código válido - salvar no localStorage
            const accessData = {
                codigo: data.data.code,
                team_name: data.data.team_name,
                coach_name: data.data.coach_name,
                coach_email: data.data.coach_email,
                validoAte: data.data.expires_at,
                code_id: data.data.id,
                timestamp: new Date().toISOString()
            };
            
            localStorage.setItem(STORAGE_KEY, JSON.stringify(accessData));
            
            showModalSuccess(' Código válido! Redirecionando para o formulário...');
            
            // Redirecionar após 1.5 segundos
            setTimeout(() => {
                window.location.href = 'inscricoes.html';
            }, 1500);
            
        } catch (error) {
            showModalError(error.message);
            accessCodeInput.classList.add('error');
            
            // Restaurar botão
            if (btnVerificar) {
                btnVerificar.disabled = false;
                btnVerificar.textContent = 'Verificar Código';
            }
        }
    }
    
    function showModalError(mensagem) {
        if (codeError) {
            codeError.textContent = mensagem;
            codeError.classList.add('show');
            codeError.style.animation = 'fadeIn 0.3s ease';
        }
        
        if (accessStatus) {
            accessStatus.innerHTML = `
                <div class="message error" style="margin-top: 15px;">
                    x ${mensagem}
                </div>
            `;
            accessStatus.style.display = 'block';
        }
    }
    
    function showModalSuccess(mensagem) {
        if (accessStatus) {
            accessStatus.innerHTML = `
                <div class="message success" style="margin-top: 15px;">
                    ${mensagem}
                </div>
            `;
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
        
        if (accessCodeInput) {
            accessCodeInput.classList.remove('error');
        }
    }
}

// ========== FUNÇÕES PARA PÁGINA ACESSO.HTML ==========
function initializeAccessPage() {
    const accessCodeInput = document.getElementById('access-code');
    const btnVerificar = document.getElementById('btn-verificar');
    const btnLimpar = document.getElementById('btn-limpar-codigo');
    const accessStatus = document.getElementById('access-status');
    const codeError = document.getElementById('code-error');
    
    if (!accessCodeInput || !btnVerificar) {
        console.log('Elementos da página acesso.html não encontrados');
        return;
    }
    
    // Event Listeners
    if (btnVerificar) {
        btnVerificar.addEventListener('click', verificarCodigoPage);
    }
    
    if (btnLimpar) {
        btnLimpar.addEventListener('click', function() {
            accessCodeInput.value = '';
            clearPageMessages();
            accessCodeInput.focus();
        });
    }
    
    if (accessCodeInput) {
        accessCodeInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                verificarCodigoPage();
            }
        });
        
        // Remover classe de erro ao digitar
        accessCodeInput.addEventListener('input', function() {
            this.classList.remove('error');
            if (codeError) {
                codeError.textContent = '';
                codeError.style.display = 'none';
            }
        });
    }
    
    async function verificarCodigoPage() {
        const codigo = accessCodeInput.value.trim().toUpperCase();
        
        clearPageMessages();
        
        if (!codigo) {
            showPageError('Por favor, digite um código de acesso');
            return;
        }
        
        // Verificar se é o código ADMIN
        if (codigo === ADMIN_CODE) {
            showPageSuccess(' Código de administrador válido! Redirecionando para o painel...');
            setTimeout(() => {
                window.location.href = 'admin-panel.html';
            }, 1500);
            return;
        }
        
        // Verificar se é o código de teste para inscrições
        if (codigo === TEST_CODE) {
            showPageSuccess(' Código de teste válido! Redirecionando para o formulário...');
            
            // Criar dados de acesso de teste
            const accessData = {
                codigo: TEST_CODE,
                team_name: 'Equipe Teste',
                coach_name: 'Coach Teste',
                coach_email: 'teste@email.com',
                validoAte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                code_id: 999,
                timestamp: new Date().toISOString()
            };
            
            localStorage.setItem(STORAGE_KEY, JSON.stringify(accessData));
            
            setTimeout(() => {
                window.location.href = 'inscricoes.html';
            }, 1500);
            return;
        }
        
        if (codigo.length < 8) {
            showPageError('Código inválido. O código deve ter pelo menos 8 caracteres.');
            return;
        }
        
        // Mostrar loading
        if (btnVerificar) {
            btnVerificar.disabled = true;
            btnVerificar.innerHTML = '<span class="loading-spinner"></span> Verificando...';
        }
        
        try {
            // Chamar API para validar código
            const response = await fetch(`${API_URL}/codes/validate/${codigo}`);
            
            if (!response.ok) {
                throw new Error('Erro na conexão com o servidor');
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Código inválido');
            }
            
            // Código válido - salvar no localStorage
            const accessData = {
                codigo: data.data.code,
                team_name: data.data.team_name,
                coach_name: data.data.coach_name,
                coach_email: data.data.coach_email,
                validoAte: data.data.expires_at,
                code_id: data.data.id,
                timestamp: new Date().toISOString()
            };
            
            localStorage.setItem(STORAGE_KEY, JSON.stringify(accessData));
            
            showPageSuccess(' Código válido! Redirecionando para o formulário...');
            
            // Atualizar navegação
            updateNavigation();
            
            // Redirecionar após 1.5 segundos
            setTimeout(() => {
                window.location.href = 'inscricoes.html';
            }, 1500);
            
        } catch (error) {
            showPageError(error.message);
            accessCodeInput.classList.add('error');
            
            // Restaurar botão
            if (btnVerificar) {
                btnVerificar.disabled = false;
                btnVerificar.textContent = 'Verificar Código';
            }
        }
    }
    
    function showPageError(mensagem) {
        if (codeError) {
            codeError.textContent = mensagem;
            codeError.style.display = 'block';
            codeError.style.animation = 'fadeIn 0.3s ease';
        }
        
        if (accessStatus) {
            accessStatus.innerHTML = `
                <div class="message error">
                     ${mensagem}
                </div>
            `;
            accessStatus.style.display = 'block';
        }
    }
    
    function showPageSuccess(mensagem) {
        if (accessStatus) {
            accessStatus.innerHTML = `
                <div class="message success">
                   x ${mensagem}
                </div>
            `;
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
        
        if (accessCodeInput) {
            accessCodeInput.classList.remove('error');
        }
    }
}

// ========== FUNÇÕES COMPARTILHADAS ==========
function checkExistingAccess() {
    const accessData = localStorage.getItem(STORAGE_KEY);
    
    if (accessData) {
        try {
            const data = JSON.parse(accessData);
            const expira = new Date(data.validoAte);
            const hoje = new Date();
            
            if (expira > hoje) {
                // Acesso ainda válido
                console.log('Acesso válido encontrado:', data.team_name);
                
                // Se estiver na página de acesso, mostrar mensagem e redirecionar
                if (window.location.pathname.includes('acesso.html')) {
                    const accessStatus = document.getElementById('access-status');
                    if (accessStatus) {
                        accessStatus.innerHTML = `
                            <div class="message success">
                                 Você já tem acesso válido até ${expira.toLocaleDateString('pt-BR')}. Redirecionando...
                            </div>
                        `;
                        accessStatus.style.display = 'block';
                    }
                    
                    const btnVerificar = document.getElementById('btn-verificar');
                    if (btnVerificar) {
                        btnVerificar.disabled = true;
                        btnVerificar.textContent = 'Acesso já concedido';
                    }
                    
                    setTimeout(() => {
                        window.location.href = 'inscricoes.html';
                    }, 1500);
                }
            } else {
                // Acesso expirado - limpar
                localStorage.removeItem(STORAGE_KEY);
                console.log('Acesso expirado removido');
                
                if (window.location.pathname.includes('acesso.html')) {
                    const accessStatus = document.getElementById('access-status');
                    if (accessStatus) {
                        accessStatus.innerHTML = `
                            <div class="message error">
                                 Seu acesso expirou. Por favor, use um novo código.
                            </div>
                        `;
                        accessStatus.style.display = 'block';
                    }
                }
            }
        } catch (e) {
            localStorage.removeItem(STORAGE_KEY);
            console.error('Erro ao analisar dados de acesso:', e);
        }
    }
}

function updateNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        if (link.getAttribute('href') === 'acesso.html') {
            link.textContent = 'Formulário';
            link.href = 'inscricoes.html';
        }
    });
}

// ========== FUNÇÕES DE DEBUG/TESTE ==========
window.AccessDebug = {
    testAccessCode: function(code = 'TESTE123') {
        // Simula um código de teste válido
        const accessData = {
            codigo: code,
            team_name: 'Equipe Teste',
            coach_name: 'Coach Teste',
            coach_email: 'teste@email.com',
            validoAte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            code_id: 999,
            timestamp: new Date().toISOString()
        };
        
        localStorage.setItem(STORAGE_KEY, JSON.stringify(accessData));
        console.log(' Código de teste configurado:', accessData);
        alert('Código de teste configurado! Redirecionando...');
        
        setTimeout(() => {
            window.location.href = 'inscricoes.html';
        }, 1000);
    },
    
    testAdminCode: function() {
        alert('Usando código ADMIN123 para acessar o painel...');
        
        const fakeInput = document.createElement('input');
        fakeInput.value = 'ADMIN123';
        fakeInput.id = 'test-admin-input';
        document.body.appendChild(fakeInput);
        
        const accessCodeInput = document.getElementById('access-code-modal') || 
                                document.getElementById('access-code') || 
                                fakeInput;
        
        accessCodeInput.value = 'ADMIN123';
        
        if (document.getElementById('access-code-modal')) {
            document.getElementById('btn-verificar-modal').click();
        } else if (document.getElementById('access-code')) {
            document.getElementById('btn-verificar').click();
        } else {
            window.location.href = 'admin-panel.html';
        }
        
        document.body.removeChild(fakeInput);
    },
    
    clearAccess: function() {
        localStorage.removeItem(STORAGE_KEY);
        console.log(' Acesso limpo');
        alert('Acesso removido do localStorage');
        
        if (window.location.pathname.includes('acesso.html')) {
            location.reload();
        }
    },
    
    viewAccessData: function() {
        const data = localStorage.getItem(STORAGE_KEY);
        if (data) {
            console.log(' Dados de acesso:', JSON.parse(data));
            alert('Verifique o console para ver os dados de acesso');
        } else {
            console.log(' Nenhum dado de acesso encontrado');
            alert('Nenhum código de acesso armazenado');
        }
    }
};

console.log(`
╔══════════════════════════════════════════════╗
║           SISTEMA DE ACESSO ATIVO            ║
╠══════════════════════════════════════════════╣
║ Modo: ${document.getElementById('access-code-modal') ? 'Modal (index.html)' : 'Página (acesso.html)'} ║
║ API: ${API_URL}                              ║
║ Storage Key: ${STORAGE_KEY}                  ║
║ Código Admin: ${ADMIN_CODE}                  ║
║ Código Teste: ${TEST_CODE}                   ║
║ Acesso Atual: ${localStorage.getItem(STORAGE_KEY) ? '✅' : '❌'}               ║
╚══════════════════════════════════════════════╝
`);