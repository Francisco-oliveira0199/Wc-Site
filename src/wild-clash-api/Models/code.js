const db = require('../database');

class Code {
    static async create(codeData) {
        const {
            code,
            team_name,
            coach_name = null,
            coach_email = null,
            coach_phone = null,
            created_by = null,
            expires_in_days = 7,
            max_uses = 1,
            notes = null
        } = codeData;

        const expires_at = new Date();
        expires_at.setDate(expires_at.getDate() + parseInt(expires_in_days));

        // Buscar nome do criador
        let creator_name = null;
        if (created_by) {
            const [creator] = await db.query('SELECT username FROM administrators WHERE id = ?', [created_by]);
            creator_name = creator[0]?.username || null;
        }

        const sql = `
            INSERT INTO access_codes 
            (code, team_name, coach_name, coach_email, coach_phone, created_by, creator_name, expires_at, max_uses, notes, validity_days)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const result = await db.query(sql, [
            code,
            team_name,
            coach_name,
            coach_email,
            coach_phone,
            created_by,
            creator_name,
            expires_at,
            max_uses,
            notes,
            expires_in_days
        ]);

        return { 
            id: result.insertId, 
            code, 
            team_name,
            coach_name,
            coach_email,
            coach_phone,
            validity_days: expires_in_days,
            max_uses,
            expires_at,
            created_at: new Date(),
            status: 'active'
        };
    }

    static async findById(id) {
        const sql = `
            SELECT ac.*, 
            a.username as created_by_username,
            (ac.current_uses >= ac.max_uses) as is_max_used,
            (ac.expires_at < NOW()) as is_expired,
            CASE 
                WHEN ac.expires_at < NOW() THEN 'expired'
                WHEN ac.current_uses >= ac.max_uses THEN 'used'
                ELSE 'active'
            END as status
            FROM access_codes ac
            LEFT JOIN administrators a ON ac.created_by = a.id
            WHERE ac.id = ? AND ac.is_active = TRUE
        `;
        
        const results = await db.query(sql, [id]);
        return results[0] || null;
    }

    static async findByCode(code) {
        const sql = `
            SELECT *, 
            (current_uses >= max_uses) as is_max_used,
            (expires_at < NOW()) as is_expired,
            CASE 
                WHEN expires_at < NOW() THEN 'expired'
                WHEN current_uses >= max_uses THEN 'used'
                ELSE 'active'
            END as status
            FROM access_codes 
            WHERE code = ? AND is_active = TRUE
        `;
        
        const results = await db.query(sql, [code]);
        return results[0] || null;
    }

    static async validateCode(code) {
        const codeData = await this.findByCode(code);
        
        if (!codeData) {
            return { valid: false, error: 'Código não encontrado' };
        }

        if (!codeData.is_active) {
            return { valid: false, error: 'Código desativado' };
        }

        if (codeData.is_expired) {
            return { valid: false, error: 'Código expirado' };
        }

        if (codeData.is_max_used) {
            return { valid: false, error: 'Código já utilizado o número máximo de vezes' };
        }

        if (codeData.status === 'cancelled') {
            return { valid: false, error: 'Código cancelado' };
        }

        return { 
            valid: true, 
            data: {
                id: codeData.id,
                code: codeData.code,
                team_name: codeData.team_name,
                coach_name: codeData.coach_name,
                coach_email: codeData.coach_email,
                expires_at: codeData.expires_at,
                max_uses: codeData.max_uses,
                current_uses: codeData.current_uses,
                validity_days: codeData.validity_days
            }
        };
    }

    static async useCode(codeId, ip = null, userAgent = null) {
        const connection = await db.getConnection();
        
        try {
            await connection.beginTransaction();

            // Buscar informações do dispositivo
            const deviceInfo = userAgent || '';
            const browser = this.extractBrowser(userAgent);
            const platform = this.extractPlatform(userAgent);

            // Atualizar uso do código
            const updateSql = `
                UPDATE access_codes 
                SET current_uses = current_uses + 1,
                    used_at = CASE WHEN current_uses = 0 THEN NOW() ELSE used_at END,
                    is_used = CASE WHEN (current_uses + 1) >= max_uses THEN TRUE ELSE is_used END,
                    status = CASE 
                        WHEN (current_uses + 1) >= max_uses THEN 'used'
                        ELSE status
                    END
                WHERE id = ? AND current_uses < max_uses
            `;

            const [updateResult] = await connection.execute(updateSql, [codeId]);
            
            if (updateResult.affectedRows === 0) {
                throw new Error('Não foi possível usar o código');
            }

            // Registrar log de uso
            const logSql = `
                INSERT INTO code_usage_logs (code_id, code, ip_address, user_agent, device_info, browser, platform)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `;
            
            const [codeData] = await connection.execute('SELECT code FROM access_codes WHERE id = ?', [codeId]);
            
            await connection.execute(logSql, [
                codeId, 
                codeData[0].code, 
                ip, 
                userAgent, 
                deviceInfo, 
                browser, 
                platform
            ]);
            
            await connection.commit();
            
            return true;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async getAll(limit = 50, offset = 0, filters = {}) {
        let sql = `
            SELECT ac.*, a.username as created_by_username,
            (ac.current_uses >= ac.max_uses) as is_max_used,
            (ac.expires_at < NOW()) as is_expired,
            CASE 
                WHEN ac.status = 'cancelled' THEN 'cancelled'
                WHEN ac.expires_at < NOW() THEN 'expired'
                WHEN ac.current_uses >= ac.max_uses THEN 'used'
                ELSE 'active'
            END as calculated_status
            FROM access_codes ac
            LEFT JOIN administrators a ON ac.created_by = a.id
            WHERE ac.is_active = TRUE
        `;
        
        const params = [];
        
        // Aplicar filtros
        if (filters.status) {
            if (filters.status === 'available') {
                sql += ` AND ac.expires_at > NOW() AND ac.current_uses < ac.max_uses AND ac.status = 'active'`;
            } else if (filters.status === 'used') {
                sql += ` AND (ac.current_uses >= ac.max_uses OR ac.status = 'used')`;
            } else if (filters.status === 'expired') {
                sql += ` AND (ac.expires_at <= NOW() OR ac.status = 'expired')`;
            } else {
                sql += ` AND ac.status = ?`;
                params.push(filters.status);
            }
        }
        
        if (filters.search) {
            sql += ` AND (
                ac.code LIKE ? OR 
                ac.team_name LIKE ? OR 
                ac.coach_name LIKE ? OR 
                ac.coach_email LIKE ? OR
                ac.coach_phone LIKE ?
            )`;
            const searchTerm = `%${filters.search}%`;
            for (let i = 0; i < 5; i++) {
                params.push(searchTerm);
            }
        }
        
        // Ordenação
        const sortBy = filters.sort_by || 'created_at';
        const sortOrder = (filters.sort_order || 'DESC').toUpperCase();
        sql += ` ORDER BY ${sortBy} ${sortOrder}`;
        
        // Paginação
        if (limit) {
            sql += ` LIMIT ? OFFSET ?`;
            params.push(limit, offset);
        }
        
        return await db.query(sql, params);
    }

    static async getStats() {
        const sql = `
            SELECT 
                COUNT(*) as total_codes,
                SUM(CASE WHEN status = 'active' AND expires_at > NOW() AND current_uses < max_uses THEN 1 ELSE 0 END) as available_codes,
                SUM(CASE WHEN status = 'used' OR current_uses >= max_uses THEN 1 ELSE 0 END) as used_codes,
                SUM(CASE WHEN status = 'expired' OR expires_at <= NOW() THEN 1 ELSE 0 END) as expired_codes,
                SUM(current_uses) as total_usages
            FROM access_codes
            WHERE is_active = TRUE
        `;
        
        const results = await db.query(sql);
        return results[0] || {};
    }

    static async getDashboardStats() {
        const sql = `
            SELECT 
                -- Estatísticas gerais
                (SELECT COUNT(*) FROM access_codes WHERE is_active = TRUE) as total_codes,
                (SELECT COUNT(*) FROM access_codes WHERE is_active = TRUE AND status = 'active' AND expires_at > NOW()) as active_codes,
                (SELECT COUNT(*) FROM access_codes WHERE is_active = TRUE AND status = 'used') as used_codes,
                (SELECT COUNT(*) FROM access_codes WHERE is_active = TRUE AND status = 'expired') as expired_codes,
                
                -- Usos recentes (últimos 7 dias)
                (SELECT COUNT(*) FROM code_usage_logs WHERE used_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)) as recent_usages,
                
