import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import pkg from "pg";
const { Pool } = pkg;
// Suppress connection errors during start by lazy initializing
import dotenv from "dotenv";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize PG Pool if DATABASE_URL is present
let pool: any = null;
const dbUrl = process.env.DATABASE_URL;

if (dbUrl) {
  console.log("Initializing Postgres Pool with Neon DATABASE_URL...");
  pool = new Pool({
    connectionString: dbUrl,
    ssl: {
      rejectUnauthorized: false // Required for Neon SSL connection
    }
  });
} else {
  console.warn("⚠️ DATABASE_URL environment variable is missing. The app will fall back to local in-memory storage. Please set DATABASE_URL in AI Studio Secrets.");
}

// In-Memory Fallbacks in case DATABASE_URL is not set yet
let memoryStudents: any[] = [];
let memoryTeachers: string[] = ['Juan Pérez', 'María Rodríguez', 'Carlos Gómez', 'Ana Martínez'];
let memorySchools: string[] = ['Miguel Hidalgo', 'Benito Juárez', 'Ignacio Zaragoza', 'Niños Héroes'];

// Auto-initialize DB tables if connected
async function initDb() {
  if (!pool) return;
  try {
    const client = await pool.connect();
    console.log("⚡ Connected to Neon PostgreSQL successfully! Running migrations...");
    
    // Create students table
    await client.query(`
      CREATE TABLE IF NOT EXISTS students (
        id VARCHAR(50) PRIMARY KEY,
        primer_nombre VARCHAR(100),
        segundo_nombre VARCHAR(100),
        primer_apellido VARCHAR(100),
        segundo_apellido VARCHAR(100),
        sexo VARCHAR(10),
        fecha_nacimiento JSONB,
        escuela VARCHAR(255),
        turno VARCHAR(50),
        direccion JSONB,
        profesor_educacion_fisica VARCHAR(255),
        practica_deporte VARCHAR(10),
        deporte_cual VARCHAR(100),
        entrenador_nombre VARCHAR(255),
        cumplio_calentamiento VARCHAR(10),
        measurement JSONB,
        results JSONB,
        evaluation JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create teachers table
    await client.query(`
      CREATE TABLE IF NOT EXISTS teachers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create schools table
    await client.query(`
      CREATE TABLE IF NOT EXISTS schools (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    client.release();
    console.log("✅ Neon Database migrations verified and table structure is ready.");
  } catch (error) {
    console.error("❌ Failed to run Neon database migrations:", error);
  }
}

// Run DB init
initDb();

// --- API ROUTES ---

// Health and DB status info
app.get("/api/db-status", async (req, res) => {
  if (!pool) {
    return res.json({ connected: false, message: "No DATABASE_URL provided. Fallback memory database active." });
  }
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({ connected: true, time: result.rows[0].now, message: "Connected to Neon PostgreSQL" });
  } catch (err: any) {
    res.status(500).json({ connected: false, error: err.message, message: "Postgres connection error." });
  }
});

// Students endpoints
app.get("/api/students", async (req, res) => {
  if (!pool) {
    return res.json(memoryStudents);
  }
  try {
    const result = await pool.query("SELECT * FROM students ORDER BY created_at DESC");
    const formatted = result.rows.map((row: any) => ({
      id: row.id,
      primerNombre: row.primer_nombre || "",
      segundoNombre: row.segundo_nombre || "",
      primerApellido: row.primer_apellido || "",
      segundoApellido: row.segundo_apellido || "",
      sexo: row.sexo || "",
      fechaNacimiento: row.fecha_nacimiento || { dia: "", mes: "", año: "" },
      escuela: row.escuela || "",
      turno: row.turno || "",
      direccion: row.direccion || { colonia: "", numeroExterior: "", numeroInterior: "" },
      profesorEducacionFisica: row.profesor_educacion_fisica || "",
      practicaDeporte: row.practica_deporte || "",
      deporteCual: row.deporte_cual || "",
      entrenadorNombre: row.entrenador_nombre || "",
      cumplioCalentamiento: row.cumplio_calentamiento || "",
      measurement: row.measurement || null,
      results: row.results || {
        peso: "", estatura: "", flexibilidad: "", velocidad: "", 
        lagartijas: "", abdominales: "", salto: "", resistencia: ""
      },
      evaluation: row.evaluation || null
    }));
    res.json(formatted);
  } catch (err: any) {
    console.error("Error reading students from Neon:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/students", async (req, res) => {
  const s = req.body;
  if (!s || !s.id) {
    return res.status(400).json({ error: "Missing student data or ID" });
  }

  if (!pool) {
    const idx = memoryStudents.findIndex(item => item.id === s.id);
    if (idx !== -1) {
      memoryStudents[idx] = s;
    } else {
      memoryStudents.push(s);
    }
    return res.json({ success: true, student: s, localFallback: true });
  }

  try {
    // Check if student exists
    const checkEx = await pool.query("SELECT id FROM students WHERE id = $1", [s.id]);
    if (checkEx.rows.length > 0) {
      // Update
      await pool.query(`
        UPDATE students SET 
          primer_nombre = $1,
          segundo_nombre = $2,
          primer_apellido = $3,
          segundo_apellido = $4,
          sexo = $5,
          fecha_nacimiento = $6,
          escuela = $7,
          turno = $8,
          direccion = $9,
          profesor_educacion_fisica = $10,
          practica_deporte = $11,
          deporte_cual = $12,
          entrenador_nombre = $13,
          cumplio_calentamiento = $14,
          measurement = $15,
          results = $16,
          evaluation = $17
        WHERE id = $18
      `, [
        s.primerNombre, s.segundoNombre, s.primerApellido, s.segundoApellido,
        s.sexo, JSON.stringify(s.fechaNacimiento), s.escuela, s.turno,
        JSON.stringify(s.direccion), s.profesorEducacionFisica, s.practicaDeporte,
        s.deporteCual, s.entrenadorNombre, s.cumplioCalentamiento,
        JSON.stringify(s.measurement), JSON.stringify(s.results),
        JSON.stringify(s.evaluation), s.id
      ]);
    } else {
      // Insert
      await pool.query(`
        INSERT INTO students (
          id, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido,
          sexo, fecha_nacimiento, escuela, turno, direccion,
          profesor_educacion_fisica, practica_deporte, deporte_cual,
          entrenador_nombre, cumplio_calentamiento, measurement, results, evaluation
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
        )
      `, [
        s.id, s.primerNombre, s.segundoNombre, s.primerApellido, s.segundoApellido,
        s.sexo, JSON.stringify(s.fechaNacimiento), s.escuela, s.turno,
        JSON.stringify(s.direccion), s.profesorEducacionFisica, s.practicaDeporte,
        s.deporteCual, s.entrenadorNombre, s.cumplioCalentamiento,
        JSON.stringify(s.measurement), JSON.stringify(s.results),
        JSON.stringify(s.evaluation)
      ]);
    }
    res.json({ success: true, student: s });
  } catch (err: any) {
    console.error("Error saving student to Neon:", err);
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/students/:id", async (req, res) => {
  const { id } = req.params;
  if (!pool) {
    memoryStudents = memoryStudents.filter(item => item.id !== id);
    return res.json({ success: true, localFallback: true });
  }
  try {
    await pool.query("DELETE FROM students WHERE id = $1", [id]);
    res.json({ success: true });
  } catch (err: any) {
    console.error("Error deleting student from Neon:", err);
    res.status(500).json({ error: err.message });
  }
});

// Teachers endpoints
app.get("/api/teachers", async (req, res) => {
  if (!pool) {
    return res.json(memoryTeachers);
  }
  try {
    const result = await pool.query("SELECT name FROM teachers ORDER BY created_at ASC");
    const dbItems = result.rows.map((r: any) => r.name);
    // Combine with default values securely
    const defaults = ['Juan Pérez', 'María Rodríguez', 'Carlos Gómez', 'Ana Martínez'];
    const combined = Array.from(new Set([...defaults, ...dbItems]));
    res.json(combined);
  } catch (err: any) {
    console.error("Error reading teachers from Neon:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/teachers", async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Missing teacher name" });
  }
  const nameTrim = name.trim();

  if (!pool) {
    if (!memoryTeachers.includes(nameTrim)) {
      memoryTeachers.push(nameTrim);
    }
    return res.json({ success: true, name: nameTrim, localFallback: true });
  }

  try {
    // Insert if not exists
    await pool.query("INSERT INTO teachers (name) VALUES ($1) ON CONFLICT (name) DO NOTHING", [nameTrim]);
    res.json({ success: true, name: nameTrim });
  } catch (err: any) {
    console.error("Error saving teacher to Neon:", err);
    res.status(500).json({ error: err.message });
  }
});

// Schools endpoints
app.get("/api/schools", async (req, res) => {
  if (!pool) {
    return res.json(memorySchools);
  }
  try {
    const result = await pool.query("SELECT name FROM schools ORDER BY created_at ASC");
    const dbItems = result.rows.map((r: any) => r.name);
    const defaults = ['Miguel Hidalgo', 'Benito Juárez', 'Ignacio Zaragoza', 'Niños Héroes'];
    const combined = Array.from(new Set([...defaults, ...dbItems]));
    res.json(combined);
  } catch (err: any) {
    console.error("Error reading schools from Neon:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/schools", async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Missing school name" });
  }
  const nameTrim = name.trim();

  if (!pool) {
    if (!memorySchools.includes(nameTrim)) {
      memorySchools.push(nameTrim);
    }
    return res.json({ success: true, name: nameTrim, localFallback: true });
  }

  try {
    // Insert if not exists
    await pool.query("INSERT INTO schools (name) VALUES ($1) ON CONFLICT (name) DO NOTHING", [nameTrim]);
    res.json({ success: true, name: nameTrim });
  } catch (err: any) {
    console.error("Error saving school to Neon:", err);
    res.status(500).json({ error: err.message });
  }
});

// --- VITE MIDDLEWARE ---

async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite dev server mounted as Express middleware (HMR is platform-handled).");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Serving build static files from:", distPath);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Full-stack app running on http://localhost:${PORT}`);
  });
}

setupVite();
