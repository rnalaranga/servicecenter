import { api } from './client';

export type ReminderStatus = 'PENDING' | 'CONTACTED' | 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';

export interface ReminderFollowup {
  id: number;
  reminderId: number;
  contactDate: string;
  channel: 'PHONE' | 'WHATSAPP' | 'SMS' | 'IN_PERSON';
  contacted: boolean;
  response: string;
  scheduledDate?: string | null;
  notes?: string | null;
  createdBy?: { id: number; fullName: string };
  createdAt: string;
}

export interface MaintenanceReminder {
  id: number;
  jobCardId?: number | null;
  customerId: number;
  vehicleId: number;
  serviceName: string;
  reminderDate: string;
  intervalLabel: string;
  status: ReminderStatus;
  scheduledDate?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;

  customer?: { id: number; code: string; name: string; mobile: string; email?: string | null };
  vehicle?: { id: number; registration: string; make: string; model: string; colour?: string | null };
  jobCard?: { id: number; jobNumber: string; date: string } | null;
  followups?: ReminderFollowup[];
  latestFollowup?: ReminderFollowup | null;
  isOverdue?: boolean;
  isDueToday?: boolean;
  isDueThisWeek?: boolean;
}

export interface CreateReminderPayload {
  jobCardId?: number | null;
  customerId: number;
  vehicleId: number;
  serviceName: string;
  preset: 'SINGLE' | 'COATING_5YR' | 'GENERAL_MAINTENANCE' | 'CUSTOM';
  startDate?: string;
  reminderDate?: string;
  intervalLabel?: string;
  notes?: string;
  customIntervals?: {
    reminderDate: string;
    intervalLabel: string;
    serviceName?: string;
  }[];
}

export interface AddFollowupPayload {
  channel: 'PHONE' | 'WHATSAPP' | 'SMS' | 'IN_PERSON';
  contacted: boolean;
  response: string;
  scheduledDate?: string | null;
  notes?: string | null;
}

export const getReminders = async (params?: {
  status?: string;
  timeframe?: string;
  search?: string;
  customerId?: number;
  vehicleId?: number;
}): Promise<MaintenanceReminder[]> => {
  const { data } = await api.get('/reminders', { params });
  return data;
};

export const getReminder = async (id: number | string): Promise<MaintenanceReminder> => {
  const { data } = await api.get(`/reminders/${id}`);
  return data;
};

export const createReminderSchedule = async (payload: CreateReminderPayload): Promise<any> => {
  const { data } = await api.post('/reminders', payload);
  return data;
};

export const updateReminder = async (id: number | string, payload: Partial<MaintenanceReminder>): Promise<MaintenanceReminder> => {
  const { data } = await api.put(`/reminders/${id}`, payload);
  return data;
};

export const deleteReminder = async (id: number | string): Promise<{ message: string }> => {
  const { data } = await api.delete(`/reminders/${id}`);
  return data;
};

export const addReminderFollowup = async (id: number | string, payload: AddFollowupPayload): Promise<any> => {
  const { data } = await api.post(`/reminders/${id}/followups`, payload);
  return data;
};
