import { Tire } from "@/lib/tireData";

// Mapper from Frontend (camelCase) to Database (snake_case)
export function toDbTire(t: Tire) {
  return {
    id: t.id,
    qtd: t.qtd ?? 1,
    cd_filial: t.cdFilial,
    fogo: t.fogo,
    n_vida: t.nVida,
    km_percorrido: t.kmPercorrido,
    ano: t.ano,
    mes: t.mes,
    dias_em_estoque: t.diasEmEstoque,
    modelo: t.modelo,
    motivo_desinstalacao: t.motivoDesinstalacao,
    borracha: t.borracha,
    dimensao: t.dimensao,
    filial: t.filial || null,
    s1: t.s1 || null,
    s2: t.s2 || null,
    s3: t.s3 || null,
    s4: t.s4 || null,
    s5: t.s5 || null,
    data_evento: t.dataEvento || null,
    posicao: t.posicao || null,
    placa: t.placa || null,
    marca: t.marca || null,
    ano_desinstalacao: t.anoDesinstalacao ?? null,
    mes_analisado: t.mesAnalisado || null
  };
}

// Mapper from Database (snake_case) to Frontend (camelCase)
export function fromDbTire(db: any): Tire {
  return {
    id: db.id,
    qtd: Number(db.qtd ?? 1),
    cdFilial: db.cd_filial,
    fogo: db.fogo,
    nVida: Number(db.n_vida),
    kmPercorrido: Number(db.km_percorrido),
    ano: Number(db.ano),
    mes: db.mes,
    diasEmEstoque: Number(db.dias_em_estoque),
    modelo: db.modelo,
    motivoDesinstalacao: db.motivo_desinstalacao,
    borracha: db.borracha,
    dimensao: db.dimensao,
    filial: db.filial || undefined,
    s1: db.s1 || undefined,
    s2: db.s2 || undefined,
    s3: db.s3 || undefined,
    s4: db.s4 || undefined,
    s5: db.s5 || undefined,
    dataEvento: db.data_evento || undefined,
    posicao: db.posicao || undefined,
    placa: db.placa || undefined,
    marca: db.marca || undefined,
    anoDesinstalacao: db.ano_desinstalacao ? Number(db.ano_desinstalacao) : undefined,
    mesAnalisado: db.mes_analisado || undefined
  };
}

export const tireService = {
  // Trigger table setup if not done already
  async initDb(): Promise<boolean> {
    try {
      const res = await fetch("/api/init-db", { method: "POST" });
      if (!res.ok) return false;
      const data = await res.json();
      return data.success;
    } catch (err) {
      console.error("Erro ao inicializar banco de dados via API:", err);
      return false;
    }
  },

  // Get all tires from Supabase
  async getAll(): Promise<{ tires: Tire[]; supabaseConfigured: boolean }> {
    try {
      const res = await fetch("/api/tires");
      if (!res.ok) throw new Error("Erro na rede ao buscar pneus");
      const data = await res.json();
      
      if (data.supabaseConfigured === false) {
        return { tires: [], supabaseConfigured: false };
      }
      
      if (!data.success) {
        throw new Error(data.message || "Erro desconhecido ao carregar pneus");
      }
      
      return {
        tires: data.tires || [],
        supabaseConfigured: data.supabaseConfigured !== false
      };
    } catch (err: any) {
      console.warn("Aviso no tireService.getAll (esperado se Supabase não estiver configurado):", err.message || err);
      return { tires: [], supabaseConfigured: false };
    }
  },

  // Save a single tire (create or update)
  async save(tire: Tire): Promise<Tire> {
    try {
      const res = await fetch("/api/tires", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save", tire }),
      });
      if (!res.ok) throw new Error("Erro de rede ao salvar pneu");
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Erro ao salvar pneu");
      return data.tire;
    } catch (err: any) {
      console.error("Erro no tireService.save:", err);
      throw err;
    }
  },

  // Delete a tire
  async delete(id: string): Promise<boolean> {
    try {
      const res = await fetch("/api/tires", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id }),
      });
      if (!res.ok) throw new Error("Erro de rede ao excluir pneu");
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Erro ao excluir pneu");
      return true;
    } catch (err: any) {
      console.error("Erro no tireService.delete:", err);
      throw err;
    }
  },

  // Bulk import tires (replace all or append)
  async bulkImport(tires: Tire[], replaceExisting: boolean): Promise<Tire[]> {
    try {
      const res = await fetch("/api/tires", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "bulk", tires, replaceExisting }),
      });
      if (!res.ok) throw new Error("Erro de rede ao importar planilha");
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Erro ao importar planilha");
      return data.tires;
    } catch (err: any) {
      console.error("Erro no tireService.bulkImport:", err);
      throw err;
    }
  }
};
