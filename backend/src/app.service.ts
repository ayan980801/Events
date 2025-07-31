import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth(): { message: string; timestamp: string; uptime: number } {
    return {
      message: 'AI Chatbot API is healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  getVersion(): { version: string; environment: string } {
    return {
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    };
  }
}
