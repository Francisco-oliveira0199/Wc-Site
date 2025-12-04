// =============================================================================
// PROJETO: Wild Clash - Site de Campeonatos de Wild Rift
// ARQUIVO: script.js
// DESCRIÇÃO: Funcionalidades do site - carousel, validação de formulários, envio via EmailJS
// VERSÃO: 6.0
// DATA: Dezembro 2025
// =============================================================================

// ========== INICIALIZAÇÃO GLOBAL ==========
document.addEventListener('DOMContentLoaded', function() {
    console.log('Wild Clash - Inicializando sistema...');
    
    // Inicializa todas as funcionalidades
    initializeEmailJS();
    initializeCarousel();
    initializeFormHandlers();
    initializeRulesScroll();
    initializeCardEffects();
    initializeNavigation();
    initializeFooter();
    
    console.log('Sistema Wild Clash inicializado com sucesso!');
});

// ========== EMAILJS CONFIGURAÇÃO ==========
function initializeEmailJS() {
    // Verifica se já foi inicializado no HTML
    if (typeof emailjs === 'undefined') {
        console.error('EmailJS SDK não carregado!');
        return;
    }
    
    try {
        // Apenas inicializa se não foi feito no HTML
        if (!emailjs._isInitialized) {
            emailjs.init({
                publicKey: "1bph11qy38lrIRSwK",
                blockHeadless: true,
                limitRate: {
                    id: 'wildclash_inscricoes',
                    throttle: 10000
                }
            });
        }
        console.log('EmailJS configurado');
    } catch (error) {
        console.error('Erro ao configurar EmailJS:', error);
    }
}

// ========== CAROUSEL ==========
function initializeCarousel() {
    const carousel = document.querySelector('.carousel');
    if (!carousel) return;
    
    const slides = carousel.querySelectorAll('.carousel-slide');
    const indicators = carousel.querySelectorAll('.indicator');
    const prevBtn = carousel.querySelector('.arrow.prev');
    const nextBtn = carousel.querySelector('.arrow.next');
    
    let currentIndex = 0;
    let autoPlayInterval;
    
    function updateSlides() {
        slides.forEach((slide, index) => {
            slide.classList.remove('active', 'prev', 'next', 'hidden');
            slide.setAttribute('aria-hidden', 'true');
            
            if (index === currentIndex) {
                slide.classList.add('active');
                slide.setAttribute('aria-hidden', 'false');
            } else if (index === (currentIndex - 1 + slides.length) % slides.length) {
                slide.classList.add('prev');
            } else if (index === (currentIndex + 1) % slides.length) {
                slide.classList.add('next');
            } else {
                slide.classList.add('hidden');
            }
        });
        
        indicators.forEach((indicator, index) => {
            indicator.classList.toggle('active', index === currentIndex);
            indicator.setAttribute('aria-selected', index === currentIndex);
        });
    }
    
    function nextSlide() {
        currentIndex = (currentIndex + 1) % slides.length;
        updateSlides();
    }
    
    function prevSlide() {
        currentIndex = (currentIndex - 1 + slides.length) % slides.length;
        updateSlides();
    }
    
    function goToSlide(index) {
        if (index >= 0 && index < slides.length) {
            currentIndex = index;
            updateSlides();
        }
    }
    
    // Event listeners
    if (prevBtn) {
        prevBtn.addEventListener('click', (e) => {
            e.preventDefault();
            prevSlide();
            resetAutoPlay();
        });
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', (e) => {
            e.preventDefault();
            nextSlide();
            resetAutoPlay();
        });
    }
    
    indicators.forEach((indicator, index) => {
        indicator.addEventListener('click', (e) => {
            e.preventDefault();
            goToSlide(index);
            resetAutoPlay();
        });
    });
    
    // Teclado
    document.addEventListener('keydown', (e) => {
        if (!carousel.contains(document.activeElement)) return;
        
        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            prevSlide();
            resetAutoPlay();
        } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            nextSlide();
            resetAutoPlay();
        }
    });
    
    // Autoplay
    function startAutoPlay() {
        stopAutoPlay();
        autoPlayInterval = setInterval(nextSlide, 5000);
    }
    
    function stopAutoPlay() {
        if (autoPlayInterval) {
            clearInterval(autoPlayInterval);
            autoPlayInterval = null;
        }
    }
    
    function resetAutoPlay() {
        stopAutoPlay();
        startAutoPlay();
    }
    
    // Pausa no hover/focus
    carousel.addEventListener('mouseenter', stopAutoPlay);
    carousel.addEventListener('mouseleave', startAutoPlay);
    carousel.addEventListener('focusin', stopAutoPlay);
    carousel.addEventListener('focusout', startAutoPlay);
    
    // Inicializa
    updateSlides();
    startAutoPlay();
    
    console.log('🎠 Carousel inicializado com', slides.length, 'slides');
}

