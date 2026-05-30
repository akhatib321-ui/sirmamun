import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * @Global() means PrismaService is available everywhere once this module
 * is imported in AppModule — no need to import PrismaModule in each
 * feature module (catalog, inventory, scheduling, analytics).
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
