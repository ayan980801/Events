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
  private googleClient: OAuth2Client;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    const googleClientId = this.configService.get('GOOGLE_CLIENT_ID');
    if (googleClientId) {
      this.googleClient = new OAuth2Client(googleClientId);
    }
  }

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
    if (!this.googleClient) {
      throw new UnauthorizedException('Google OAuth is not configured');
    }

    try {
      // Verify the Google token
      const ticket = await this.googleClient.verifyIdToken({
        idToken: token,
        audience: this.configService.get('GOOGLE_CLIENT_ID'),
      });

      const payload = ticket.getPayload();
      if (!payload) {
        throw new UnauthorizedException('Invalid Google token');
      }

      const { email, name, sub: googleId } = payload;
      if (!email) {
        throw new UnauthorizedException('Email not provided by Google');
      }

      // Check if user exists
      let user = await this.usersService.findByEmail(email);

      if (!user) {
        // Create new user
        user = await this.usersService.create({
          email,
          name: name || 'Google User',
          provider: AuthProvider.GOOGLE,
          providerId: googleId,
        });
      } else if (user.provider !== AuthProvider.GOOGLE) {
        // Update existing user to Google provider
        user = await this.usersService.updateProvider(user.id, AuthProvider.GOOGLE, googleId);
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
      console.error('Google auth error:', error);
      throw new UnauthorizedException('Google authentication failed');
    }
  }

  async appleAuth(token: string) {
    try {
      const appleClientId = this.configService.get('APPLE_CLIENT_ID');
      if (!appleClientId) {
        throw new UnauthorizedException('Apple OAuth is not configured');
      }

      // Verify the Apple token
      const appleData = await appleSignin.verifyIdToken(token, {
        audience: appleClientId,
        ignoreExpiration: false,
      });

      const { email, sub: appleId } = appleData;
      if (!email) {
        throw new UnauthorizedException('Email not provided by Apple');
      }

      // Check if user exists
      let user = await this.usersService.findByEmail(email);

      if (!user) {
        // Create new user
        user = await this.usersService.create({
          email,
          name: 'Apple User', // Apple doesn't always provide name
          provider: AuthProvider.APPLE,
          providerId: appleId,
        });
      } else if (user.provider !== AuthProvider.APPLE) {
        // Update existing user to Apple provider
        user = await this.usersService.updateProvider(user.id, AuthProvider.APPLE, appleId);
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
