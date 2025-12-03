// =============================================================================
// PROJETO: Wild Clash - Site de Campeonatos de Wild Rift
// ARQUIVO: script.js
// DESCRIÇÃO: Funcionalidades do site - carousel, validação de formulários, envio via EmailJS
// VERSÃO: 5.0
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
    
    console.log('✅ Sistema Wild Clash inicializado com sucesso!');
});

// ========== EMAILJS CONFIGURAÇÃO ==========
function initializeEmailJS() {
    if (typeof emailjs === 'undefined') {
        console.error('EmailJS SDK não carregado!');
        return;
    }
    
    // Inicializa com sua chave pública (SUBSTITUA COM SUA CHAVE)
    emailjs.init("1bph11qy38lrIRSwK"); // ← SUBSTITUA COM SUA CHAVE PÚBLICA
    
    console.log('📧 EmailJS inicializado');
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
    
    // Atualiza slides
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
        
        // Atualiza indicadores
        indicators.forEach((indicator, index) => {
            const isActive = index === currentIndex;
            indicator.classList.toggle('active', isActive);
            indicator.setAttribute('aria-selected', isActive);
        });
    }
    
    // Navegação
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
    
    // Configura eventos
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
    
    // Pausa no hover
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
    const forms = document.querySelectorAll('form');
    
    forms.forEach(form => {
        // Adiciona atributo data-emailjs para identificar formulários
        if (!form.hasAttribute('data-emailjs')) {
            form.setAttribute('data-emailjs', 'true');
        }
        
        // Validação em tempo real
        const inputs = form.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
            input.addEventListener('blur', validateField);
            input.addEventListener('input', clearFieldError);
        });
        
        // Envio do formulário
        form.addEventListener('submit', handleFormSubmit);
        
        // Previne envio ao pressionar Enter em campos não-submit
        form.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA' && e.target.type !== 'submit') {
                e.preventDefault();
            }
        });
    });
    
    console.log('📝 Formulários inicializados:', forms.length);
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
                // Remove caracteres não numéricos para validação
                const cleanPhone = value.replace(/\D/g, '');
                if (cleanPhone.length < 10) {
                    isValid = false;
                    error = 'Telefone inválido (mínimo 10 dígitos)';
                }
                break;
                
            case 'text':
                // Validação de nome
                if (field.name === 'coach' || field.name.includes('player')) {
                    if (value.length < 2) {
                        isValid = false;
                        error = 'Nome muito curto';
                    }
                }
                break;
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
        
        // Validação personalizada para campos de jogador
        if (field.name.match(/top|jng|mid|adc|sup|reserva/)) {
            if (!value.includes('#') && value.length > 0) {
                isValid = false;
                error = 'Inclua o #tag (ex: Nick#1234)';
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
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'field-error';
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
    
    const errorDiv = field.parentNode.querySelector('.field-error');
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
    
    requiredFields.forEach(field => {
        const event = new Event('blur', { bubbles: true });
        field.dispatchEvent(event);
        
        if (field.classList.contains('error') || 
            (field.required && !field.value.trim())) {
            allValid = false;
            
            // Foca no primeiro campo inválido
            if (allValid === false) {
                field.focus();
                allValid = null; // Para não focar novamente
            }
        }
    });
    
    if (!allValid) {
        showFormMessage(form, '❌ Por favor, corrija os erros destacados antes de enviar.', 'error');
        return;
    }
    
    // Coleta dados do formulário
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    // Adiciona metadados
    data['_data_envio'] = new Date().toLocaleString('pt-BR');
    data['_pagina'] = window.location.pathname;
    data['_timestamp'] = new Date().toISOString();
    data['_formulario'] = form.id || 'formulario_sem_id';
    
    // Mostra loading
    const submitBtn = form.querySelector('[type="submit"]');
    const originalText = submitBtn.innerHTML;
    const originalState = submitBtn.disabled;
    
    submitBtn.innerHTML = `
        <span class="loading-spinner"></span>
        <span class="loading-text">Enviando inscrição...</span>
    `;
    submitBtn.disabled = true;
    
    // Efeito visual de envio
    form.classList.add('sending');
    
    try {
        console.log('📤 Enviando formulário via EmailJS...', data);
        
        // Envia via EmailJS
        const response = await emailjs.send(
            'service_n23atzb',      // Service ID
            'template_9k24qcu',     // Template ID
            data
        );
        
        console.log('✅ Resposta EmailJS:', response);
        
        if (response.status === 200) {
            // Sucesso
            showFormMessage(form, 
                '🎉 Inscrição enviada com sucesso!<br>Entraremos em contato em breve.', 
                'success'
            );
            
            // Limpa o formulário
            form.reset();
            
            // Remove classes de validação
            form.querySelectorAll('.error').forEach(el => {
                el.classList.remove('error');
                el.style.borderColor = '';
                el.style.boxShadow = '';
            });
            
            form.querySelectorAll('.field-error').forEach(el => el.remove());
            
            // Scroll para mensagem de sucesso
            setTimeout(() => {
                const message = form.querySelector('.form-message');
                if (message) {
                    message.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'center' 
                    });
                }
            }, 100);
            
            // Log para debug
            console.log('📋 Formulário enviado com sucesso:', data);
            
        } else {
            throw new Error('Status de resposta inválido');
        }
        
    } catch (error) {
        console.error('❌ Erro ao enviar formulário:', error);
        
        // Mensagem de erro amigável
        let errorMessage = '❌ Erro ao enviar inscrição. ';
        
        if (error.status === 0) {
            errorMessage += 'Verifique sua conexão com a internet.';
        } else if (error.text && error.text.includes('Invalid template')) {
            errorMessage += 'Erro na configuração do sistema.';
        } else {
            errorMessage += 'Tente novamente ou entre em contato diretamente: nittocoach@gmail.com';
        }
        
        showFormMessage(form, errorMessage, 'error');
        
        // Fallback: armazena localmente
        try {
            const backupKey = `form_backup_${Date.now()}`;
            localStorage.setItem(backupKey, JSON.stringify({
                data: data,
                timestamp: new Date().toISOString(),
                error: error.toString()
            }));
            console.log('📦 Backup salvo localmente:', backupKey);
        } catch (backupError) {
            console.error('Erro ao salvar backup:', backupError);
        }
        
    } finally {
        // Restaura botão
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = originalState;
        form.classList.remove('sending');
    }
}

