import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AtGuard } from 'src/guards/at.guard';
import { RtGuard } from 'src/guards/rt.guard';
import { ResendDto } from './dto/resend.dto';
import { ForgotPasswordDto } from './dto/forgot-pasword.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { LoginGoogleDto } from './dto/login-google.dto';
import { CompleteGoogleRegisterDto } from './dto/complete-google-register.dto';
import { ChangePasswordDto } from './dto/chance-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @UseGuards(AtGuard)
  @Get('profile')
  async getProfile() {
    return this.authService.getProfile();
  }

  @Post('refresh')
  @UseGuards(RtGuard)
  refresh(@Req() req) {
    return this.authService.refreshTokens(req.user.sub, req.user.refreshToken);
  }

  @Post('resend-email-verifikasi')
  async resendEmailVerifikasi(@Body() dto: ResendDto) {
    return this.authService.resendEmailVerifikasi(dto);
  }

  @Get('cek-verifikasi-email')
  async cekVerifikasiEmail(
    @Query('userId') userId: string,
    @Query('token') token: string,
  ) {
    return this.authService.cekVerifikasiEmail(userId, token);
  }

  // Link di email verifikasi mengarah ke sini:
  // verifikasi token → issue access-token & refresh-token baru → redirect ke home
  @Get('verifikasi-email')
  async verifikasiEmail(
    @Query('userId') userId: string,
    @Query('token') token: string,
    @Res() res,
  ) {
    try {
      const result = await this.authService.verifikasiEmailDanIssueTokens(
        userId,
        token,
      );

      return res.redirect(
        `${process.env.URL_FRONTEND}/verifikasi-berhasil?access_token=${result.access_token}&refresh_token=${result.refresh_token}&uuid=${result.userId}`,
      );
    } catch (err) {
      return res.redirect(
        `${process.env.URL_FRONTEND}/verifikasi-email?status=gagal`,
      );
    }
  }

  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Post('login-google')
  async loginGoogle(@Body() dto: LoginGoogleDto) {
    return this.authService.loginGoogle(dto);
  }

  @Post('complete-google-register')
  async completeGoogleRegister(@Body() dto: CompleteGoogleRegisterDto) {
    return this.authService.completeGoogleRegister(dto);
  }

  @Get('check-username')
  async checkUsername(@Query('username') username: string) {
    return this.authService.checkUsername(username);
  }

  @UseGuards(AtGuard)
  @Patch('change-password')
  async changePassword(@Req() req, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(req.user.sub, dto);
  }

  @UseGuards(AtGuard)
  @Patch('profile')
  async updateProfile(@Req() req, @Body() dto: UpdateProfileDto) {
    return this.authService.updateProfile(dto);
  }

  @UseGuards(AtGuard)
  @Get('sessions')
  async getLoginSessions() {
    return this.authService.getLoginSessions();
  }

  @UseGuards(AtGuard)
  @Delete('sessions/:id')
  async revokeLoginSession(@Param('id') id: string) {
    return this.authService.revokeLoginSession(id);
  }
}
