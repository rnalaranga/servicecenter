import { api } from './client';
import type { User } from './users';

export interface AuditLog {
  id: number;
  userId: number | null;
  action: string;
  module: string;
  recordId: number | null;
  recordRef: string | null;
  oldValue: string | null;
  newValue: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  user: Pick<User, 'id' | 'username' | 'fullName'> | null;
}

export const getAuditLogs = async (params?: { module?: string, action?: string, userId?: number, search?: string }): Promise<AuditLog[]> => {
  const searchParams = new URLSearchParams();
  if (params?.module) searchParams.append('module', params.module);
  if (params?.action) searchParams.append('action', params.action);
  if (params?.userId) searchParams.append('userId', params.userId.toString());
  if (params?.search) searchParams.append('search', params.search);
  
  const { data } = await api.get(`/system/audit-logs?${searchParams.toString()}`);
  return data;
};

export const getSettings = async (): Promise<Record<string, string>> => {
  const { data } = await api.get('/system/settings');
  return data;
};

export const updateSettings = async (settings: Record<string, { value: string, group: string }>): Promise<{ message: string }> => {
  const { data } = await api.put('/system/settings', settings);
  return data;
};
