import { Controller, Post, Get, Put, Delete, Body, Param } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private svc: AuthService) {}

  @Post('login')
  login(@Body('pin') pin: string) {
    return this.svc.login(pin);
  }

  @Get('users')
  listUsers() {
    return this.svc.listUsers();
  }

  @Post('users')
  createUser(@Body() body: { name: string; pin: string; role?: string; locationIds?: string[] }) {
    return this.svc.createUser(body.name, body.pin, body.role, body.locationIds);
  }

  @Put('users/:id')
  updateUser(@Param('id') id: string, @Body() dto: any) {
    return this.svc.updateUser(id, dto);
  }

  @Delete('users/:id')
  deleteUser(@Param('id') id: string) {
    return this.svc.deleteUser(id);
  }
}
