// =============================================================================
// PROJETO: Wild Clash - Armazenamento Offline de Códigos
// ARQUIVO: storage.js
// DESCRIÇÃO: Gerencia os códigos de acesso no localStorage
// =============================================================================

const STORAGE_KEY = 'wildclash_codes_storage_v2';
const ADMIN_CODE = 'NittoCoach@08'; // Código de administrador
const TEST_CODE = 'TESTE123';       // Código de teste para inscrições

// Inicializa o storage com códigos padrão se não existir
function initStorage() {
    if (!localStorage.getItem(STORAGE_KEY)) {
        const defaultCodes = [
            {
                id: 1,
                code: ADMIN_CODE,
                team_name: 'Administrador',
                coach_name: 'Nitto',
                coach_email: 'nittocoach@gmail.com',
                created_at: new Date().toISOString(),
                expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
                validity_days: 365,
                current_uses: 0,
                max_uses: 9999,
                status: 'active',
                notes: 'Código de administrador',
                is_active: true
            },
            {
                id: 2,
                code: TEST_CODE,
                team_name: 'Equipe Teste',
                coach_name: 'Coach Teste',
                coach_email: 'teste@email.com',
                created_at: new Date().toISOString(),
                expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                validity_days: 7,
                current_uses: 0,
                max_uses: 1,
                status: 'active',
                notes: 'Código de teste para inscrições',
                is_active: true
            }
        ];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultCodes));
    }
}

// Retorna todos os códigos
function getAllCodes() {
    const codes = localStorage.getItem(STORAGE_KEY);
    return codes ? JSON.parse(codes) : [];
}

// Salva todos os códigos
function saveAllCodes(codes) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(codes));
}

// Busca um código pelo valor
function getCode(codeValue) {
    const codes = getAllCodes();
    return codes.find(c => c.code === codeValue && c.is_active === true);
}

// Valida um código (retorna objeto com sucesso/erro e dados)
function validateCode(codeValue) {
    const code = getCode(codeValue.toUpperCase());
    const now = new Date();

    if (!code) {
        return { success: false, error: 'Código não encontrado' };
    }

    // Verificar expiração
    const expiresAt = new Date(code.expires_at);
    if (expiresAt < now) {
        // Atualiza status para expirado
        code.status = 'expired';
        updateCode(code);
        return { success: false, error: 'Código expirado' };
    }

    // Verificar se já foi usado completamente
    if (code.current_uses >= code.max_uses) {
        code.status = 'used';
        updateCode(code);
        return { success: false, error: 'Código já foi usado o número máximo de vezes' };
    }

    // Verificar status
    if (code.status === 'used' || code.status === 'expired') {
        return { success: false, error: `Código ${code.status === 'used' ? 'já utilizado' : 'expirado'}` };
    }

    // Código válido
    return {
        success: true,
        data: {
            code: code.code,
            team_name: code.team_name,
            coach_name: code.coach_name,
            coach_email: code.coach_email,
            expires_at: code.expires_at,
            id: code.id
        }
    };
}

// Marca um código como usado (incrementa current_uses)
function useCode(codeValue) {
    const code = getCode(codeValue);
    if (!code) {
        return { success: false, error: 'Código não encontrado' };
    }

    const validation = validateCode(codeValue);
    if (!validation.success) {
        return validation;
    }

    code.current_uses++;
    if (code.current_uses >= code.max_uses) {
        code.status = 'used';
    }

    updateCode(code);
    return { success: true, message: 'Código marcado como usado' };
}

// Adiciona um novo código
function addCode(newCode) {
    const codes = getAllCodes();
    
    // Gerar ID único
    const maxId = codes.reduce((max, code) => Math.max(max, code.id || 0), 0);
    newCode.id = maxId + 1;
    
    // Adicionar timestamp
    newCode.created_at = new Date().toISOString();
    newCode.is_active = true;
    newCode.current_uses = 0;
    newCode.status = 'active';
    
    // Se não tem expires_at, calcular com base em validity_days
    if (!newCode.expires_at && newCode.validity_days) {
        newCode.expires_at = new Date(Date.now() + newCode.validity_days * 24 * 60 * 60 * 1000).toISOString();
    }
    
    codes.push(newCode);
    saveAllCodes(codes);
    return newCode;
}

// Atualiza um código existente
function updateCode(updatedCode) {
    const codes = getAllCodes();
    const index = codes.findIndex(c => c.id === updatedCode.id);
    if (index !== -1) {
        codes[index] = updatedCode;
        saveAllCodes(codes);
        return true;
    }
    return false;
}

// Remove um código (soft delete - is_active = false)
function deleteCode(codeId) {
    const codes = getAllCodes();
    const index = codes.findIndex(c => c.id === codeId);
    if (index !== -1) {
        codes[index].is_active = false;
        saveAllCodes(codes);
        return true;
    }
    return false;
}

// Retorna estatísticas
function getStats() {
    const codes = getAllCodes();
    const now = new Date();
    
    const stats = {
        total: codes.filter(c => c.is_active).length,
        available: codes.filter(c => 
            c.is_active && 
            c.status === 'active' && 
            new Date(c.expires_at) > now &&
            c.current_uses < c.max_uses
        ).length,
        used: codes.filter(c => 
            c.is_active && 
            (c.status === 'used' || c.current_uses >= c.max_uses)
        ).length,
        expired: codes.filter(c => 
            c.is_active && 
            (c.status === 'expired' || new Date(c.expires_at) <= now)
        ).length
    };
    
    return stats;
}

// Gera um código único
function generateUniqueCode(prefix = 'WILDCLASH') {
    const codes = getAllCodes();
    let code;
    let attempts = 0;
    
    do {
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        code = `${prefix}-${random}`;
        attempts++;
        
        if (attempts > 100) {
            code = `${prefix}-${Date.now().toString(36).toUpperCase()}`;
            break;
        }
    } while (codes.some(c => c.code === code));
    
    return code;
}

// Inicializa o storage quando o script é carregado
initStorage();

// =============================================================================
// EXPORTAÇÃO PARA USO EM OUTROS ARQUIVOS
// =============================================================================
window.WildClashStorage = {
    ADMIN_CODE,
    TEST_CODE,
    getAllCodes,
    addCode,
    getCode,
    validateCode,
    useCode,
    updateCode,
    deleteCode,
    getStats,
    generateUniqueCode
};

console.log(' Storage offline inicializado com sucesso!');