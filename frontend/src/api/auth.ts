import api from './client';
import type { User } from '../types';

export async function login(username: string, password: string): Promise<void> {
  const form = new URLSearchParams();
  form.append('username', username);
  form.append('password', password);
  await api.post('/auth/login', form, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout');
}

export async function getMe(): Promise<User> {
  return (await api.get('/auth/me')).data;
}

export async function checkInvite(invite_code: string): Promise<void> {
  await api.post('/auth/check-invite', { invite_code });
}

export async function sendVerificationCode(data: {
  invite_code: string;
  first_name: string;
  last_name: string;
  email: string;
}): Promise<void> {
  await api.post('/auth/send-code', data);
}

export async function verifyCode(email: string, code: string): Promise<void> {
  await api.post('/auth/verify-code', { email, code });
}

export async function register(data: {
  email: string;
  password: string;
  avatar?: string | null;
}): Promise<User> {
  return (await api.post('/auth/register', data)).data;
}

export async function updateMe(data: {
  avatar?: string | null;
  current_password?: string;
  new_password?: string;
}): Promise<User> {
  return (await api.patch('/auth/me', data)).data;
}

export async function requestMagicLink(email: string): Promise<void> {
  await api.post('/auth/magic-link', { email });
}

export async function verifyMagicLink(token: string): Promise<void> {
  await api.get('/auth/magic-link/verify', { params: { token } });
}
