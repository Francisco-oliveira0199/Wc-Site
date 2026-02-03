// =============================================================================
// PROJETO: Wild Clash - Funcionalidades GERAIS do site
// ARQUIVO: script.js (Funcionalidades GERAIS do site)
// VERSÃO: 9.0 - CORRIGIDO COM MODAL FUNCIONAL
// DATA: Dezembro 2025
// =============================================================================

// Função para esperar o DOM estar pronto
function domReady(callback) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', callback);
    } else {
        callback();
    }
}

// Inicialização principal
domReady(function() {
    console.log(' Wild Clash - Inicializando funcionalidades...');
    
    // Verificar elementos críticos
    console.log(' Verificando elementos:');
    console.log('  - Modal:', !!document.getElementById('accessModal'));
    console.log('  - Botão Nav:', !!document.getElementById('inscreva-se-link'));
    console.log('  - Botão Hero:', !!document.getElementById('inscreva-se-btn'));
    console.log('  - Botão Fechar:', !!document.getElementById('closeModal'));
    
    // Inicializar todas as funcionalidades
    try {
        initializeAccessModal(); // ← PRIMEIRO e mais importante!
        initializeCarousel();
        initializeCardEffects();
        initializeNavigation();
        initializeFooter();
        initializeSmoothScroll();
        initializeFormEnhancements();
        
        console.log(' Todas as funcionalidades inicializadas com sucesso!');
    } catch (error) {
        console.error(' Erro ao inicializar:', error);
    }
});

// ========== MODAL DE ACESSO - GARANTIDO FUNCIONAR ==========
function initializeAccessModal() {
    const modal = document.getElementById('accessModal');
    if (!modal) {
        console.warn(' Modal de acesso não encontrado');
        return;
    }
    
    console.log(' Configurando modal de acesso...');
    
    // Elementos
    const btnNav = document.getElementById('inscreva-se-link');
    const btnHero = document.getElementById('inscreva-se-btn');
    const btnClose = document.getElementById('closeModal');
    
    // Função para abrir modal
    const openModal = function(event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        
        console.log(' Abrindo modal...');
        modal.classList.add('active');
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        document.body.style.paddingRight = getScrollbarWidth() + 'px';
        
        // Animar entrada
        modal.style.opacity = '0';
        modal.querySelector('.access-modal-content').style.transform = 'translateY(-20px)';
        
        setTimeout(() => {
            modal.style.opacity = '1';
            modal.querySelector('.access-modal-content').style.transform = 'translateY(0)';
        }, 10);
        
        return false;
    };
    
    // Função para fechar modal
    const closeModal = function(event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        
        console.log(' Fechando modal...');
        modal.classList.remove('active');
        modal.style.opacity = '0';
        modal.querySelector('.access-modal-content').style.transform = 'translateY(-20px)';
        
        setTimeout(() => {
            modal.style.display = 'none';
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
        }, 300);
        
        return false;
    };
    
    // Calcular largura da scrollbar
    function getScrollbarWidth() {
        const outer = document.createElement('div');
        outer.style.visibility = 'hidden';
        outer.style.overflow = 'scroll';
        outer.style.width = '100px';
        document.body.appendChild(outer);
        
        const widthNoScroll = outer.offsetWidth;
        outer.style.overflow = 'scroll';
        
        const inner = document.createElement('div');
        inner.style.width = '100%';
        outer.appendChild(inner);
        
        const widthWithScroll = inner.offsetWidth;
        outer.parentNode.removeChild(outer);
        
        return widthNoScroll - widthWithScroll;
    }
    
    // Adicionar eventos de forma robusta
    if (btnNav) {
        btnNav.addEventListener('click', openModal);
        btnNav.addEventListener('touchstart', openModal, { passive: true });
        console.log(' Eventos adicionados ao botão de navegação');
    }
    
    if (btnHero) {
        btnHero.addEventListener('click', openModal);
        btnHero.addEventListener('touchstart', openModal, { passive: true });
        console.log(' Eventos adicionados ao botão do hero');
    }
    
    if (btnClose) {
        btnClose.addEventListener('click', closeModal);
        console.log(' Evento adicionado ao botão fechar');
    }
    
    // Fechar ao clicar fora
    modal.addEventListener('click', function(event) {
        if (event.target === modal) {
            closeModal(event);
        }
    });
    
    // Fechar com ESC
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape' && modal.classList.contains('active')) {
            closeModal(event);
        }
    });
    
    // Prevenir que o modal feche ao clicar dentro
    const modalContent = modal.querySelector('.access-modal-content');
    if (modalContent) {
        modalContent.addEventListener('click', function(event) {
            event.stopPropagation();
        });
    }
    
    console.log(' Modal configurado com sucesso!');
}

