// =============================================================================
// PROJETO: Wild Clash - Funcionalidades do Formulário de Inscrição
// ARQUIVO: inscricoes.js (APENAS para página inscricoes.html)
// DESCRIÇÃO: Upload de logo, validação, EmailJS, sistema de regras
// =============================================================================

// Configurações
const IMGBB_API_KEY = 'c8882eb1787cc704d3b84f8df11b3085';
const API_URL = 'http://localhost:3001/api';
const STORAGE_KEY = 'wildclash_access_token';

document.addEventListener('DOMContentLoaded', function() {
    console.log('Formulário de inscrições inicializado');
    
    // Inicializar EmailJS
    initializeEmailJS();
    
    // Verificar acesso antes de mostrar o formulário
    verifyAccess();
    
    // Inicializar todas as funcionalidades
    initializeFormHandlers();
    initializeRulesScroll();
    initializeLogoUpload();
    initializeCharCounter();
    initializeMobileSettings();
    
    console.log('Formulário pronto para uso');
});

// ========== EMAILJS ==========
function initializeEmailJS() {
    if (typeof emailjs === 'undefined') {
        console.error('EmailJS SDK não carregado!');
        return;
    }
    
    try {
        emailjs.init({
            publicKey: "1bph11qy38lrIRSwK",
            blockHeadless: true,
            limitRate: {
                id: 'wildclash_inscricoes',
                throttle: 10000
            }
        });
        console.log('✅ EmailJS configurado');
    } catch (error) {
        console.error('❌ Erro ao configurar EmailJS:', error);
    }
}

// ========== VERIFICAÇÃO DE ACESSO ==========
function verifyAccess() {
    const accessData = localStorage.getItem(STORAGE_KEY);
    
    if (!accessData) {
        // Sem acesso - redirecionar
        showAccessError('Acesso não autorizado. Redirecionando...');
        setTimeout(() => {
            window.location.href = 'acesso.html';
        }, 2000);
        return;
    }
    
    try {
        const data = JSON.parse(accessData);
        const expira = new Date(data.validoAte);
        const hoje = new Date();
        
        if (expira < hoje) {
            // Acesso expirado
            localStorage.removeItem(STORAGE_KEY);
            showAccessError('Seu acesso expirou. Redirecionando...');
            setTimeout(() => {
                window.location.href = 'acesso.html?expired=true';
            }, 2000);
        } else {
            // Acesso válido - mostrar informações do time
            displayTeamInfo(data);
        }
    } catch (e) {
        localStorage.removeItem(STORAGE_KEY);
        window.location.href = 'acesso.html';
    }
}

function showAccessError(message) {
    const main = document.querySelector('main');
    if (main) {
        main.innerHTML = `
            <div class="form-section glass">
                <div class="access-error">
                    <h2 class="neon-title">Acesso Negado</h2>
                    <p>${message}</p>
                    <a href="acesso.html" class="btn neon">Voltar para Validação</a>
                </div>
            </div>
        `;
    }
}

function displayTeamInfo(accessData) {
    console.log('✅ Time autorizado:', accessData.team_name);
    // Você pode adicionar lógica para preencher automaticamente campos aqui
}

// ========== FUNÇÕES DO FORMULÁRIO ==========
function initializeFormHandlers() {
    const form = document.getElementById('inscricao-form');
    if (!form) return;
    
    // Validação em tempo real
    const inputs = form.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
        input.addEventListener('blur', validateField);
        input.addEventListener('input', clearFieldError);
    });
    
    // Configurar botões
    configureFormButtons(form);
    
    // Submit do formulário
    form.addEventListener('submit', handleFormSubmit);
    
    // Prevenir Enter em inputs não-textarea
    form.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA' && e.target.type !== 'submit') {
            e.preventDefault();
        }
    });
}

