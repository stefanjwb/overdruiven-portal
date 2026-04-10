import api from './client';

export const getPaymentInfo = async (activityId: number) =>
  (await api.get(`/payments/info/${activityId}`)).data;

export const confirmPayment = async (activityId: number, guestNames: string[] = []) =>
  api.post(`/payments/confirm/${activityId}`, { guest_names: guestNames });

export const getPaymentStatus = async (activityId: number) =>
  (await api.get(`/payments/status/${activityId}`)).data;
