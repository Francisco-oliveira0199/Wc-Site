-- ============================================
-- BANCO DE DADOS WILD CLASH - SISTEMA DE CÓDIGOS
-- ============================================

CREATE DATABASE IF NOT EXISTS wildclash_db;
USE wildclash_db;

-- ============================================
-- TABELA DE ADMINISTRADORES
-- ============================================
CREATE TABLE IF NOT EXISTS administrators (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    full_name VARCHAR(100),
    role ENUM('super_admin', 'admin') DEFAULT 'admin',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    INDEX idx_username (username),
    INDEX idx_email (email),
    INDEX idx_active (is_active)
);

-- ============================================
-- TABELA PRINCIPAL DE CÓDIGOS
-- ============================================
CREATE TABLE IF NOT EXISTS access_codes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    code VARCHAR(50) UNIQUE NOT NULL COMMENT 'Código único para acesso',
    team_name VARCHAR(100) NOT NULL COMMENT 'Nome do time',
    coach_name VARCHAR(100) COMMENT 'Nome do treinador',
    coach_email VARCHAR(100) COMMENT 'Email do treinador',
    coach_phone VARCHAR(20) COMMENT 'Telefone do treinador',
    
    -- Controle de validade
    validity_days INT NOT NULL DEFAULT 7 COMMENT 'Dias de validade',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL COMMENT 'Data de expiração calculada',
    
    -- Controle de usos
    max_uses INT NOT NULL DEFAULT 1 COMMENT 'Número máximo de usos permitidos',
    current_uses INT DEFAULT 0 COMMENT 'Usos atuais',
    is_used BOOLEAN DEFAULT FALSE COMMENT 'Indica se já foi usado',
    used_at TIMESTAMP NULL COMMENT 'Data do primeiro uso',
    
    -- Informações de criação
    created_by INT COMMENT 'ID do administrador que criou',
    creator_name VARCHAR(100) COMMENT 'Nome do criador (backup)',
    
    -- Status e notas
    status ENUM('active', 'used', 'expired', 'cancelled') DEFAULT 'active',
    notes TEXT COMMENT 'Observações adicionais',
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Índices para performance
    INDEX idx_code (code),
    INDEX idx_expires_at (expires_at),
    INDEX idx_status (status),
    INDEX idx_team_name (team_name),
    INDEX idx_created_by (created_by),
    INDEX idx_created_at (created_at DESC),
    INDEX idx_is_active (is_active),
    
    -- Chave estrangeira
    FOREIGN KEY (created_by) REFERENCES administrators(id) ON DELETE SET NULL
);

-- ============================================
-- TABELA DE USOS DE CÓDIGOS (LOG)
-- ============================================
CREATE TABLE IF NOT EXISTS code_usage_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    code_id INT NOT NULL,
    code VARCHAR(50) NOT NULL COMMENT 'Código usado (backup)',
    
    -- Informações do usuário
    ip_address VARCHAR(45),
    user_agent TEXT,
    device_info VARCHAR(255),
    browser VARCHAR(100),
    platform VARCHAR(50),
    
    -- Data e hora
    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Índices
    INDEX idx_code_id (code_id),
    INDEX idx_used_at (used_at DESC),
    INDEX idx_ip_address (ip_address),
    
    -- Chave estrangeira
    FOREIGN KEY (code_id) REFERENCES access_codes(id) ON DELETE CASCADE
);

-- ============================================
-- TABELA DE CÓDIGOS EXPIRADOS (VIEW/Backup)
-- ============================================
CREATE TABLE IF NOT EXISTS expired_codes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    original_code_id INT,
    code VARCHAR(50) NOT NULL,
    team_name VARCHAR(100) NOT NULL,
    validity_days INT NOT NULL,
    max_uses INT NOT NULL,
    current_uses INT DEFAULT 0,
    created_at TIMESTAMP,
    expired_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expired_by INT COMMENT 'Admin que marcou como expirado',
    
    INDEX idx_code (code),
    INDEX idx_expired_at (expired_at DESC),
    FOREIGN KEY (expired_by) REFERENCES administrators(id) ON DELETE SET NULL
);

-- ============================================
-- TABELA DE CONFIGURAÇÕES DO SISTEMA
-- ============================================
CREATE TABLE IF NOT EXISTS system_settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    setting_key VARCHAR(50) UNIQUE NOT NULL,
    setting_value TEXT,
    setting_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
    description TEXT,
    is_editable BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by INT,
    
    INDEX idx_setting_key (setting_key),
    FOREIGN KEY (updated_by) REFERENCES administrators(id) ON DELETE SET NULL
);

