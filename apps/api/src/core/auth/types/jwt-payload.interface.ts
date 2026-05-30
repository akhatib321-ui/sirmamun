// CORRECTED — replaces the version from the auth integration
// Changes from original:
//   sub: number → sub: string  (User.id is UUID, not integer)
//   locationIds: number[] | null → locationIds: string[] | null  (UUID strings)

export interface JwtPayload {
  sub: string;                    // User UUID
  role: 'admin' | 'staff';
  organizationId: number;
  locationIds: string[] | null;   // null = access to all locations
  iat?: number;
  exp?: number;
}
