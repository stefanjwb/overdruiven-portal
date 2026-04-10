import api from './client';
import type { User, InviteCode } from '../types';

export const getUsers         = async (): Promise<User[]> => (await api.get('/admin/users')).data;
export const updateUser       = async (id: number, p: Record<string, string>) => (await api.put(`/admin/users/${id}`, p)).data;
export const deleteUser       = async (id: number) => api.delete(`/admin/users/${id}`);
export const getInviteCodes   = async (): Promise<InviteCode[]> => (await api.get('/admin/invite-codes')).data;
export const createInviteCode = async (role: string): Promise<InviteCode> => (await api.post('/admin/invite-codes', { role })).data;
export const deleteInviteCode = async (id: number) => api.delete(`/admin/invite-codes/${id}`);
export const getAdminActivities = async (): Promise<any[]> => (await api.get('/admin/activities')).data;
export const getOrganizers = async (): Promise<{id: number; username: string}[]> => (await api.get('/activities/organizers')).data;
export const getAdminPayments = async (): Promise<any[]> => (await api.get('/admin/payments')).data;
export const approvePayment = async (id: number) => api.post(`/payments/approve/${id}`);
export const rejectPayment = async (id: number) => api.post(`/payments/reject/${id}`);
export const createActivity = async (data: Record<string, any>) => (await api.post('/activities/', data)).data;
export const updateActivity = async (id: number, data: Record<string, any>) => (await api.put(`/activities/${id}`, data)).data;
export const deleteActivity = async (id: number) => api.delete(`/activities/${id}`);

export const adminAddSignup      = async (activityId: number, userId: number) => (await api.post(`/admin/signups/${activityId}`, { user_id: userId })).data;

export const getStatistics       = async (): Promise<any[]> => (await api.get('/admin/statistics')).data;

export const getInventory        = async (): Promise<any[]> => (await api.get('/inventory/')).data;
export const createInventoryItem = async (data: Record<string, any>) => (await api.post('/inventory/', data)).data;
export const updateInventoryItem = async (id: number, data: Record<string, any>) => (await api.put(`/inventory/${id}`, data)).data;
export const deleteInventoryItem = async (id: number) => api.delete(`/inventory/${id}`);