-- ============================================
-- TABELA DE LOGS DO SISTEMA
-- ============================================
CREATE TABLE IF NOT EXISTS system_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    log_type ENUM('info', 'warning', 'error', 'security', 'action') NOT NULL,
    module VARCHAR(50) NOT NULL COMMENT 'Módulo do sistema',
    action VARCHAR(100) NOT NULL COMMENT 'Ação realizada',
    description TEXT,
    
    -- Informações do usuário/admin
    user_id INT NULL,
    username VARCHAR(50),
    ip_address VARCHAR(45),
    
    -- Data e metadados
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSON COMMENT 'Dados adicionais em JSON',
    
    INDEX idx_log_type (log_type),
    INDEX idx_module (module),
    INDEX idx_created_at (created_at DESC),
    INDEX idx_user_id (user_id)
);

-- ============================================
-- VIEWS PARA RELATÓRIOS
-- ============================================

-- View para códigos disponíveis
CREATE OR REPLACE VIEW available_codes_view AS
SELECT 
    ac.id,
    ac.code,
    ac.team_name,
    ac.coach_name,
    ac.coach_email,
    ac.validity_days,
    ac.max_uses,
    ac.current_uses,
    ac.created_at,
    ac.expires_at,
    DATEDIFF(ac.expires_at, NOW()) as days_remaining,
    a.username as created_by_username,
    ac.notes
FROM access_codes ac
LEFT JOIN administrators a ON ac.created_by = a.id
WHERE ac.is_active = TRUE 
    AND ac.status = 'active'
    AND ac.expires_at > NOW()
    AND ac.current_uses < ac.max_uses
ORDER BY ac.expires_at ASC;

-- View para códigos usados
CREATE OR REPLACE VIEW used_codes_view AS
SELECT 
    ac.id,
    ac.code,
    ac.team_name,
    ac.coach_name,
    ac.coach_email,
    ac.validity_days,
    ac.max_uses,
    ac.current_uses,
    ac.created_at,
    ac.used_at,
    ac.expires_at,
    a.username as created_by_username,
    COUNT(cul.id) as total_usages,
    MAX(cul.used_at) as last_usage
FROM access_codes ac
LEFT JOIN administrators a ON ac.created_by = a.id
LEFT JOIN code_usage_logs cul ON ac.id = cul.code_id
WHERE ac.is_active = TRUE 
    AND (ac.status = 'used' OR ac.current_uses >= ac.max_uses)
GROUP BY ac.id
ORDER BY ac.used_at DESC;

-- View para códigos expirados
CREATE OR REPLACE VIEW expired_codes_view AS
SELECT 
    ac.id,
    ac.code,
    ac.team_name,
    ac.coach_name,
    ac.coach_email,
    ac.validity_days,
    ac.max_uses,
    ac.current_uses,
    ac.created_at,
    ac.expires_at,
    a.username as created_by_username,
    ac.notes,
    DATEDIFF(NOW(), ac.expires_at) as days_expired
FROM access_codes ac
LEFT JOIN administrators a ON ac.created_by = a.id
WHERE ac.is_active = TRUE 
    AND ac.status = 'expired'
    OR (ac.expires_at <= NOW() AND ac.status = 'active')
ORDER BY ac.expires_at DESC;

-- ============================================
-- INSERIR DADOS INICIAIS
-- ============================================

-- Administrador padrão (senha: Admin123!)
INSERT INTO administrators (username, password_hash, email, full_name, role) VALUES 
('admin', '$2a$10$N9qo8uLOickgx2ZMRZoMy.Mrq7LqM.3c6L9Q4.8B.T9.7G2VYzQ6O', 'admin@wildclash.com', 'Administrador Principal', 'super_admin')
ON DUPLICATE KEY UPDATE username = username;

-- Configurações do sistema
INSERT INTO system_settings (setting_key, setting_value, setting_type, description) VALUES
('default_validity_days', '7', 'number', 'Dias padrão de validade para novos códigos'),
('default_max_uses', '1', 'number', 'Usos máximos padrão para novos códigos'),
('allow_multiple_uses', 'false', 'boolean', 'Permitir múltiplos usos do mesmo código'),
('auto_expire_codes', 'true', 'boolean', 'Expirar códigos automaticamente após a data'),
('code_prefix', 'WILDCLASH', 'string', 'Prefixo para geração de códigos'),
('max_codes_per_day', '100', 'number', 'Máximo de códigos gerados por dia'),
('system_maintenance', 'false', 'boolean', 'Modo manutenção do sistema'),
('notification_email', 'notifications@wildclash.com', 'string', 'Email para notificações')
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;

