import { MailerService } from '@nestjs-modules/mailer/dist/mailer.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class MailService {
  constructor(private readonly mailerService: MailerService) {}

  /**
   * Kirim email verifikasi
   */
  async sendEmailVerifikasi(payload: {
    email: string;
    link: string;
    name: string;
  }) {
    await this.mailerService.sendMail({
      to: payload.email,
      subject: 'Verifikasi Email Akun Lentera Sosmed',
      template: './verifikasi',
      context: {
        email: payload.email,
        link: payload.link,
        name: payload.name,
      },
    });
  }

  /**
   * Kirim email lupa password
   */
  async sendForgotPasswordEmail(payload: {
    email: string;
    name: string;
    link: string;
    expiredIn: string;
  }) {
    await this.mailerService.sendMail({
      to: payload.email,
      subject: 'Reset Password Akun Lentera Sosmed',
      template: './forgot-password',
      context: {
        email: payload.email,
        name: payload.name,
        link: payload.link,
        expiredIn: payload.expiredIn,
      },
    });
  }

  async sendResetPasswordOtp(payload: {
    email: string;
    name: string;
    otp: string;
  }) {
    await this.mailerService.sendMail({
      to: payload.email,
      subject: 'Kode OTP Reset Password',
      template: './reset-password-otp',
      context: {
        name: payload.name,
        otp: payload.otp,
      },
    });
  }
}
