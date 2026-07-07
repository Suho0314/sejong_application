import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { DatabaseModule } from '../database/database.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [
    DatabaseModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_SECRET');
        const expiresIn = Number(
          configService.get<string>('JWT_ACCESS_TOKEN_TTL_SECONDS') ?? '3600',
        );

        if (!secret) {
          throw new Error('JWT_SECRET is required');
        }

        if (!Number.isInteger(expiresIn) || expiresIn <= 0) {
          throw new Error('JWT_ACCESS_TOKEN_TTL_SECONDS must be a positive integer');
        }

        return {
          secret,
          signOptions: { expiresIn },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