function configureFormButtons(form) {
    const btnEnviar = form.querySelector('#btn-enviar');
    const btnLimpar = form.querySelector('#btn-limpar');
    const btnAceitarRegras = form.querySelector('#btn-aceitar-regras');
    
    if (btnEnviar) {
        btnEnviar.disabled = true;
        btnEnviar.classList.add('disabled');
    }
    
    if (btnLimpar) {
        btnLimpar.addEventListener('click', function(e) {
            e.preventDefault();
            
            if (confirm('Tem certeza que deseja limpar todos os dados do formulário?')) {
                form.reset();
                resetFormButtons(form);
                showFormMessage(form, 
                    'Formulário limpo com sucesso. Preencha novamente para enviar uma nova inscrição.', 
                    'info');
            }
        });
    }
    
    if (btnAceitarRegras) {
        const rulesCheckbox = form.querySelector('#aceito_regras');
        
        btnAceitarRegras.addEventListener('click', function(e) {
            e.preventDefault();
            
            if (this.classList.contains('read') || this.classList.contains('accepted')) {
                toggleRulesAcceptance(this, rulesCheckbox, btnEnviar, form);
            } else {
                showFormMessage(form, 
                    'Leia as regras completamente primeiro. Role até o final das regras para habilitar o botão.', 
                    'error');
            }
        });
    }
}

function toggleRulesAcceptance(button, checkbox, submitBtn, form) {
    if (button.classList.contains('accepted')) {
        // Desmarcar
        button.classList.remove('accepted');
        button.classList.add('read');
        button.innerHTML = `
            <span class="btn-icon">✓</span>
            <span class="btn-text">Li e aceito todas as regras</span>
        `;
        
        if (checkbox) checkbox.checked = false;
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.classList.add('disabled');
        }
        
        showFormMessage(form, 'Aceitação das regras cancelada.', 'info');
    } else {
        // Marcar
        button.classList.remove('read');
        button.classList.add('accepted');
        button.innerHTML = `
            <span class="btn-icon">✓</span>
            <span class="btn-text">Regras aceitas!</span>
        `;
        
        if (checkbox) checkbox.checked = true;
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.classList.remove('disabled');
        }
        
        showFormMessage(form, 
            '✅ Regras aceitas com sucesso! Agora você pode enviar sua inscrição.', 
            'success');
    }
}

// ========== VALIDAÇÃO DE CAMPOS ==========
function validateField(e) {
    const field = e.target;
    const value = field.value.trim();
    let isValid = true;
    let error = '';
    
    if (!field.required && !value) {
        clearFieldError({ target: field });
        return true;
    }
    
    if (field.required && !value) {
        isValid = false;
        error = 'Este campo é obrigatório';
    }
    
    if (isValid && value) {
        switch(field.type) {
            case 'email':
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(value)) {
                    isValid = false;
                    error = 'Por favor, insira um email válido';
                }
                break;
                
            case 'tel':
                const phoneRegex = /^\(\d{2}\)\d{8,9}$/;
                if (!phoneRegex.test(value)) {
                    isValid = false;
                    error = 'Formato: (DD) + 8 ou 9 números<br>Exemplo: (11)91234567 ou (11)912345678<br>Sem hífen, sem espaços';
                }
                break;
        }
        
        if (field.name.match(/top|jng|mid|adc|sup|reserva/)) {
            if (!value.includes('#') && value.length > 0) {
                isValid = false;
                error = 'Formato: Nick#TAG (ex: Player#1234)';
            }
        }
        
        if (field.hasAttribute('minlength')) {
            const minLength = parseInt(field.getAttribute('minlength'));
            if (value.length < minLength) {
                isValid = false;
                error = `Mínimo ${minLength} caracteres`;
            }
        }
        
        if (field.hasAttribute('maxlength')) {
            const maxLength = parseInt(field.getAttribute('maxlength'));
            if (value.length > maxLength) {
                isValid = false;
                error = `Máximo ${maxLength} caracteres`;
            }
        }
    }
    
    if (!isValid) {
        showFieldError(field, error);
    } else {
        clearFieldError({ target: field });
    }
    
    return isValid;
}

function showFieldError(field, message) {
    clearFieldError({ target: field });
    
    field.classList.add('error');
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = message;
    
    field.parentNode.appendChild(errorDiv);
}