function showFormMessage(form, message, type) {
    // Remove mensagens anteriores
    const oldMessages = form.querySelectorAll('.form-message');
    oldMessages.forEach(msg => msg.remove());
    
    // Cria nova mensagem
    const messageDiv = document.createElement('div');
    messageDiv.className = `form-message ${type}`;
    messageDiv.innerHTML = message;
    
    // Estilos
    const baseStyles = `
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
    
    if (type === 'success') {
        messageDiv.style.cssText = baseStyles + `
            background: rgba(40, 199, 111, 0.15);
            border-color: rgba(40, 199, 111, 0.4);
            color: #28c76f;
        `;
    } else if (type === 'error') {
        messageDiv.style.cssText = baseStyles + `
            background: rgba(255, 45, 117, 0.15);
            border-color: rgba(255, 45, 117, 0.4);
            color: #ff2d75;
        `;
    } else {
        messageDiv.style.cssText = baseStyles + `
            background: rgba(0, 234, 255, 0.15);
            border-color: rgba(0, 234, 255, 0.4);
            color: #00eaff;
        `;
    }
    
    // Adiciona ao formulário (no início)
    form.prepend(messageDiv);
    
    // Remove após 10 segundos (exceto erros importantes)
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
    const rulesContainer = document.querySelector('.rules-scroll');
    const acceptBtn = document.getElementById('inscricao-accept-btn');
    const rulesCheckbox = document.getElementById('inscricao-rules-checkbox');
    
    if (!rulesContainer || !acceptBtn) return;
    
    let hasRead = false;
    let isAccepted = false;
    
    // Configura o botão inicialmente
    updateAcceptButton();
    
    // Evento de scroll nas regras
    rulesContainer.addEventListener('scroll', function() {
        const scrollBottom = this.scrollHeight - this.scrollTop - this.clientHeight;
        
        // Considera que leu se chegou próximo ao final
        if (scrollBottom <= 100 && !hasRead) {
            hasRead = true;
            console.log('📜 Regras lidas completamente');
            
            // Anima o botão
            acceptBtn.classList.add('can-accept');
            acceptBtn.innerHTML = '✓ Li e aceito todas as regras';
            
            // Adiciona efeito visual
            const checkmark = document.createElement('span');
            checkmark.className = 'checkmark';
            checkmark.innerHTML = '✓';
            checkmark.style.cssText = `
                display: inline-block;
                margin-right: 8px;
                font-size: 16px;
                animation: bounce 0.5s ease;
            `;
            
            acceptBtn.prepend(checkmark);
            
            // Scroll suave para o botão
            setTimeout(() => {
                acceptBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300);
        }
    });
    
    // Evento de clique no botão de aceitar
    acceptBtn.addEventListener('click', function(e) {
        e.preventDefault();
        
        if (!hasRead) {
            showRulesWarning();
            return;
        }
        
        if (!isAccepted) {
            isAccepted = true;
            acceptRules();
        } else {
            isAccepted = false;
            unacceptRules();
        }
        
        updateAcceptButton();
    });
    
    function updateAcceptButton() {
        if (!hasRead) {
            acceptBtn.disabled = false;
            acceptBtn.classList.remove('accepted');
            acceptBtn.innerHTML = '📜 Role para ler as regras primeiro';
            acceptBtn.style.opacity = '0.7';
            
            if (rulesCheckbox) {
                rulesCheckbox.checked = false;
                rulesCheckbox.disabled = true;
            }
        } else if (isAccepted) {
            acceptBtn.disabled = false;
            acceptBtn.classList.add('accepted');
            acceptBtn.innerHTML = '✓ Regras aceitas ✓';
            acceptBtn.style.opacity = '1';
            
            if (rulesCheckbox) {
                rulesCheckbox.checked = true;
                rulesCheckbox.disabled = false;
            }
        } else {
            acceptBtn.disabled = false;
            acceptBtn.classList.remove('accepted');
            acceptBtn.innerHTML = '✓ Li e aceito todas as regras';
            acceptBtn.style.opacity = '1';
            
            if (rulesCheckbox) {
                rulesCheckbox.checked = false;
                rulesCheckbox.disabled = false;
            }
        }
    }
    
    function acceptRules() {
        acceptBtn.classList.add('accepted');
        acceptBtn.style.cssText += `
            background: linear-gradient(135deg, rgba(0, 234, 255, 0.3), rgba(0, 234, 255, 0.2));
            border-color: var(--neon-cyan);
            color: white;
            box-shadow: 0 0 20px rgba(0, 234, 255, 0.5);
            animation: pulse 2s infinite;
        `;
        
        console.log('✅ Regras aceitas pelo usuário');
        
        // Mostra confirmação
        showFormMessage(rulesContainer.closest('form') || document.querySelector('form'), 
            '✅ Regras aceitas! Agora você pode enviar sua inscrição.', 
            'success');
    }
    
    function unacceptRules() {
        acceptBtn.classList.remove('accepted');
        acceptBtn.style.cssText = '';
        console.log('⚠️ Aceitação das regras cancelada');
    }
    
    function showRulesWarning() {
        // Cria mensagem de alerta
        const warning = document.createElement('div');
        warning.className = 'rules-warning';
        warning.innerHTML = `
            <p>⚠️ Por favor, leia todas as regras primeiro!</p>
            <p>Role até o final do regulamento para habilitar o botão de aceitação.</p>
        `;
        warning.style.cssText = `
            background: rgba(255, 215, 0, 0.15);
            border: 1px solid rgba(255, 215, 0, 0.4);
            color: #ffd700;
            padding: 10px;
            border-radius: 8px;
            margin: 10px 0;
            text-align: center;
            animation: shake 0.5s ease;
        `;
        
        // Insere após o botão
        acceptBtn.parentNode.insertBefore(warning, acceptBtn.nextSibling);
        
        // Remove após 5 segundos
        setTimeout(() => {
            if (warning.parentNode) {
                warning.style.opacity = '0';
                warning.style.transition = 'opacity 0.5s ease';
                setTimeout(() => {
                    if (warning.parentNode) {
                        warning.remove();
                    }
                }, 500);
            }
        }, 5000);
        
        // Scroll para o início das regras
        rulesContainer.scrollTo({ top: 0, behavior: 'smooth' });
    }
    
    console.log('📜 Sistema de regras inicializado');
}

// ========== CARD EFFECTS ==========
function initializeCardEffects() {
    const cards = document.querySelectorAll('.card.clickable');
    
    cards.forEach(card => {
        // Efeito de hover
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-10px) scale(1.02)';
            this.style.zIndex = '10';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
            this.style.zIndex = '1';
        });
        
        // Efeito de clique
        card.addEventListener('click', function(e) {
            // Adiciona efeito visual de clique
            this.style.transform = 'scale(0.98)';
            
            // Remove a classe 'external' se for um link interno
            if (this.href && this.href.includes(window.location.hostname)) {
                this.classList.remove('external');
            }
            
            setTimeout(() => {
                this.style.transform = '';
            }, 150);
        });
    });
}

// ========== NAVEGAÇÃO ==========
function initializeNavigation() {
    // Navegação suave para âncoras
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
                
                // Atualiza URL sem recarregar
                history.pushState(null, null, href);
            }
        });
    });
    
    // Marca link ativo
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-link').forEach(link => {
        const linkPage = link.getAttribute('href');
        if (linkPage === currentPage || 
            (currentPage === '' && linkPage === 'index.html')) {
            link.classList.add('active');
            link.setAttribute('aria-current', 'page');
        }
    });
}

// ========== FOOTER ==========
function initializeFooter() {
    // Atualiza ano do copyright
    const copyrightElements = document.querySelectorAll('.footer-copyright');
    const currentYear = new Date().getFullYear();
    
    copyrightElements.forEach(element => {
        if (element.textContent.includes('2025') && currentYear > 2025) {
            element.innerHTML = element.innerHTML.replace('2025', `2025-${currentYear}`);
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
        
        // Previne duplo clique rápido
        btn.addEventListener('click', function(e) {
            const originalHref = this.href;
            
            setTimeout(() => {
                this.href = originalHref;
            }, 1000);
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
        
        @keyframes bounce {
            0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
            40% { transform: translateY(-10px); }
            60% { transform: translateY(-5px); }
        }
        
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
            20%, 40%, 60%, 80% { transform: translateX(5px); }
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
            animation: spin 1s ease-in-out infinite;
            margin-right: 8px;
            vertical-align: middle;
        }
        
        .form-message {
            animation: fadeIn 0.5s ease !important;
        }
        
        .card {
            animation: fadeIn 0.6s ease;
        }
    `;
    document.head.appendChild(style);
})();

