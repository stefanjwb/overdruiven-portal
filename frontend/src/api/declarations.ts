import api from './client';

export const submitDeclaration = async (data: Record<string, any>) =>
  (await api.post('/declarations/', data)).data;

export const getMyDeclarations = async () =>
  (await api.get('/declarations/me')).data;

export const getAdminDeclarations = async () =>
  (await api.get('/declarations/')).data;

export const updateDeclarationStatus = async (id: number, status: string, admin_note?: string) =>
  (await api.put(`/declarations/${id}/status`, { status, admin_note })).data;

export const deleteDeclaration = async (id: number) =>
  api.delete(`/declarations/${id}`);