function clearFieldError(e) {
    const field = e.target;
    field.classList.remove('error');
    
    const errorDiv = field.parentNode.querySelector('.error-message');
    if (errorDiv) {
        errorDiv.remove();
    }
}

// ========== SISTEMA DE REGRAS SCROLL ==========
function initializeRulesScroll() {
    const rulesScroll = document.getElementById('rules-scroll');
    const rulesProgress = document.getElementById('rules-progress');
    const rulesProgressText = document.getElementById('rules-progress-text');
    const btnAceitarRegras = document.getElementById('btn-aceitar-regras');
    
    if (!rulesScroll || !btnAceitarRegras) {
        console.log('Elementos das regras não encontrados');
        return;
    }
    
    let hasReadRules = false;
    
    btnAceitarRegras.disabled = true;
    btnAceitarRegras.classList.add('disabled');
    
    rulesScroll.addEventListener('scroll', function() {
        const scrollTop = this.scrollTop;
        const scrollHeight = this.scrollHeight - this.clientHeight;
        const scrollPercentage = Math.round((scrollTop / scrollHeight) * 100);
        
        if (rulesProgress) {
            rulesProgress.style.width = scrollPercentage + '%';
        }
        
        if (rulesProgressText) {
            rulesProgressText.textContent = scrollPercentage + '% lido';
        }
        
        if (scrollPercentage >= 95 && !hasReadRules) {
            hasReadRules = true;
            
            btnAceitarRegras.disabled = false;
            btnAceitarRegras.classList.remove('disabled');
            btnAceitarRegras.classList.add('read');
            btnAceitarRegras.innerHTML = `
                <span class="btn-icon">✓</span>
                <span class="btn-text">Li e aceito todas as regras</span>
            `;
            
            btnAceitarRegras.style.animation = 'pulse 2s infinite';
            
            const rulesStatus = document.getElementById('rules-status');
            if (rulesStatus) {
                rulesStatus.innerHTML = '<span class="success">✓ Regras lidas completamente</span>';
                rulesStatus.style.color = '#28c76f';
            }
            
            console.log('✅ Regras lidas completamente - botão habilitado');
        }
    });
    
    // Verificar se o conteúdo já está carregado completamente
    setTimeout(() => {
        const scrollHeight = rulesScroll.scrollHeight - rulesScroll.clientHeight;
        if (scrollHeight <= 0) {
            hasReadRules = true;
            btnAceitarRegras.disabled = false;
            btnAceitarRegras.classList.remove('disabled');
            btnAceitarRegras.classList.add('read');
            btnAceitarRegras.innerHTML = `
                <span class="btn-icon">✓</span>
                <span class="btn-text">Li e aceito todas as regras</span>
            `;
            console.log('✅ Conteúdo das regras carregado - botão habilitado automaticamente');
        }
    }, 500);
}

