import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Format email tidak valid' })
  @IsNotEmpty({ message: 'Email tidak boleh kosong' })
  email: string;

  @IsNotEmpty({ message: 'Username tidak boleh kosong' })
  @IsString()
  @Matches(/^[a-zA-Z0-9._]{3,30}$/, {
    message:
      'Username hanya boleh huruf, angka, titik (.) dan underscore (_), tanpa spasi, 3-30 karakter',
  })
  username: string;

  @IsNotEmpty({ message: 'Name tidak boleh kosong' })
  name: string;

  @IsString()
  @MinLength(6, { message: 'Password minimal 6 karakter' })
  @IsNotEmpty({ message: 'Password tidak boleh kosong' })
  password: string;
}
