export type AdminUser = {
  id: string;
  email: string;
  userName: string | null;
  displayName: string | null;
  phoneNumber: string | null;
  emailConfirmed: boolean;
  roles: string[];
};

export type UpdateAdminUserPayload = {
  email: string;
  displayName: string;
  phoneNumber: string;
  roles: string[];
};
