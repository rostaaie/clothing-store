import 'reflect-metadata';
import 'dotenv/config';
import { join } from 'path';
import { DataSource, DataSourceOptions } from 'typeorm';
import { SeederOptions } from 'typeorm-extension';

/**
 * DataSource مستقل مخصوص اجرای seed ها (typeorm-extension).
 * مستقیماً از متغیرهای .env خوانده می‌شود و به NestJS وابسته نیست؛
 * پس می‌توان آن را با `npm run seed` خارج از اپلیکیشن اجرا کرد.
 */
export const dataSource = new DataSource({
  type: 'mysql',
  host: (process.env.DB_HOST || 'localhost').trim(),
  port: parseInt((process.env.DB_PORT || '3306').trim(), 10),
  username: (process.env.DB_USERNAME || '').trim(),
  password: process.env.DB_PASSWORD || '',
  database: (process.env.DB_DATABASE || '').trim(),
  entities: [join(__dirname, '..', '**', '*.entity.{ts,js}')],
  // مثل app.module، جدول‌ها در این پروژه با synchronize ساخته می‌شوند
  synchronize: true,
  logging: false,
  seeds: [join(__dirname, 'seeds', '**', '*.{ts,js}')],
} as DataSourceOptions & SeederOptions);