// ========== CAROUSEL ==========
function initializeCarousel() {
    const carousel = document.querySelector('.carousel');
    if (!carousel) return;
    
    const slides = carousel.querySelectorAll('.carousel-slide');
    const indicators = carousel.querySelectorAll('.indicator');
    const prevBtn = carousel.querySelector('.arrow.prev');
    const nextBtn = carousel.querySelector('.arrow.next');
    
    if (slides.length === 0) return;
    
    let currentIndex = 0;
    let autoPlayInterval;
    let isAnimating = false;
    
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
        if (isAnimating) return;
        isAnimating = true;
        
        currentIndex = (currentIndex + 1) % slides.length;
        updateSlides();
        
        setTimeout(() => {
            isAnimating = false;
        }, 600);
        
        resetAutoPlay();
    }
    
    function prevSlide() {
        if (isAnimating) return;
        isAnimating = true;
        
        currentIndex = (currentIndex - 1 + slides.length) % slides.length;
        updateSlides();
        
        setTimeout(() => {
            isAnimating = false;
        }, 600);
        
        resetAutoPlay();
    }
    
    function goToSlide(index) {
        if (isAnimating || index === currentIndex) return;
        if (index >= 0 && index < slides.length) {
            isAnimating = true;
            currentIndex = index;
            updateSlides();
            
            setTimeout(() => {
                isAnimating = false;
            }, 600);
            
            resetAutoPlay();
        }
    }
    
    // Event Listeners
    if (prevBtn) {
        prevBtn.addEventListener('click', (e) => {
            e.preventDefault();
            prevSlide();
        });
        
        prevBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            prevSlide();
        }, { passive: false });
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', (e) => {
            e.preventDefault();
            nextSlide();
        });
        
        nextBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            nextSlide();
        }, { passive: false });
    }
    
    indicators.forEach((indicator, index) => {
        indicator.addEventListener('click', (e) => {
            e.preventDefault();
            goToSlide(index);
        });
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
    
    // Interações
    carousel.addEventListener('mouseenter', stopAutoPlay);
    carousel.addEventListener('mouseleave', startAutoPlay);
    
    // Inicializar
    updateSlides();
    startAutoPlay();
    
    console.log(' Carousel inicializado');
}

// ========== CARD EFFECTS ==========
function initializeCardEffects() {
    const cards = document.querySelectorAll('.card.clickable, .card');
    
    cards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-10px) scale(1.02)';
            this.style.zIndex = '10';
            this.style.transition = 'all 0.3s ease';
            this.style.boxShadow = '0 20px 40px rgba(0,0,0,0.6)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
            this.style.zIndex = '1';
            this.style.boxShadow = '';
        });
        
        // Feedback tátil para mobile
        card.addEventListener('touchstart', function() {
            this.style.transform = 'translateY(-5px) scale(1.01)';
        }, { passive: true });
        
        card.addEventListener('touchend', function() {
            setTimeout(() => {
                this.style.transform = 'translateY(0) scale(1)';
            }, 150);
        }, { passive: true });
    });
    
    console.log(' Efeitos de cards inicializados');
}

// ========== NAVEGAÇÃO ==========
function initializeNavigation() {
    // Marcar link ativo baseado na página atual
    const currentPath = window.location.pathname;
    const currentPage = currentPath.split('/').pop() || 'index.html';
    
    document.querySelectorAll('.nav-link').forEach(link => {
        const linkHref = link.getAttribute('href');
        const linkPage = linkHref.split('/').pop() || linkHref;
        
        if (linkPage === currentPage || 
            (currentPage === '' && linkPage === 'index.html') ||
            (currentPage === 'index.html' && linkPage === 'index.html')) {
            
            link.classList.add('active');
            link.setAttribute('aria-current', 'page');
        } else {
            link.classList.remove('active');
            link.removeAttribute('aria-current');
        }
    });
    
    console.log(' Navegação inicializada');
}

// ========== FOOTER ==========
function initializeFooter() {
    // Atualizar ano do copyright
    const year = new Date().getFullYear();
    document.querySelectorAll('.footer-copyright').forEach(el => {
        el.textContent = `© ${year} WILD CLASH`;
    });
    
    console.log(' Footer inicializado');
}