// ========== FORMULÁRIOS E EMAILJS ==========
function initializeFormHandlers() {
    const forms = document.querySelectorAll('form[data-emailjs]');
    
    forms.forEach(form => {
        // Configura validação em tempo real
        const inputs = form.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
            input.addEventListener('blur', validateField);
            input.addEventListener('input', clearFieldError);
        });
        
        // Configura botões especiais
        configureFormButtons(form);
        
        // Configura envio do formulário
        form.addEventListener('submit', handleFormSubmit);
        
        // Previne envio ao pressionar Enter em campos não-submit
        form.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA' && e.target.type !== 'submit') {
                e.preventDefault();
            }
        });
    });
    
    console.log('Formulários inicializados:', forms.length);
}

function configureFormButtons(form) {
    const btnEnviar = form.querySelector('#btn-enviar');
    const btnLimpar = form.querySelector('#btn-limpar');
    const btnAceitarRegras = form.querySelector('#btn-aceitar-regras');
    
    // Configura botão de envio (inicialmente desabilitado)
    if (btnEnviar) {
        btnEnviar.disabled = true;
        btnEnviar.classList.add('disabled');
        
        // Adiciona ícone de loading
        const loadingHTML = `
            <span class="loading-spinner"></span>
            <span class="loading-text">Enviando...</span>
        `;
        
        // Salva o HTML original
        btnEnviar.dataset.originalHTML = btnEnviar.innerHTML;
        btnEnviar.dataset.loadingHTML = loadingHTML;
    }
    
    // Configura botão de limpar
    if (btnLimpar) {
        btnLimpar.addEventListener('click', function(e) {
            e.preventDefault();
            
            if (confirm('Tem certeza que deseja limpar todos os dados do formulário?')) {
                // Limpa formulário
                form.reset();
                
                // Reseta botões
                resetFormButtons(form);
                
                // Mostra mensagem
                showFormMessage(form, 
                    'Formulário limpo com sucesso. Preencha novamente para enviar uma nova inscrição.', 
                    'info');
            }
        });
    }
    
    // Configura botão de aceitar regras
    if (btnAceitarRegras) {
        const rulesCheckbox = form.querySelector('#aceito_regras');
        
        btnAceitarRegras.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Verifica se já leu as regras
            if (this.classList.contains('read') || this.classList.contains('accepted')) {
                if (this.classList.contains('accepted')) {
                    // Já estava aceito, remove aceitação
                    this.classList.remove('accepted');
                    this.classList.add('read');
                    this.innerHTML = `
                        <span class="btn-icon">✓</span>
                        <span class="btn-text">Li e aceito todas as regras</span>
                    `;
                    
                    if (rulesCheckbox) rulesCheckbox.checked = false;
                    if (btnEnviar) {
                        btnEnviar.disabled = true;
                        btnEnviar.classList.add('disabled');
                    }
                    
                    showFormMessage(form, 'Aceitação das regras cancelada.', 'info');
                } else {
                    // Aceita as regras
                    this.classList.remove('read');
                    this.classList.add('accepted');
                    this.innerHTML = `
                        <span class="btn-icon">✓</span>
                        <span class="btn-text">Regras aceitas!</span>
                    `;
                    
                    if (rulesCheckbox) rulesCheckbox.checked = true;
                    if (btnEnviar) {
                        btnEnviar.disabled = false;
                        btnEnviar.classList.remove('disabled');
                    }
                    
                    showFormMessage(form, 
                        '✅ Regras aceitas com sucesso! Agora você pode enviar sua inscrição.', 
                        'success');
                }
            } else {
                // Ainda não leu as regras
                showFormMessage(form, 
                    'Leia as regras completamente primeiro. Role até o final das regras para habilitar o botão.', 
                    'error');
            }
        });
    }
}

