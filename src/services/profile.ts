import { apiFetch } from '@/lib/apiFetch';

export type Address = {
  _id: string;
  label: string;
  fullAddress: string;
  isDefault?: boolean;
};

export async function fetchProfile(): Promise<any> {
  const body = await apiFetch('/users/profile');
  return (body as any)?.data?.user ?? (body as any)?.data;
}

export async function updateProfile(input: {
  fullName?: string;
  mobile?: string;
  gender?: 'male' | 'female' | 'other';
}) {
  const body = await apiFetch('/users/profile', {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  return (body as any)?.data?.user ?? (body as any)?.data;
}

export async function updateAddress(input: { addressId: string } & Partial<Omit<Address, '_id'>>) {
  const body = await apiFetch(`/users/address/${input.addressId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  return (body as any)?.data?.address;
}

export async function deleteAddress(addressId: string) {
  const body = await apiFetch(`/users/address/${addressId}`, { method: 'DELETE' });
  return body;
}

export async function deleteAccount() {
  const body = await apiFetch('/users/delete-account', { method: 'DELETE' });
  return body;
}

