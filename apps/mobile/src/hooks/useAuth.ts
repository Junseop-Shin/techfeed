import { useMutation } from '@tanstack/react-query';
import { login, signup } from '../api/auth';
import { useAuthStore } from '../store/auth.store';

export const useLogin = () => {
  const { login: storeLogin } = useAuthStore();

  return useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      storeLogin(data.token, data.user);
    },
  });
};

export const useSignup = () => {
  const { login: storeLogin } = useAuthStore();

  return useMutation({
    mutationFn: signup,
    onSuccess: (data) => {
      storeLogin(data.token, data.user);
    },
  });
};
