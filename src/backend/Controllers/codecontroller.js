const Code = require('../models/Code');

class CodeController {
    static async generateCode(req, res) {
        try {
            const {
                team_name,
                coach_name,
                coach_email,
                coach_phone,
                expires_in_days = 7,
                max_uses = 1,
                notes
            } = req.body;

            if (!team_name) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Nome do time é obrigatório' 
                });
            }

            // Gerar código único com timestamp
            const timestamp = Date.now().toString(36).toUpperCase();
            const random = Math.random().toString(36).substring(2, 7).toUpperCase();
            const code = `WILDCLASH-${timestamp}-${random}`;

            const codeData = {
                code,
                team_name,
                coach_name: coach_name || null,
                coach_email: coach_email || null,
                coach_phone: coach_phone || null,
                created_by: req.userId,
                expires_in_days: parseInt(expires_in_days),
                max_uses: parseInt(max_uses),
                notes: notes || null
            };

            const newCode = await Code.create(codeData);

            // Log da criação
            await Code.logAction(req.userId, 'code_created', {
                code: newCode.code,
                team_name: newCode.team_name
            });

            res.status(201).json({
                success: true,
                message: 'Código gerado com sucesso',
                data: newCode
            });
        } catch (error) {
            console.error('Erro ao gerar código:', error);
            res.status(500).json({ 
                success: false, 
                error: 'Erro ao gerar código' 
            });
        }
    }

    static async getCode(req, res) {
        try {
            const { id } = req.params;

            const code = await Code.findById(id);

            if (!code) {
                return res.status(404).json({ 
                    success: false, 
                    error: 'Código não encontrado' 
                });
            }

            res.json({
                success: true,
                data: code
            });
        } catch (error) {
            console.error('Erro ao buscar código:', error);
            res.status(500).json({ 
                success: false, 
                error: 'Erro ao buscar código' 
            });
        }
    }

    static async validateCode(req, res) {
        try {
            const { code } = req.params;

            if (!code) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Código não fornecido' 
                });
            }

            const validation = await Code.validateCode(code.toUpperCase());

            if (!validation.valid) {
                return res.status(400).json({ 
                    success: false, 
                    error: validation.error 
                });
            }

            res.json({
                success: true,
                message: 'Código válido',
                data: validation.data
            });
        } catch (error) {
            console.error('Erro ao validar código:', error);
            res.status(500).json({ 
                success: false, 
                error: 'Erro ao validar código' 
            });
        }
    }

    static async useCode(req, res) {
        try {
            const { code } = req.params;
            const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
            const userAgent = req.get('User-Agent');

            const validation = await Code.validateCode(code.toUpperCase());

            if (!validation.valid) {
                return res.status(400).json({ 
                    success: false, 
                    error: validation.error 
                });
            }

            await Code.useCode(validation.data.id, ip, userAgent);

            res.json({
                success: true,
                message: 'Código utilizado com sucesso'
            });
        } catch (error) {
            console.error('Erro ao usar código:', error);
            res.status(500).json({ 
                success: false, 
                error: 'Erro ao usar código' 
            });
        }
    }

    static async listCodes(req, res) {
        try {
            const { 
                page = 1, 
                limit = 10,
                search,
                status,
                sort_by = 'created_at',
                sort_order = 'DESC'
            } = req.query;

            const offset = (page - 1) * limit;
            
            const filters = {};
            if (search) filters.search = search;
            if (status) filters.status = status;
            if (sort_by) filters.sort_by = sort_by;
            if (sort_order) filters.sort_order = sort_order;

            const codes = await Code.getAll(parseInt(limit), parseInt(offset), filters);
            const stats = await Code.getStats();

            res.json({
                success: true,
                data: codes,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: stats.total_codes || 0,
                    total_pages: Math.ceil((stats.total_codes || 0) / limit)
                },
                stats: {
                    total_codes: stats.total_codes || 0,
                    available_codes: stats.available_codes || 0,
                    used_codes: stats.used_codes || 0,
                    expired_codes: stats.expired_codes || 0,
                    total_usages: stats.total_usages || 0
                }
            });
        } catch (error) {
            console.error('Erro ao listar códigos:', error);
            res.status(500).json({ 
                success: false, 
                error: 'Erro ao listar códigos' 
            });
        }
    }

    static async updateCode(req, res) {
        try {
            const { id } = req.params;
            const updateData = req.body;

            // Verificar se o código existe
            const code = await Code.findById(id);
            if (!code) {
                return res.status(404).json({ 
                    success: false, 
                    error: 'Código não encontrado' 
                });
            }

            // Atualizar código
            const updated = await Code.update(id, updateData);

            // Log da atualização
            await Code.logAction(req.userId, 'code_updated', {
                code_id: id,
                changes: updateData
            });

            res.json({
                success: true,
                message: 'Código atualizado com sucesso',
                data: updated
            });
        } catch (error) {
            console.error('Erro ao atualizar código:', error);
            res.status(500).json({ 
                success: false, 
                error: 'Erro ao atualizar código' 
            });
        }
    }

    static async deleteCode(req, res) {
        try {
            const { id } = req.params;

            // Verificar se o código existe
            const code = await Code.findById(id);
            if (!code) {
                return res.status(404).json({ 
                    success: false, 
                    error: 'Código não encontrado' 
                });
            }

            const deleted = await Code.deleteCode(id);

            // Log da exclusão
            await Code.logAction(req.userId, 'code_deleted', {
                code: code.code,
                team_name: code.team_name
            });

            res.json({
                success: true,
                message: 'Código deletado com sucesso'
            });
        } catch (error) {
            console.error('Erro ao deletar código:', error);
            res.status(500).json({ 
                success: false, 
                error: 'Erro ao deletar código' 
            });
        }
    }

    static async exportCodes(req, res) {
        try {
            const codes = await Code.getAll(1000, 0, {});

            // Converter para CSV
            const headers = ['Código', 'Time', 'Treinador', 'Email', 'Dias Validade', 'Usos', 'Status', 'Criado em', 'Expira em'];
            const csvRows = [];
            
            csvRows.push(headers.join(','));
            
            codes.forEach(code => {
                const row = [
                    `"${code.code}"`,
                    `"${code.team_name}"`,
                    `"${code.coach_name || ''}"`,
                    `"${code.coach_email || ''}"`,
                    code.validity_days,
                    `${code.current_uses}/${code.max_uses}`,
                    code.status,
                    `"${new Date(code.created_at).toISOString()}"`,
                    `"${new Date(code.expires_at).toISOString()}"`
                ];
                csvRows.push(row.join(','));
            });

            const csvString = csvRows.join('\n');

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=wildclash-codes-${Date.now()}.csv`);
            res.send(csvString);

            // Log da exportação
            await Code.logAction(req.userId, 'codes_exported', {
                count: codes.length
            });

        } catch (error) {
            console.error('Erro ao exportar códigos:', error);
            res.status(500).json({ 
                success: false, 
                error: 'Erro ao exportar códigos' 
            });
        }
    }

    static async getDashboardStats(req, res) {
        try {
            const stats = await Code.getDashboardStats();

            res.json({
                success: true,
                data: stats
            });
        } catch (error) {
            console.error('Erro ao buscar estatísticas:', error);
            res.status(500).json({ 
                success: false, 
                error: 'Erro ao buscar estatísticas' 
            });
        }
    }
}

module.exports = CodeController;