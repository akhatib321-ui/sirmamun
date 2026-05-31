import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { JwtPayload } from '../types/jwt-payload.interface';

@Injectable()
export class LocationGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as JwtPayload;

    if (user.role === 'admin') return true;
    if (!user.locationIds || user.locationIds.length === 0) return true;

    const locationId: string | undefined =
      request.params?.locationId ?? request.query?.locationId;

    if (!locationId) return true;

    if (!user.locationIds.includes(locationId)) {
      throw new ForbiddenException('You do not have access to this location');
    }

    return true;
  }
}
