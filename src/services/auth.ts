import { apiFetch } from '@/lib/apiFetch';

export async function forgotPassword(email: string) {
  const body = await apiFetch('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
  return body;
}

export async function resetPassword(input: {
  email: string;
  otp: string;
  newPassword: string;
}) {
  const body = await apiFetch('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return body;
}
