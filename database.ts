import dotenv from "dotenv";
import pg, { type Pool as PgPool } from "pg";

dotenv.config({ path: [".env.local", ".env"], quiet: true });

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL?.trim();

export const pool = connectionString
  ? new Pool({
      connectionString,
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    })
  : null;

export const migrations = [
  {
    version: "001_initial_schema",
    sql: `
      CREATE TABLE IF NOT EXISTS students (
        id VARCHAR(50) PRIMARY KEY,
        primer_nombre VARCHAR(100) NOT NULL DEFAULT '',
        segundo_nombre VARCHAR(100) NOT NULL DEFAULT '',
        primer_apellido VARCHAR(100) NOT NULL DEFAULT '',
        segundo_apellido VARCHAR(100) NOT NULL DEFAULT '',
        sexo VARCHAR(10) NOT NULL DEFAULT '',
        fecha_nacimiento JSONB NOT NULL DEFAULT '{}'::jsonb,
        escuela VARCHAR(255) NOT NULL DEFAULT '',
        turno VARCHAR(50) NOT NULL DEFAULT '',
        direccion JSONB NOT NULL DEFAULT '{}'::jsonb,
        profesor_educacion_fisica VARCHAR(255) NOT NULL DEFAULT '',
        practica_deporte VARCHAR(10) NOT NULL DEFAULT '',
        deporte_cual VARCHAR(100) NOT NULL DEFAULT '',
        entrenador_nombre VARCHAR(255) NOT NULL DEFAULT '',
        cumplio_calentamiento VARCHAR(10) NOT NULL DEFAULT '',
        measurement JSONB,
        results JSONB NOT NULL DEFAULT '{}'::jsonb,
        evaluation JSONB,
        created_by VARCHAR(128),
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE students ADD COLUMN IF NOT EXISTS created_by VARCHAR(128);
      ALTER TABLE students ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

      CREATE INDEX IF NOT EXISTS students_created_at_idx ON students (created_at DESC);
      CREATE INDEX IF NOT EXISTS students_school_idx ON students (escuela);
      CREATE INDEX IF NOT EXISTS students_created_by_idx ON students (created_by);

      CREATE TABLE IF NOT EXISTS teachers (
        id BIGSERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS schools (
        id BIGSERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      INSERT INTO teachers (name) VALUES
        ('Prof. Juan Pérez'),
        ('Profa. María Gómez'),
        ('Prof. Carlos Ruiz')
      ON CONFLICT (name) DO NOTHING;

      INSERT INTO schools (name) VALUES
        ('Miguel Hidalgo'),
        ('Benito Juárez'),
        ('Ignacio Zaragoza'),
        ('Niños Héroes')
      ON CONFLICT (name) DO NOTHING;
    `,
  },
] as const;

export async function runMigrations(databasePool: PgPool) {
  const client = await databasePool.connect();

  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext('talentlab_schema_migrations'))");
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(100) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    for (const migration of migrations) {
      const applied = await client.query(
        "SELECT 1 FROM schema_migrations WHERE version = $1",
        [migration.version],
      );

      if (applied.rowCount === 0) {
        await client.query(migration.sql);
        await client.query(
          "INSERT INTO schema_migrations (version) VALUES ($1)",
          [migration.version],
        );
      }
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export const databaseReady = pool && process.env.SKIP_AUTO_MIGRATION !== "1"
  ? runMigrations(pool).then(() => {
      console.log("PostgreSQL schema is ready.");
    })
  : Promise.resolve();
