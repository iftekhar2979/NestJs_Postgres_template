import {
  Injectable,
  ExecutionContext,
  UnauthorizedException
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from 'src/user/user.service';

@Injectable()
export class JwtAuthenticationGuard {
  constructor(
    private readonly jwtService: JwtService, // Inject JwtService
    private readonly userService: UserService, // Inject UserService
    // @Inject(CACHE_MANAGER) private cacheManager: Cache
    //  private cacheManager: Cache
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new UnauthorizedException(
        'You are not authorized to access this resource!',
      );
    }
    try {
      const payload = await this.jwtService.verifyAsync(token);
      const user = await this.userService.getUserById(payload.id);
      if (!user) {
        throw new Error('User is Not Available!');
      }
      if (payload.id !== user.id.toString()) {
        throw new Error(
          'You are not authorized to access this resource!',
        );
      }
      if (user.deletedAt) {
        throw new Error('User is Not Available!');
      }

      request.user = payload; // Attach user data to the request
      request.userInfo=user
      return true;
    } catch (error) {
      console.log(error);
      throw new UnauthorizedException(error.message);
    }
  }

  private extractTokenFromHeader(request: any): string | null {
    const bearerToken = request.headers['authorization'];
    console.log("Bearer Token :", bearerToken);
    if (bearerToken && bearerToken.startsWith('Bearer ')) {
      return bearerToken.split(' ')[1];
    }
    return null;
  }
}
