#!/usr/bin/env ts-node

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { UsersService } from '../../users/users.service';
import { AuthProvider, SubscriptionTier } from '../../users/entities/user.entity';
import * as bcrypt from 'bcryptjs';

async function seedDatabase() {
  console.log('🌱 Starting database seeding...');
  
  const app = await NestFactory.createApplicationContext(AppModule);
  const usersService = app.get(UsersService);

  try {
    // Create demo users
    const demoUsers = [
      {
        name: 'Demo User',
        email: 'demo@example.com',
        password: await bcrypt.hash('Demo123!', 12),
        provider: AuthProvider.EMAIL,
        subscriptionTier: SubscriptionTier.FREE,
        defaultModel: 'gpt-3.5-turbo',
        preferences: {
          theme: 'light',
          notifications: true,
          language: 'en',
        },
      },
      {
        name: 'Premium User',
        email: 'premium@example.com',
        password: await bcrypt.hash('Premium123!', 12),
        provider: AuthProvider.EMAIL,
        subscriptionTier: SubscriptionTier.PREMIUM,
        defaultModel: 'gpt-4',
        preferences: {
          theme: 'dark',
          notifications: true,
          language: 'en',
        },
      },
      {
        name: 'Enterprise User',
        email: 'enterprise@example.com',
        password: await bcrypt.hash('Enterprise123!', 12),
        provider: AuthProvider.EMAIL,
        subscriptionTier: SubscriptionTier.ENTERPRISE,
        defaultModel: 'gpt-4',
        preferences: {
          theme: 'system',
          notifications: false,
          language: 'en',
        },
      },
      {
        name: 'Google User',
        email: 'google@example.com',
        provider: AuthProvider.GOOGLE,
        providerId: 'google_123456789',
        subscriptionTier: SubscriptionTier.FREE,
        defaultModel: 'gpt-3.5-turbo',
        preferences: {
          theme: 'light',
          notifications: true,
          language: 'en',
        },
      },
      {
        name: 'Apple User',
        email: 'apple@example.com',
        provider: AuthProvider.APPLE,
        providerId: 'apple_123456789',
        subscriptionTier: SubscriptionTier.FREE,
        defaultModel: 'gpt-3.5-turbo',
        preferences: {
          theme: 'dark',
          notifications: true,
          language: 'en',
        },
      },
    ];

    console.log('👥 Creating demo users...');
    
    for (const userData of demoUsers) {
      try {
        // Check if user already exists
        const existingUser = await usersService.findByEmail(userData.email);
        if (existingUser) {
          console.log(`⚠️  User ${userData.email} already exists, skipping...`);
          continue;
        }

        const user = await usersService.create(userData as any);
        console.log(`✅ Created user: ${user.email} (${user.subscriptionTier})`);
      } catch (error) {
        console.error(`❌ Failed to create user ${userData.email}:`, error.message);
      }
    }

    console.log('🎉 Database seeding completed successfully!');
    
    // Print summary
    console.log('\n📊 Seeding Summary:');
    console.log('==================');
    console.log('Demo Users Created:');
    console.log('- demo@example.com (password: Demo123!) - Free tier');
    console.log('- premium@example.com (password: Premium123!) - Premium tier');
    console.log('- enterprise@example.com (password: Enterprise123!) - Enterprise tier');
    console.log('- google@example.com - OAuth Google user');
    console.log('- apple@example.com - OAuth Apple user');
    console.log('\n💡 Use these credentials to test the application');
    
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    throw error;
  } finally {
    await app.close();
  }
}

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('✨ Seeding process completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Seeding process failed:', error);
      process.exit(1);
    });
}

export { seedDatabase };