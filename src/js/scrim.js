// =============================================================================
// PROJETO: Wild Clash - Funcionalidades da Página Scrim
// ARQUIVO: scrim.js (APENAS para página scrim.html)
// DESCRIÇÃO: Validação de formulário, sistema de regras scroll, envio via Discord webhook
// =============================================================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('Página Scrim inicializada');
    
    initializeScrimForm();
    initializeScrimRules();
    
    console.log('Scrim.js carregado');
});

// ========== FORMULÁRIO DE SCRIM ==========
function initializeScrimForm() {
    const form = document.getElementById('scrim-form');
    if (!form) return;
    
    // Configuração dos botões de formato
    const formatOptions = form.querySelectorAll('input[name="format"]');
    const gameSelects = form.querySelectorAll('.game-select');
    
    formatOptions.forEach(option => {
        option.addEventListener('change', function() {
            // Habilitar o select correspondente
            const formatId = this.id;
            const selectId = formatId + '-games';
            const select = document.getElementById(selectId);
            
            // Desabilitar todos os selects primeiro
            gameSelects.forEach(select => {
                select.disabled = true;
            });
            
            // Habilitar o select do formato escolhido
            if (select) {
                select.disabled = false;
                select.required = true;
            }
        });
    });
    
    // Sistema de aceitação de regras
    const acceptBtn = document.getElementById('scrim-accept-btn');
    const rulesCheckbox = document.getElementById('rules-checkbox');
    const rulesScroll = form.querySelector('.rules-scroll');
    
    if (acceptBtn) {
        acceptBtn.disabled = true;
        acceptBtn.classList.add('disabled');
        
        acceptBtn.addEventListener('click', function() {
            if (this.classList.contains('accepted')) {
                // Desmarcar
                this.classList.remove('accepted');
                this.textContent = 'Li e aceito todas as regras';
                rulesCheckbox.checked = false;
            } else {
                // Marcar
                this.classList.add('accepted');
                this.textContent = 'Regras aceitas!';
                rulesCheckbox.checked = true;
            }
        });
    }
    
    // Sistema de scroll das regras
    if (rulesScroll && acceptBtn) {
        rulesScroll.addEventListener('scroll', function() {
            const scrollTop = this.scrollTop;
            const scrollHeight = this.scrollHeight - this.clientHeight;
            const scrollPercentage = Math.round((scrollTop / scrollHeight) * 100);
            
            if (scrollPercentage >= 95 && !acceptBtn.classList.contains('read')) {
                acceptBtn.disabled = false;
                acceptBtn.classList.remove('disabled');
                acceptBtn.classList.add('read');
                acceptBtn.textContent = 'Li e aceito todas as regras';
                
                // Animar o botão
                acceptBtn.style.animation = 'pulse 2s infinite';
            }
        });
        
        // Forçar verificação inicial
        setTimeout(() => {
            const scrollHeight = rulesScroll.scrollHeight - rulesScroll.clientHeight;
            if (scrollHeight <= 0) {
                acceptBtn.disabled = false;
                acceptBtn.classList.remove('disabled');
                acceptBtn.classList.add('read');
                acceptBtn.textContent = 'Li e aceito todas as regras';
            }
        }, 500);
    }
    
    // Validação em tempo real
    const requiredInputs = form.querySelectorAll('input[required], select[required]');
    requiredInputs.forEach(input => {
        input.addEventListener('blur', validateScrimField);
        input.addEventListener('input', clearScrimFieldError);
    });
    
    // Envio do formulário
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Validar todos os campos
        let allValid = true;
        requiredInputs.forEach(input => {
            if (!validateScrimField({ target: input })) {
                allValid = false;
                if (!firstInvalidField) {
                    firstInvalidField = input;
                }
            }
        });
        
        if (!allValid) {
            alert('Por favor, corrija os erros destacados antes de enviar.');
            if (firstInvalidField) {
                firstInvalidField.focus();
            }
            return;
        }
        
        // Validar regras
        if (!rulesCheckbox.checked) {
            alert('Você precisa ler e aceitar as regras antes de enviar.');
            return;
        }
        
        // Validar formato selecionado
        const selectedFormat = form.querySelector('input[name="format"]:checked');
        if (!selectedFormat) {
            alert('Por favor, selecione um formato (MDX ou BCX).');
            return;
        }
        
        // Coletar dados do formulário
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        // Adicionar data de envio
        data['_data_envio'] = new Date().toLocaleString('pt-BR');
        data['_timestamp'] = new Date().toISOString();
        
        // Desabilitar botão de envio
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Enviando...';
        submitBtn.disabled = true;
        
        try {
            // Webhook do Discord (substitua pela sua URL)
            const webhookURL = 'https://discord.com/api/webhooks/SUA_WEBHOOK_AQUI';
            
            // Formatar mensagem para Discord
            const discordMessage = {
                content: '📢 **NOVA SOLICITAÇÃO DE SCRIM!** 📢',
                embeds: [{
                    title: '🎮 Agendamento de SCRIM - Wild Clash',
                    color: 0x00eaff,
                    fields: [
                        { 
                            name: '🏆 Time', 
                            value: data.team || 'Não informado', 
                            inline: true 
                        },
                        { 
                            name: '📞 Contato', 
                            value: data.contact || 'Não informado', 
                            inline: true 
                        },
                        { 
                            name: '📅 Data e Hora', 
                            value: data.datetime ? new Date(data.datetime).toLocaleString('pt-BR') : 'Não informado', 
                            inline: false 
                        },
                        { 
                            name: '🎯 Formato', 
                            value: `${data.format} (${data[data.format.toLowerCase() + '-games']} jogos)` || 'Não informado', 
                            inline: true 
                        },
                        { 
                            name: '👥 Lineup Principal', 
                            value: `TOP: ${data.top || '-'}\nJNG: ${data.jng || '-'}\nMID: ${data.mid || '-'}\nADC: ${data.adc || '-'}\nSUP: ${data.sup || '-'}`, 
                            inline: false 
                        },
                        { 
                            name: '🔄 Reservas', 
                            value: `Reserva 1: ${data.reserva1 || '-'} (${data.rota1 || '-'})\nReserva 2: ${data.reserva2 || '-'} (${data.rota2 || '-'})`, 
                            inline: false 
                        },
                        { 
                            name: '📝 Observações', 
                            value: data.obs || 'Nenhuma observação', 
                            inline: false 
                        },
                        { 
                            name: '⏰ Data de Envio', 
                            value: new Date().toLocaleString('pt-BR'), 
                            inline: true 
                        }
                    ],
                    timestamp: new Date().toISOString(),
                    footer: { 
                        text: 'Wild Clash Scrim System • nittocoach@gmail.com',
                        icon_url: 'https://i.imgur.com/favicon.ico'
                    },
                    thumbnail: {
                        url: 'https://i.imgur.com/wildclash-logo.png'
                    }
                }]
            };
            
            console.log('Enviando SCRIM para Discord:', data);
            
            // Enviar para webhook
            const response = await fetch(webhookURL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(discordMessage)
            });
            
            if (response.ok) {
                alert(' Solicitação de SCRIM enviada com sucesso!\n\nEm breve nossa equipe entrará em contato com você.\n\nAcompanhe nosso Discord para mais informações:\ndiscord.gg/smJ9Q2V3VB');
                form.reset();
                
                // Resetar botão de aceitação
                if (acceptBtn) {
                    acceptBtn.classList.remove('accepted', 'read');
                    acceptBtn.textContent = 'Li e aceito todas as regras';
                    acceptBtn.disabled = true;
                    acceptBtn.classList.add('disabled');
                }
                
                // Resetar selects de jogos
                gameSelects.forEach(select => {
                    select.disabled = true;
                    select.required = false;
                });
                
                // Resetar seleção de formato
                formatOptions.forEach(option => {
                    option.checked = false;
                });
                
            } else {
                const errorText = await response.text();
                throw new Error(`Erro Discord: ${response.status} - ${errorText}`);
            }
            
        } catch (error) {
            console.error('Erro ao enviar SCRIM:', error);
            
            // Fallback: mostrar dados no console e alerta
            console.log('Dados da SCRIM (para envio manual):', data);
            
            alert(' SCRIM salva localmente!\n\n' +
                  'O sistema de envio automático está temporariamente indisponível.\n\n' +
                  'Por favor, entre em contato diretamente pelo Discord:\n' +
                  'discord.gg/smJ9Q2V3VB\n\n' +
                  'Ou envie um email para: nittocoach@gmail.com\n\n' +
                  'Informe os dados da sua solicitação.');
            
            // Salvar localmente como backup
            try {
                const backupKey = `scrim_backup_${Date.now()}`;
                localStorage.setItem(backupKey, JSON.stringify({
                    data: data,
                    timestamp: new Date().toISOString(),
                    error: error.toString()
                }));
                console.log('Backup SCRIM salvo:', backupKey);
            } catch (backupError) {
                console.error('Erro ao salvar backup:', backupError);
            }
            
        } finally {
            // Reabilitar botão
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });
}

