/* script.js
   - Comentários em PT-BR indicando onde colocar webhooks e instruções.
   - Não implementa backend; apenas exemplo de envio e UX local.
*/

/* ------------------------------
   CONFIGURAÇÕES (substituir)
   ------------------------------
   COLOCAR AQUI O WEBHOOK DO DISCORD se desejar integrar (ex: "https://discord.com/api/webhooks/ID/TOKEN")
   Atenção: por segurança, não coloque webhook público em cliente (front-end). Idealemente, use backend que protege o token.
*/
const DISCORD_WEBHOOK_URL = ""; // --> COLE A URL DO WEBHOOK AQUI (opcional, recomendado usar backend)

/* UTILITÁRIOS */
function showToast(message){
  // simples notificação temporária
  const t = document.createElement('div');
  t.textContent = message;
  t.style.position = 'fixed';
  t.style.right = '20px';
  t.style.bottom = '20px';
  t.style.padding = '10px 14px';
  t.style.borderRadius = '10px';
  t.style.background = 'linear-gradient(90deg, rgba(0,234,255,0.08), rgba(255,45,117,0.08))';
  t.style.color = '#fff';
  t.style.zIndex = '9999';
  document.body.appendChild(t);
  setTimeout(()=> t.remove(), 4200);
}

/* FORMULÁRIO DE INSCRIÇÃO */
const inscricaoForm = document.getElementById('inscricao-form');
if (inscricaoForm){
  inscricaoForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(inscricaoForm).entries());
    showToast('Preparando inscrição...');

    // Criar corpo do email formatado
    const emailSubject = encodeURIComponent("🏆 Nova Inscrição - Campeonato Wild Clash");
    const emailBody = encodeURIComponent(`📋 NOVA INSCRIÇÃO PARA CAMPEONATO WILD CLASH

🕒 Data/Hora da Solicitação: ${new Date().toLocaleString('pt-BR')}

🏆 INFORMAÇÕES DA EQUIPE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👨‍🏫 Coach da Equipe: ${data.coach || 'Não informado'}

👥 Lineup Principal:
${data.lineup || 'Não informado'}

🛡️ Jogadores Reserva(s):
${data.reservas || 'Nenhum reserva informado'}

📊 Distribuição por Roles:
${data.roles || 'Não informado'}

📝 Observações Adicionais:
${data.obs || 'Nenhuma observação.'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  IMPORTANTE: Esta é uma inscrição automática gerada pelo formulário oficial do Wild Clash.
   A equipe aceitou ler e concordar integralmente com o regulamento.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔔 AGUARDE O CONTATO DA ORGANIZAÇÃO PARA CONFIRMAÇÃO E PRÓXIMOS PASSOS.

Atenciosamente,
Sistema de Inscrições WILD CLASH
🌟 Campeonatos oficiais de Wild Rift`);

    // Criar link mailto
    const mailtoLink = `mailto:nittocoach@gmail.com?subject=${emailSubject}&body=${emailBody}`;
    window.open(mailtoLink);

    showToast('✅ Cliente de email aberto com dados preenchidos!');
    inscricaoForm.reset();
  });
}

