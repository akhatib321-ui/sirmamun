// src/shared/interfaces.ts
// Common typed interfaces used across all modules.
// Import from here — never duplicate these types in individual modules.

export interface LocationScoped {
  locationId: string;
  organizationId: number;
}

export interface UserContext {
  sub: string;                     // User UUID
  role: 'admin' | 'staff';
  organizationId: number;
  locationIds: string[] | null;    // null = all locations
}

// Utility: filter a Prisma query's locationId based on the current user
// Usage: where: { ...locationFilter(user, locationId) }
export function locationFilter(
  user: UserContext,
  locationId?: string,
): { locationId?: string; organizationId: number } {
  const base = { organizationId: user.organizationId };

  // Admin with no location restriction and no specific location requested
  if (!locationId && (!user.locationIds || user.locationIds.length === 0)) {
    return base;
  }

  // Explicit locationId requested — use it (LocationGuard already validated access)
  if (locationId) {
    return { ...base, locationId };
  }

  // Staff scoped to their first location if no locationId specified
  if (user.locationIds && user.locationIds.length > 0) {
    return { ...base, locationId: user.locationIds[0] };
  }

  return base;
}
