import { Global, Module } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { SimpleJwtAuthGuard } from './simple-jwt-auth.guard';
import { UsersModule } from '../../users/users.module';

@Global()
@Module({
  imports: [UsersModule],
  providers: [JwtAuthGuard, SimpleJwtAuthGuard],
  exports: [JwtAuthGuard, SimpleJwtAuthGuard],
})
export class GuardsModule {}