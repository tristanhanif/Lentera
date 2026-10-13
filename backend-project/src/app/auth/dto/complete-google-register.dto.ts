import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

export class CompleteGoogleRegisterDto {
  @IsEmail({}, { message: 'Format email tidak valid' })
  @IsNotEmpty({ message: 'Email tidak boleh kosong' })
  email: string;

  @IsNotEmpty({ message: 'Nama tidak boleh kosong' })
  @IsString()
  name: string;

  @IsNotEmpty({ message: 'Username tidak boleh kosong' })
  @IsString()
  @Matches(/^[a-zA-Z0-9._]{3,30}$/, {
    message:
      'Username hanya boleh huruf, angka, titik (.) dan underscore (_), tanpa spasi, 3-30 karakter',
  })
  username: string;

  @IsOptional()
  @IsString()
  avatar?: string;
}
