import api from './client';

export const getPublishedPosts = async (): Promise<any[]> =>
  (await api.get('/blog/')).data;

export const getPost = async (id: number): Promise<any> =>
  (await api.get(`/blog/${id}`)).data;

export const getAllPosts = async (): Promise<any[]> =>
  (await api.get('/blog/manage')).data;

export const createPost = async (data: Record<string, any>): Promise<any> =>
  (await api.post('/blog/', data)).data;

export const updatePost = async (id: number, data: Record<string, any>): Promise<any> =>
  (await api.put(`/blog/${id}`, data)).data;

export const deletePost = async (id: number): Promise<void> =>
  api.delete(`/blog/${id}`);
