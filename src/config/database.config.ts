import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  type: 'mysql' as const,
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  timezone: process.env.DB_TIMEZONE ?? 'Z',
  dateStrings: true,
  autoLoadEntities: true,
  synchronize: process.env.TYPEORM_SYNCHRONIZE === 'true',
}));
