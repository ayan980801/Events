import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthProvider } from '../users/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { email, password, name } = registerDto;

    // Check if user already exists
    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      throw new UnauthorizedException('User already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await this.usersService.create({
      email,
      password: hashedPassword,
      name,
      provider: AuthProvider.EMAIL,
    });

    // Generate JWT token
    const payload = { sub: user.id, email: user.email };
    const token = this.jwtService.sign(payload);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      token,
    };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // Find user
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate JWT token
    const payload = { sub: user.id, email: user.email };
    const token = this.jwtService.sign(payload);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      token,
    };
  }

  async googleAuth(token: string) {
    try {
      // Verify Google token (in a real implementation, you'd verify with Google's API)
      // For now, we'll implement a mock verification that accepts any token starting with 'google_'
      if (!token || !token.startsWith('google_')) {
        throw new UnauthorizedException('Invalid Google token');
      }

      // Mock Google user data (in real implementation, get from Google API)
      const googleUser = {
        id: 'google_user_123',
        email: 'user@gmail.com',
        name: 'Google User',
        verified_email: true,
      };

      // Check if user exists
      let user = await this.usersService.findByEmail(googleUser.email);
      
      if (!user) {
        // Create new user
        user = await this.usersService.create({
          email: googleUser.email,
          name: googleUser.name,
          provider: AuthProvider.GOOGLE,
          providerId: googleUser.id,
        });
      }

      // Generate JWT token
      const payload = { sub: user.id, email: user.email };
      const jwtToken = this.jwtService.sign(payload);

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        token: jwtToken,
      };
    } catch (error) {
      throw new UnauthorizedException('Google authentication failed');
    }
  }

  async appleAuth(token: string) {
    try {
      // Verify Apple token (in a real implementation, you'd verify with Apple's API)
      // For now, we'll implement a mock verification that accepts any token starting with 'apple_'
      if (!token || !token.startsWith('apple_')) {
        throw new UnauthorizedException('Invalid Apple token');
      }

      // Mock Apple user data (in real implementation, get from Apple API)
      const appleUser = {
        sub: 'apple_user_123',
        email: 'user@icloud.com',
        name: 'Apple User',
        email_verified: true,
      };

      // Check if user exists
      let user = await this.usersService.findByEmail(appleUser.email);
      
      if (!user) {
        // Create new user
        user = await this.usersService.create({
          email: appleUser.email,
          name: appleUser.name,
          provider: AuthProvider.APPLE,
          providerId: appleUser.sub,
        });
      }

      // Generate JWT token
      const payload = { sub: user.id, email: user.email };
      const jwtToken = this.jwtService.sign(payload);

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        token: jwtToken,
      };
    } catch (error) {
      throw new UnauthorizedException('Apple authentication failed');
    }
  }

  async refreshToken(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const payload = { sub: user.id, email: user.email };
    const token = this.jwtService.sign(payload);

    return { token };
  }

  async validateUser(userId: string) {
    return this.usersService.findById(userId);
  }
}