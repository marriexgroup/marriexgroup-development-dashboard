import { postData } from "@/lib/fetch-util";
import type { SignupFormData } from "@/routes/auth/sign-up";
import { useMutation } from "@tanstack/react-query";

export const useSignUpMutation = () => {
  return useMutation({
    mutationFn: (data: SignupFormData) => postData("/auth/register", data),
  });
};

export const useVerifyEmailMutation = () => {
  return useMutation({
    mutationFn: (data: { token: string }) =>
      postData("/auth/verify-email", data),
  });
};

export const useLoginMutation = () => {
  return useMutation({
    mutationFn: (data: { email: string; password: string }) =>
      postData("/auth/login", data),
  });
};

export const useForgotPasswordMutation = () => {
  return useMutation({
    mutationFn: (data: { email: string; otp?: string }) =>
      postData("/auth/reset-password-request", data),
  });
};

export const useResetPasswordMutation = () => {
  return useMutation({
    mutationFn: (data: {
      token: string;
      newPassword: string;
      confirmPassword: string;
    }) => postData("/auth/reset-password", data),
  });
};

export const useSetup2FARequestMutation = () => {
  return useMutation({
    mutationFn: (data: { email: string }) =>
      postData("/auth/setup-2fa-request", data),
  });
};

export const useSetup2FAVerifyMutation = () => {
  return useMutation({
    mutationFn: (data: { email: string; otp: string }) =>
      postData("/auth/setup-2fa-verify", data),
  });
};

export const useSignAgreementMutation = () => {
  return useMutation({
    mutationFn: (data: { email: string; otp: string; fullName: string; designation: string }) =>
      postData("/auth/sign-agreement", data),
  });
};
