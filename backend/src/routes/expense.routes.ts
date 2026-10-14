import { Router } from 'express';
import { getExpenses, getExpenseCategories, createExpense, createExpenseCategory, deleteExpense } from '../controllers/expense.controller';

const router = Router();

router.get('/categories', getExpenseCategories);
router.post('/categories', createExpenseCategory);

router.get('/', getExpenses);
router.post('/', createExpense);
router.delete('/:id', deleteExpense);

export default router;
