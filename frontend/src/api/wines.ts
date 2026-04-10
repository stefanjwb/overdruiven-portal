import api from './client';

export const getWinesForActivity = async (activityId: number): Promise<any[]> =>
  (await api.get(`/wines/activity/${activityId}`)).data;

export const createWine = async (data: Record<string, any>): Promise<any> =>
  (await api.post('/wines/', data)).data;

export const updateWine = async (id: number, data: Record<string, any>): Promise<any> =>
  (await api.put(`/wines/${id}`, data)).data;

export const deleteWine = async (id: number): Promise<void> =>
  api.delete(`/wines/${id}`);

export const updatePersonalNote = async (wineId: number, data: { personal_note?: string; rating?: number }): Promise<any> =>
  (await api.put(`/wines/${wineId}/note`, data)).data;

export const getMyLibrary = async (): Promise<any[]> =>
  (await api.get('/wines/library/me')).data;

export const getHomepageWines = async (): Promise<any[]> =>
  (await api.get('/wines/homepage')).data;

export const getAllWinesAdmin = async (): Promise<any[]> =>
  (await api.get('/wines/library/all')).data;

export const getAllLibrary = async (): Promise<any[]> =>
  (await api.get('/wines/library/all')).data;