function resetFormButtons(form) {
    const btnEnviar = form.querySelector('#btn-enviar');
    const btnAceitarRegras = form.querySelector('#btn-aceitar-regras');
    const rulesCheckbox = form.querySelector('#aceito_regras');
    
    // Reseta botão de envio
    if (btnEnviar) {
        btnEnviar.disabled = true;
        btnEnviar.classList.add('disabled');
        btnEnviar.innerHTML = btnEnviar.dataset.originalHTML || 'Enviar Inscrição';
    }
    
    // Reseta botão de aceitar regras
    if (btnAceitarRegras) {
        btnAceitarRegras.disabled = true;
        btnAceitarRegras.classList.remove('accepted', 'read');
        btnAceitarRegras.classList.add('disabled');
        btnAceitarRegras.innerHTML = '<span class="btn-text">Role para ler as regras primeiro</span>';
        btnAceitarRegras.style.animation = 'none';
    }
    
    // Reseta checkbox
    if (rulesCheckbox) {
        rulesCheckbox.checked = false;
    }
    
    // Reseta progresso das regras
    const rulesProgress = document.getElementById('rules-progress');
    const rulesProgressText = document.getElementById('rules-progress-text');
    
    if (rulesProgress) rulesProgress.style.width = '0%';
    if (rulesProgressText) rulesProgressText.textContent = '0% lido';
}

function validateField(e) {
    const field = e.target;
    const value = field.value.trim();
    let isValid = true;
    let error = '';
    
    // Ignora se não for required e vazio
    if (!field.required && !value) {
        clearFieldError({ target: field });
        return true;
    }
    
    // Verifica se é obrigatório
    if (field.required && !value) {
        isValid = false;
        error = 'Este campo é obrigatório';
    }
    
    // Validação específica por tipo
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
                // Validação básica de telefone
                const phoneRegex = /^\(?\d{2}\)?[\s-]?\d{4,5}[\s-]?\d{4}$/;
                if (!phoneRegex.test(value)) {
                    isValid = false;
                    error = 'Formato: (DD) 99999-9999';
                }
                break;
        }
        
        // Validação de Nick#TAG para jogadores
        if (field.name.match(/top|jng|mid|adc|sup|reserva/)) {
            if (!value.includes('#') && value.length > 0) {
                isValid = false;
                error = 'Formato: Nick#TAG (ex: Player#1234)';
            }
        }
        
        // Validação por atributos HTML5
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
    
    // Aplica resultado
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
    field.style.borderColor = '#ff2d75';
    field.style.boxShadow = '0 0 0 2px rgba(255, 45, 117, 0.2)';
    
    // Cria mensagem de erro
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    errorDiv.style.cssText = `
        color: #ff2d75;
        font-size: 12px;
        margin-top: 4px;
        padding: 4px 8px;
        background: rgba(255, 45, 117, 0.1);
        border-radius: 4px;
        animation: fadeIn 0.3s ease;
    `;
    
    field.parentNode.appendChild(errorDiv);
}

function clearFieldError(e) {
    const field = e.target;
    field.classList.remove('error');
    field.style.borderColor = '';
    field.style.boxShadow = '';
    
    const errorDiv = field.parentNode.querySelector('.error-message');
    if (errorDiv) {
        errorDiv.remove();
    }
}

