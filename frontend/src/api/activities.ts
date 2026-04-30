import api from './client';

export const getUpcomingActivities = async (): Promise<any[]> =>
  (await api.get('/activities/')).data;

export const getPublicActivities = async (): Promise<any[]> =>
  (await api.get('/public/')).data;

export const getActivity = async (id: number): Promise<any> =>
  (await api.get(`/activities/${id}`)).data;

export const getActivitySignups = async (id: number): Promise<any[]> =>
  (await api.get(`/activities/${id}/signups`)).data;

export const getMySignups = async (): Promise<number[]> =>
  (await api.get('/signups/me')).data;

export const signupForActivity = async (activityId: number, guestNames: string[] = []): Promise<void> =>
  api.post(`/signups/${activityId}`, { guest_names: guestNames });

export const cancelSignup = async (activityId: number): Promise<void> =>
  api.delete(`/signups/me/${activityId}`);

export const sendContactForm = async (data: { name: string; email: string; message: string; website: string }): Promise<void> =>
  api.post('/public/contact', data);
