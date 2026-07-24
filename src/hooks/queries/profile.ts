import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { deleteAddress, fetchProfile, updateAddress, deleteAccount } from '@/services/profile';

export const profileKeys = {
  me: ['profile', 'me'] as const,
};

export function useProfileQuery() {
  return useQuery({
    queryKey: profileKeys.me,
    queryFn: fetchProfile,
    staleTime: 5 * 60 * 1000, // 5 minutes staleTime
  });
}

export function useUpdateAddressMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateAddress,
    onSuccess: () => qc.invalidateQueries({ queryKey: profileKeys.me }),
  });
}

export function useDeleteAddressMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteAddress,
    onSuccess: () => qc.invalidateQueries({ queryKey: profileKeys.me }),
  });
}

export function useDeleteAccountMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteAccount,
    onSuccess: () => qc.invalidateQueries({ queryKey: profileKeys.me }),
  });
}

