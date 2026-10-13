import axiosClient from './axiosClient';
import { LoginRequest, LoginResponse } from '../types';

export const authApi = {
  login: (data: LoginRequest) => axiosClient.post<LoginResponse>('/auth/login', data),
};