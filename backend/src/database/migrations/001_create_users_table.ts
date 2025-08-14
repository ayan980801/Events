import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateUsersTable1701234567890 implements MigrationInterface {
  name = 'CreateUsersTable1701234567890';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'email',
            type: 'varchar',
            length: '255',
            isUnique: true,
          },
          {
            name: 'password',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'provider',
            type: 'enum',
            enum: ['email', 'google', 'apple'],
            default: "'email'",
          },
          {
            name: 'providerId',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'subscriptionTier',
            type: 'enum',
            enum: ['free', 'premium', 'enterprise'],
            default: "'free'",
          },
          {
            name: 'subscriptionExpiresAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'defaultModel',
            type: 'varchar',
            length: '100',
            default: "'gpt-3.5-turbo'",
          },
          {
            name: 'preferences',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex('users', new TableIndex({
      name: 'IDX_USERS_EMAIL',
      columnNames: ['email']
    }));
    
    await queryRunner.createIndex('users', new TableIndex({
      name: 'IDX_USERS_PROVIDER_ID',
      columnNames: ['provider', 'providerId']
    }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('users');
  }
}