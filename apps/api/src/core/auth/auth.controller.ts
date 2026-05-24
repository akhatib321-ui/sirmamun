import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put } from '@nestjs/common';
import { LoginDto } from './dto/login.dto';
import { Public } from './decorators/public.decorator';
import { Roles } from './decorators/roles.decorator';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Roles('admin')
  @Get('users')
  listUsers() {
    return this.authService.listUsers();
  }

  @Roles('admin')
  @Post('users')
  createUser(@Body() body: { name: string; pin: string; role?: string; locationIds?: string[]; active?: boolean }) {
    return this.authService.createUser(body);
  }

  @Roles('admin')
  @Put('users/:id')
  updateUser(
    @Param('id') id: string,
    @Body() body: { name?: string; pin?: string; role?: string; locationIds?: string[]; active?: boolean },
  ) {
    return this.authService.updateUser(id, body);
  }

  @Roles('admin')
  @Delete('users/:id')
  deleteUser(@Param('id') id: string) {
    return this.authService.deleteUser(id);
  }
}
