import * as dotenv from 'dotenv';
import { createConnection } from 'mysql2/promise';

dotenv.config();

type RequiredEnvKey =
  | 'DB_HOST'
  | 'DB_PORT'
  | 'DB_USER'
  | 'DB_PASSWORD'
  | 'DB_NAME';

function getRequiredEnv(name: RequiredEnvKey): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function quoteIdentifier(identifier: string): string {
  return `\`${identifier.replace(/`/g, '``')}\``;
}

async function bootstrapDatabase(): Promise<void> {
  const host = getRequiredEnv('DB_HOST');
  const port = Number(getRequiredEnv('DB_PORT'));
  const user = getRequiredEnv('DB_USER');
  const password = getRequiredEnv('DB_PASSWORD');
  const database = getRequiredEnv('DB_NAME');

  if (Number.isNaN(port)) {
    throw new Error('DB_PORT must be a valid number');
  }

  const connection = await createConnection({
    host,
    port,
    user,
    password,
    multipleStatements: false,
  });

  try {
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS ${quoteIdentifier(database)} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
    console.log(`Database "${database}" is ready.`);
  } finally {
    await connection.end();
  }
}

bootstrapDatabase().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown error';
  console.error(`Database bootstrap failed: ${message}`);
  process.exit(1);
});
