import { apiFetch } from '@/lib/apiFetch';

export async function addAddress(input: {
  label: string;
  fullAddress: string;
  latitude?: number;
  longitude?: number;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  landmark?: string;
  isDefault?: boolean;
}) {
  const body = await apiFetch<{
    success: true;
    message: string;
    data: { address: any };
  }>('/users/address', { method: 'POST', body: JSON.stringify(input) });
  return body.data.address;
}

