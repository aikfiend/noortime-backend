import { Injectable } from '@nestjs/common';
import { PassportSerializer } from '@nestjs/passport';
import { UsersService } from '../users/users.service';
import { User } from '../users/users.service';

@Injectable()
export class SessionSerializer extends PassportSerializer {
  constructor(private readonly usersService: UsersService) {
    super();
  }

  serializeUser(user: User, done: (err: unknown, id: number) => void): void {
    done(null, user.id);
  }

  async deserializeUser(
    id: number,
    done: (err: unknown, user: User | null) => void,
  ): Promise<void> {
    try {
      const user = await this.usersService.findById(id);
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  }
}
