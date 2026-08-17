import { Router } from 'express';
import * as jobcardController from '../controllers/jobcard.controller';

const router = Router();

router.get('/', jobcardController.getJobCards);
router.get('/:id', jobcardController.getJobCardById);
router.post('/', jobcardController.createJobCard);
router.put('/:id', jobcardController.updateJobCard);

router.post('/:id/services', jobcardController.addServiceToJobCard);
router.delete('/:id/services/:serviceId', jobcardController.removeServiceFromJobCard);

export default router;
