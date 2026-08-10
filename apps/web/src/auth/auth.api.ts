import { httpClient } from '@/lib/httpClient';
import type { AuthUser } from './auth.store';

export interface LoginPayload {
  email: string;
  senha: string;
}

export interface LoginResponse {
  accessToken: string;
  usuario: AuthUser;
}

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const { data } = await httpClient.post<LoginResponse>('/auth/login', payload);
  return data;
}

export async function me(): Promise<AuthUser> {
  const { data } = await httpClient.get<AuthUser>('/auth/me');
  return data;
}
