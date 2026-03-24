import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

/**
 * JWT guard that does not reject unauthenticated requests.
 * If a valid token is present, req.user is populated.
 * If no token or invalid token, req.user remains undefined.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    return super.canActivate(context);
  }

  handleRequest<T>(err: Error | null, user: T): T {
    // Suppress authentication errors — allow unauthenticated access
    return user;
  }
}
