import api from './client';

export const getPaymentInfo = async (activityId: number) =>
  (await api.get(`/payments/info/${activityId}`)).data;

export const confirmPayment = async (activityId: number, guestNames: string[] = [], eatsAlong: boolean = true, guestEats: boolean[] = []) =>
  api.post(`/payments/confirm/${activityId}`, { guest_names: guestNames, eats_along: eatsAlong, guest_eats: guestEats });

export const getPaymentStatus = async (activityId: number) =>
  (await api.get(`/payments/status/${activityId}`)).data;
