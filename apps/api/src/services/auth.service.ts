import { prisma } from '../lib/prisma.js';
import { hashPassword, comparePassword, generateToken, hashToken } from '../utils/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { RegisterInput, LoginInput } from '@dinepilot/validation';
import { UserRole } from '@dinepilot/types';

const SESSION_EXPIRY_DAYS = 30;

export class AuthService {
  /**
   * Register a new user
   */
  static async register(input: RegisterInput) {
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (existingUser) {
      throw new AppError('An account with this email already exists.', 409, 'EMAIL_ALREADY_EXISTS');
    }

    const passwordHash = await hashPassword(input.password);

    const user = await prisma.user.create({
      data: {
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        email: input.email.toLowerCase().trim(),
        passwordHash,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const { token, expiresAt } = await this.createSession(user.id);

    return { user, token, expiresAt };
  }

  /**
   * Authenticate user credentials
   */
  static async login(input: LoginInput) {
    const user = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase().trim() },
      include: {
        restaurants: {
          include: {
            restaurant: true,
          },
        },
      },
    });

    if (!user) {
      throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
    }

    const isPasswordValid = await comparePassword(input.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
    }

    const { token, expiresAt } = await this.createSession(user.id);

    const primaryRestaurantUser = user.restaurants[0];

    const userData = {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      role: primaryRestaurantUser ? (primaryRestaurantUser.role as UserRole) : UserRole.OWNER,
      restaurantId: primaryRestaurantUser ? primaryRestaurantUser.restaurantId : undefined,
      restaurant: primaryRestaurantUser ? primaryRestaurantUser.restaurant : null,
    };

    return { user: userData, token, expiresAt };
  }

  /**
   * Helper to generate session token & save to DB
   */
  static async createSession(userId: string) {
    const rawToken = generateToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + SESSION_EXPIRY_DAYS);

    await prisma.session.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });

    return { token: rawToken, expiresAt };
  }

  /**
   * Logout / destroy session
   */
  static async logout(token: string) {
    if (!token) return;
    const tokenHash = hashToken(token);
    await prisma.session.deleteMany({
      where: { tokenHash },
    }).catch(() => {});
  }
}
