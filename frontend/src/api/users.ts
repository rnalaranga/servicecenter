import { api } from './client';

export interface User {
  id: number;
  username: string;
  email: string;
  fullName: string;
  role: string;
  phone?: string;
  avatar?: string;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}

export const getUsers = async (): Promise<User[]> => {
  const { data } = await api.get('/users');
  return data;
};

export const createUser = async (user: Partial<User> & { password?: string }): Promise<User> => {
  const { data } = await api.post('/users', user);
  return data;
};

export const updateUser = async (id: number, user: Partial<User> & { password?: string }): Promise<User> => {
  const { data } = await api.put(`/users/${id}`, user);
  return data;
};

export const toggleUserStatus = async (id: number, isActive: boolean): Promise<User> => {
  const { data } = await api.patch(`/users/${id}/status`, { isActive });
  return data;
};
