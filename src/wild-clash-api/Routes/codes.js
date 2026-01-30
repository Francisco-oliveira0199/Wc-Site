const express = require('express');
const router = express.Router();
const CodeController = require('../controllers/codeController');
const authMiddleware = require('../middleware/auth');

// Rotas públicas
router.get('/validate/:code', CodeController.validateCode);
router.post('/use/:code', CodeController.useCode);

// Rotas protegidas (admin)
router.use(authMiddleware); // Todas as rotas abaixo requerem autenticação

router.post('/generate', CodeController.generateCode);
router.get('/list', CodeController.listCodes);
router.get('/:id', CodeController.getCode);
router.put('/:id', CodeController.updateCode);
router.delete('/:id', CodeController.deleteCode);
router.get('/export/csv', CodeController.exportCodes);
router.get('/dashboard/stats', CodeController.getDashboardStats);

module.exports = router;