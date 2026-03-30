import { apiClient } from './client';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  name?: string;
  agreed_terms: boolean;
}

export interface AuthResponse {
  access_token: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
}

export const login = (data: LoginRequest): Promise<AuthResponse> =>
  apiClient.post('/auth/login', data).then((r) => r.data);

export const signup = (data: SignupRequest): Promise<AuthResponse> =>
  apiClient.post('/auth/signup', data).then((r) => r.data);

export const googleLogin = (accessToken: string): Promise<AuthResponse> =>
  apiClient.post('/auth/google', { access_token: accessToken }).then((r) => r.data);
