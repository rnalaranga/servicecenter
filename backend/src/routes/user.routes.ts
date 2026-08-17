import { Router } from 'express';
import { getUsers, createUser, updateUser, toggleUserStatus } from '../controllers/user.controller';

const router = Router();

router.get('/', getUsers);
router.post('/', createUser);
router.put('/:id', updateUser);
router.patch('/:id/status', toggleUserStatus);

export default router;
