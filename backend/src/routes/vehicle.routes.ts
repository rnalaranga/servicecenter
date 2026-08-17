import { Router } from 'express';
import { getVehicles, getVehicleById, getVehiclesByCustomerId, createVehicle, updateVehicle } from '../controllers/vehicle.controller';

const router = Router();

router.get('/', getVehicles);
router.post('/', createVehicle);
router.get('/:id', getVehicleById);
router.put('/:id', updateVehicle);
router.get('/customer/:customerId', getVehiclesByCustomerId);

export default router;
