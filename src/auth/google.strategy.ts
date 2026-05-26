import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-google-oauth20';
import { AuthService } from './auth.service';
import { User } from '../users/users.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private readonly authService: AuthService) {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: `${process.env.BACKEND_URL}/api/auth/google/callback`,
      scope: ['profile', 'email'],
      // Hint Google's account picker to show only the allowed domain
      hd: process.env.ALLOWED_EMAIL_DOMAIN,
    });
  }

  // NestJS's PassportStrategy wrapper calls done() after this resolves.
  // Do NOT call done() here — return the user (or throw) and let the wrapper do it.
  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
  ): Promise<User> {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      throw new Error('no_email');
    }

    const allowedDomain = process.env.ALLOWED_EMAIL_DOMAIN ?? 'clips4sale.com';
    if (!email.endsWith(`@${allowedDomain}`)) {
      throw new Error('domain_not_allowed');
    }

    return this.authService.findOrCreateUser({
      googleId: profile.id,
      email,
      name: profile.displayName,
      avatarUrl: profile.photos?.[0]?.value ?? null,
    });
  }
}