/* FORMULÁRIO DE SCRIM */
const scrimForm = document.getElementById('scrim-form');
if (scrimForm){
  scrimForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(scrimForm).entries());

    // Processar formato com jogos selecionados
    let formatLabel = data.format || "—";
    if (data.format === "MDX" && data["mdx-games"]) {
      formatLabel += ` (${data["mdx-games"]} jogos)`;
    } else if (data.format === "BCX" && data["bcx-games"]) {
      formatLabel += ` (${data["bcx-games"]} jogos)`;
    }

    // Processar data e horário legível
    let dateTimeLabel = "—";
    if (data.datetime) {
      try {
        const dateTime = new Date(data.datetime + ':00'); // Adiciona segundos
        dateTimeLabel = dateTime.toLocaleString('pt-BR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
      } catch (e) {
        dateTimeLabel = data.datetime; // Mantém valor original se erro
      }
    }

    showToast('Enviando agendamento...');

    const payload = {
      username: "SCRIM WILD CLASH",
      embeds: [{
        title: "📅 Novo Agendamento de SCRIM",
        color: 1669967, // Ciano neon (#19F0FF em hexadecimal)
        fields: [
          { name: "🏆 Nome do Time", value: data.team || "—", inline: false },
          { name: "📞 Contato (Discord/Telefone)", value: data.contact || "—", inline: false },
          { name: "📅 Data e Horário da SCRIM", value: dateTimeLabel, inline: true },
          { name: "🎮 Formato", value: formatLabel, inline: true },
          { name: "📝 Observação", value: data.obs || "Nenhuma observação", inline: false }
        ],
        footer: {
          text: "Enviado pelo formulário oficial de SCRIM WILD CLASH"
        },
        timestamp: new Date().toISOString() // Timestamp automático em ISO
      }]
    };

    // ✅ WEBHOOK SCRIM CONFIGURADO
    // Canal alvo: https://discord.com/channels/1397032702229872660/1443249843265998878
    const SCRIM_WEBHOOK_URL = "https://discord.com/api/webhooks/1443253527844622426/afdAftfjuG-KRz1jA8gSUUIsTZFVGLJpfuTMa3R519MIL0VLki7HGD7v34IK0SdIDCUG";

    if (SCRIM_WEBHOOK_URL && SCRIM_WEBHOOK_URL !== "https://discord.com/api/webhooks/WEBHOOK_ID/WEBHOOK_TOKEN"){
      try {
        await fetch(SCRIM_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        showToast('✅ Agendamento enviado com sucesso!');
        scrimForm.reset();
      } catch (err) {
        console.error('Erro no webhook:', err);
        showToast('❌ Erro ao enviar agendamento. Tente novamente.');
      }
    } else {
      // Modo simulação - mostra dados no console
      console.log('🎮 SCRIM AGENDAMENTO (SIMULAÇÃO):', payload);
      console.log('Para ativar envio real, configure SCRIM_WEBHOOK_URL em script.js');
      showToast('🎪 Simulação: Confira console para dados. Configure webhook para envio real.');
      scrimForm.reset();
    }
  });
}

/* Pequena animação de fundo ao focar/hover -> realce sutil */
document.addEventListener('mousemove', (e) => {
  const bg = document.getElementById('background');
  if (!bg) return;
  const x = (e.clientX / window.innerWidth - 0.5) * 10;
  const y = (e.clientY / window.innerHeight - 0.5) * 10;
  bg.style.transform = `scale(1.06) translate(${x}px, ${y}px)`;
});

/* Navegação: destacar link ativo (no client-side, com base em pathname) */
(function markActiveLink(){
  const links = document.querySelectorAll('.nav-link');
  const path = window.location.pathname.split('/').pop();
  links.forEach(a => {
    const href = a.getAttribute('href');
    if (href === path || (href === 'index.html' && (path === '' || path === 'index.html'))){
      a.classList.add('active');
    }
  });
})();

/* Scrim format selection: enable/disable game selects based on radio */
document.addEventListener('DOMContentLoaded', function() {
  const mdxRadio = document.getElementById('mdx');
  const bcxRadio = document.getElementById('bcx');
  const mdxSelect = document.getElementById('mdx-games');
  const bcxSelect = document.getElementById('bcx-games');

  function updateSelects() {
    if (mdxRadio && mdxRadio.checked) {
      mdxSelect.disabled = false;
      bcxSelect.disabled = true;
    } else if (bcxRadio && bcxRadio.checked) {
      bcxSelect.disabled = false;
      mdxSelect.disabled = true;
    } else {
      mdxSelect.disabled = true;
      bcxSelect.disabled = true;
    }
  }

  if (mdxRadio) mdxRadio.addEventListener('change', updateSelects);
  if (bcxRadio) bcxRadio.addEventListener('change', updateSelects);
  updateSelects(); // initial state
});

