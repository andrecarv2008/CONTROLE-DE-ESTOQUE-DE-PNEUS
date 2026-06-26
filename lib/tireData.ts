export interface Tire {
  id: string;
  qtd: number; // usually 1
  cdFilial: string; // e.g. "CD IMPERATRIZ", "INDUSTRIA DE PÃES CD-119"
  fogo: string; // e.g. "7916", "GM5161", "8220", "7941"
  nVida: number; // e.g. 1, 5, 2, 2
  kmPercorrido: number; // e.g. 29830, 213912
  ano: number; // e.g. 2025, 2026
  mes: string; // e.g. "Janeiro", "Fevereiro", "Julho", "Outubro"
  diasEmEstoque: number; // e.g. 489, 329, 260, 174
  modelo: string; // e.g. "GOODYEAR", "MICHELIN", "XBRI"
  motivoDesinstalacao: string;
  borracha: string;
  dimensao: string;

  // Additional recognized columns from spreadsheet imports
  filial?: string;
  s1?: string;
  s2?: string;
  s3?: string;
  s4?: string;
  s5?: string;
  dataEvento?: string;
  posicao?: string;
  placa?: string;
  marca?: string;
  anoDesinstalacao?: number;
  mesAnalisado?: string;
}

export const INITIAL_TIRES: Tire[] = [
  // First 4 tires visible in the table
  {
    id: "1",
    qtd: 1,
    cdFilial: "INDUSTRIA DE PÃES CD-119",
    fogo: "7916",
    nVida: 1,
    kmPercorrido: 29830,
    ano: 2025,
    mes: "Fevereiro",
    diasEmEstoque: 489,
    modelo: "GOODYEAR",
    motivoDesinstalacao: "REFORMA",
    borracha: "VL100",
    dimensao: "275/80 R. 22,5"
  },
  {
    id: "2",
    qtd: 1,
    cdFilial: "CD IMPERATRIZ",
    fogo: "GM5161",
    nVida: 5,
    kmPercorrido: 213912,
    ano: 2025,
    mes: "Julho",
    diasEmEstoque: 329,
    modelo: "MICHELIN",
    motivoDesinstalacao: "REFORMA",
    borracha: "VL110 L",
    dimensao: "275/80 R. 22,5"
  },
  {
    id: "3",
    qtd: 1,
    cdFilial: "CD IMPERATRIZ",
    fogo: "8220",
    nVida: 2,
    kmPercorrido: 20302,
    ano: 2025,
    mes: "Outubro",
    diasEmEstoque: 260,
    modelo: "XBRI",
    motivoDesinstalacao: "CONSERTO",
    borracha: "XMULT",
    dimensao: "275/80 R. 22,5"
  },
  {
    id: "4",
    qtd: 1,
    cdFilial: "INDUSTRIA DE PÃES CD-119",
    fogo: "7941",
    nVida: 2,
    kmPercorrido: 47549,
    ano: 2026,
    mes: "Janeiro",
    diasEmEstoque: 174,
    modelo: "GOODYEAR",
    motivoDesinstalacao: "REFORMA",
    borracha: "VM530L",
    dimensao: "275/80 R. 22,5"
  }
];

// Helper to generate the remaining 86 tires matching the distributions perfectly:
// Total tires: 90
// - CD FILIAL: 86 CD IMPERATRIZ, 4 INDUSTRIA DE PÃES CD-119 (we have 2 CD IMPERATRIZ and 2 INDUSTRIA DE PÃES in the first 4, so we need 84 CD IMPERATRIZ and 2 INDUSTRIA DE PÃES)
// - MOTIVO DESINSTALAÇÃO: 55 REFORMA, 14 NOVO, 12 CONSERTO, 5 REUTILIZAÇÃO, 4 SUCATA
//   First 4 have: 3 REFORMA, 1 CONSERTO
//   Remaining needed: 52 REFORMA, 14 NOVO, 11 CONSERTO, 5 REUTILIZAÇÃO, 4 SUCATA
// - BORRACHA: 31 VL100, 20 XMULT, 17 VL110 L, 9 VM530L, 3 XZE2 230, 10 OUTROS
//   First 4 have: 1 VL100, 1 VL110 L, 1 XMULT, 1 VM530L
//   Remaining needed: 30 VL100, 19 XMULT, 16 VL110 L, 8 VM530L, 3 XZE2 230, 10 OUTROS
// - DIMENSÃO: 87 "275/80 R. 22,5", 2 "205/75R 16", 1 "215/75 R17,5"
//   First 4 have: 4 "275/80 R. 22,5"
//   Remaining needed: 83 "275/80 R. 22,5", 2 "205/75R 16", 1 "215/75 R17,5"