// ========== VALIDAÇÃO DE CAMPOS SCRIM ==========
function validateScrimField(e) {
    const field = e.target;
    const value = field.value.trim();
    let isValid = true;
    let error = '';
    
    // Ignora se não for required e vazio
    if (!field.required && !value) {
        clearScrimFieldError({ target: field });
        return true;
    }
    
    // Verifica se é obrigatório
    if (field.required && !value) {
        isValid = false;
        error = 'Este campo é obrigatório';
    }
    
    // Validação específica por tipo
    if (isValid && value) {
        // Validação de Nick#TAG para jogadores
        if (field.name.match(/top|jng|mid|adc|sup|reserva/)) {
            if (!value.includes('#') && value.length > 0) {
                isValid = false;
                error = 'Formato: Nick#TAG (ex: Player#1234)';
            }
        }
        
        // Validação de data/hora
        if (field.type === 'datetime-local') {
            const selectedDate = new Date(value);
            const now = new Date();
            
            if (selectedDate < now) {
                isValid = false;
                error = 'A data/hora deve ser futura';
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
        showScrimFieldError(field, error);
    } else {
        clearScrimFieldError({ target: field });
    }
    
    return isValid;
}

function showScrimFieldError(field, message) {
    clearScrimFieldError({ target: field });
    
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

function clearScrimFieldError(e) {
    const field = e.target;
    field.classList.remove('error');
    field.style.borderColor = '';
    field.style.boxShadow = '';
    
    const errorDiv = field.parentNode.querySelector('.error-message');
    if (errorDiv) {
        errorDiv.remove();
    }
}

// ========== DEBUG/TESTE ==========
window.ScrimDebug = {
    testFormData: function() {
        const form = document.getElementById('scrim-form');
        if (form) {
            const data = new FormData(form);
            console.log('Dados do formulário SCRIM:', Object.fromEntries(data.entries()));
        }
    },
    
    fillTestData: function() {
        const form = document.getElementById('scrim-form');
        if (!form) return;
        
        form.querySelector('[name="team"]').value = 'Equipe Teste';
        form.querySelector('[name="contact"]').value = 'Teste#1234';
        form.querySelector('[name="top"]').value = 'TopTeste#1111';
        form.querySelector('[name="jng"]').value = 'JngTeste#2222';
        form.querySelector('[name="mid"]').value = 'MidTeste#3333';
        form.querySelector('[name="adc"]').value = 'AdcTeste#4444';
        form.querySelector('[name="sup"]').value = 'SupTeste#5555';
        
        // Definir data para amanhã
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(19, 0, 0, 0);
        form.querySelector('[name="datetime"]').value = tomorrow.toISOString().slice(0, 16);
        
        // Selecionar formato
        const mdxRadio = document.getElementById('mdx');
        if (mdxRadio) {
            mdxRadio.checked = true;
            mdxRadio.dispatchEvent(new Event('change'));
            document.getElementById('mdx-games').value = '3';
        }
        
        console.log('Dados de teste preenchidos');
    },
    
    testRulesScroll: function() {
        const rulesScroll = document.querySelector('.rules-scroll');
        if (rulesScroll) {
            rulesScroll.scrollTop = rulesScroll.scrollHeight;
            console.log('Scroll das regras testado');
        }
    }
};

console.log(`
╔══════════════════════════════════════════════╗
║           SCRIM SYSTEM - ATIVADO             ║
╠══════════════════════════════════════════════╣
║ Sistema de Regras: ${document.querySelector('.rules-scroll') ? '✅' : '❌'}             ║
║ Botão de Aceitação: ${document.getElementById('scrim-accept-btn') ? '✅' : '❌'}           ║
║ Formulário: ${document.getElementById('scrim-form') ? '✅' : '❌'}               ║
╚══════════════════════════════════════════════╝
`);