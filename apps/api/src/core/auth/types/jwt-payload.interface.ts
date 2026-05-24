export interface JwtPayload {
  sub: string;
  name: string;
  role: string;
  organizationId: number;
  locationIds: string[];
}
