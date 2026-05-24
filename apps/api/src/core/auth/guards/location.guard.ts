import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { JwtPayload } from '../types/jwt-payload.interface';

@Injectable()
export class LocationGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as JwtPayload | undefined;

    if (!user) {
      return false;
    }

    if (user.role === 'admin') {
      return true;
    }

    const requestedLocationIds: string[] = [
      request.params?.locationId,
      request.params?.lid,
      request.body?.locationId,
      request.body?.lid,
      request.body?.fromLid,
      request.body?.toLid,
      request.query?.locationId,
    ]
      .filter((value) => value !== undefined && value !== null)
      .map((value) => String(value));

    if (requestedLocationIds.length === 0) {
      return true;
    }

    if (!Array.isArray(user.locationIds)) {
      throw new ForbiddenException('Access denied for this location');
    }

    const hasAccess = requestedLocationIds.every((locationId) => user.locationIds.includes(locationId));
    if (!hasAccess) {
      throw new ForbiddenException('Access denied for this location');
    }

    return true;
  }
}
