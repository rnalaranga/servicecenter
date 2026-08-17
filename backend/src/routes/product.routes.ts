import { Router } from 'express';
import * as productController from '../controllers/product.controller';

const router = Router();

// Sub-resources first
router.get('/categories', productController.getCategories);
router.get('/units', productController.getUnits);

// Products CRUD
router.get('/', productController.getProducts);
router.post('/', productController.createProduct);
router.get('/:id', productController.getProductById);
router.put('/:id', productController.updateProduct);

export default router;
