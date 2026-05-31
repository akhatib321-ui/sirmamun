export interface JwtPayload {
  sub: string;                    // User UUID
  role: 'admin' | 'staff';
  organizationId: number;
  locationIds: string[] | null;   // null = access to all locations
  iat?: number;
  exp?: number;
}
