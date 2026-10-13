import {
  IsNotEmpty,
  MinLength,
  Validate,
} from 'class-validator';
import { Match } from '../validators/match.validator';

export class ChangePasswordDto {
  @IsNotEmpty()
  currentPassword: string;

  @IsNotEmpty()
  @MinLength(6)
  newPassword: string;

  @IsNotEmpty()
  @MinLength(6)
  @Validate(Match, ['newPassword'])
  confirmPassword: string;
}