async function handleFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    
    // Valida todos os campos obrigatórios
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
    
    // Verifica se as regras foram aceitas
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
    
    // Coleta dados do formulário
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    // Adiciona metadados
    data['_data_envio'] = new Date().toLocaleString('pt-BR');
    data['_timestamp'] = new Date().toISOString();
    data['_pagina'] = window.location.pathname;
    
    // Mostra loading no botão de envio
    const submitBtn = form.querySelector('[type="submit"]');
    const originalHTML = submitBtn.innerHTML;
    
    submitBtn.innerHTML = submitBtn.dataset.loadingHTML || `
        <span class="loading-spinner"></span>
        <span class="loading-text">Enviando...</span>
    `;
    submitBtn.disabled = true;
    submitBtn.classList.add('disabled');
    
    // Efeito visual de envio
    form.classList.add('sending');
    
    try {
        console.log('Enviando formulário via EmailJS...', data);
        
        // Envia via EmailJS
        const response = await emailjs.send(
            'service_n23atzb',      // Service ID
            'template_9k24qcu',     // Template ID
            data
        );
        
        console.log('✅ Formulário enviado com sucesso:', response);
        
        if (response.status === 200) {
            // Sucesso
            showFormMessage(form, 
                '✅ Inscrição enviada com sucesso!<br><br>' +
                'Em breve você receberá um email de confirmação. ' +
                'Acompanhe nosso Discord para mais informações: ' +
                '<a href="https://discord.gg/GPRavHze" style="color: #00eaff;">discord.gg/GPRavHze</a>', 
                'success'
            );
            
            // Limpa o formulário
            form.reset();
            
            // Reseta botões e estado
            resetFormButtons(form);
            
            // Remove classes de validação
            form.querySelectorAll('.error').forEach(el => {
                el.classList.remove('error');
            });
            form.querySelectorAll('.error-message').forEach(el => el.remove());
            
            // Scroll para mensagem de sucesso
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
        
        if (error.status === 0) {
            errorMessage += 'Verifique sua conexão com a internet e tente novamente.';
        } else if (error.text && error.text.includes('Invalid template')) {
            errorMessage += 'Erro na configuração do sistema. Entre em contato com o suporte.';
        } else {
            errorMessage += 'Tente novamente em alguns minutos. Se o erro persistir, entre em contato: nittocoach@gmail.com';
        }
        
        showFormMessage(form, errorMessage, 'error');
        
        // Fallback: armazena localmente
        try {
            const backupKey = `inscricao_backup_${Date.now()}`;
            localStorage.setItem(backupKey, JSON.stringify({
                data: data,
                timestamp: new Date().toISOString(),
                error: error.toString()
            }));
            console.log('Backup salvo localmente:', backupKey);
            
            showFormMessage(form, 
                'Seu formulário foi salvo localmente. Recarregue a página e tente enviar novamente.', 
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

function showFormMessage(form, message, type = 'info') {
    // Remove mensagens anteriores
    const oldMessages = form.querySelectorAll('.form-message');
    oldMessages.forEach(msg => msg.remove());
    
    // Cria nova mensagem
    const messageDiv = document.createElement('div');
    messageDiv.className = `form-message ${type}`;
    messageDiv.innerHTML = message;
    
    // Estilos base
    messageDiv.style.cssText = `
        padding: 15px 20px;
        margin: 20px 0;
        border-radius: 10px;
        text-align: center;
        font-weight: 500;
        animation: fadeIn 0.5s ease;
        border: 1px solid;
        backdrop-filter: blur(10px);
        font-size: 14px;
    `;
    
    // Estilos específicos por tipo
    switch(type) {
        case 'success':
            messageDiv.style.cssText += `
                background: rgba(40, 199, 111, 0.15);
                border-color: rgba(40, 199, 111, 0.4);
                color: #28c76f;
            `;
            break;
        case 'error':
            messageDiv.style.cssText += `
                background: rgba(255, 45, 117, 0.15);
                border-color: rgba(255, 45, 117, 0.4);
                color: #ff2d75;
            `;
            break;
        default:
            messageDiv.style.cssText += `
                background: rgba(0, 234, 255, 0.15);
                border-color: rgba(0, 234, 255, 0.4);
                color: #00eaff;
            `;
    }
    
    // Adiciona ao formulário (após o título)
    const title = form.querySelector('h1') || form.querySelector('h2') || form;
    if (title.nextSibling) {
        title.parentNode.insertBefore(messageDiv, title.nextSibling);
    } else {
        title.parentNode.appendChild(messageDiv);
    }
    
    // Remove após 10 segundos (exceto erros)
    if (type !== 'error') {
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

// ========== SISTEMA DE REGRAS SCROLL ==========
function initializeRulesScroll() {
    const rulesScroll = document.getElementById('rules-scroll');
    const rulesProgress = document.getElementById('rules-progress');
    const rulesProgressText = document.getElementById('rules-progress-text');
    const btnAceitarRegras = document.getElementById('btn-aceitar-regras');
    
    if (!rulesScroll || !btnAceitarRegras) return;
    
    let hasReadRules = false;
    
    // Configura botão inicialmente
    btnAceitarRegras.disabled = true;
    btnAceitarRegras.classList.add('disabled');
    
    // Evento de scroll nas regras
    rulesScroll.addEventListener('scroll', function() {
        const scrollTop = this.scrollTop;
        const scrollHeight = this.scrollHeight - this.clientHeight;
        const scrollPercentage = Math.round((scrollTop / scrollHeight) * 100);
        
        // Atualiza barra de progresso
        if (rulesProgress) {
            rulesProgress.style.width = scrollPercentage + '%';
        }
        
        if (rulesProgressText) {
            rulesProgressText.textContent = scrollPercentage + '% lido';
        }
        
        // Verifica se chegou ao final (95% ou mais)
        if (scrollPercentage >= 95 && !hasReadRules) {
            hasReadRules = true;
            
            // Habilita botão de aceitação
            btnAceitarRegras.disabled = false;
            btnAceitarRegras.classList.remove('disabled');
            btnAceitarRegras.classList.add('read');
            btnAceitarRegras.innerHTML = `
                <span class="btn-icon">✓</span>
                <span class="btn-text">Li e aceito todas as regras</span>
            `;
            
            // Anima o botão
            btnAceitarRegras.style.animation = 'pulse 2s infinite';
            
            // Mostra feedback
            const rulesStatus = document.getElementById('rules-status');
            if (rulesStatus) {
                rulesStatus.innerHTML = '<span class="success">✓ Regras lidas completamente</span>';
                rulesStatus.style.color = '#28c76f';
            }
        }
    });
    
    console.log('📜 Sistema de regras inicializado');
}

// ========== CARD EFFECTS ==========
function initializeCardEffects() {
    const cards = document.querySelectorAll('.card');
    
    cards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-10px) scale(1.02)';
            this.style.zIndex = '10';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
            this.style.zIndex = '1';
        });
    });
}

// ========== NAVEGAÇÃO ==========
function initializeNavigation() {
    // Marca link ativo
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-link').forEach(link => {
        const linkPage = link.getAttribute('href');
        if (linkPage === currentPage || 
            (currentPage === '' && linkPage === 'index.html')) {
            link.classList.add('active');
            link.setAttribute('aria-current', 'page');
        } else {
            link.classList.remove('active');
            link.removeAttribute('aria-current');
        }
    });
    
    // Navegação suave para âncoras internas
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href === '#') return;
            
            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                
                window.scrollTo({
                    top: target.offsetTop - 80,
                    behavior: 'smooth'
                });
                
                history.pushState(null, null, href);
            }
        });
    });
}

