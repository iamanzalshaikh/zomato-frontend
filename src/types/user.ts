export type AccountStatus = 'ACTIVE' | 'BLOCKED' | 'SUSPENDED';

export type UserRole = 'CUSTOMER' | 'RESTAURANT_OWNER' | 'RIDER' | 'ADMIN';

/**
 * Mirrors backend `formatAuthUser()` shape.
 */
export type User = {
  _id: string;
  fullName?: string;
  email: string;
  mobile?: string;
  profileImage?: string;
  role?: UserRole;
  onboardingCompleted?: boolean;
  onboardingStep?: number;
  accountStatus?: AccountStatus;
  createdAt?: string;
  updatedAt?: string;
};

