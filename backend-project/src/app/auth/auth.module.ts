import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtModule } from '@nestjs/jwt';
import { AtStrategy } from './jwt-strategy/at.strategy';
import { RtStrategy } from './jwt-strategy/rt.strategy';
import { User } from '../entity/user.entity';
import { PasswordResetToken } from '../entity/password-reset-token.entity';
import { Follow } from '../entity/follow.entity';
import { LoginSession } from '../entity/login-session.entity';
import { PostsModule } from '../posts/posts.module';
import { Match } from './validators/match.validator';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, PasswordResetToken, Follow, LoginSession]),
    JwtModule.register({}),
    PostsModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, AtStrategy, RtStrategy, Match],
})
export class AuthModule {}
