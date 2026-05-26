import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20';
import { AuthService } from './auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private readonly authService: AuthService) {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: `${process.env.BACKEND_URL}/api/auth/google/callback`,
      scope: ['profile', 'email'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<void> {
    try {
      const email = profile.emails?.[0]?.value;
      if (!email) {
        return done(null, false, { message: 'no_email' });
      }

      const allowedDomain = process.env.ALLOWED_EMAIL_DOMAIN ?? 'clips4sale.com';
      if (!email.endsWith(`@${allowedDomain}`)) {
        return done(null, false, { message: 'domain_not_allowed' });
      }

      const user = await this.authService.findOrCreateUser({
        googleId: profile.id,
        email,
        name: profile.displayName,
        avatarUrl: profile.photos?.[0]?.value ?? null,
      });

      done(null, user);
    } catch (err) {
      done(err as Error, undefined);
    }
  }
}