/* SCROLL TO END OF RULES - ENABLE ACCEPT CHECKBOX */
document.addEventListener('DOMContentLoaded', function() {
  // Verificação para a página de scrims
  const scrimRulesScroll = document.querySelector('.rules-scroll');
  const scrimCheckbox = document.getElementById('rules-checkbox');
  const scrimCheckboxLabel = document.querySelector('.checkbox-label');

  // Verificação para a página de inscrições
  const inscricaoRulesScroll = document.querySelector('.rules-scroll');
  const inscricaoCheckbox = document.getElementById('inscricao-rules-checkbox');
  const inscricaoCheckboxLabel = document.querySelector('.checkbox-label');

  // Função genérica para verificar scroll
  function checkScroll(rulesScroll, checkbox, checkboxLabel) {
    if (!rulesScroll || !checkbox || !checkboxLabel) return;

    const isAtBottom = rulesScroll.scrollTop + rulesScroll.clientHeight >= rulesScroll.scrollHeight - 10;

    if (isAtBottom && !checkbox.disabled) {
      return; // Já está habilitado
    }

    if (isAtBottom) {
      checkbox.disabled = false;
      checkboxLabel.classList.add('has-read');
      checkboxLabel.textContent = checkbox === inscricaoCheckbox ?
        'Li e aceito todas as regras do regulamento (clique para confirmar)' :
        'Li e aceito todas as regras (clique para confirmar)';
      showToast('Você leu todas as regras! Agora pode aceitar.');
    }
  }

  // Configurar verificação para scrims
  if (scrimRulesScroll && scrimCheckbox && scrimCheckboxLabel) {
    scrimRulesScroll.addEventListener('scroll', () => checkScroll(scrimRulesScroll, scrimCheckbox, scrimCheckboxLabel));

    if (scrimRulesScroll.scrollHeight <= scrimRulesScroll.clientHeight) {
      checkScroll(scrimRulesScroll, scrimCheckbox, scrimCheckboxLabel);
    }

    scrimRulesScroll.addEventListener('touchend', () => setTimeout(() => checkScroll(scrimRulesScroll, scrimCheckbox, scrimCheckboxLabel), 100));
    scrimCheckbox.disabled = true;
  }

  // Configurar verificação para inscrições
  if (inscricaoRulesScroll && inscricaoCheckbox && inscricaoCheckboxLabel) {
    inscricaoRulesScroll.addEventListener('scroll', () => checkScroll(inscricaoRulesScroll, inscricaoCheckbox, inscricaoCheckboxLabel));

    if (inscricaoRulesScroll.scrollHeight <= inscricaoRulesScroll.clientHeight) {
      checkScroll(inscricaoRulesScroll, inscricaoCheckbox, inscricaoCheckboxLabel);
    }

    inscricaoRulesScroll.addEventListener('touchend', () => setTimeout(() => checkScroll(inscricaoRulesScroll, inscricaoCheckbox, inscricaoCheckboxLabel), 100));
    inscricaoCheckbox.disabled = true;
  }
});

/* GROUP TABS SWITCHING - WILDCCLASH PAGE */
document.addEventListener('DOMContentLoaded', function() {
  const tabButtons = document.querySelectorAll('.tab-button');
  const bracketContents = document.querySelectorAll('.bracket-content');

  tabButtons.forEach(button => {
    button.addEventListener('click', function() {
      const targetGroup = this.getAttribute('data-group');

      // Remove active class from all tabs
      tabButtons.forEach(btn => btn.classList.remove('active'));

      // Add active class to clicked tab
      this.classList.add('active');

      // Hide all bracket contents
      bracketContents.forEach(content => content.classList.add('hidden'));

      // Show target bracket content
      const targetContent = document.getElementById(`${targetGroup}-content`);
      if (targetContent) {
        targetContent.classList.remove('hidden');
      }
    });
  });
});