// ========== SCROLL SUAVE ==========
function initializeSmoothScroll() {
    // Scroll suave para links internos
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            
            if (href === '#' || href === '#!') return;
            
            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                
                window.scrollTo({
                    top: target.offsetTop - 100,
                    behavior: 'smooth'
                });
                
                // Foco acessível
                setTimeout(() => {
                    target.setAttribute('tabindex', '-1');
                    target.focus();
                }, 500);
            }
        });
    });
    
    console.log(' Scroll suave inicializado');
}

// ========== FORM ENHANCEMENTS ==========
function initializeFormEnhancements() {
    // Adicionar classes de validação visual
    const forms = document.querySelectorAll('form');
    
    forms.forEach(form => {
        const inputs = form.querySelectorAll('input, textarea, select');
        
        inputs.forEach(input => {
            // Adicionar classe quando em foco
            input.addEventListener('focus', function() {
                this.parentElement.classList.add('focused');
            });
            
            input.addEventListener('blur', function() {
                this.parentElement.classList.remove('focused');
            });
            
            // Validação básica em tempo real
            if (input.hasAttribute('required')) {
                input.addEventListener('blur', function() {
                    if (!this.value.trim()) {
                        this.classList.add('invalid');
                    } else {
                        this.classList.remove('invalid');
                    }
                });
            }
        });
    });
    
    console.log(' Form enhancements inicializados');
}

// ========== UTILITÁRIOS ==========
// Detectar mobile
function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           window.innerWidth <= 768;
}

// Verificar conexão
function checkConnection() {
    if (!navigator.onLine) {
        showOfflineWarning();
    }
    
    window.addEventListener('online', () => {
        hideOfflineWarning();
        console.log(' Conexão restaurada');
    });
    
    window.addEventListener('offline', () => {
        showOfflineWarning();
        console.log('  Conexão perdida');
    });
}

function showOfflineWarning() {
    let warning = document.getElementById('offline-warning');
    
    if (!warning) {
        warning = document.createElement('div');
        warning.id = 'offline-warning';
        warning.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: #ff2d75;
            color: white;
            padding: 10px 20px;
            text-align: center;
            z-index: 99999;
            font-weight: 600;
            animation: slideDown 0.3s ease;
        `;
        warning.textContent = ' Você está offline. Algumas funcionalidades podem não funcionar.';
        document.body.appendChild(warning);
    }
}

function hideOfflineWarning() {
    const warning = document.getElementById('offline-warning');
    if (warning && warning.parentNode) {
        warning.style.animation = 'slideUp 0.3s ease';
        setTimeout(() => {
            warning.parentNode.removeChild(warning);
        }, 300);
    }
}

// ========== ANIMAÇÕES CSS DINÂMICAS ==========
function addDynamicStyles() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideDown {
            from { transform: translateY(-100%); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
        
        @keyframes slideUp {
            from { transform: translateY(0); opacity: 1; }
            to { transform: translateY(-100%); opacity: 0; }
        }
        
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes pulse {
            0% { box-shadow: 0 0 0 0 rgba(0, 234, 255, 0.4); }
            70% { box-shadow: 0 0 0 10px rgba(0, 234, 255, 0); }
            100% { box-shadow: 0 0 0 0 rgba(0, 234, 255, 0); }
        }
        
        .access-modal-content {
            animation: fadeIn 0.3s ease !important;
            transition: transform 0.3s ease !important;
        }
        
        .form-group.focused label {
            color: #00eaff !important;
        }
        
        input.invalid, textarea.invalid, select.invalid {
            border-color: #ff2d75 !important;
            background: rgba(255, 45, 117, 0.1) !important;
        }
    `;
    document.head.appendChild(style);
}

// ========== INICIALIZAÇÕES ADICIONAIS ==========
// Adicionar estilos dinâmicos
addDynamicStyles();

// Verificar conexão
checkConnection();

// Log de status final
console.log(`
╔══════════════════════════════════════════════╗
║       WILD CLASH - SISTEMA ATIVADO           ║
╠══════════════════════════════════════════════╣
║ Versão: 9.0 (Modal Fix)                      ║
║ Dispositivo: ${isMobile() ? '📱 Mobile' : '💻 Desktop'}             ║
║ Online: ${navigator.onLine ? '✅ Sim' : '❌ Não'}                    ║
║ Modal: ${document.getElementById('accessModal') ? '✅ Configurado' : '❌ Ausente'} ║
║ Carousel: ${document.querySelector('.carousel') ? '✅' : '❌'}                ║
╚══════════════════════════════════════════════╝
`);