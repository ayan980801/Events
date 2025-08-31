import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import * as appleSignin from 'apple-signin-auth';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthProvider } from '../users/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
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
    const client = new OAuth2Client(this.configService.get('GOOGLE_CLIENT_ID'));
    try {
      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: this.configService.get('GOOGLE_CLIENT_ID'),
      });
      const payload = ticket.getPayload();
      
      if (!payload) {
        throw new UnauthorizedException('Invalid Google token');
      }

      const { email, name, picture, sub } = payload;
      
      // Check if user exists
      let user = await this.usersService.findByEmail(email);
      
      if (!user) {
        // Create new user from Google account
        user = await this.usersService.create({
          email,
          name: name || 'Google User',
          provider: AuthProvider.GOOGLE,
          providerId: sub,
          avatar: picture,
        });
      }

      // Generate JWT token
      const jwtPayload = { sub: user.id, email: user.email };
      const jwtToken = this.jwtService.sign(jwtPayload);

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
        },
        token: jwtToken,
      };
    } catch (error) {
      console.error('Google auth error:', error);
      throw new UnauthorizedException('Invalid Google token');
    }
  }

  async appleAuth(token: string) {
    try {
      const clientId = this.configService.get('APPLE_CLIENT_ID');
      const appleData = await appleSignin.verifyIdToken(token, {
        audience: clientId,
        ignoreExpiration: false,
      });

      const { email, sub } = appleData;
      
      if (!email || !sub) {
        throw new UnauthorizedException('Invalid Apple token');
      }

      // Check if user exists
      let user = await this.usersService.findByEmail(email);
      
      if (!user) {
        // Create new user from Apple account
        user = await this.usersService.create({
          email,
          name: 'Apple User', // Apple doesn't always provide name
          provider: AuthProvider.APPLE,
          providerId: sub,
        });
      }

      // Generate JWT token
      const jwtPayload = { sub: user.id, email: user.email };
      const jwtToken = this.jwtService.sign(jwtPayload);

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        token: jwtToken,
      };
    } catch (error) {
      console.error('Apple auth error:', error);
      throw new UnauthorizedException('Invalid Apple token');
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