                -- Códigos prestes a expirar (próximos 3 dias)
                (SELECT COUNT(*) FROM access_codes WHERE is_active = TRUE AND status = 'active' AND expires_at BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 3 DAY)) as expiring_soon,
                
                -- Top times
                (SELECT COUNT(DISTINCT team_name) FROM access_codes WHERE is_active = TRUE) as unique_teams,
                
                -- Taxa de uso
                (SELECT ROUND(SUM(current_uses) * 100.0 / SUM(max_uses), 2) FROM access_codes WHERE is_active = TRUE) as usage_rate
        `;
        
        const results = await db.query(sql);
        return results[0] || {};
    }

    static async update(id, updateData) {
        const fields = [];
        const values = [];
        
        Object.keys(updateData).forEach(key => {
            if (key !== 'id') {
                fields.push(`${key} = ?`);
                values.push(updateData[key]);
            }
        });
        
        values.push(id);
        
        const sql = `UPDATE access_codes SET ${fields.join(', ')} WHERE id = ?`;
        await db.query(sql, values);
        
        return await this.findById(id);
    }

    static async deleteCode(id) {
        // Soft delete (marcar como inativo)
        const sql = `UPDATE access_codes SET is_active = FALSE, status = 'cancelled' WHERE id = ?`;
        const result = await db.query(sql, [id]);
        return result.affectedRows > 0;
    }

    static async logAction(userId, action, metadata = {}) {
        try {
            let username = null;
            if (userId) {
                const [user] = await db.query('SELECT username FROM administrators WHERE id = ?', [userId]);
                username = user[0]?.username || null;
            }
            
            const sql = `
                INSERT INTO system_logs (log_type, module, action, description, user_id, username, metadata)
                VALUES (?, 'codes', ?, ?, ?, ?, ?)
            `;
            
            await db.query(sql, [
                'action',
                action,
                `Ação executada: ${action}`,
                userId,
                username,
                JSON.stringify(metadata)
            ]);
        } catch (error) {
            console.error('Erro ao registrar log:', error);
        }
    }

    static extractBrowser(userAgent) {
        if (!userAgent) return 'Desconhecido';
        
        if (userAgent.includes('Chrome')) return 'Chrome';
        if (userAgent.includes('Firefox')) return 'Firefox';
        if (userAgent.includes('Safari')) return 'Safari';
        if (userAgent.includes('Edge')) return 'Edge';
        if (userAgent.includes('Opera')) return 'Opera';
        
        return 'Outro';
    }

    static extractPlatform(userAgent) {
        if (!userAgent) return 'Desconhecido';
        
        if (userAgent.includes('Windows')) return 'Windows';
        if (userAgent.includes('Mac OS')) return 'macOS';
        if (userAgent.includes('Linux')) return 'Linux';
        if (userAgent.includes('Android')) return 'Android';
        if (userAgent.includes('iOS') || userAgent.includes('iPhone')) return 'iOS';
        
        return 'Outro';
    }
}

module.exports = Code;