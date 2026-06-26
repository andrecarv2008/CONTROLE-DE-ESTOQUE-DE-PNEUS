import { NextRequest, NextResponse } from "next/server";
import postgres from "postgres";
import { FULL_INITIAL_DATASET } from "@/lib/tireData";

export async function POST(req: NextRequest) {
  const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

  if (!dbUrl) {
    return NextResponse.json({
      success: false,
      message: "DATABASE_URL or SUPABASE_DB_URL environment variable is not defined. Automatic table creation skipped."
    }, { status: 200 }); // Return 200 to not block frontend initialization
  }

  let sql;
  try {
    // Initialize Postgres client with SSL require (Supabase requirement)
    sql = postgres(dbUrl, {
      ssl: "require",
      connect_timeout: 10,
    });

    // 1. Create settings table
    await sql`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, now()) NOT NULL
      );
    `;

    // 2. Create tires table
    await sql`
      CREATE TABLE IF NOT EXISTS tires (
        id TEXT PRIMARY KEY,
        qtd INTEGER NOT NULL DEFAULT 1,
        cd_filial TEXT NOT NULL,
        fogo TEXT NOT NULL,
        n_vida INTEGER NOT NULL,
        km_percorrido INTEGER NOT NULL,
        ano INTEGER NOT NULL,
        mes TEXT NOT NULL,
        dias_em_estoque INTEGER NOT NULL,
        modelo TEXT NOT NULL,
        motivo_desinstalacao TEXT NOT NULL,
        borracha TEXT NOT NULL,
        dimensao TEXT NOT NULL,
        filial TEXT,
        s1 TEXT,
        s2 TEXT,
        s3 TEXT,
        s4 TEXT,
        s5 TEXT,
        data_evento TEXT,
        posicao TEXT,
        placa TEXT,
        marca TEXT,
        ano_desinstalacao INTEGER,
        mes_analisado TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, now()) NOT NULL
      );
    `;

    // 3. Create index for performance
    await sql`
      CREATE INDEX IF NOT EXISTS idx_tires_fogo ON tires (fogo);
    `;

    // 4. Check if tires table is empty
    const tiresCountResult = await sql`
      SELECT COUNT(*) as count FROM tires;
    `;
    const count = Number(tiresCountResult[0]?.count || 0);

    let seededCount = 0;
    if (count === 0) {
      // Seed with FULL_INITIAL_DATASET
      console.log("Seeding database with initial dataset of tires...");
      
      // Perform batch inserts
      for (const t of FULL_INITIAL_DATASET) {
        await sql`
          INSERT INTO tires (
            id, qtd, cd_filial, fogo, n_vida, km_percorrido, ano, mes, dias_em_estoque,
            modelo, motivo_desinstalacao, borracha, dimensao, filial, s1, s2, s3, s4, s5,
            data_evento, posicao, placa, marca, ano_desinstalacao, mes_analisado
          ) VALUES (
            ${t.id}, ${t.qtd ?? 1}, ${t.cdFilial}, ${t.fogo}, ${t.nVida}, ${t.kmPercorrido}, ${t.ano}, ${t.mes}, ${t.diasEmEstoque},
            ${t.modelo}, ${t.motivoDesinstalacao}, ${t.borracha}, ${t.dimensao}, ${t.filial || null}, ${t.s1 || null}, ${t.s2 || null}, ${t.s3 || null}, ${t.s4 || null}, ${t.s5 || null},
            ${t.dataEvento || null}, ${t.posicao || null}, ${t.placa || null}, ${t.marca || null}, ${t.anoDesinstalacao ?? null}, ${t.mesAnalisado || null}
          ) ON CONFLICT (id) DO NOTHING;
        `;
        seededCount++;
      }
    }

    // Clean up SQL client connection
    await sql.end();

    return NextResponse.json({
      success: true,
      message: "Database tables initialized successfully.",
      seeded: count === 0,
      seededCount
    });

  } catch (err: any) {
    console.error("Database initialization error:", err);
    if (sql) {
      try { await sql.end(); } catch {}
    }
    return NextResponse.json({
      success: false,
      message: "Failed to initialize database: " + err.message
    }, { status: 500 });
  }
}
