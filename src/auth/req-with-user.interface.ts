import { Request } from 'express';
import { UserRole } from 'src/utils/user_utils';

export interface JwtUserPayload {
  sub: string;
  username: string;
  role: UserRole;
}

export interface ReqWithUser extends Request {
  user: JwtUserPayload;
}