// ========== UPLOAD DE LOGO PARA IMGBB ==========
function initializeLogoUpload() {
    const uploadBox = document.getElementById('upload-box');
    const fileInput = document.getElementById('logo_equipe');
    const previewContainer = document.getElementById('upload-preview');
    const previewImage = document.getElementById('preview-image');
    const fileName = document.getElementById('file-name');
    const fileSize = document.getElementById('file-size');
    const removeButton = document.getElementById('remove-preview');
    const errorMessage = document.getElementById('logo-error');
    const submitButton = document.getElementById('btn-enviar');

    if (!uploadBox || !fileInput) {
        console.log('Elementos de upload não encontrados');
        return;
    }

    // Validar arquivo
    function validateFile(file) {
        const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        const maxSize = 2 * 1024 * 1024; // 2MB
        
        if (!validTypes.includes(file.type)) {
            return 'Tipo de arquivo inválido. Use JPG, PNG ou GIF.';
        }
        
        if (file.size > maxSize) {
            return 'Arquivo muito grande. Tamanho máximo: 2MB.';
        }
        
        return null;
    }

    // Formatador de tamanho
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Mostrar preview
    function showPreview(file) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            previewImage.src = e.target.result;
            fileName.textContent = file.name;
            fileSize.textContent = formatFileSize(file.size);
            previewContainer.classList.add('show');
            uploadBox.classList.add('has-file');
            errorMessage.classList.remove('show');
            errorMessage.textContent = '';
            
            // Habilitar botão de envio se tudo estiver ok
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.classList.remove('disabled');
            }
        };
        
        reader.readAsDataURL(file);
    }

    // Remover preview
    function removePreview() {
        fileInput.value = '';
        previewContainer.classList.remove('show');
        uploadBox.classList.remove('has-file');
        errorMessage.classList.remove('show');
        errorMessage.textContent = '';
        
        // Desabilitar botão de envio
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.classList.add('disabled');
        }
    }

    // Event Listeners
    uploadBox.addEventListener('click', function(e) {
        if (e.target !== fileInput) {
            fileInput.click();
        }
    });

    uploadBox.addEventListener('dragover', function(e) {
        e.preventDefault();
        uploadBox.style.borderColor = 'var(--neon-cyan)';
        uploadBox.style.background = 'rgba(0, 234, 255, 0.1)';
    });

    uploadBox.addEventListener('dragleave', function(e) {
        e.preventDefault();
        uploadBox.style.borderColor = '';
        uploadBox.style.background = '';
    });

    uploadBox.addEventListener('drop', function(e) {
        e.preventDefault();
        uploadBox.style.borderColor = '';
        uploadBox.style.background = '';
        
        const file = e.dataTransfer.files[0];
        if (file) {
            const error = validateFile(file);
            if (error) {
                errorMessage.textContent = error;
                errorMessage.classList.add('show');
                return;
            }
            
            showPreview(file);
        }
    });

    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const error = validateFile(file);
        if (error) {
            errorMessage.textContent = error;
            errorMessage.classList.add('show');
            fileInput.value = '';
            return;
        }
        
        showPreview(file);
    });

    removeButton.addEventListener('click', function(e) {
        e.stopPropagation();
        removePreview();
    });
}

// ========== FUNÇÃO PARA UPLOAD NO IMGBB ==========
async function uploadFileToImgBB(file) {
    const formData = new FormData();
    formData.append('image', file);
    
    try {
        console.log('📤 Enviando para ImgBB...');
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            console.log('✅ Upload para ImgBB bem-sucedido:', data.data.url);
            return {
                url: data.data.url,
                thumb: data.data.thumb.url,
                delete_url: data.data.delete_url,
                id: data.data.id
            };
        } else {
            throw new Error(data.error.message || 'Erro no upload para ImgBB');
        }
    } catch (error) {
        console.error('❌ Erro no upload para ImgBB:', error);
        throw new Error('Falha ao enviar a logo para o servidor. Tente novamente ou envie a logo manualmente para: nittocoach@gmail.com');
    }
}

