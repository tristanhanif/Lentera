import { ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
export class RtGuard extends AuthGuard("refresh_token") {
  constructor() {
    super();
  }
 
  // canActivate tetap digunakan untuk memicu proses validasi
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }
 
  // handleRequest dipanggil SETELAH Passport Strategy selesai memvalidasi token
  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    // 1. Jika ada error dari passport (misal: token kadaluarsa atau typo)
    if (err || !user) {
      throw (
        err ||
        new UnauthorizedException(
          "Sesi verifikasi gagal, silakan login kembali"
        )
      );
    }
 
    // 2. Jika valid, 'user' ini akan otomatis dimasukkan ke request.user
 
    return user;
  }
}