// ========== FUNÇÕES DE DEBUG/TESTE ==========
window.WildClashDebug = {
    testEmailJS: function() {
        if (typeof emailjs === 'undefined') {
            console.error('EmailJS não está carregado');
            alert('❌ EmailJS SDK não encontrado!');
            return;
        }
        
        const testData = {
            to_name: 'Nitto Coach',
            from_name: 'Teste Wild Clash',
            message: 'Esta é uma mensagem de teste do sistema de inscrições',
            reply_to: 'teste@wildclash.com',
            _test: true,
            _timestamp: new Date().toISOString()
        };
        
        console.log('🧪 Testando EmailJS com dados:', testData);
        
        emailjs.send('service_n23atzb', 'template_9k24qcu', testData)
            .then(response => {
                console.log('✅ Teste bem-sucedido:', response);
                alert('✅ Teste de EmailJS realizado com sucesso!\nVerifique o email nittocoach@gmail.com');
            })
            .catch(error => {
                console.error('❌ Teste falhou:', error);
                alert('❌ Erro no teste de EmailJS:\n' + error.text);
            });
    },
    
    checkFormData: function() {
        const forms = document.querySelectorAll('form');
        forms.forEach((form, index) => {
            const data = new FormData(form);
            console.log(`Formulário ${index + 1}:`, Object.fromEntries(data.entries()));
        });
    },
    
    resetForms: function() {
        const forms = document.querySelectorAll('form');
        forms.forEach(form => {
            form.reset();
            form.querySelectorAll('.form-message, .field-error').forEach(el => el.remove());
            form.querySelectorAll('.error').forEach(el => {
                el.classList.remove('error');
                el.style.borderColor = '';
                el.style.boxShadow = '';
            });
        });
        console.log('♻️ Todos os formulários foram resetados');
    }
};

// ========== FUNÇÕES AUXILIARES GLOBAIS ==========
window.validateEmail = function(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
};

window.formatPhone = function(phone) {
    return phone.replace(/\D/g, '')
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{4,5})(\d{4})/, '$1-$2');
};

// ========== LOG INICIAL ==========
console.log(`
╔══════════════════════════════════════════════╗
║          WILD CLASH - SISTEMA ATIVO          ║
╠══════════════════════════════════════════════╣
║ 🎮 Carousel:           ${document.querySelector('.carousel') ? '✔' : '✘'}            ║
║ 📝 Formulários:        ${document.querySelectorAll('form').length}             ║
║ 📧 EmailJS:            ${typeof emailjs !== 'undefined' ? '✔' : '✘'}            ║
║ 🎯 Regras:             ${document.querySelector('.rules-scroll') ? '✔' : '✘'}            ║
║ 🃏 Cards:              ${document.querySelectorAll('.card').length}             ║
╚══════════════════════════════════════════════╝
`);