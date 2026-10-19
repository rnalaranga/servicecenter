import { Router } from 'express';
import { getUsers, createUser, updateUser, toggleUserStatus, loginUser } from '../controllers/user.controller';

const router = Router();

router.post('/login', loginUser);
router.get('/', getUsers);
router.post('/', createUser);
router.put('/:id', updateUser);
router.patch('/:id/status', toggleUserStatus);

export default router;
