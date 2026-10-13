import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';

// Riwayat sesi login per perangkat.
// Dibuat otomatis setiap login berhasil (form / Google / register / verifikasi email).
// Logout satu sesi = isActive=false (bukan hapus fisik, agar konsisten dengan "riwayat terhapus" di UI = nonaktif).
@Entity('login_sessions')
@Index(['userId', 'isActive'])
export class LoginSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  // Nama perangkat hasil parse User-Agent, mis. "Infinix X688B", "iPhone", "Windows PC".
  // Catatan: browser desktop tidak mengirim merek/seri (cuma OS), jadi di PC
  // tidak bisa tampil "Infinix/Asus/Lenovo" — hanya sekelas "Windows PC".
  @Column({ type: 'varchar', length: 255, nullable: true })
  device: string | null;

  @Column({ type: 'text', nullable: true })
  userAgent: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  ip: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  city: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  region: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  country: string | null;

  @Column({ type: 'double', nullable: true })
  lat: number | null;

  @Column({ type: 'double', nullable: true })
  lng: number | null;

  // Hash refresh token sesi ini (bcrypt). Dipakai untuk validasi saat refresh.
  @Column({ type: 'varchar', length: 255, nullable: true, select: false })
  refreshTokenHash: string | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  lastActiveAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