// ========== FOOTER ==========
function initializeFooter() {
    // Atualiza ano do copyright
    const copyrightElements = document.querySelectorAll('.footer-copyright');
    const currentYear = new Date().getFullYear();
    
    copyrightElements.forEach(element => {
        if (element.textContent.includes('©')) {
            element.textContent = `© ${currentYear} WILD CLASH`;
        }
    });
    
    // Efeitos nos botões sociais
    const socialButtons = document.querySelectorAll('.social-btn');
    
    socialButtons.forEach(btn => {
        btn.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-5px) scale(1.1)';
        });
        
        btn.addEventListener('mouseleave', function() {
            this.style.transform = '';
        });
    });
}

// ========== ANIMAÇÕES CSS DINÂMICAS ==========
(function addAnimations() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes pulse {
            0% { box-shadow: 0 0 0 0 rgba(0, 234, 255, 0.4); }
            70% { box-shadow: 0 0 0 10px rgba(0, 234, 255, 0); }
            100% { box-shadow: 0 0 0 0 rgba(0, 234, 255, 0); }
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        .loading-spinner {
            display: inline-block;
            width: 16px;
            height: 16px;
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            border-top-color: #00eaff;
            animation: spin 1s linear infinite;
            margin-right: 8px;
            vertical-align: middle;
        }
        
        .form-message {
            animation: fadeIn 0.5s ease !important;
        }
    `;
    document.head.appendChild(style);
})();

// ========== FUNÇÕES DE DEBUG/TESTE ==========
window.WildClashDebug = {
    testEmailJS: function() {
        if (typeof emailjs === 'undefined') {
            alert('EmailJS não está carregado!');
            return;
        }
        
        const testData = {
            competicao: 'Wild Clash Teste',
            coach: 'Nome de Teste',
            email_coach: 'teste@email.com',
            telefone: '(11) 99999-9999',
            nome_equipe: 'Equipe Teste',
            top: 'TesteTop#1234',
            jng: 'TesteJng#1234',
            mid: 'TesteMid#1234',
            adc: 'TesteAdc#1234',
            sup: 'TesteSup#1234',
            observacoes: 'Esta é uma mensagem de teste do sistema',
            aceito_regras: 'Sim',
            _test: true,
            _timestamp: new Date().toISOString()
        };
        
        console.log('Testando EmailJS com dados:', testData);
        
        emailjs.send('service_n23atzb', 'template_9k24qcu', testData)
            .then(response => {
                console.log('Teste bem-sucedido:', response);
                alert('✅ Teste de EmailJS realizado com sucesso!\nVerifique o email nittocoach@gmail.com');
            })
            .catch(error => {
                console.error('Teste falhou:', error);
                alert('❌ Erro no teste de EmailJS:\n' + (error.text || error.toString()));
            });
    },
    
    checkFormData: function() {
        const forms = document.querySelectorAll('form');
        forms.forEach((form, index) => {
            const data = new FormData(form);
            console.log(`Formulário ${index + 1}:`, Object.fromEntries(data.entries()));
        });
    },
    
    resetAllForms: function() {
        const forms = document.querySelectorAll('form');
        forms.forEach(form => {
            form.reset();
            form.querySelectorAll('.form-message, .error-message').forEach(el => el.remove());
            form.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
            
            const btnAceitarRegras = form.querySelector('#btn-aceitar-regras');
            if (btnAceitarRegras) {
                btnAceitarRegras.disabled = true;
                btnAceitarRegras.classList.remove('read', 'accepted');
                btnAceitarRegras.classList.add('disabled');
                btnAceitarRegras.innerHTML = '<span class="btn-text">Role para ler as regras primeiro</span>';
            }
        });
        console.log('Todos os formulários resetados');
    }
};

// ========== LOG INICIAL ==========
console.log(`
╔══════════════════════════════════════════════╗
║          WILD CLASH - SISTEMA ATIVO          ║
╠══════════════════════════════════════════════╣
║ Versão:               6.0                    ║
║ EmailJS:              ${typeof emailjs !== 'undefined' ? '✅' : '❌'}             ║
║ Carousel:             ${document.querySelector('.carousel') ? '✅' : '❌'}             ║
║ Formulários:          ${document.querySelectorAll('form[data-emailjs]').length}             ║
║ Sistema de Regras:    ${document.querySelector('.rules-scroll') ? '✅' : '❌'}             ║
╚══════════════════════════════════════════════╝
`);