// ========== ENVIO DO FORMULÁRIO ==========
async function handleFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    
    // 1. Verificar acesso
    const accessData = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!accessData) {
        showFormMessage(form, 'Acesso expirado ou inválido. Recarregue a página.', 'error');
        return;
    }
    
    // 2. Validar logo
    const logoInput = document.getElementById('logo_equipe');
    const logoError = document.getElementById('logo-error');
    
    if (!logoInput || !logoInput.files[0]) {
        if (logoError) {
            logoError.textContent = 'Por favor, selecione a logo da equipe';
            logoError.classList.add('show');
        }
        showFormMessage(form, 'Por favor, selecione a logo da equipe antes de enviar.', 'error');
        return;
    }
    
    const file = logoInput.files[0];
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const maxSize = 2 * 1024 * 1024;
    
    if (!validTypes.includes(file.type)) {
        if (logoError) {
            logoError.textContent = 'Formato inválido. Use JPG, PNG ou GIF.';
            logoError.classList.add('show');
        }
        return;
    }
    
    if (file.size > maxSize) {
        if (logoError) {
            logoError.textContent = 'Arquivo muito grande. Máximo: 2MB.';
            logoError.classList.add('show');
        }
        return;
    }
    
    // 3. Validar todos os campos obrigatórios
    const requiredFields = form.querySelectorAll('[required]');
    let allValid = true;
    let firstInvalidField = null;
    
    requiredFields.forEach(field => {
        const isValid = validateField({ target: field });
        if (!isValid) {
            allValid = false;
            if (!firstInvalidField) {
                firstInvalidField = field;
            }
        }
    });
    
    if (!allValid) {
        showFormMessage(form, 'Por favor, corrija os erros destacados antes de enviar.', 'error');
        if (firstInvalidField) {
            firstInvalidField.focus();
        }
        return;
    }
    
    // 4. Verificar se as regras foram aceitas
    const rulesCheckbox = form.querySelector('#aceito_regras');
    if (rulesCheckbox && !rulesCheckbox.checked) {
        showFormMessage(form, 
            'Você precisa ler e aceitar as regras do torneio antes de enviar a inscrição.', 
            'error');
        
        const rulesSection = form.querySelector('.rules-container');
        if (rulesSection) {
            rulesSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
    }
    
    // 5. Mostrar loading no botão de envio
    const submitBtn = form.querySelector('[type="submit"]');
    const originalHTML = submitBtn.innerHTML;
    
    submitBtn.innerHTML = `
        <span class="loading-spinner"></span>
        <span class="loading-text">Enviando logo para ImgBB...</span>
    `;
    submitBtn.disabled = true;
    submitBtn.classList.add('disabled');
    
    // Efeito visual de envio
    form.classList.add('sending');
    
    try {
        // 6. Fazer upload da logo para o ImgBB
        console.log('📤 Iniciando upload da logo para ImgBB...');
        const imgbbResult = await uploadFileToImgBB(file);
        
        // 7. Preparar dados do formulário
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        // 8. Adicionar dados da logo
        data['logo_url'] = imgbbResult.url;
        data['logo_thumb'] = imgbbResult.thumb;
        data['logo_filename'] = file.name;
        data['logo_size'] = Math.round(file.size / 1024) + ' KB';
        data['logo_type'] = file.type;
        
        // 9. Adicionar metadados
        data['_data_envio'] = new Date().toLocaleString('pt-BR');
        data['_timestamp'] = new Date().toISOString();
        data['_pagina'] = window.location.pathname;
        data['access_code'] = accessData.codigo;
        data['team_from_code'] = accessData.team_name;
        
        // 10. Atualizar mensagem do botão
        submitBtn.innerHTML = `
            <span class="loading-spinner"></span>
            <span class="loading-text">Enviando inscrição...</span>
        `;
        
        // 11. Enviar via EmailJS
        console.log('📧 Enviando formulário via EmailJS...', data);
        
        const response = await emailjs.send(
            'service_n23atzb',
            'template_9k24qcu',
            data
        );
        
        console.log('✅ Formulário enviado com sucesso:', response);
        
        if (response.status === 200) {
            // 12. Marcar código como usado na API
            try {
                await fetch(`${API_URL}/codes/use/${accessData.codigo}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });
                console.log('✅ Código marcado como usado na API');
            } catch (apiError) {
                console.error('❌ Erro ao marcar código como usado:', apiError);
            }
            
            // 13. Limpar acesso
            localStorage.removeItem(STORAGE_KEY);
            
            // 14. Mostrar mensagem de sucesso
            showFormMessage(form, 
                '✅ Inscrição enviada com sucesso!<br><br>' +
                '✅ Logo do time enviada para o ImgBB com sucesso!<br>' +
                '✅ Link da logo: <a href="' + imgbbResult.url + '" target="_blank">' + imgbbResult.url + '</a><br><br>' +
                '✅ Código marcado como utilizado<br>' +
                '📧 Toda a inscrição foi enviada para nittocoach@gmail.com<br>' +
                '📨 Você receberá uma cópia por email em breve.<br><br>' +
                '🎮 Acompanhe nosso Discord para mais informações: ' +
                '<a href="https://discord.gg/smJ9Q2V3VB">discord.gg/smJ9Q2V3VB</a>', 
                'success'
            );
            
            // 15. Limpar formulário
            form.reset();
            
            // 16. Remove preview da logo
            const uploadBox = document.getElementById('upload-box');
            const previewContainer = document.getElementById('upload-preview');
            if (uploadBox) uploadBox.classList.remove('has-file');
            if (previewContainer) previewContainer.classList.remove('show');
            
            // 17. Reseta botões e estado
            resetFormButtons(form);
            
            // 18. Remove classes de validação
            form.querySelectorAll('.error').forEach(el => {
                el.classList.remove('error');
            });
            form.querySelectorAll('.error-message').forEach(el => el.remove());
            
            // 19. Scroll para mensagem de sucesso
            setTimeout(() => {
                const message = form.querySelector('.form-message');
                if (message) {
                    message.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 100);
            
        } else {
            throw new Error('Status de resposta inválido: ' + response.status);
        }
        
    } catch (error) {
        console.error('❌ Erro ao enviar formulário:', error);
        
        // Mensagem de erro amigável
        let errorMessage = 'Erro ao enviar inscrição. ';
        
        if (error.message.includes('ImgBB')) {
            errorMessage = 'Erro ao enviar a logo para o servidor. ';
            errorMessage += 'Por favor, envie a logo manualmente para: nittocoach@gmail.com<br>';
            errorMessage += 'O restante da inscrição foi enviada com sucesso.';
            
            showFormMessage(form, errorMessage, 'warning');
        } else if (error.status === 0) {
            errorMessage += 'Verifique sua conexão com a internet e tente novamente.';
            showFormMessage(form, errorMessage, 'error');
        } else if (error.text && error.text.includes('Invalid template')) {
            errorMessage += 'Erro na configuração do sistema. Entre em contato com o suporte.';
            showFormMessage(form, errorMessage, 'error');
        } else {
            errorMessage += 'Tente novamente em alguns minutos. Se o erro persistir, entre em contato: nittocoach@gmail.com';
            showFormMessage(form, errorMessage, 'error');
        }
        
        // Fallback: armazena localmente
        try {
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());
            
            const backupKey = `inscricao_backup_${Date.now()}`;
            localStorage.setItem(backupKey, JSON.stringify({
                data: data,
                timestamp: new Date().toISOString(),
                error: error.toString()
            }));
            console.log('Backup salvo localmente:', backupKey);
            
            showFormMessage(form, 
                '⚠️ Seu formulário foi salvo localmente. Recarregue a página e tente enviar novamente.', 
                'info');
        } catch (backupError) {
            console.error('Erro ao salvar backup:', backupError);
        }
        
    } finally {
        // Restaura botão
        submitBtn.innerHTML = originalHTML;
        submitBtn.disabled = false;
        submitBtn.classList.remove('disabled');
        form.classList.remove('sending');
    }
}

// ========== FUNÇÕES AUXILIARES ==========
function resetFormButtons(form) {
    const btnEnviar = form.querySelector('#btn-enviar');
    const btnAceitarRegras = form.querySelector('#btn-aceitar-regras');
    const rulesCheckbox = form.querySelector('#aceito_regras');
    
    if (btnEnviar) {
        btnEnviar.disabled = true;
        btnEnviar.classList.add('disabled');
        btnEnviar.innerHTML = 'Enviar Inscrição';
    }
    
    if (btnAceitarRegras) {
        btnAceitarRegras.disabled = true;
        btnAceitarRegras.classList.remove('accepted', 'read');
        btnAceitarRegras.classList.add('disabled');
        btnAceitarRegras.innerHTML = '<span class="btn-text">Role para ler as regras primeiro</span>';
        btnAceitarRegras.style.animation = 'none';
    }
    
    if (rulesCheckbox) {
        rulesCheckbox.checked = false;
    }
    
    const rulesProgress = document.getElementById('rules-progress');
    const rulesProgressText = document.getElementById('rules-progress-text');
    
    if (rulesProgress) rulesProgress.style.width = '0%';
    if (rulesProgressText) rulesProgressText.textContent = '0% lido';
}

function showFormMessage(form, message, type = 'info') {
    const oldMessages = form.querySelectorAll('.form-message');
    oldMessages.forEach(msg => msg.remove());
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `form-message ${type}`;
    messageDiv.innerHTML = message;
    
    const title = form.querySelector('h1') || form.querySelector('h2') || form;
    if (title.nextSibling) {
        title.parentNode.insertBefore(messageDiv, title.nextSibling);
    } else {
        title.parentNode.appendChild(messageDiv);
    }
    
    if (type !== 'error' && type !== 'warning') {
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.style.opacity = '0';
                messageDiv.style.transition = 'opacity 0.5s ease';
                setTimeout(() => {
                    if (messageDiv.parentNode) {
                        messageDiv.remove();
                    }
                }, 500);
            }
        }, 10000);
    }
}

// ========== CONTADOR DE CARACTERES ==========
function initializeCharCounter() {
    const textareaObservacoes = document.getElementById('observacoes');
    const charCountElement = document.getElementById('char-count');
    
    if (textareaObservacoes && charCountElement) {
        textareaObservacoes.addEventListener('input', function() {
            const currentLength = this.value.length;
            charCountElement.textContent = currentLength;
            
            if (currentLength > 450) {
                charCountElement.style.color = '#ff2d75';
            } else if (currentLength > 400) {
                charCountElement.style.color = '#ffd700';
            } else {
                charCountElement.style.color = '#00eaff';
            }
        });
        
        charCountElement.textContent = textareaObservacoes.value.length;
    }
}

// ========== CONFIGURAÇÕES MOBILE ==========
function initializeMobileSettings() {
    // Verificar se estamos em dispositivo móvel para ajustar o zoom
    if (window.innerWidth <= 768) {
        console.log('Dispositivo móvel detectado - ajustando viewport para zoom 90%');
        document.querySelector('meta[name="viewport"]').setAttribute('content', 
            'width=device-width, initial-scale=0.9, maximum-scale=1.0, user-scalable=yes');
    }
}

// ========== FUNÇÕES DE DEBUG/TESTE ==========
window.InscricoesDebug = {
    testEmailJS: function() {
        const testData = {
            competicao: 'Wild Clash',
            coach: 'Coach Teste',
            email_coach: 'teste@email.com',
            telefone: '(11)91234567',
            nome_equipe: 'Time Teste',
            top: 'Player1#1234',
            jng: 'Player2#1234',
            mid: 'Player3#1234',
            adc: 'Player4#1234',
            sup: 'Player5#1234',
            _data_envio: new Date().toLocaleString('pt-BR'),
            _timestamp: new Date().toISOString()
        };
        
        console.log('Testando EmailJS com dados:', testData);
        
        emailjs.send('service_n23atzb', 'template_9k24qcu', testData)
            .then(response => console.log('✅ Teste EmailJS bem-sucedido:', response))
            .catch(error => console.error('❌ Erro no teste EmailJS:', error));
    },
    
    clearAllData: function() {
        localStorage.removeItem('wildclash_access_token');
        const backupKeys = Object.keys(localStorage).filter(key => key.includes('inscricao_backup'));
        backupKeys.forEach(key => localStorage.removeItem(key));
        console.log('❌ Todos os dados limpos');
        alert('Dados limpos! A página será recarregada.');
        location.reload();
    }
};

console.log(`
╔══════════════════════════════════════════════╗
║    FORMULÁRIO DE INSCRIÇÕES INICIALIZADO     ║
╠══════════════════════════════════════════════╣
║ API: ${API_URL}                              ║
║ ImgBB Key: ${IMGBB_API_KEY.substring(0, 8)}... ║
║ Acesso: ${localStorage.getItem(STORAGE_KEY) ? '✅' : '❌'}              ║
║ EmailJS: ${typeof emailjs !== 'undefined' ? '✅' : '❌'}              ║
╚══════════════════════════════════════════════╝
`);