const generateRemainingTires = (): Tire[] => {
  const tires: Tire[] = [...INITIAL_TIRES];
  
  // Define pools of remaining items to allocate
  const filiais = [
    ...Array(84).fill("CD IMPERATRIZ"),
    ...Array(2).fill("INDUSTRIA DE PÃES CD-119")
  ];
  
  const motivos: ("REFORMA" | "NOVO" | "CONSERTO" | "REUTILIZAÇÃO" | "SUCATA")[] = [
    ...Array(52).fill("REFORMA"),
    ...Array(14).fill("NOVO"),
    ...Array(11).fill("CONSERTO"),
    ...Array(5).fill("REUTILIZAÇÃO"),
    ...Array(4).fill("SUCATA")
  ];
  
  const borrachas: ("VL100" | "XMULT" | "VL110 L" | "VM530L" | "XZE2 230" | "OUTROS")[] = [
    ...Array(30).fill("VL100"),
    ...Array(19).fill("XMULT"),
    ...Array(16).fill("VL110 L"),
    ...Array(8).fill("VM530L"),
    ...Array(3).fill("XZE2 230"),
    ...Array(10).fill("OUTROS")
  ];
  
  const dimensoes: ("275/80 R. 22,5" | "205/75R 16" | "215/75 R17,5")[] = [
    ...Array(83).fill("275/80 R. 22,5"),
    ...Array(2).fill("205/75R 16"),
    ...Array(1).fill("215/75 R17,5")
  ];

  const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const modelos = ["GOODYEAR", "MICHELIN", "XBRI", "PIRELLI", "CONTINENTAL"];

  // Seeded pseudo-random generator to make generation deterministic
  let seed = 42;
  const random = () => {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  };

  // Shuffle utility
  const shuffle = <T>(array: T[]): T[] => {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  const shuffledFiliais = shuffle(filiais);
  const shuffledMotivos = shuffle(motivos);
  const shuffledBorrachas = shuffle(borrachas);
  const shuffledDimensoes = shuffle(dimensoes);

  // Distribute specific values to achieve exact target averages matching user constraints:
  // - SUCATA (4 items): Average 91.0 (Sum = 364)
  const sucataValues = [85, 95, 90, 94];
  // - REUTILIZAÇÃO (5 items): Average 52.0 (Sum = 260)
  const reutilizacaoValues = [48, 55, 52, 50, 55];
  // - NOVO (14 items): Average 50.0 (Sum = 700)
  const novoValues = [45, 52, 48, 50, 55, 47, 53, 49, 51, 50, 48, 52, 50, 50];
  // - CONSERTO (12 items, 1 initial with 260, 11 generated): Average 64.0 (Sum = 768, Gen Sum = 508)
  const consertoValues = [42, 45, 48, 46, 44, 47, 43, 45, 50, 48, 50];
  // - REFORMA (55 items, 3 initial with [489, 329, 174] sum 992, 52 generated): Average 67.0 (Sum = 3685, Gen Sum = 2693)
  const reformaValues: number[] = [];
  let reformaSum = 0;
  for (let idx = 0; idx < 51; idx++) {
    const val = idx % 2 === 0 ? 52 : 51;
    reformaValues.push(val);
    reformaSum += val;
  }
  reformaValues.push(2693 - reformaSum); // Exactly 42 to make the exact sum 2693

  let sucataIdx = 0;
  let reutilizacaoIdx = 0;
  let novoIdx = 0;
  let consertoIdx = 0;
  let reformaIdx = 0;

  // We need to generate 86 items (from id 5 to 90)
  for (let i = 0; i < 86; i++) {
    const motivo = shuffledMotivos[i];
    
    let dias = 113;
    if (motivo === "SUCATA") {
      dias = sucataValues[sucataIdx++];
    } else if (motivo === "REUTILIZAÇÃO") {
      dias = reutilizacaoValues[reutilizacaoIdx++];
    } else if (motivo === "NOVO") {
      dias = novoValues[novoIdx++];
    } else if (motivo === "CONSERTO") {
      dias = consertoValues[consertoIdx++];
    } else if (motivo === "REFORMA") {
      dias = reformaValues[reformaIdx++];
    }

    // Generate KM percorrido
    // SUCATA usually has higher KM, NOVO has 0 or low KM
    let km = 120000;
    if (motivo === "NOVO") km = 0;
    else if (motivo === "SUCATA") km = Math.round(200000 + random() * 150000);
    else km = Math.round(15000 + random() * 180000);

    const ano = random() > 0.4 ? 2025 : 2026;
    const nVida = motivo === "NOVO" ? 1 : Math.floor(random() * 5) + 1;

    tires.push({
      id: String(i + 5),
      qtd: 1,
      cdFilial: shuffledFiliais[i],
      fogo: `F${Math.floor(1000 + random() * 8999)}`,
      nVida,
      kmPercorrido: km,
      ano,
      mes: meses[Math.floor(random() * meses.length)],
      diasEmEstoque: dias,
      modelo: modelos[Math.floor(random() * modelos.length)],
      motivoDesinstalacao: motivo,
      borracha: shuffledBorrachas[i],
      dimensao: shuffledDimensoes[i]
    });
  }

  return tires;
};

export const FULL_INITIAL_DATASET = generateRemainingTires();

export const getStoredTires = (): Tire[] => {
  if (typeof window === "undefined") return FULL_INITIAL_DATASET;
  const stored = localStorage.getItem("mateus_pneus_estoque");
  if (!stored) {
    localStorage.setItem("mateus_pneus_estoque", JSON.stringify(FULL_INITIAL_DATASET));
    return FULL_INITIAL_DATASET;
  }
  try {
    return JSON.parse(stored);
  } catch (e) {
    return FULL_INITIAL_DATASET;
  }
};

export const saveTires = (tires: Tire[]): void => {
  if (typeof window !== "undefined") {
    localStorage.setItem("mateus_pneus_estoque", JSON.stringify(tires));
  }
};
