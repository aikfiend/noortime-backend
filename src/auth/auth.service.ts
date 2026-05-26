import { Injectable } from '@nestjs/common';
import { UsersService, User } from '../users/users.service';

interface GoogleProfile {
  googleId: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

@Injectable()
export class AuthService {
  constructor(private readonly usersService: UsersService) {}

  async findOrCreateUser(profile: GoogleProfile): Promise<User> {
    const existing = await this.usersService.findByGoogleId(profile.googleId);
    if (existing) {
      return existing;
    }
    return this.usersService.create(profile);
  }
}
