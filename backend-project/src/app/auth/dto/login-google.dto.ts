import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class LoginGoogleDto {
  @IsEmail({}, { message: 'Format email tidak valid' })
  @IsNotEmpty({ message: 'Email tidak boleh kosong' })
  email: string;

  @IsNotEmpty({ message: 'Nama tidak boleh kosong' })
  name: string;

  @IsOptional()
  @IsString()
  avatar?: string;
}
