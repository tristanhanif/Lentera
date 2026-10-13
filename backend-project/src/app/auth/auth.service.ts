import { IsEmail } from 'class-validator';
import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  Inject,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm'; // Pastikan path entity benar
import { RegisterDto } from 'src/app/auth/dto/register.dto';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';
import { REQUEST } from '@nestjs/core';
import { createHash, randomBytes } from 'crypto';
import { MailService } from '../mail/mail.service';
import { ResendDto } from './dto/resend.dto';
import { ForgotPasswordDto } from './dto/forgot-pasword.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { LoginGoogleDto } from './dto/login-google.dto';
import { User } from '../entity/user.entity';
import { PasswordResetToken } from '../entity/password-reset-token.entity';
import { ChangePasswordDto } from './dto/chance-password.dto';
import { LoginSession } from '../entity/login-session.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { Follow } from '../entity/follow.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectRepository(PasswordResetToken)
    private readonly resetTokenRepository: Repository<PasswordResetToken>,

    @InjectRepository(Follow)
    private readonly followRepo: Repository<Follow>,

    @InjectRepository(LoginSession)
    private readonly sessionRepo: Repository<LoginSession>,

    private jwtService: JwtService,
    private mailService: MailService,
    @Inject(REQUEST)
    private req: any,
  ) {}
  /* ===============================
   * 📱 Sesi login (Aktivitas login)
   * Device dari User-Agent, kota + maps dari IP publik (ip-api.com).
   * IP lokal / lookup gagal -> kota & lat/lng null (ditampilkan "tidak diketahui").
   * =============================== */
  private getRequestMeta(): { ip: string | null; userAgent: string | null } {
    try {
      const headers = this.req?.headers ?? {};
      const forwarded = headers['x-forwarded-for'];
      const rawIp =
        (Array.isArray(forwarded) ? forwarded[0] : forwarded?.split?.(',')[0]?.trim()) ||
        this.req?.ip ||
        this.req?.socket?.remoteAddress ||
        null;
      const ip = rawIp ? String(rawIp).replace('::ffff:', '').trim() : null;
      const userAgent = headers['user-agent'] ? String(headers['user-agent']) : null;
      return { ip, userAgent };
    } catch {
      return { ip: null, userAgent: null };
    }
  }

  private parseDevice(userAgent: string | null): string {
    if (!userAgent) return 'Perangkat tidak dikenal';
    const ua = userAgent;
    // Android: ambil model persis seperti "Infinix X688B" dari pola "; MODEL Build/".
    // Contoh UA: "Linux; Android 13; Infinix X688B Build/TP1A.220624.014; wv" -> "Infinix X688B".
    if (/Android/i.test(ua)) {
      const m = ua.match(/;\s*([^;()]+?)\s+Build\//i);
      const model = m?.[1]?.trim();
      if (model) return model;
      return 'Perangkat Android';
    }
    if (/iPhone/i.test(ua)) return 'iPhone';
    if (/iPad/i.test(ua)) return 'iPad';
    // Desktop tidak mengirim merek/seri di User-Agent (cuma "Windows NT", "Macintosh"),
    // jadi tidak bisa tahu "Infinix/Asus/Lenovo" — tampilkan sekelasnya saja.
    if (/Windows/i.test(ua)) return 'Windows PC';
    if (/Macintosh|Mac OS/i.test(ua)) return 'Mac';
    if (/Linux/i.test(ua)) return 'Linux PC';
    return 'Perangkat tidak dikenal';
  }

  private isPrivateIp(ip: string | null): boolean {
    if (!ip) return true;
    const v = ip.toLowerCase();
    return (
      v === '127.0.0.1' ||
      v === '::1' ||
      v.startsWith('10.') ||
      v.startsWith('192.168.') ||
      v.startsWith('fc00:') ||
      v.startsWith('fe80:') ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(v)
    );
  }

  private async lookupLocation(ip: string | null): Promise<{
    city: string | null;
    region: string | null;
    country: string | null;
    lat: number | null;
    lng: number | null;
  }> {
    const empty = { city: null, region: null, country: null, lat: null, lng: null };
    if (!ip || this.isPrivateIp(ip)) return empty;
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 3500);
      const res = await fetch(
        `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,message,country,regionName,city,lat,lon`,
        { signal: ctrl.signal },
      );
      clearTimeout(timer);
      if (!res.ok) return empty;
      const data: any = await res.json();
      if (data?.status !== 'success') return empty;
      return {
        city: data.city || null,
        region: data.regionName || null,
        country: data.country || null,
        lat: typeof data.lat === 'number' ? data.lat : null,
        lng: typeof data.lon === 'number' ? data.lon : null,
      };
    } catch {
      return empty;
    }
  }

  private async recordLoginSession(userId: string, refreshToken: string) {
    try {
      const { ip, userAgent } = this.getRequestMeta();
      const device = this.parseDevice(userAgent);
      const loc = await this.lookupLocation(ip);
      const hash = refreshToken ? await bcrypt.hash(refreshToken, 10) : null;
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const session = this.sessionRepo.create({
        userId,
        device,
        userAgent,
        ip,
        city: loc.city,
        region: loc.region,
        country: loc.country,
        lat: loc.lat,
        lng: loc.lng,
        refreshTokenHash: hash,
        isActive: true,
        lastActiveAt: new Date(),
        expiresAt,
      });
      await this.sessionRepo.save(session);
    } catch {
      // Jangan gagalkan login hanya karena pencatatan sesi gagal.
    }
  }

  async register(dto: RegisterDto) {
    // 1. Cek apakah email sudah terdaftar
    const userExists = await this.userRepo.findOne({
      where: [{ email: dto.email }, { username: dto.username.toLowerCase() }],
    });

    if (userExists) {
      const isEmailDuplicate = userExists.email === dto.email;
      throw new BadRequestException(
        isEmailDuplicate
          ? 'Email sudah digunakan, silakan gunakan email lain'
          : 'Username sudah digunakan',
      );
    }

    // 2. Hashing Password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(dto.password, salt);

    // 3. Buat user langsung aktif (tanpa verifikasi email)
    const newUser = this.userRepo.create({
      username: dto.username.toLowerCase(),
      name: dto.name,
      email: dto.email,
      password: hashedPassword,
      provider: 'form',
      isEmailVerified: true,
    });

    // 4. Simpan ke Database
    const savedUser = await this.userRepo.save(newUser);

    // 5. Langsung issue token biar frontend bisa auto-login ke onboarding avatar
    const tokens = await this.getTokens(savedUser.id, savedUser.email);
    await this.updateRefreshToken(savedUser.id, tokens.refresh_token);
    await this.recordLoginSession(savedUser.id, tokens.refresh_token);

    return {
      message: 'Registrasi berhasil',
      user: {
        id: savedUser.id,
        username: savedUser.username,
        email: savedUser.email,
      },
      ...tokens,
    };
  }

  private async kirimEmailVerifikasi(user: User) {
    const link = `${process.env.BASE_SERVER_URL}/auth/verifikasi-email?userId=${user.id}&token=${user.emailVerificationToken}`;
    await this.mailService.sendEmailVerifikasi({
      email: user.email,
      name: user.name,
      link,
    });
  }

  async login(dto: LoginDto) {
    // 1. Cari user berdasarkan email
    // Kita gunakan .select karena di entity password diset { select: false }
    const user = await this.userRepo.findOne({
      where: { email: dto.email },
      select: ['id', 'username', 'email', 'password', 'provider'],
    });

    // 2. Jika user tidak ditemukan
    if (!user) {
      throw new BadRequestException('Kredensial salah (Email tidak terdaftar)');
    }

    // 2b. Akun Google (password null / dummy) tidak bisa login via form
    if (!user.password || user.provider === 'google') {
      // Jika provider google tapi user sudah set password via forgot-password,
      // user.password akan ada — tapi tetap cek di bawah.
      // Untuk keamanan, jika password null langsung tolak:
      if (!user.password) {
        throw new BadRequestException(
          'Akun ini terdaftar via Google, silakan login dengan Google',
        );
      }
    }

    // 3. Bandingkan password inputan dengan password di DB (Hashed)
    const isMatch = await bcrypt.compare(dto.password, user.password);

    // 4. Jika password tidak cocok
    if (!isMatch) {
      throw new BadRequestException('Kredensial salah (Password salah)');
    }

    // 5. Generate Tokens
    const tokens = await this.getTokens(user.id, user.email);

    // 6. SIMPAN REFRESH TOKEN KE DB (Encrypted)
    await this.updateRefreshToken(user.id, tokens.refresh_token);
    await this.recordLoginSession(user.id, tokens.refresh_token);

    // 7. Berhasil Login (Nantinya di sini kita akan me-return JWT Token)
    return {
      message: 'Login berhasil',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
      ...tokens,
    };
  }

  async getTokens(userId: string, email: string) {
    const at = await this.jwtService.signAsync(
      {
        sub: userId,
        id: userId,
        email: email,
      },
      {
        secret: process.env.ACCESS_TOKEN_SECRET, // Kunci rahasia (Simpan di .env nanti)
        expiresIn: '1d', // Masa berlaku 1 hari
      },
    );

    const rt = await this.jwtService.signAsync(
      {
        sub: userId,
        id: userId,
        email: email,
      },
      {
        secret: process.env.REFRESH_TOKEN_SECRET, // Kunci rahasia (Simpan di .env nanti)
        expiresIn: '7d', // Masa berlaku 1 hari
      },
    );

    return { access_token: at, refresh_token: rt };
  }

  async updateRefreshToken(userId: string, refreshToken: string) {
    if (!refreshToken) {
      await this.userRepo.update(userId, { refreshToken: '' });
      return;
    }

    const hash = await bcrypt.hash(refreshToken, 10);
    await this.userRepo.update(userId, {
      refreshToken: hash,
    });
  }

  async refreshTokens(userId: string, refreshToken: string) {
    // 1. Cari user berdasarkan ID
    // Pastikan kita select hashedRefreshToken yang tadinya di-hide
    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: ['id', 'email', 'refreshToken'],
    });

    // 2. Jika user tidak ditemukan atau tidak punya token di DB (sudah logout)
    if (!user || !user.refreshToken) {
      throw new UnauthorizedException('Akses Ditolak (Silakan Login Ulang)');
    }

    // 3. Bandingkan refresh token dari user dengan yang ada di DB
    const refreshTokenMatches = await bcrypt.compare(
      refreshToken,
      user.refreshToken,
    );

    // 4. Jika tidak cocok, hapus token di DB (keamanan: indikasi token dicuri)
    if (!refreshTokenMatches) {
      await this.updateRefreshToken(user.id, ''); // Paksa logout di DB
      throw new UnauthorizedException(
        'Token tidak valid atau telah kadaluarsa',
      );
    }

    // 5. Jika cocok, buatkan pasang token baru
    const tokens = await this.getTokens(user.id, user.email);

    // 6. Update kembali refresh token terbaru ke database (Token Rotation)
    await this.updateRefreshToken(user.id, tokens.refresh_token);

    // 7. Samakan sesi perangkat ini (cocokkan hash refresh lama) agar lastActive terbarui,
    //    tanpa menambah baris baru setiap refresh.
    try {
      const activeSessions = await this.sessionRepo
        .createQueryBuilder('s')
        .addSelect('s.refreshTokenHash')
        .where('s.userId = :userId AND s.isActive = :active', { userId: user.id, active: true })
        .orderBy('s.lastActiveAt', 'DESC')
        .getMany();
      let matched = false;
      for (const s of activeSessions) {
        if (!s.refreshTokenHash) continue;
        // eslint-disable-next-line no-await-in-loop
        if (await bcrypt.compare(refreshToken, s.refreshTokenHash)) {
          s.refreshTokenHash = await bcrypt.hash(tokens.refresh_token, 10);
          s.lastActiveAt = new Date();
          s.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
          // eslint-disable-next-line no-await-in-loop
          await this.sessionRepo.save(s);
          matched = true;
          break;
        }
      }
      // Sesi lama (sebelum fitur ini) tidak punya baris cocok -> catat sebagai sesi baru agar muncul di Aktivitas login.
      if (!matched && activeSessions.length === 0) {
        await this.recordLoginSession(user.id, tokens.refresh_token);
      }
    } catch {
      // Abaikan, refresh tetap berhasil.
    }

    return tokens;
  }

  /* ===== Daftar & revoke sesi (dipakai halaman /session/login_activity) ===== */
  async getLoginSessions() {
    const userId = this.req?.user?.sub;
    if (!userId) throw new UnauthorizedException('Akses Ditolak (Silakan Login Ulang)');

    let sessions = await this.sessionRepo.find({
      where: { userId, isActive: true },
      order: { lastActiveAt: 'DESC' },
    });

    // Backfill: user lama yang belum punya baris sesi -> buat dari request saat ini
    // agar halaman langsung menampilkan data real tanpa harus login ulang.
    if (sessions.length === 0) {
      try {
        const { ip, userAgent } = this.getRequestMeta();
        const device = this.parseDevice(userAgent);
        const loc = await this.lookupLocation(ip);
        const row = this.sessionRepo.create({
          userId,
          device,
          userAgent,
          ip,
          city: loc.city,
          region: loc.region,
          country: loc.country,
          lat: loc.lat,
          lng: loc.lng,
          isActive: true,
          lastActiveAt: new Date(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        });
        const saved = await this.sessionRepo.save(row);
        sessions = [saved];
      } catch {
        // biarkan kosong
      }
    }

    // Tandai sesi perangkat saat ini (cocokkan IP + device) agar UI bisa label "Sesi ini".
    const { ip: curIp, userAgent: curUa } = this.getRequestMeta();
    const curDevice = this.parseDevice(curUa);
    const data = sessions.map((s, idx) => ({
      id: s.id,
      city: s.city,
      region: s.region,
      country: s.country,
      device: s.device,
      ip: s.ip,
      lat: s.lat,
      lng: s.lng,
      lastActiveAt: s.lastActiveAt,
      createdAt: s.createdAt,
      isCurrent: idx === 0 && (s.ip === curIp || s.device === curDevice),
    }));

    return { message: 'Daftar sesi login berhasil diambil', data };
  }

  async revokeLoginSession(sessionId: string) {
    const userId = this.req?.user?.sub;
    if (!userId) throw new UnauthorizedException('Akses Ditolak (Silakan Login Ulang)');

    const session = await this.sessionRepo.findOne({ where: { id: sessionId, userId } });
    if (!session || !session.isActive) {
      throw new NotFoundException('Sesi tidak ditemukan');
    }

    session.isActive = false;
    await this.sessionRepo.save(session);

    // Kalau yang di-kill adalah sesi perangkat ini (IP cocok / sesi aktif terakhir),
    // ikut bersihkan refreshToken user agar benar-benar logout di perangkat ini.
    const { ip: curIp } = this.getRequestMeta();
    const remaining = await this.sessionRepo.count({ where: { userId, isActive: true } });
    const isCurrentDevice = session.ip === curIp || remaining === 0;
    if (isCurrentDevice) {
      await this.updateRefreshToken(userId, '');
    }

    return { message: 'Sesi berhasil diakhiri', data: { id: sessionId, revokedCurrent: isCurrentDevice } };
  }

  async getProfile() {
    const data = await this.userRepo.findOne({
      where: { id: this.req.user.sub },
      select: ['id', 'name', 'username', 'email', 'avatar', 'cover', 'bio', 'location', 'website', 'provider', 'isEmailVerified', 'showSuggestion', 'createdAt', 'updatedAt'],
    });

    if (!data) {
      throw new NotFoundException('User tidak ditemukan');
    }

    const [followersCount, followingCount] = await Promise.all([
      this.followRepo.count({ where: { following: { id: data.id } } }),
      this.followRepo.count({ where: { follower: { id: data.id } } }),
    ]);

    return {
      message: 'Data profile berhasil diambil',
      data: {
        ...data,
        loginMethod: data.provider,
        followersCount,
        followingCount,
      },
    };
  }

  async updateProfile(dto: UpdateProfileDto) {
    const data = await this.userRepo.findOne({
      where: { id: this.req.user.sub },
    });

    if (!data) {
      throw new NotFoundException('User tidak ditemukan');
    }

    // Username: normalisasi ke lowercase + cek keunikan (abaikan jika tidak berubah)
    if (dto.username && dto.username.toLowerCase() !== data.username) {
      const existing = await this.userRepo.findOne({
        where: { username: dto.username.toLowerCase() },
      });

      if (existing) {
        throw new BadRequestException('Username sudah digunakan');
      }

      data.username = dto.username.toLowerCase();
    }

    delete dto.username;

    Object.assign(data, dto);
    await this.userRepo.save(data);

    return {
      message: 'Profil berhasil diperbarui',
      data,
    };
  }

  async resendEmailVerifikasi(dto: ResendDto) {
    const userExists = await this.userRepo.findOne({
      where: { email: dto.email },
    });

    if (!userExists) {
      throw new BadRequestException('Email tidak terdaftar');
    }

    if (userExists.isEmailVerified) {
      throw new BadRequestException('Email Anda sudah terverifikasi');
    }

    const token = randomBytes(32).toString('hex');
    await this.userRepo.update(userExists.id, {
      emailVerificationToken: token,
    });

    await this.kirimEmailVerifikasi({
      ...userExists,
      emailVerificationToken: token,
    });

    return {
      message: 'Email verifikasi berhasil dikirim',
    };
  }

  async cekVerifikasiEmail(userId: string, token: string) {
    const user = await this.userRepo.findOne({
      where: { id: userId, emailVerificationToken: token },
    });

    if (!user) {
      throw new BadRequestException(
        'Verifikasi email gagal: Token tidak valid',
      );
    }

    await this.userRepo.update(user.id, {
      isEmailVerified: true,
      emailVerificationToken: '',
    });

    return {
      message: 'Email berhasil diverifikasi',
      data: user,
    };
  }

  async verifikasiEmailDanIssueTokens(userId: string, token: string) {
    const user = await this.userRepo.findOne({
      where: { id: userId, emailVerificationToken: token },
    });

    if (!user) {
      throw new BadRequestException(
        'Verifikasi email gagal: Token tidak valid',
      );
    }

    // Akun resmi aktif setelah email diverifikasi
    await this.userRepo.update(user.id, {
      isEmailVerified: true,
      emailVerificationToken: '',
    });

    // Issue access-token & refresh-token baru
    const tokens = await this.getTokens(user.id, user.email);
    await this.updateRefreshToken(user.id, tokens.refresh_token);
    await this.recordLoginSession(user.id, tokens.refresh_token);

    return {
      userId: user.id,
      ...tokens,
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.userRepo.findOne({
      where: { email: dto.email },
    });

    if (!user) {
      throw new NotFoundException('Email tidak terdaftar');
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const expiredAt = new Date();
    expiredAt.setMinutes(expiredAt.getMinutes() + 5);

    await this.resetTokenRepository.delete({ email: user.email });

    await this.resetTokenRepository.save({
      email: user.email,
      otp,
      expiredAt,
    });

    await this.mailService.sendResetPasswordOtp({
      email: user.email,
      otp,
      name: user.name,
    });

    return {
      message: 'Kode OTP berhasil dikirim ke email',
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const { email, otp, newPassword } = dto;

    // 1️⃣ cek OTP
    const token = await this.resetTokenRepository.findOne({
      where: { email, otp },
    });

    if (!token) {
      throw new BadRequestException('OTP tidak valid');
    }

    if (token.expiredAt < new Date()) {
      throw new BadRequestException('OTP sudah kadaluarsa');
    }

    // 2️⃣ ambil user
    const user = await this.userRepo.findOne({ where: { email } });

    if (!user) {
      throw new NotFoundException('User tidak ditemukan');
    }

    // 3️⃣ hash password baru
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.userRepo.update(user.id, {
      password: hashedPassword,
    });

    // 4️⃣ hapus OTP (anti reuse)
    await this.resetTokenRepository.delete({ email });

    return {
      message: 'Password berhasil diperbarui, silakan login',
    };
  }

  private async suggestUsername(email: string): Promise<string> {
    const baseUsername =
      email.split('@')[0].toLowerCase().replace(/[^a-z0-9_.]/g, '_').slice(0, 20) ||
      'user';

    let username = baseUsername;
    // eslint-disable-next-line no-await-in-loop
    while (await this.userRepo.findOne({ where: { username } })) {
      const suffix = randomBytes(3).toString('hex');
      username = `${baseUsername}_${suffix}`.slice(0, 30);
    }
    return username;
  }

  // Dipanggil dari callback Google:
  // - kalau email sudah terdaftar -> langsung login (isNew: false + tokens)
  // - kalau belum -> kembalikan isNew: true, user BELUM dibuat di DB
  async loginGoogle(dto: LoginGoogleDto) {
    const user = await this.userRepo.findOne({
      where: { email: dto.email },
    });

    if (!user) {
      const suggestedUsername = await this.suggestUsername(dto.email);
      return {
        isNew: true,
        message: 'Akun belum terdaftar, lanjutkan onboarding',
        email: dto.email,
        name: dto.name,
        avatar: dto.avatar ?? null,
        suggestedUsername,
      };
    }

    // User sudah ada: sinkronkan data Google seperlunya.
    // Catatan: JANGAN auto-isi avatar Google di sini. Kalau user tidak
    // masang PP, avatar tetap null agar frontend pakai /default-avatar.jpg
    // (= image-untuk-project/foto-profil.jpg). Auto-isi dulu yang bikin
    // akun form seperti wh0isthis_ tiba-tiba pakai foto Google.
    let needUpdate = false;

    if (!user.isEmailVerified) {
      user.isEmailVerified = true;
      needUpdate = true;
    }

    if (needUpdate) {
      await this.userRepo.save(user);
    }

    const tokens = await this.getTokens(user.id, user.email);
    await this.updateRefreshToken(user.id, tokens.refresh_token);
    await this.recordLoginSession(user.id, tokens.refresh_token);

    return {
      isNew: false,
      message: 'Login berhasil',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
      ...tokens,
    };
  }

  // Dipanggil dari halaman onboarding setelah user isi nama + username
  async completeGoogleRegister(dto: import('./dto/complete-google-register.dto').CompleteGoogleRegisterDto) {
    const email = dto.email.toLowerCase().trim();
    const username = dto.username.toLowerCase().trim();

    const existingEmail = await this.userRepo.findOne({ where: { email } });
    if (existingEmail) {
      throw new BadRequestException('Email sudah terdaftar, silakan login');
    }

    const existingUsername = await this.userRepo.findOne({ where: { username } });
    if (existingUsername) {
      throw new BadRequestException('Username sudah digunakan, pilih yang lain');
    }

    const dummyPassword = randomBytes(32).toString('hex');
    const hashedDummyPassword = await bcrypt.hash(dummyPassword, 10);

    const newUser = this.userRepo.create({
      name: dto.name.trim(),
      email,
      username,
      // Jangan simpan avatar Google otomatis — biar default (null ->
      // /default-avatar.jpg) sampai user upload sendiri di onboarding.
      avatar: undefined,
      password: hashedDummyPassword,
      isEmailVerified: true,
      provider: 'google',
    });
    const user = await this.userRepo.save(newUser);

    const tokens = await this.getTokens(user.id, user.email);
    await this.updateRefreshToken(user.id, tokens.refresh_token);
    await this.recordLoginSession(user.id, tokens.refresh_token);

    return {
      message: 'Registrasi Google berhasil',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
      ...tokens,
    };
  }

  async checkUsername(username: string) {
    const normalized = username.toLowerCase().trim();
    if (!/^[a-zA-Z0-9._]{3,30}$/.test(normalized)) {
      return {
        available: false,
        message: 'Username hanya boleh huruf, angka, titik dan underscore, 3-30 karakter',
      };
    }
    const existing = await this.userRepo.findOne({ where: { username: normalized } });
    return {
      available: !existing,
      message: existing ? 'Username sudah digunakan' : 'Username tersedia',
    };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    // 1️⃣ Ambil user berdasarkan ID dari JWT (sertakan password dan provider)
    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: ['id', 'password', 'provider'],
    });

    if (!user) {
      throw new NotFoundException('User tidak ditemukan');
    }

    // Jika user login melalui Google, maka tidak diperbolehkan menggunakan fitur ubah password.
    if (user.provider === 'google' || !user.password) {
      throw new BadRequestException(
        'Akun ini dibuat melalui OAuth (Google). Silakan atur kata sandi melalui metode lain atau gunakan fitur login yang sesuai.',
      );
    }

    // 2️⃣ Verifikasi password saat ini
    const isPasswordValid = await bcrypt.compare(
      dto.currentPassword,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Kata sandi saat ini salah');
    }

    // 3️⃣ Cegah password baru sama dengan password lama
    const isSamePassword = await bcrypt.compare(
      dto.newPassword,
      user.password as string,
    );

    if (isSamePassword) {
      throw new BadRequestException(
        'Kata sandi baru tidak boleh sama dengan kata sandi lama',
      );
    }

    // 4️⃣ Hash password baru
    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

    // 5️⃣ Update database
    user.password = hashedPassword;
    await this.userRepo.save(user);

    return {
      message: 'Kata sandi berhasil diubah',
    };
  }
}
