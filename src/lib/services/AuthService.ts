import { conflict, unauthorized } from "@/lib/domain/errors";
import type { IUserRepository } from "@/lib/domain/repositories";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

export class AuthService {
  constructor(private readonly userRepo: IUserRepository) {}

  async login(
    email: string,
    password: string,
  ): Promise<{ id: string; email: string }> {
    const user = await this.userRepo.findByEmail(email);

    if (!user) {
      throw unauthorized("Invalid credentials");
    }

    const isValid = await verifyPassword(password, user.password_hash);

    if (!isValid) {
      throw unauthorized("Invalid credentials");
    }

    return { id: user.id, email: user.email };
  }

  async register(
    email: string,
    password: string,
  ): Promise<{ id: string; email: string }> {
    const existing = await this.userRepo.findByEmail(email);

    if (existing) {
      throw conflict("Email already exists");
    }

    const passwordHash = await hashPassword(password);
    return this.userRepo.create(email, passwordHash);
  }
}