-- Códigos de exemplo
INSERT INTO access_codes (code, team_name, coach_name, coach_email, validity_days, max_uses, expires_at, status) VALUES
('WILDCLASH-001', 'Dragões de Fogo', 'Carlos Silva', 'carlos@email.com', 7, 1, DATE_ADD(NOW(), INTERVAL 7 DAY), 'active'),
('WILDCLASH-002', 'Tigres Alados', 'Ana Santos', 'ana@email.com', 14, 2, DATE_ADD(NOW(), INTERVAL 14 DAY), 'active'),
('WILDCLASH-003', 'Águias Douradas', 'Pedro Costa', 'pedro@email.com', 7, 1, DATE_ADD(NOW(), INTERVAL -1 DAY), 'expired'),
('WILDCLASH-004', 'Leões da Montanha', 'Maria Oliveira', 'maria@email.com', 7, 1, DATE_ADD(NOW(), INTERVAL 7 DAY), 'used'),
('WILDCLASH-005', 'Lobos da Neve', 'João Pereira', 'joao@email.com', 30, 5, DATE_ADD(NOW(), INTERVAL 30 DAY), 'active')
ON DUPLICATE KEY UPDATE code = code;

-- ============================================
-- PROCEDURES ÚTEIS
-- ============================================

-- Procedure para atualizar status dos códigos
DELIMITER //
CREATE PROCEDURE UpdateCodeStatuses()
BEGIN
    -- Marcar códigos expirados
    UPDATE access_codes 
    SET status = 'expired'
    WHERE status = 'active' 
        AND expires_at <= NOW()
        AND is_active = TRUE;
    
    -- Marcar códigos usados
    UPDATE access_codes 
    SET status = 'used'
    WHERE status = 'active' 
        AND current_uses >= max_uses
        AND is_active = TRUE;
END //
DELIMITER ;

-- Event para executar diariamente
CREATE EVENT IF NOT EXISTS DailyCodeStatusUpdate
ON SCHEDULE EVERY 1 DAY
STARTS CURRENT_TIMESTAMP
DO
    CALL UpdateCodeStatuses();

-- ============================================
-- TRIGGERS PARA LOGS AUTOMÁTICOS
-- ============================================

DELIMITER //
CREATE TRIGGER AfterCodeInsert
AFTER INSERT ON access_codes
FOR EACH ROW
BEGIN
    INSERT INTO system_logs (log_type, module, action, description, user_id, username)
    VALUES ('action', 'codes', 'code_created', 
            CONCAT('Código criado: ', NEW.code, ' - Time: ', NEW.team_name),
            NEW.created_by, 
            (SELECT username FROM administrators WHERE id = NEW.created_by LIMIT 1));
END //

CREATE TRIGGER AfterCodeUse
AFTER UPDATE ON access_codes
FOR EACH ROW
BEGIN
    IF NEW.current_uses > OLD.current_uses THEN
        INSERT INTO system_logs (log_type, module, action, description)
        VALUES ('info', 'codes', 'code_used', 
                CONCAT('Código usado: ', NEW.code, ' - Usos: ', NEW.current_uses, '/', NEW.max_uses));
    END IF;
END //
DELIMITER ;

-- ============================================
-- ADICIONAR APÓS OS TRIGGERS EXISTENTES
-- ============================================

DELIMITER //
CREATE TRIGGER BeforeCodeInsert
BEFORE INSERT ON access_codes
FOR EACH ROW
BEGIN
    -- Garantir que expires_at seja calculado se não fornecido
    IF NEW.expires_at IS NULL THEN
        SET NEW.expires_at = DATE_ADD(NOW(), INTERVAL NEW.validity_days DAY);
    END IF;
    
    -- Garantir que creator_name seja preenchido
    IF NEW.created_by IS NOT NULL AND NEW.creator_name IS NULL THEN
        SET NEW.creator_name = (SELECT username FROM administrators WHERE id = NEW.created_by LIMIT 1);
    END IF;
END //

CREATE TRIGGER BeforeCodeUpdate
BEFORE UPDATE ON access_codes
FOR EACH ROW
BEGIN
    -- Se mudar validity_days, recalcular expires_at
    IF NEW.validity_days != OLD.validity_days THEN
        SET NEW.expires_at = DATE_ADD(OLD.created_at, INTERVAL NEW.validity_days DAY);
    END IF;
END //
DELIMITER ;