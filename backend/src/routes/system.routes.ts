import { Router } from 'express';
import { getAuditLogs, getSettings, updateSettings, fixDatabase } from '../controllers/system.controller';

const router = Router();

router.get('/audit-logs', getAuditLogs);
router.get('/settings', getSettings);
router.put('/settings', updateSettings);
router.post('/fix-database', fixDatabase);

export default router;
