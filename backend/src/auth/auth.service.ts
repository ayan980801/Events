import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import axios from 'axios';
import * as jwt from 'jsonwebtoken';
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
      const { data } = await axios.get('https://oauth2.googleapis.com/tokeninfo', {
        params: { id_token: token },
      });

      const email = data.email as string | undefined;
      const googleId = data.sub as string | undefined;
      const name = (data.name as string | undefined) ??
        `${data.given_name ?? ''} ${data.family_name ?? ''}`.trim();

      if (!email || !googleId) {
        throw new UnauthorizedException('Invalid Google token');
      }

      let user = await this.usersService.findByEmail(email);
      if (!user) {
        user = await this.usersService.create({
          email,
          name: name || 'Google User',
          provider: AuthProvider.GOOGLE,
          providerId: googleId,
        });
      }

      const payload = { sub: user.id, email: user.email };
      const jwt = this.jwtService.sign(payload);

      return {
        user: { id: user.id, email: user.email, name: user.name },
        token: jwt,
      };
    } catch (err) {
      throw new UnauthorizedException('Google authentication failed');
    }
  }

  async appleAuth(token: string) {
    try {
      const decoded: any = jwt.decode(token);
      if (!decoded || !decoded.sub) {
        throw new UnauthorizedException('Invalid Apple token');
      }

      const email: string | undefined = decoded.email;
      const appleId: string = decoded.sub;

      let user = email ? await this.usersService.findByEmail(email) : null;
      if (!user) {
        user = await this.usersService.create({
          email: email ?? `apple-${appleId}@example.com`,
          name: 'Apple User',
          provider: AuthProvider.APPLE,
          providerId: appleId,
        });
      }

      const payload = { sub: user.id, email: user.email };
      const jwtToken = this.jwtService.sign(payload);

      return {
        user: { id: user.id, email: user.email, name: user.name },
        token: jwtToken,
      };
    } catch (err) {
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
