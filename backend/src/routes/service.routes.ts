import { Router } from 'express';
import * as serviceController from '../controllers/service.controller';

const router = Router();

// Sub-resources
router.get('/categories', serviceController.getServiceCategories);

// Services CRUD
router.get('/', serviceController.getServices);
router.post('/', serviceController.createService);
router.get('/:id', serviceController.getServiceById);
router.put('/:id', serviceController.updateService);

export default router;
