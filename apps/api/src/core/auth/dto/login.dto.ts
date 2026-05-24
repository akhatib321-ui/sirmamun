import { IsString, Length } from 'class-validator';

export class LoginDto {
  @IsString()
  @Length(4, 16)
  pin: string;
}
