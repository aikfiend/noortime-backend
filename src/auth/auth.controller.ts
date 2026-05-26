import {
  Controller,
  Get,
  Next,
  Post,
  Req,
  Res,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const passport = require('passport') as typeof import('passport');
import { GoogleOAuthGuard } from './guards/google-oauth.guard';
import { AuthenticatedGuard } from './guards/authenticated.guard';
import { User } from '../users/users.service';

@Controller('auth')
export class AuthController {
  @Get('google')
  @UseGuards(GoogleOAuthGuard)
  googleLogin(): void {
    // Passport redirects to Google — no body needed
  }

  // Manual callback so we can redirect to the error page on domain/auth failure
  // instead of returning a JSON 401 that the browser can't handle post-redirect.
  @Get('google/callback')
  googleCallback(
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction,
  ): void {
    passport.authenticate(
      'google',
      (err: Error | null, user: unknown, info: { message?: string } | undefined) => {
        if (err || !user) {
          const reason = encodeURIComponent(
            info?.message ?? err?.message ?? 'auth_failed',
          );
          return res.redirect(
            `${process.env.FRONTEND_URL}/auth/error?reason=${reason}`,
          );
        }

        req.logIn(user, (loginErr: Error | null) => {
          if (loginErr) {
            res.redirect(
              `${process.env.FRONTEND_URL}/auth/error?reason=login_failed`,
            );
            return;
          }
          res.redirect(`${process.env.FRONTEND_URL}/dashboard`);
        });
      },
    )(req, res, next);
  }

  @Post('logout')
  @HttpCode(200)
  logout(@Req() req: Request, @Res() res: Response): void {
    req.logout(() => {
      req.session.destroy(() => {
        res.clearCookie('connect.sid');
        res.json({ message: 'Logged out' });
      });
    });
  }

  @Get('me')
  @UseGuards(AuthenticatedGuard)
  me(@Req() req: Request): User {
    return req.user as User;
  }
}
