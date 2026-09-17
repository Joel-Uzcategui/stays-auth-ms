export interface JwtPayload {
  sub: string; // id del usuario
  email: string;
  role: string;
}
