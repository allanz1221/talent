import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { databaseReady, pool } from "./database.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3000;

app.use(express.json());

if (!pool) {
  console.warn("DATABASE_URL is missing. Temporary in-memory storage is active.");
}

// In-Memory Fallbacks in case DATABASE_URL is not set yet
let memoryStudents: any[] = [];
let memoryTeachers: string[] = ['Prof. Juan Pérez', 'Profa. María Gómez', 'Prof. Carlos Ruiz'];
let memorySchools: string[] = ['Miguel Hidalgo', 'Benito Juárez', 'Ignacio Zaragoza', 'Niños Héroes'];

app.use("/api", async (_req, res, next) => {
  try {
    await databaseReady;
    next();
  } catch (error) {
    console.error("Database initialization failed:", error);
    res.status(503).json({
      error: "Database is not ready",
      message: "No fue posible conectar con PostgreSQL.",
    });
  }
});

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
    await pool.query(`
      INSERT INTO students (
        id, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido,
        sexo, fecha_nacimiento, escuela, turno, direccion,
        profesor_educacion_fisica, practica_deporte, deporte_cual,
        entrenador_nombre, cumplio_calentamiento, measurement, results,
        evaluation, created_by, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
        $15, $16, $17, $18, $19, CURRENT_TIMESTAMP
      )
      ON CONFLICT (id) DO UPDATE SET
        primer_nombre = EXCLUDED.primer_nombre,
        segundo_nombre = EXCLUDED.segundo_nombre,
        primer_apellido = EXCLUDED.primer_apellido,
        segundo_apellido = EXCLUDED.segundo_apellido,
        sexo = EXCLUDED.sexo,
        fecha_nacimiento = EXCLUDED.fecha_nacimiento,
        escuela = EXCLUDED.escuela,
        turno = EXCLUDED.turno,
        direccion = EXCLUDED.direccion,
        profesor_educacion_fisica = EXCLUDED.profesor_educacion_fisica,
        practica_deporte = EXCLUDED.practica_deporte,
        deporte_cual = EXCLUDED.deporte_cual,
        entrenador_nombre = EXCLUDED.entrenador_nombre,
        cumplio_calentamiento = EXCLUDED.cumplio_calentamiento,
        measurement = EXCLUDED.measurement,
        results = EXCLUDED.results,
        evaluation = EXCLUDED.evaluation,
        created_by = COALESCE(students.created_by, EXCLUDED.created_by),
        updated_at = CURRENT_TIMESTAMP
    `, [
      s.id, s.primerNombre || "", s.segundoNombre || "", s.primerApellido || "",
      s.segundoApellido || "", s.sexo || "", s.fechaNacimiento || {}, s.escuela || "",
      s.turno || "", s.direccion || {}, s.profesorEducacionFisica || "",
      s.practicaDeporte || "", s.deporteCual || "", s.entrenadorNombre || "",
      s.cumplioCalentamiento || "", s.measurement || null, s.results || {},
      s.evaluation || null, s.createdBy || null,
    ]);
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
    res.json(result.rows.map((row: any) => row.name));
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
    res.json(result.rows.map((row: any) => row.name));
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
    const { createServer: createViteServer } = await import("vite");
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

  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Full-stack app running on http://localhost:${PORT}`);
    });
  }
}

setupVite();

export default app;
