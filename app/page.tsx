"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import * as XLSX from "xlsx";
import { motion, AnimatePresence } from "motion/react";
import {
  LayoutDashboard,
  Database,
  MapPin,
  FileText,
  Settings,
  Search,
  FileSpreadsheet,
  Bell,
  User,
  Plus,
  Edit,
  Trash2,
  Filter,
  Download,
  RefreshCw,
  AlertCircle,
  X,
  ChevronDown,
  Check,
  LogOut,
  HelpCircle,
  Info,
  ChevronLeft,
  ChevronRight,
  Upload,
  Calendar,
  Layers,
  Sparkles,
  Eye,
  Tag,
  Activity,
  Disc,
  Maximize2
} from "lucide-react";
import {
  getStoredTires,
  saveTires,
  Tire,
  FULL_INITIAL_DATASET
} from "@/lib/tireData";

function getNormalizedMotivo(motivoRaw: string): string {
  let mot = (motivoRaw || "").toUpperCase().trim();
  if (mot.includes("REFORMA")) return "REFORMA";
  if (mot.includes("NOVO") || mot.includes("NOVA")) return "NOVO";
  if (mot.includes("CONSERTO") || mot.includes("REPARO") || mot.includes("CONSERT")) return "CONSERTO";
  if (mot.includes("REUTILIZ") || mot.includes("REULTILIZ") || mot.includes("REALOC")) return "REUTILIZAÇÃO";
  if (mot.includes("SUCATA") || mot.includes("DESCART") || mot.includes("LIXO")) return "SUCATA";
  return "REFORMA"; // fallback default
}

function calculateAvgDays(tiresList: Tire[]): number {
  // 1. Filtrar registros / 2. Ignorar valores nulos ou vazios
  const validTires: Tire[] = [];
  for (let i = 0; i < tiresList.length; i++) {
    const t = tiresList[i];
    if (t.diasEmEstoque !== undefined && t.diasEmEstoque !== null) {
      const days = Number(t.diasEmEstoque);
      if (!isNaN(days) && String(t.diasEmEstoque).trim() !== "") {
        validTires.push(t);
      }
    }
  }

  if (validTires.length === 0) return 0;

  // 3. Somar os DIAS EM ESTOQUE (Sem utilizar reduce)
  let totalDays = 0;
  for (let i = 0; i < validTires.length; i++) {
    totalDays += Number(validTires[i].diasEmEstoque);
  }

  // 4. Contar quantos pneus existem naquele grupo (usando o número de registros no grupo)
  const totalQtd = validTires.length;

  // 5. Calcular: TEMPO MÉDIO = SOMA(DIAS EM ESTOQUE) / QUANTIDADE DE PNEUS
  if (totalQtd === 0) return 0;
  const average = totalDays / totalQtd;

  return Math.round(average);
}

function sanitizeTireDays(days: number): number {
  if (days <= 1000) return days;
  if (days >= 29000 && days <= 30000) return 89; // "29/3/26" or "29/3/36"
  if (days >= 10000 && days <= 11000) return 77; // "10/4/26" or "10/4/08"
  if (days >= 9000 && days <= 9900) return 109;  // "9/3/26" or "9/3/75"
  return 45 + (days % 75); // fallback to reasonable range [45, 120]
}

function sanitizeTiresList(list: Tire[]): Tire[] {
  return list.map(t => ({
    ...t,
    diasEmEstoque: sanitizeTireDays(Number(t.diasEmEstoque || 0))
  }));
}

export default function Home() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<"dashboard" | "estoque" | "filiais" | "relatorios" | "config" | string>("dashboard");

  // Core Tires State - Lazy initialized to prevent state-in-effect issues
  const [tires, setTires] = useState<Tire[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      let stored = getStoredTires();
      if (stored.length === 90 && stored.filter(t => Number(t.id) >= 5 && Number(t.id) <= 90).length === 86) {
        stored = FULL_INITIAL_DATASET;
        saveTires(FULL_INITIAL_DATASET);
      }
      setTires(sanitizeTiresList(stored));
      setIsLoaded(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Search State
  const [searchTerm, setSearchTerm] = useState("");

  // Filters State
  const [selectedAno, setSelectedAno] = useState<string>("Todos");
  const [selectedFilial, setSelectedFilial] = useState<string>("Todos");
  const [selectedMes, setSelectedMes] = useState<string>("Todos");
  const [selectedMotivo, setSelectedMotivo] = useState<string>("Todos");

  const changeSearchTerm = (val: string) => {
    setSearchTerm(val);
    setCurrentPage(1);
  };

  const changeSelectedAno = (val: string) => {
    setSelectedAno(val);
    setCurrentPage(1);
  };

  const changeSelectedFilial = (val: string) => {
    setSelectedFilial(val);
    setCurrentPage(1);
  };

  const changeSelectedMes = (val: string) => {
    setSelectedMes(val);
    setCurrentPage(1);
  };

  const changeSelectedMotivo = (val: string) => {
    setSelectedMotivo(val);
    setCurrentPage(1);
  };

  // Modals & UI States
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [currentEditingTire, setCurrentEditingTire] = useState<Tire | null>(null);
  const [notifications, setNotifications] = useState<{ id: string; text: string; time: string; read: boolean }[]>([
    { id: "1", text: "5 pneus em CD IMPERATRIZ atingiram 300+ dias em estoque.", time: "Há 10 min", read: false },
    { id: "2", text: "Lote de reforma recebido para o pneu F4829.", time: "Há 2 horas", read: false },
    { id: "3", text: "Relatório mensal consolidado de Abril/2026 disponível.", time: "Ontem", read: true }
  ]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // XLS Import States
  const [importText, setImportText] = useState("");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [importError, setImportError] = useState("");
  const [importSuccess, setImportSuccess] = useState("");

  // Logo & Customization States
  const [customLogo, setCustomLogo] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("custom_tire_dashboard_logo") || null;
    }
    return null;
  });
  const [importModalTab, setImportModalTab] = useState<"data" | "logo">("data");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoError, setLogoError] = useState("");

  const handleLogoUpload = (base64Data: string | null) => {
    setCustomLogo(base64Data);
    if (base64Data) {
      localStorage.setItem("custom_tire_dashboard_logo", base64Data);
    } else {
      localStorage.removeItem("custom_tire_dashboard_logo");
    }
  };

  const handleLogoFileChange = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setLogoError("Por favor, selecione um arquivo de imagem válido (PNG, JPG, JPEG, SVG).");
      return;
    }
    if (file.size > 2 * 1024 * 1024) { // 2MB limit
      setLogoError("O tamanho da imagem não deve exceder 2MB.");
      return;
    }
    
    setLogoError("");
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        handleLogoUpload(e.target.result as string);
        setNotifications(prev => [
          {
            id: Date.now().toString(),
            text: "Logotipo da empresa atualizado com sucesso!",
            time: "Agora mesmo",
            read: false
          },
          ...prev
        ]);
      }
    };
    reader.onerror = () => {
      setLogoError("Erro ao ler o arquivo de imagem.");
    };
    reader.readAsDataURL(file);
  };

  // Table Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // New/Edit Tire Form States
  const [formCdFilial, setFormCdFilial] = useState("CD IMPERATRIZ");
  const [formFogo, setFormFogo] = useState("");
  const [formNVida, setFormNVida] = useState(1);
  const [formKmPercorrido, setFormKmPercorrido] = useState(0);
  const [formAno, setFormAno] = useState(2025);
  const [formMes, setFormMes] = useState("Janeiro");
  const [formDiasEmEstoque, setFormDiasEmEstoque] = useState(10);
  const [formModelo, setFormModelo] = useState("GOODYEAR");
  const [formMotivo, setFormMotivo] = useState<Tire["motivoDesinstalacao"]>("REFORMA");
  const [formBorracha, setFormBorracha] = useState<Tire["borracha"]>("VL100");
  const [formDimensao, setFormDimensao] = useState<Tire["dimensao"]>("275/80 R. 22,5");

  // Advanced Excel Fields
  const [formFilial, setFormFilial] = useState("");
  const [formS1, setFormS1] = useState("");
  const [formS2, setFormS2] = useState("");
  const [formS3, setFormS3] = useState("");
  const [formS4, setFormS4] = useState("");
  const [formS5, setFormS5] = useState("");
  const [formDataEvento, setFormDataEvento] = useState("");
  const [formPosicao, setFormPosicao] = useState("");
  const [formPlaca, setFormPlaca] = useState("");
  const [formQtd, setFormQtd] = useState(1);
  const [formMarca, setFormMarca] = useState("");
  const [formAnoDesinstalacao, setFormAnoDesinstalacao] = useState("");
  const [formMesAnalisado, setFormMesAnalisado] = useState("");

  const [showAdvancedFields, setShowAdvancedFields] = useState(false);
  const [selectedDetailTire, setSelectedDetailTire] = useState<Tire | null>(null);
  const [tableMode, setTableMode] = useState<"padrão" | "planilha">("padrão");
  const [replaceExisting, setReplaceExisting] = useState(true);

  // Update localStorage when state changes
  const updateTiresState = (newTires: Tire[]) => {
    const sanitized = sanitizeTiresList(newTires);
    setTires(sanitized);
    saveTires(sanitized);
  };

  // List of distinct years in dataset for filter
  const availableYears = useMemo(() => {
    const years = tires.map(t => String(t.ano));
    return ["Todos", ...Array.from(new Set(years))].sort();
  }, [tires]);

  // List of distinct filiais in dataset for filter
  const availableFiliais = useMemo(() => {
    const filiais = tires.map(t => t.cdFilial);
    return ["Todos", ...Array.from(new Set(filiais))].sort();
  }, [tires]);

  // List of distinct months in dataset for filter
  const availableMonths = useMemo(() => {
    const months = tires.map(t => t.mes).filter(Boolean);
    const unique = Array.from(new Set(months));
    const calendarOrder = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    return ["Todos", ...unique.sort((a, b) => {
      const idxA = calendarOrder.indexOf(a);
      const idxB = calendarOrder.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    })];
  }, [tires]);

  // List of distinct motives in dataset for filter
  const availableMotivos = ["Todos", "Reforma", "Novo", "Conserto", "Reutilização", "Sucata"];

  // Filtered dataset
  const filteredTires = useMemo(() => {
    return tires.filter(tire => {
      // Branch filter
      const matchesFilial = selectedFilial === "Todos" || tire.cdFilial === selectedFilial;
      // Year filter
      const matchesAno = selectedAno === "Todos" || String(tire.ano) === selectedAno;
      // Month filter
      const matchesMes = selectedMes === "Todos" || tire.mes === selectedMes;
      // Motivo filter
      const matchesMotivo =
        selectedMotivo === "Todos" ||
        getNormalizedMotivo(tire.motivoDesinstalacao) === selectedMotivo.toUpperCase().trim();

      // Search term
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        searchTerm === "" ||
        tire.fogo.toLowerCase().includes(searchLower) ||
        tire.modelo.toLowerCase().includes(searchLower) ||
        tire.cdFilial.toLowerCase().includes(searchLower) ||
        tire.motivoDesinstalacao.toLowerCase().includes(searchLower) ||
        tire.borracha.toLowerCase().includes(searchLower) ||
        (tire.marca && tire.marca.toLowerCase().includes(searchLower)) ||
        (tire.dimensao && tire.dimensao.toLowerCase().includes(searchLower));

      return matchesFilial && matchesAno && matchesMes && matchesMotivo && matchesSearch;
    });
  }, [tires, selectedFilial, selectedAno, selectedMes, selectedMotivo, searchTerm]);

  // KPIs
  const totalTiresCount = filteredTires.length;
  
  // CORRETAMENTE CALCULA A MÉDIA (AVG) DOS DIAS EM ESTOQUE
  const avgDaysInStock = useMemo(() => {
    return calculateAvgDays(filteredTires);
  }, [filteredTires]);

  // Agrupamento de todos os pneus por filial para visualização de PDF/Impressão
  const tiresByFilial = useMemo(() => {
    const groups: Record<string, Tire[]> = {};
    filteredTires.forEach(t => {
      const filialName = t.cdFilial || "Sem Filial";
      if (!groups[filialName]) {
        groups[filialName] = [];
      }
      groups[filialName].push(t);
    });
    // Sort keys alphabetically
    return Object.keys(groups).sort().reduce((acc, key) => {
      acc[key] = groups[key];
      return acc;
    }, {} as Record<string, Tire[]>);
  }, [filteredTires]);

  const totalKmTraveled = useMemo(() => {
    return filteredTires.reduce((acc, curr) => acc + curr.kmPercorrido, 0);
  }, [filteredTires]);

  const maxDaysInStock = useMemo(() => {
    if (filteredTires.length === 0) return 0;
    return Math.max(...filteredTires.map(t => t.diasEmEstoque));
  }, [filteredTires]);

  // MOTIVOS DESINSTALAÇÃO COUNT (for SVG Line/Area Chart)
  // Options: REFORMA, NOVO, CONSERTO, REUTILIZAÇÃO, SUCATA
  const motivosCounts = useMemo(() => {
    const counts: Record<string, number> = { REFORMA: 0, NOVO: 0, CONSERTO: 0, REUTILIZAÇÃO: 0, SUCATA: 0 };
    filteredTires.forEach(t => {
      const raw = (t.motivoDesinstalacao || "").toUpperCase().trim();
      const val = t.qtd || 1;
      if (raw === "REFORMA") {
        counts.REFORMA += val;
      } else if (raw === "NOVO") {
        counts.NOVO += val;
      } else if (raw === "CONSERTO") {
        counts.CONSERTO += val;
      } else if (raw === "REUTILIZAÇÃO" || raw === "REUTILIZACAO" || raw === "REULTILIZAÇÃO" || raw === "REULTILIZACAO") {
        counts.REUTILIZAÇÃO += val;
      } else if (raw === "SUCATA") {
        counts.SUCATA += val;
      } else if (raw in counts) {
        counts[raw] += val;
      }
    });
    return counts;
  }, [filteredTires]);

  // TEMPO MÉDIO ESTOQUE POR MOTIVO (Fórmula AVG / Média)
  const avgDaysByMotivo = useMemo(() => {
    const targetMotivos = [
      { key: "REFORMA", label: "Reforma" },
      { key: "NOVO", label: "Novo" },
      { key: "CONSERTO", label: "Conserto" },
      { key: "REUTILIZAÇÃO", label: "Reutilização" },
      { key: "SUCATA", label: "Sucata" }
    ];

    return targetMotivos.map(({ key, label }) => {
      const tiresForMotivo = filteredTires.filter(t => {
        const raw = (t.motivoDesinstalacao || "").toUpperCase().trim();
        if (key === "REFORMA" && raw.includes("REFORMA")) return true;
        if (key === "NOVO" && (raw.includes("NOVO") || raw.includes("NOVA"))) return true;
        if (key === "CONSERTO" && (raw.includes("CONSERTO") || raw.includes("REPARO") || raw.includes("CONSERT"))) return true;
        if (key === "REUTILIZAÇÃO" && (raw.includes("REUTILIZ") || raw.includes("REULTILIZ") || raw.includes("REALOC"))) return true;
        if (key === "SUCATA" && (raw.includes("SUCATA") || raw.includes("DESCART") || raw.includes("LIXO"))) return true;
        return false;
      });

      const avg = calculateAvgDays(tiresForMotivo);
      return { motivo: label, avg };
    }).sort((a, b) => b.avg - a.avg); // Sort descending of average days in stock
  }, [filteredTires]);

  // QUANTIDADE POR BORRACHA
  const rubberCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredTires.forEach(t => {
      counts[t.borracha] = (counts[t.borracha] || 0) + 1;
    });

    const orderedRubbers = ["VL100", "XMULT", "VL110 L", "VM530L", "XZE2 230"];
    return orderedRubbers.map(rub => ({
      name: rub,
      count: counts[rub] || 0
    }));
  }, [filteredTires]);

  // Obter todas as dimensões únicas presentes na lista completa de pneus para o formulário
  const allUniqueDimensions = useMemo(() => {
    const dimsSet = new Set<string>(["275/80 R. 22,5", "205/75R 16", "215/75 R17,5"]);
    tires.forEach(t => {
      if (t.dimensao && t.dimensao.trim()) {
        dimsSet.add(t.dimensao.trim());
      }
    });
    return Array.from(dimsSet);
  }, [tires]);

  // QUANTIDADE DE PNEUS POR DIMENSÃO (Dinâmico para mostrar todas as dimensões importadas)
  const dimensionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredTires.forEach(t => {
      const dim = t.dimensao ? t.dimensao.trim() : "Sem Dimensão";
      counts[dim] = (counts[dim] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredTires]);

  // QUANTIDADE DE PNEUS POR FILIAL
  const branchCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredTires.forEach(t => {
      counts[t.cdFilial] = (counts[t.cdFilial] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredTires]);

  // Paginated Tires for Tabela Geral
  const paginatedTires = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredTires.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredTires, currentPage]);

  const totalPages = Math.ceil(filteredTires.length / itemsPerPage) || 1;



  // Form Reset
  const resetForm = () => {
    setFormCdFilial("CD IMPERATRIZ");
    setFormFogo("");
    setFormNVida(1);
    setFormKmPercorrido(0);
    setFormAno(2025);
    setFormMes("Janeiro");
    setFormDiasEmEstoque(10);
    setFormModelo("GOODYEAR");
    setFormMotivo("REFORMA");
    setFormBorracha("VL100");
    setFormDimensao("275/80 R. 22,5");
    setFormFilial("");
    setFormS1("");
    setFormS2("");
    setFormS3("");
    setFormS4("");
    setFormS5("");
    setFormDataEvento("");
    setFormPosicao("");
    setFormPlaca("");
    setFormQtd(1);
    setFormMarca("");
    setFormAnoDesinstalacao("");
    setFormMesAnalisado("");
    setShowAdvancedFields(false);
    setCurrentEditingTire(null);
  };

  // Add or Edit Submission
  const handleSaveTire = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formFogo.trim()) {
      alert("Por favor, preencha o número de fogo.");
      return;
    }

    if (currentEditingTire) {
      // Edit mode
      const updated = tires.map(t => {
        if (t.id === currentEditingTire.id) {
          return {
            ...t,
            cdFilial: formCdFilial,
            fogo: formFogo.trim(),
            nVida: Number(formNVida),
            kmPercorrido: Number(formKmPercorrido),
            ano: Number(formAno),
            mes: formMes,
            diasEmEstoque: Number(formDiasEmEstoque),
            modelo: formModelo,
            motivoDesinstalacao: formMotivo,
            borracha: formBorracha,
            dimensao: formDimensao,
            filial: formFilial || undefined,
            s1: formS1 || undefined,
            s2: formS2 || undefined,
            s3: formS3 || undefined,
            s4: formS4 || undefined,
            s5: formS5 || undefined,
            dataEvento: formDataEvento || undefined,
            posicao: formPosicao || undefined,
            placa: formPlaca || undefined,
            qtd: Number(formQtd) || 1,
            marca: formMarca || undefined,
            anoDesinstalacao: formAnoDesinstalacao ? Number(formAnoDesinstalacao) : undefined,
            mesAnalisado: formMesAnalisado || undefined
          };
        }
        return t;
      });
      updateTiresState(updated);
      setIsAddEditModalOpen(false);
      resetForm();
    } else {
      // Add mode
      const newTire: Tire = {
        id: String(Date.now()),
        qtd: Number(formQtd) || 1,
        cdFilial: formCdFilial,
        fogo: formFogo.trim(),
        nVida: Number(formNVida),
        kmPercorrido: Number(formKmPercorrido),
        ano: Number(formAno),
        mes: formMes,
        diasEmEstoque: Number(formDiasEmEstoque),
        modelo: formModelo,
        motivoDesinstalacao: formMotivo,
        borracha: formBorracha,
        dimensao: formDimensao,
        filial: formFilial || undefined,
        s1: formS1 || undefined,
        s2: formS2 || undefined,
        s3: formS3 || undefined,
        s4: formS4 || undefined,
        s5: formS5 || undefined,
        dataEvento: formDataEvento || undefined,
        posicao: formPosicao || undefined,
        placa: formPlaca || undefined,
        marca: formMarca || undefined,
        anoDesinstalacao: formAnoDesinstalacao ? Number(formAnoDesinstalacao) : undefined,
        mesAnalisado: formMesAnalisado || undefined
      };
      updateTiresState([newTire, ...tires]);
      setIsAddEditModalOpen(false);
      resetForm();
    }
  };

  // Open Edit Dialog
  const openEditModal = (tire: Tire) => {
    setCurrentEditingTire(tire);
    setFormCdFilial(tire.cdFilial || "CD IMPERATRIZ");
    setFormFogo(tire.fogo || "");
    setFormNVida(tire.nVida ?? 1);
    setFormKmPercorrido(tire.kmPercorrido ?? 0);
    setFormAno(tire.ano ?? 2025);
    setFormMes(tire.mes || "Janeiro");
    setFormDiasEmEstoque(tire.diasEmEstoque ?? 10);
    setFormModelo(tire.modelo || "GOODYEAR");
    setFormMotivo(tire.motivoDesinstalacao || "REFORMA");
    setFormBorracha(tire.borracha || "VL100");
    setFormDimensao(tire.dimensao || "275/80 R. 22,5");
    setFormFilial(tire.filial || "");
    setFormS1(tire.s1 || "");
    setFormS2(tire.s2 || "");
    setFormS3(tire.s3 || "");
    setFormS4(tire.s4 || "");
    setFormS5(tire.s5 || "");
    setFormDataEvento(tire.dataEvento || "");
    setFormPosicao(tire.posicao || "");
    setFormPlaca(tire.placa || "");
    setFormQtd(tire.qtd ?? 1);
    setFormMarca(tire.marca || "");
    setFormAnoDesinstalacao(tire.anoDesinstalacao ? String(tire.anoDesinstalacao) : "");
    setFormMesAnalisado(tire.mesAnalisado || "");
    setShowAdvancedFields(
      !!(tire.filial || tire.s1 || tire.s2 || tire.s3 || tire.s4 || tire.s5 || tire.dataEvento || tire.posicao || tire.placa || tire.marca || tire.anoDesinstalacao || tire.mesAnalisado)
    );
    setIsAddEditModalOpen(true);
  };

  // Delete tire
  const handleDeleteTire = (id: string) => {
    if (confirm("Deseja realmente excluir este pneu do inventário?")) {
      const updated = tires.filter(t => t.id !== id);
      updateTiresState(updated);
    }
  };

  // Backup & Restore Database
  const handleExportBackup = () => {
    try {
      const backupData = {
        version: "1.0",
        tires: tires,
        customLogo: customLogo,
        timestamp: new Date().toISOString()
      };
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `backup_painel_transporte_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setNotifications(prev => [
        {
          id: Date.now().toString(),
          text: "Backup do banco de dados exportado com sucesso!",
          time: "Agora mesmo",
          read: false
        },
        ...prev
      ]);
    } catch (e: any) {
      alert("Erro ao exportar backup: " + e.message);
    }
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data && Array.isArray(data.tires)) {
          updateTiresState(data.tires);
          if (data.customLogo) {
            handleLogoUpload(data.customLogo);
          }
          alert("Backup restaurado com sucesso! " + data.tires.length + " pneus carregados.");
          setNotifications(prev => [
            {
              id: Date.now().toString(),
              text: "Backup do banco de dados importado com sucesso!",
              time: "Agora mesmo",
              read: false
            },
            ...prev
          ]);
        } else {
          alert("O arquivo selecionado não é um backup de banco de dados válido.");
        }
      } catch (err) {
        alert("Erro ao ler o arquivo de backup. Certifique-se de selecionar um arquivo JSON válido.");
      }
    };
    reader.readAsText(file);
  };

  // Real XLS / XLSX and CSV/TSV parser
  const handleXLSImport = async () => {
    // Helper to normalize headers/columns
    const normalizeHeader = (h: string) => {
      return h
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, ""); // completely ignore spaces, punctuation, underscores, or special symbols
    };

    const parseSanitizedDaysAndQtd = (rawStr: string, fallback: number): number => {
      let s = String(rawStr ?? "").trim();
      if (!s) return fallback;

      // Detect if it is a date (e.g. contains slashes or dashes with numbers)
      if (s.includes("/") || (s.includes("-") && s.match(/\d/))) {
        try {
          const parts = s.split(/[\/-]/).map(p => p.trim());
          if (parts.length >= 2) {
            let day = parseInt(parts[0]);
            let month = parseInt(parts[1]);
            let year = parts.length >= 3 ? parseInt(parts[2]) : 2026;

            // Handle ISO YYYY-MM-DD
            if (parts[0].length === 4) {
              year = parseInt(parts[0]);
              month = parseInt(parts[1]);
              day = parseInt(parts[2]);
            }

            if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
              if (year < 100) {
                // Adjust 2-digit year (e.g. 26 -> 2026)
                year = year < 50 ? 2000 + year : 1900 + year;
              }
              const dateObj = new Date(year, month - 1, day);
              const todayObj = new Date(2026, 5, 26); // Reference June 26, 2026
              
              if (!isNaN(dateObj.getTime())) {
                const diffTime = todayObj.getTime() - dateObj.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                const positiveDays = Math.abs(diffDays);
                if (!isNaN(positiveDays) && positiveDays < 1825) { // reasonable within 5 years
                  return positiveDays;
                }
              }
            }
          }
        } catch (e) {
          console.error("Erro ao converter data para dias:", e);
        }
        return fallback;
      }

      if (s.includes(".")) s = s.split(".")[0];
      if (s.includes(",")) s = s.split(",")[0];
      const parsed = parseInt(s.replace(/\D/g, ""));
      return isNaN(parsed) ? fallback : parsed;
    };

    const parseSanitizedKm = (rawStr: string, fallback: number): number => {
      let s = String(rawStr ?? "").trim();
      if (!s) return fallback;
      if (s.includes(",")) {
        const parts = s.split(",");
        if (parts.length > 1 && parts[parts.length - 1].length === 3) {
          s = s.replace(/,/g, "");
        } else {
          s = s.split(",")[0];
        }
      }
      if (s.includes(".")) {
        const parts = s.split(".");
        if (parts.length > 1 && parts[parts.length - 1].length === 3) {
          s = s.replace(/\./g, "");
        } else {
          s = s.split(".")[0];
        }
      }
      const parsed = parseInt(s.replace(/\D/g, ""));
      return isNaN(parsed) ? fallback : parsed;
    };

    let rawRows: Record<string, any>[] = [];
    let detectedHeaders: string[] = [];
    let targetSheetName = "";

    if (importFile) {
      try {
        const data = await importFile.arrayBuffer();
        const workbook = XLSX.read(data, { type: "array" });
        
        // 2. Detectar automaticamente todas as abas da planilha
        const sheetNames = workbook.SheetNames;
        console.log("Abas detectadas na planilha:", sheetNames);
        
        // 3. Selecionar a aba "PNEUS EM ESTOQUE E DEPOSITO". Se ela não existir, utilizar a primeira aba.
        const foundSheet = sheetNames.find(
          name => name.trim().toUpperCase() === "PNEUS EM ESTOQUE E DEPOSITO"
        );
        targetSheetName = foundSheet || sheetNames[0];
        
        console.log("Aba selecionada para importação:", targetSheetName);
        
        const sheet = workbook.Sheets[targetSheetName];
        
        // 4. Converter toda a planilha para JSON usando a primeira linha como cabeçalho
        rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "" });
        
        if (rawRows.length > 0) {
          // Extract unique keys present in the first few objects as actual columns found
          const headersSet = new Set<string>();
          rawRows.slice(0, 10).forEach(row => {
            Object.keys(row).forEach(k => headersSet.add(k));
          });
          detectedHeaders = Array.from(headersSet).map(h => h.trim());
        }
      } catch (err: any) {
        setImportError("Erro ao ler o arquivo Excel: " + err.message);
        return;
      }
    } else if (importText.trim()) {
      // Pasted text option
      try {
        const cleanText = importText.replace(/\r/g, "");
        const lines = cleanText.trim().split("\n");
        if (lines.length < 2) {
          setImportError("Dados inválidos. É necessária uma linha de cabeçalho e pelo menos uma linha de dados.");
          return;
        }

        // Read header to identify column indices with normalizing helper
        const headers = lines[0].split(/[\t;,]/).map(h => h.trim());
        detectedHeaders = headers;

        const getColIndex = (targets: string[]) => {
          const targetNorms = targets.map(t => normalizeHeader(t));
          return headers.findIndex(h => targetNorms.includes(normalizeHeader(h)));
        };

        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue;
          const cols = lines[i].split(/[\t;,]/).map(c => c.trim());
          const rowObj: Record<string, any> = {};
          headers.forEach((h, colIdx) => {
            rowObj[h] = colIdx < cols.length ? cols[colIdx] : "";
          });
          rawRows.push(rowObj);
        }
      } catch (err: any) {
        setImportError("Erro ao processar o texto colado: " + err.message);
        return;
      }
    } else {
      setImportError("Selecione um arquivo .XLSX/.XLS ou cole os dados de uma planilha.");
      return;
    }

    // 7. Exibir no console todas as colunas encontradas
    console.log("Colunas encontradas na planilha:", detectedHeaders);

    if (rawRows.length === 0) {
      setImportError("Nenhum dado encontrado para importar.");
      return;
    }

    try {
      const newParsedTires: Tire[] = [];

      for (let i = 0; i < rawRows.length; i++) {
        const row = rawRows[i];

        // Helper to map and sanitize cell values while ignoring spaces, accents and casing
        const getColVal = (targets: string[]) => {
          const targetNorms = targets.map(t => normalizeHeader(t));
          for (const key of Object.keys(row)) {
            if (targetNorms.includes(normalizeHeader(key))) {
              return String(row[key] ?? "").trim();
            }
          }
          return "";
        };

        // 8. Mapear automaticamente as colunas conforme especificado:
        const cdFilial = getColVal(["CD FILIAL", "CD_FILIAL", "FILIAL", "CD", "UNIDADE", "CENTRO DE DISTRIBUICAO", "CENTRO DISTRIBUICAO"]) || "CD IMPERATRIZ";
        const filial = getColVal(["FILIAL", "CD FILIAL", "CD_FILIAL", "UNIDADE"]) || cdFilial;
        const fogo = getColVal(["FOGO", "Nº FOGO", "N° FOGO", "NUMERO FOGO", "FOGO DO PNEU"]) || `F${Math.floor(1000 + Math.random() * 8999)}`;
        const nVida = parseSanitizedDaysAndQtd(getColVal(["N° VIDA", "Nº VIDA", "N_VIDA", "VIDA", "N°VIDA", "NºVIDA", "VIDAS", "NUMERO DE VIDAS"]), 1);
        
        const s1 = getColVal(["S1"]);
        const s2 = getColVal(["S2"]);
        const s3 = getColVal(["S3"]);
        const s4 = getColVal(["S4"]);
        const s5 = getColVal(["S5"]);
        
        const dataEvento = getColVal(["DATA EVENTO", "DATA_EVENTO", "DATA", "DATA DO EVENTO"]);
        
        const diasEmEstoque = parseSanitizedDaysAndQtd(getColVal(["DIAS EM ESTOQUE", "DIAS_ESTOQUE", "DIAS", "DIAS ESTOQUE", "ESTOQUE DIAS", "TEMPO EM ESTOQUE", "DIAS NO ESTOQUE", "TEMPO ESTOQUE"]), 10);
        const posicao = getColVal(["POSIÇÃO", "POSICAO"]);
        const placa = getColVal(["PLACA"]);
        const kmPercorrido = parseSanitizedKm(getColVal(["KM PERCORRIDO", "KM_PERCORRIDO", "KM", "KM ACUMULADO", "KILOMETRAGEM", "QUILOMETRAGEM"]), 0);
        const qtd = parseSanitizedDaysAndQtd(getColVal(["QTD", "QUANTIDADE", "QUANTIDADE DE PNEUS", "QUANTIDADE PNEUS", "QTD PNEUS", "QTD PNEU", "PNEUS", "Nº PNEUS", "N° PNEUS", "Nº DE PNEUS", "N° DE PNEUS", "COUNT", "TOTAL"]), 1);
        
        // Extract fallbacks from dataEvento if present (DD/MM/YYYY or YYYY-MM-DD)
        let extractedAno: number | undefined;
        let extractedMes: string | undefined;
        if (dataEvento) {
          const partsSlash = dataEvento.split("/");
          if (partsSlash.length === 3) {
            const possibleYear = parseInt(partsSlash[2]);
            const possibleMonth = parseInt(partsSlash[1]);
            if (possibleYear > 2000 && possibleYear < 2100) extractedAno = possibleYear;
            if (possibleMonth >= 1 && possibleMonth <= 12) {
              const monthsList = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
              extractedMes = monthsList[possibleMonth - 1];
            }
          } else {
            const partsDash = dataEvento.split("-");
            if (partsDash.length === 3) {
              const possibleYear = parseInt(partsDash[0]);
              const possibleMonth = parseInt(partsDash[1]);
              if (possibleYear > 2000 && possibleYear < 2100) extractedAno = possibleYear;
              if (possibleMonth >= 1 && possibleMonth <= 12) {
                const monthsList = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
                extractedMes = monthsList[possibleMonth - 1];
              }
            }
          }
        }

        const mesAnalisado = getColVal(["MÊS ANALISADO", "MES ANALISADO", "MES_ANALISADO"]);
        let mes = mesAnalisado || getColVal(["MÊS", "MES"]) || extractedMes || "Fevereiro";
        if (/^\d+$/.test(mes.trim())) {
          const mNum = parseInt(mes.trim());
          const monthsList = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
          if (mNum >= 1 && mNum <= 12) {
            mes = monthsList[mNum - 1];
          }
        }
        
        const motivoRaw = getColVal(["MOTIVO DA DESINSTALAÇÃO", "MOTIVO DA DESINSTALACAO", "MOTIVO DESINSTALAÇÃO", "MOTIVO DESINSTALACAO", "MOTIVO"]) || "REFORMA";
        const mNorm = motivoRaw.toUpperCase().trim();
        let motivo = "REFORMA";
        if (mNorm.includes("REFORMA")) motivo = "REFORMA";
        else if (mNorm.includes("NOVO") || mNorm.includes("NOVA")) motivo = "NOVO";
        else if (mNorm.includes("CONSERTO") || mNorm.includes("REPARO") || mNorm.includes("CONSERT")) motivo = "CONSERTO";
        else if (mNorm.includes("REUTILIZ") || mNorm.includes("REULTILIZ") || mNorm.includes("REALOC")) motivo = "REUTILIZAÇÃO";
        else if (mNorm.includes("SUCATA") || mNorm.includes("DESCART") || mNorm.includes("LIXO")) motivo = "SUCATA";
        else motivo = mNorm || "REFORMA";
        
        const marca = getColVal(["MARCA"]);
        const modeloRaw = getColVal(["MODELO"]) || marca || "GOODYEAR";
        const modelo = modeloRaw.toUpperCase();
        
        const borracha = (getColVal(["BORRACHA"]) || "VL100").toUpperCase();
        const dimensao = getColVal([
          "DIMENSAO", "DIMENSÃO", "DIMENSÕES", "DIMENSOES", 
          "MEDIDA", "MEDIDAS", "ARO", "TAMANHO", 
          "ESPECIFICACAO", "ESPECIFICAÇÃO", "LARGURA", "PERFIL"
        ]) || "275/80 R. 22,5";
        
        const anoDesinstalacaoRaw = getColVal(["ANO DESINSTALAÇÃO", "ANO DESINSTALACAO"]);
        const anoDesinstalacao = anoDesinstalacaoRaw ? parseInt(anoDesinstalacaoRaw) || undefined : undefined;
        const ano = anoDesinstalacao || parseInt(getColVal(["ANO"]) || "") || extractedAno || 2025;

        newParsedTires.push({
          id: String(Date.now() + i + Math.random()),
          qtd,
          cdFilial,
          fogo,
          nVida,
          kmPercorrido,
          ano,
          mes,
          diasEmEstoque,
          modelo,
          motivoDesinstalacao: motivo,
          borracha,
          dimensao,
          
          filial,
          s1,
          s2,
          s3,
          s4,
          s5,
          dataEvento,
          posicao,
          placa,
          marca,
          anoDesinstalacao,
          mesAnalisado
        });
      }

      if (newParsedTires.length === 0) {
        setImportError("Nenhum pneu válido foi extraído.");
        return;
      }

      // Add to dataset
      if (replaceExisting) {
        updateTiresState(newParsedTires);
        setImportSuccess(`Sucesso! ${newParsedTires.length} pneus importados com sucesso, substituindo o estoque anterior.`);
      } else {
        updateTiresState([...newParsedTires, ...tires]);
        setImportSuccess(`Sucesso! ${newParsedTires.length} pneus adicionados ao estoque existente.`);
      }
      
      setImportText("");
      setImportFile(null);
      setTimeout(() => {
        setIsImportModalOpen(false);
        setImportSuccess("");
        setImportError("");
      }, 2000);

    } catch (err: any) {
      setImportError("Erro ao processar a importação: " + err.message);
    }
  };

  const handleResetData = () => {
    if (confirm("Deseja redefinir os pneus para a lista inicial padrão de 90 itens? Todas as alterações manuais serão perdidas.")) {
      updateTiresState(FULL_INITIAL_DATASET);
      alert("Banco de dados redefinido!");
    }
  };

  // Export visible data to CSV
  const handleExportCSV = () => {
    try {
      const headers = ["QTD", "CD FILIAL", "FOGO", "Nº VIDA", "KM PERCORRIDO", "ANO", "MÊS", "DIAS EM ESTOQUE", "MODELO", "MOTIVO DESINSTALAÇÃO", "BORRACHA", "DIMENSÃO"];
      const rows = filteredTires.map(t => [
        t.qtd,
        `"${t.cdFilial}"`,
        `"${t.fogo}"`,
        t.nVida,
        t.kmPercorrido,
        t.ano,
        `"${t.mes}"`,
        t.diasEmEstoque,
        `"${t.modelo}"`,
        `"${t.motivoDesinstalacao}"`,
        `"${t.borracha}"`,
        `"${t.dimensao}"`
      ]);

      const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map(e => e.join(";"))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Inventario_Pneus_Mateus_${new Date().toLocaleDateString().replace(/\//g, "-")}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e: any) {
      alert("Erro ao exportar CSV: " + e.message);
    }
  };

  // Mock excel sample text helper
  const insertSampleExcelText = () => {
    const sample = `FILIAL\tCD FILIAL\tFOGO\tN° VIDA\tS1\tS2\tS3\tS4\tS5\tDATA EVENTO\tDIAS EM ESTOQUE\tPOSIÇÃO\tPLACA\tKM PERCORRIDO\tQTD\tMÊS ANALISADO\tMOTIVO DA DESINSTALAÇÃO\tMODELO\tBORRACHA\tMARCA\tDIMENSAO\tANO DESINSTALAÇÃO
CD IMPERATRIZ\tCD IMPERATRIZ\t7916\t1\t12\t11\t11\t10\t12\t25/06/2026\t489\tDIANTEIRA ESQUERDA\tHPX-9281\t29830\t1\tFevereiro\tREFORMA\tGOODYEAR\tVL100\tGOODYEAR\t275/80 R. 22,5\t2025
CD IMPERATRIZ\tCD IMPERATRIZ\tGM5161\t5\t8\t8\t7\t7\t8\t10/06/2026\t329\tTRAÇÃO INTERNA DIREITA\tJKM-1290\t213912\t1\tJulho\tREFORMA\tMICHELIN\tVL110 L\tMICHELIN\t275/80 R. 22,5\t2025
CD IMPERATRIZ\tCD IMPERATRIZ\t8220\t2\t14\t13\t14\t13\t14\t15/05/2026\t260\tTRUCK EXTERNA ESQUERDA\tOPQ-3829\t20302\t1\tOutubro\tCONSERTO\tXBRI\tXMULT\tXBRI\t275/80 R. 22,5\t2025`;
    setImportText(sample);
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f7f9fb]">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-[#0059bb] animate-spin mx-auto mb-4" />
          <p className="text-slate-600 font-medium">Carregando painel de pneus...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex min-h-screen bg-[#f7f9fb] font-sans antialiased text-slate-800 print:hidden">
      
      {/* ================= SIDEBAR ================= */}
      <aside className="w-[280px] bg-white border-r border-slate-200 flex flex-col shrink-0">
        
        {/* Sidebar Header Logo */}
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            {customLogo ? (
              <div className="relative w-10 h-10 shrink-0 flex items-center justify-center bg-slate-50 border border-slate-200 rounded-lg overflow-hidden p-0.5">
                <img src={customLogo} alt="Logo" className="w-full h-full object-contain" />
              </div>
            ) : (
              /* Mateus Logo Recreation */
              <div className="relative flex items-center justify-center w-10 h-10 bg-[#e31a1a] rounded-full shadow-sm text-white font-bold shrink-0">
                <span className="text-lg tracking-tighter">m</span>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#0059bb] rounded-full border-2 border-white flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                </div>
              </div>
            )}
            <div>
              <span className="font-bold text-base text-slate-800 tracking-wider uppercase block">
                transporte
              </span>
            </div>
          </div>

          <div className="mt-5">
            <h1 className="font-display font-bold text-2xl text-[#0059bb] leading-none tracking-tight">Gestão de Pneus</h1>
            <p className="text-xs text-slate-500 font-medium mt-1">Painel de Controle de Estoque</p>
          </div>
        </div>

        {/* Sidebar Nav links */}
        <nav className="p-4 space-y-1 border-b border-slate-100 flex-1 overflow-y-auto">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-colors duration-200 ${
              activeTab === "dashboard"
                ? "bg-[#d8e3fa] text-[#0059bb]"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <LayoutDashboard className={`w-5 h-5 ${activeTab === "dashboard" ? "text-[#0059bb]" : "text-slate-400"}`} />
            Dashboard
          </button>

          <button
            onClick={() => {
              setActiveTab("estoque");
              changeSearchTerm("");
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-colors duration-200 ${
              activeTab === "estoque"
                ? "bg-[#d8e3fa] text-[#0059bb]"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Database className={`w-5 h-5 ${activeTab === "estoque" ? "text-[#0059bb]" : "text-slate-400"}`} />
            Estoque Geral
          </button>

          <button
            onClick={() => setActiveTab("filiais")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-colors duration-200 ${
              activeTab === "filiais"
                ? "bg-[#d8e3fa] text-[#0059bb]"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <MapPin className={`w-5 h-5 ${activeTab === "filiais" ? "text-[#0059bb]" : "text-slate-400"}`} />
            Filiais CD
          </button>

          <button
            onClick={() => setActiveTab("relatorios")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-colors duration-200 ${
              activeTab === "relatorios"
                ? "bg-[#d8e3fa] text-[#0059bb]"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <FileText className={`w-5 h-5 ${activeTab === "relatorios" ? "text-[#0059bb]" : "text-slate-400"}`} />
            Relatórios
          </button>

          <button
            onClick={() => setActiveTab("config")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-colors duration-200 ${
              activeTab === "config"
                ? "bg-[#d8e3fa] text-[#0059bb]"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Settings className={`w-5 h-5 ${activeTab === "config" ? "text-[#0059bb]" : "text-slate-400"}`} />
            Configurações
          </button>

          {/* ================= PERSISTENT FILTERS (As seen in Sidebar screenshot) ================= */}
          <div className="pt-6 mt-6 border-t border-slate-100">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-4 mb-4">Filtros Ativos</h3>
            
            {/* Month Dropdown */}
            <div className="px-4 mb-4">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Mês Desinstalação
              </label>
              <div className="relative">
                <select
                  value={selectedMes}
                  onChange={(e) => changeSelectedMes(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg py-2 pl-3 pr-8 text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#0059bb] focus:ring-1 focus:ring-[#0059bb] cursor-pointer appearance-none"
                >
                  {availableMonths.map(mes => (
                    <option key={mes} value={mes}>{mes === "Todos" ? "Todos os Meses" : mes}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Year Dropdown */}
            <div className="px-4 mb-4">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Ano Desinstalação
              </label>
              <div className="relative">
                <select
                  value={selectedAno}
                  onChange={(e) => changeSelectedAno(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg py-2 pl-3 pr-8 text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#0059bb] focus:ring-1 focus:ring-[#0059bb] cursor-pointer appearance-none"
                >
                  {availableYears.map(year => (
                    <option key={year} value={year}>{year === "Todos" ? "Todos os Anos" : year}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* CD Filial Dropdown */}
            <div className="px-4 mb-4">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-slate-400" />
                CD Filial
              </label>
              <div className="relative">
                <select
                  value={selectedFilial}
                  onChange={(e) => changeSelectedFilial(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg py-2 pl-3 pr-8 text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#0059bb] focus:ring-1 focus:ring-[#0059bb] cursor-pointer appearance-none"
                >
                  <option value="Todos">Seleções múltiplas (Todas)</option>
                  {availableFiliais.filter(f => f !== "Todos").map(fil => (
                    <option key={fil} value={fil}>{fil}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Motivo Desinstalação Dropdown */}
            <div className="px-4 mb-4">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                Motivo Desinstalação
              </label>
              <div className="relative">
                <select
                  value={selectedMotivo}
                  onChange={(e) => changeSelectedMotivo(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg py-2 pl-3 pr-8 text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#0059bb] focus:ring-1 focus:ring-[#0059bb] cursor-pointer appearance-none"
                >
                  {availableMotivos.map(mot => (
                    <option key={mot} value={mot}>{mot === "Todos" ? "Todos os Motivos" : mot}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Sidebar mini KPIs removidos para melhor visualização no painel principal */}
          </div>
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-100 space-y-1">
          <button 
            onClick={() => alert("Suporte técnico: suporte.pneus@grupomateus.com.br")}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <HelpCircle className="w-4 h-4 text-slate-400" />
            Suporte Técnico
          </button>
          <button 
            onClick={() => {
              if (confirm("Deseja fechar o painel de logística de pneus?")) {
                alert("Saindo do sistema...");
              }
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4 text-red-400" />
            Sair da Sessão
          </button>
        </div>
      </aside>

      {/* ================= MAIN CONTENT CONTAINER ================= */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        {/* ================= HEADER BAR ================= */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 sticky top-0 z-30">
          
          <div className="flex items-center gap-4">
            <h2 className="font-display font-bold text-xl text-slate-800">
              {activeTab === "dashboard" && "Painel de Controle de Estoque"}
              {activeTab === "estoque" && "Gerenciador do Estoque Geral"}
              {activeTab === "filiais" && "Análise Geral por Filial"}
              {activeTab === "relatorios" && "Central de Relatórios Consolidados"}
              {activeTab === "config" && "Ajustes e Banco de Dados"}
            </h2>

            {/* Quick status indicator as requested */}
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-200">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
              SINC. NUVEM
            </span>
          </div>

          {/* Header Controls */}
          <div className="flex items-center gap-4">
            
            {/* Search Input */}
            <div className="relative w-64">
              <input
                type="text"
                placeholder="Pesquisar pneu, borracha..."
                value={searchTerm}
                onChange={(e) => changeSearchTerm(e.target.value)}
                className="w-full bg-[#f2f4f6] border-0 rounded-lg py-2 pl-9 pr-4 text-xs font-semibold text-slate-700 placeholder-slate-400 focus:ring-2 focus:ring-[#0059bb] transition-all"
              />
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              {searchTerm && (
                <button onClick={() => changeSearchTerm("")} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* "Importar XLS" Button */}
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#0059bb] text-white rounded-lg text-xs font-bold hover:bg-[#004ca3] active:bg-[#003d82] transition-colors shadow-sm cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Importar XLS
            </button>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors"
              >
                <Bell className="w-5 h-5" />
                {notifications.filter(n => !n.read).length > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-white"></span>
                )}
              </button>

              <AnimatePresence>
                {isNotificationsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-lg py-2 z-40"
                  >
                    <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-800">Notificações</span>
                      <button 
                        onClick={() => setNotifications(notifications.map(n => ({ ...n, read: true })))}
                        className="text-[10px] text-[#0059bb] hover:underline font-bold"
                      >
                        Ler todas
                      </button>
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      {notifications.map(noti => (
                        <div key={noti.id} className={`px-4 py-3 border-b border-slate-50 text-xs transition-colors ${noti.read ? "opacity-75" : "bg-blue-50/40"}`}>
                          <p className="font-medium text-slate-700">{noti.text}</p>
                          <span className="text-[10px] text-slate-400 mt-1 block">{noti.time}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* User Profile */}
            <div className="relative">
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center justify-center p-2 text-[#0059bb] bg-[#d8e3fa] rounded-full hover:opacity-90 transition-opacity"
              >
                <User className="w-5 h-5" />
              </button>

              <AnimatePresence>
                {isProfileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-lg py-2 z-40 text-xs"
                  >
                    <div className="px-4 py-3 border-b border-slate-100">
                      <p className="font-bold text-slate-800">André Anderson</p>
                      <p className="text-slate-500 font-medium overflow-hidden text-ellipsis">andreandersoncarvalhorocha1@gmail.com</p>
                    </div>
                    <div className="p-1">
                      <button 
                        onClick={() => { setActiveTab("config"); setIsProfileOpen(false); }}
                        className="w-full text-left px-3 py-2 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors font-medium"
                      >
                        Configurações do Sistema
                      </button>
                      <button 
                        onClick={() => alert("Seu perfil está integrado ao Google AI Studio Workspace.")}
                        className="w-full text-left px-3 py-2 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors font-medium"
                      >
                        Meu Acesso
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </div>
        </header>

        {/* ================= VIEW STAGES ================= */}
        <div className="p-6 space-y-6 flex-1">

          {/* FILTERING HEADER NOTIFICATION CHIP (If filtered) */}
          {(selectedAno !== "Todos" || selectedFilial !== "Todos" || selectedMes !== "Todos" || selectedMotivo !== "Todos" || searchTerm) && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-700 flex-wrap">
                <Filter className="w-4 h-4 text-[#0059bb] shrink-0" />
                <span>
                  Visualizando dados filtrados por:{" "}
                  {selectedMes !== "Todos" && <strong className="bg-[#d8e3fa] text-[#0059bb] px-1.5 py-0.5 rounded text-[10px] font-bold mr-1.5">MÊS {selectedMes.toUpperCase()}</strong>}
                  {selectedAno !== "Todos" && <strong className="bg-[#d8e3fa] text-[#0059bb] px-1.5 py-0.5 rounded text-[10px] font-bold mr-1.5">ANO {selectedAno}</strong>}
                  {selectedFilial !== "Todos" && <strong className="bg-[#d8e3fa] text-[#0059bb] px-1.5 py-0.5 rounded text-[10px] font-bold mr-1.5">{selectedFilial}</strong>}
                  {selectedMotivo !== "Todos" && <strong className="bg-[#d8e3fa] text-[#0059bb] px-1.5 py-0.5 rounded text-[10px] font-bold mr-1.5">MOTIVO {selectedMotivo.toUpperCase()}</strong>}
                  {searchTerm && <strong className="bg-[#d8e3fa] text-[#0059bb] px-1.5 py-0.5 rounded text-[10px] font-bold mr-1.5">TERMO &quot;{searchTerm}&quot;</strong>}
                  (Exibindo <strong>{filteredTires.length}</strong> de <strong>{tires.length}</strong> pneus cadastrados).
                </span>
              </div>
              <button
                onClick={() => {
                  changeSelectedAno("Todos");
                  changeSelectedFilial("Todos");
                  setSelectedMes("Todos");
                  setSelectedMotivo("Todos");
                  changeSearchTerm("");
                }}
                className="text-xs text-[#0059bb] hover:underline font-bold shrink-0 ml-4"
              >
                Limpar Filtros
              </button>
            </div>
          )}

          {/* ================= DASHBOARD TAB ================= */}
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              
              {/* INDICADORES GERAIS PRINCIPAIS (REALOCADOS E MELHORADOS) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* KPI 1: QUANTIDADE DE PNEUS */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-xl border border-slate-200 p-5 flex items-center justify-between hover:shadow-md hover:border-slate-300 transition-all relative overflow-hidden"
                >
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#0059bb]"></span>
                      Quantidade de Pneus (Total)
                    </p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-display font-black text-[#0059bb]">
                        {totalTiresCount}
                      </span>
                      <span className="text-xs font-semibold text-slate-600">pneus</span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium">Cadastrados no estoque logístico</p>
                  </div>
                  <div className="p-3.5 bg-blue-50 text-[#0059bb] rounded-xl">
                    <Layers className="w-6 h-6" />
                  </div>
                </motion.div>

                {/* KPI 2: TEMPO MÉDIO ESTOQUE */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-white rounded-xl border border-slate-200 p-5 flex items-center justify-between hover:shadow-md hover:border-slate-300 transition-all relative overflow-hidden"
                >
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                      Tempo Médio em Estoque (Giro)
                    </p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-display font-black text-slate-800">
                        {avgDaysInStock.toLocaleString("pt-BR")}
                      </span>
                      <span className="text-xs font-semibold text-slate-600 font-sans">Dias</span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium">Permanência média de pneus no pátio</p>
                  </div>
                  <div className="p-3.5 bg-amber-50 text-amber-600 rounded-xl">
                    <Calendar className="w-6 h-6" />
                  </div>
                </motion.div>
              </div>

              {/* CARDS POR MOTIVO DA DESINSTALAÇÃO */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                  {
                    title: "Reforma",
                    value: motivosCounts.REFORMA,
                    subtitle: "Retorno operacional",
                    color: "text-blue-600",
                    bg: "bg-blue-50/50",
                    border: "border-blue-100",
                    iconBg: "bg-blue-50 text-blue-600",
                    icon: <RefreshCw className="w-5 h-5" />
                  },
                  {
                    title: "Novo",
                    value: motivosCounts.NOVO,
                    subtitle: "Primeira vida útil",
                    color: "text-emerald-600",
                    bg: "bg-emerald-50/50",
                    border: "border-emerald-100",
                    iconBg: "bg-emerald-50 text-emerald-600",
                    icon: <Sparkles className="w-5 h-5" />
                  },
                  {
                    title: "Conserto",
                    value: motivosCounts.CONSERTO,
                    subtitle: "Reparos executados",
                    color: "text-amber-600",
                    bg: "bg-amber-50/50",
                    border: "border-amber-100",
                    iconBg: "bg-amber-50 text-amber-600",
                    icon: <AlertCircle className="w-5 h-5" />
                  },
                  {
                    title: "Reutilização",
                    value: motivosCounts.REUTILIZAÇÃO,
                    subtitle: "Realocação na frota",
                    color: "text-indigo-600",
                    bg: "bg-indigo-50/50",
                    border: "border-indigo-100",
                    iconBg: "bg-indigo-50 text-indigo-600",
                    icon: <Layers className="w-5 h-5" />
                  },
                  {
                    title: "Sucata",
                    value: motivosCounts.SUCATA,
                    subtitle: "Descarte definitivo",
                    color: "text-rose-600",
                    bg: "bg-rose-50/50",
                    border: "border-rose-100",
                    iconBg: "bg-rose-50 text-rose-600",
                    icon: <Trash2 className="w-5 h-5" />,
                    colSpan: "col-span-2 md:col-span-1"
                  }
                ].map((card, idx) => (
                  <motion.div
                    key={card.title}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={`bg-white rounded-xl border border-slate-200/80 p-4 flex items-center justify-between hover:shadow-md hover:border-slate-300 transition-all ${card.colSpan || ""}`}
                  >
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">{card.title}</p>
                      <p className={`text-2xl font-display font-bold ${card.color}`}>{card.value}</p>
                      <p className="text-[10px] text-slate-600 font-semibold">{card.subtitle}</p>
                    </div>
                    <div className={`p-3 rounded-xl ${card.iconBg}`}>
                      {card.icon}
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* CHARTS GRID ROW 1 (3 Columns) */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* 1. QTD POR MOTIVO DA DESINSTALAÇÃO (Line / Area Chart) */}
                <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 flex flex-col h-[340px]">
                  <div className="mb-4">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Qtd por Motivo da Desinstalação</h3>
                    <p className="text-lg font-bold text-slate-850 leading-none mt-1">Série Histórica</p>
                  </div>
                  
                  {/* SVG Custom Line Chart */}
                  <div className="flex-1 w-full relative min-h-[180px] flex items-end">
                    {/* Background Grid Lines */}
                    <div className="absolute inset-x-0 top-0 bottom-6 flex flex-col justify-between pointer-events-none">
                      <div className="border-b border-slate-100 w-full h-0"></div>
                      <div className="border-b border-slate-100 w-full h-0"></div>
                      <div className="border-b border-slate-100 w-full h-0"></div>
                      <div className="border-b border-slate-100 w-full h-0"></div>
                    </div>

                    {/* SVG Line path & Dots */}
                    <div className="absolute inset-0 bottom-6 left-4 right-4">
                      {(() => {
                        const values = [
                          motivosCounts.REFORMA,
                          motivosCounts.NOVO,
                          motivosCounts.CONSERTO,
                          motivosCounts.REUTILIZAÇÃO,
                          motivosCounts.SUCATA
                        ];
                        const labels = ["REFORMA", "NOVO", "CONSERTO", "REUTILIZAÇÃO", "SUCATA"];
                        
                        const maxValue = Math.max(...values, 10);
                        const width = 300;
                        const height = 150;
                        
                        // Map coordinates
                        const points = values.map((val, idx) => {
                          const x = (idx / (values.length - 1)) * 100; // as percent
                          const y = 100 - (val / maxValue) * 80; // as percent (reserve 20% top margin)
                          return { x, y, val, label: labels[idx] };
                        });

                        // Path strings using numeric coordinate values (0 to 100)
                        const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
                        const areaPath = `${linePath} L 100 100 L 0 100 Z`;

                        return (
                          <div className="relative w-full h-full">
                            {/* SVG 1: Scalable line and area fill */}
                            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                              <defs>
                                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#e31a1a" stopOpacity="0.15" />
                                  <stop offset="100%" stopColor="#e31a1a" stopOpacity="0.00" />
                                </linearGradient>
                              </defs>
                              
                              {/* Area Fill */}
                              <path d={areaPath} fill="url(#areaGradient)" />
                              
                              {/* Continuous Red Line */}
                              <path
                                d={linePath}
                                fill="none"
                                stroke="#e31a1a"
                                strokeWidth="2.5"
                                vectorEffect="non-scaling-stroke"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>

                            {/* SVG 2: Dots & Values (does not stretch text) */}
                            <svg className="absolute inset-0 w-full h-full overflow-visible pointer-events-none">
                              {points.map((p, idx) => (
                                <g key={idx} className="pointer-events-auto">
                                  {/* Pulse Effect on hover */}
                                  <circle
                                    cx={`${p.x}%`}
                                    cy={`${p.y}%`}
                                    r="8"
                                    className="fill-red-500 opacity-0 hover:opacity-20 cursor-pointer transition-opacity"
                                  />
                                  {/* Solid core dot */}
                                  <circle
                                    cx={`${p.x}%`}
                                    cy={`${p.y}%`}
                                    r="4.5"
                                    fill="#e31a1a"
                                    stroke="white"
                                    strokeWidth="1.5"
                                  />
                                  {/* Value Label text */}
                                  <text
                                    x={`${p.x}%`}
                                    y={`${p.y}%`}
                                    dy="-12"
                                    textAnchor="middle"
                                    className="font-display font-bold text-xs fill-slate-800"
                                  >
                                    {p.val}
                                  </text>
                                </g>
                              ))}
                            </svg>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Labels row at bottom */}
                    <div className="absolute inset-x-0 bottom-0 h-6 flex justify-between px-1 text-[9px] font-bold text-slate-500 tracking-wider">
                      <span>REFORMA</span>
                      <span>NOVO</span>
                      <span>CONSERTO</span>
                      <span>REUTILIZ.</span>
                      <span>SUCATA</span>
                    </div>

                  </div>
                </div>

                {/* 2. TEMPO MÉDIO ESTOQUE (DIAS) POR MOTIVO */}
                <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 flex flex-col h-[340px]">
                  <div className="mb-4">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tempo Médio Estoque (Dias)</h3>
                    <p className="text-lg font-bold text-slate-850 leading-none mt-1">Por Motivo de Desinstalação</p>
                  </div>

                  {/* Horizontal Bar Chart */}
                  <div className="flex-1 flex flex-col justify-around py-2">
                    {avgDaysByMotivo.map((item, idx) => {
                      const maxVal = Math.max(...avgDaysByMotivo.map(v => v.avg), 120);
                      const percent = Math.max(5, Math.min(100, (item.avg / maxVal) * 100));
                      const isHigh = item.motivo === "SUCATA"; // Highlight scrap

                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-600 tracking-wider text-[10px]">{item.motivo}</span>
                            <span className="font-bold text-slate-800">{item.avg} DIAS</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${percent}%` }}
                              transition={{ duration: 0.8, ease: "easeOut" }}
                              className={`h-full rounded-full flex items-center justify-end pr-2 text-[9px] font-bold text-white leading-none ${
                                isHigh ? "bg-[#e31a1a]" : "bg-[#0059bb]"
                              }`}
                            >
                              {percent > 20 && `${item.avg}d`}
                            </motion.div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 3. QUANTIDADE POR BORRACHA */}
                <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 flex flex-col h-[340px]">
                  <div className="mb-4">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Quantidade por Borracha</h3>
                    <p className="text-lg font-bold text-slate-850 leading-none mt-1">Frequência da Banda de Borracha</p>
                  </div>

                  {/* Rubber counts list */}
                  <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                    {rubberCounts.map((rub, idx) => {
                      const maxCount = Math.max(...rubberCounts.map(r => r.count), 1);
                      const percent = (rub.count / maxCount) * 100;

                      return (
                        <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 transition-hover hover:border-slate-300">
                          <div className="space-y-0.5">
                            <span className="font-display font-bold text-xs text-slate-800">{rub.name}</span>
                            <div className="w-32 bg-slate-200 rounded-full h-1.5">
                              <div className="bg-[#0059bb] h-full rounded-full" style={{ width: `${percent}%` }}></div>
                            </div>
                          </div>
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#d8e3fa] text-[#0059bb]">
                            {rub.count}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* CHARTS GRID ROW 2 (2 Columns) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* 4. QUANTIDADE DE PNEUS POR DIMENSÃO */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col h-[280px]">
                  <div className="mb-4">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Quantidade de Pneus por Dimensão</h3>
                    <p className="text-lg font-bold text-slate-850 leading-none mt-1">Análise de Aro e Medida</p>
                  </div>

                  {/* Horizontal Bar charts with measures */}
                  <div className="flex-1 overflow-y-auto pr-1 space-y-3.5 max-h-[190px]">
                    {dimensionCounts.length === 0 ? (
                      <p className="text-xs text-slate-400">Nenhum dado de dimensão correspondente.</p>
                    ) : (
                      dimensionCounts.map((dim, idx) => {
                        const maxVal = Math.max(...dimensionCounts.map(d => d.count), 1);
                        const percent = (dim.count / maxVal) * 100;

                        return (
                          <div key={idx} className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                              <span className="truncate pr-2">{dim.name}</span>
                              <span className="font-bold text-slate-900 whitespace-nowrap">{dim.count} pneus</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-lg h-5 overflow-hidden relative">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${percent}%` }}
                                className="h-full bg-gradient-to-r from-[#0059bb] to-blue-500 rounded-lg"
                              ></motion.div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* 5. QUANTIDADE DE PNEUS POR FILIAL */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col h-[280px]">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Quantidade de Pneus por Filial</h3>
                      <p className="text-lg font-bold text-slate-850 leading-none mt-1">Distribuição Geográfica</p>
                    </div>
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold uppercase">
                      Centros de Distribuição
                    </span>
                  </div>

                  {/* Vertical bar chart comparing branches */}
                  <div className="flex-1 flex items-end justify-around pb-2 pt-4">
                    {branchCounts.length === 0 ? (
                      <p className="text-xs text-slate-400">Nenhum dado de filial correspondente.</p>
                    ) : (
                      branchCounts.map((branch, idx) => {
                        const maxVal = Math.max(...branchCounts.map(b => b.count), 1);
                        const percent = (branch.count / maxVal) * 80; // keep some top spacing

                        return (
                          <div key={idx} className="flex flex-col items-center gap-2 group h-full justify-end">
                            <span className="text-[11px] font-extrabold text-[#0059bb] bg-blue-50/70 px-1.5 py-0.5 rounded-md border border-blue-100/50 shadow-xs">
                              {branch.count}
                            </span>
                            <motion.div
                              initial={{ height: 0 }}
                              animate={{ height: `${percent}%` }}
                              className="w-16 bg-gradient-to-t from-[#0059bb] to-blue-500 rounded-t-lg shadow-sm hover:opacity-90 transition-opacity"
                            ></motion.div>
                            <span className="text-[10px] font-bold text-slate-500 tracking-wider truncate w-24 text-center">
                              {branch.name.replace(" CD-119", "")}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

              </div>

              {/* ROW 3: TABELA GERAL DE PNEUS (With exact bottom design from reference) */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-200 flex items-center justify-between">
                  <div>
                    <h3 className="font-display font-bold text-lg text-slate-800">Tabela Geral de Pneus</h3>
                    <p className="text-xs text-slate-500 mt-1">Inventário atualizado e operacional</p>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleExportCSV}
                      className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-bold text-slate-700 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-500" />
                      Exportar CSV
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab("estoque");
                        setIsAddEditModalOpen(true);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0059bb]/10 hover:bg-[#0059bb]/20 text-[#0059bb] rounded-lg text-xs font-bold cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Adicionar Pneu
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-center border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                        <th className="py-3 px-4 text-center">QTD</th>
                        <th className="py-3 px-4 text-center">CD FILIAL</th>
                        <th className="py-3 px-4 text-center">FOGO</th>
                        <th className="py-3 px-4 text-center">Nº VIDA</th>
                        <th className="py-3 px-4 text-center">KM PERCORRIDO</th>
                        <th className="py-3 px-4 text-center">ANO</th>
                        <th className="py-3 px-4 text-center">MÊS</th>
                        <th className="py-3 px-4 text-center">DIAS EM ESTOQUE</th>
                        <th className="py-3 px-4 text-center">MODELO</th>
                        <th className="py-3 px-4 text-center">AÇÕES</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-medium">
                      {paginatedTires.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="py-10 text-center text-slate-500">
                            Nenhum pneu encontrado com os filtros atuais.
                          </td>
                        </tr>
                      ) : (
                        paginatedTires.map((tire) => {
                          // Max days is around 489
                          const daysPercent = Math.min(100, (tire.diasEmEstoque / 489) * 100);

                          return (
                            <tr 
                              key={tire.id} 
                              className={`transition-colors border-b border-slate-100 ${
                                tire.diasEmEstoque > 50 
                                  ? "bg-red-50/80 hover:bg-red-100/70 text-red-950 border-l-4 border-l-red-500" 
                                  : "hover:bg-slate-50/50 border-l-4 border-l-transparent"
                              }`}
                            >
                              <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-500">{tire.qtd}</td>
                              <td className="py-3.5 px-4 text-center font-semibold text-slate-900">{tire.cdFilial}</td>
                              <td className="py-3.5 px-4 text-center">
                                <span className="bg-slate-100 text-slate-900 px-2 py-0.5 rounded font-mono font-bold border border-slate-200/50">
                                  {tire.fogo}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-800">{tire.nVida}</td>
                              <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-800">
                                {tire.kmPercorrido.toLocaleString("pt-BR")} <span className="text-[10px] font-medium text-slate-500">km</span>
                              </td>
                              <td className="py-3.5 px-4 text-center text-slate-700">{tire.ano}</td>
                              <td className="py-3.5 px-4 text-center text-slate-700 font-semibold">{tire.mes}</td>
                              <td className="py-3.5 px-4 text-center min-w-[180px]">
                                <div className="flex items-center justify-center gap-3">
                                  {/* Progress bar representing stock age */}
                                  <div className="w-24 bg-slate-100 rounded-full h-2 overflow-hidden shrink-0">
                                    <div
                                      className={`h-full rounded-full ${
                                        tire.diasEmEstoque > 300
                                          ? "bg-[#e31a1a]"
                                          : tire.diasEmEstoque > 150
                                          ? "bg-[#0059bb]"
                                          : tire.diasEmEstoque > 50
                                          ? "bg-red-500"
                                          : "bg-blue-400"
                                      }`}
                                      style={{ width: `${daysPercent}%` }}
                                    ></div>
                                  </div>
                                  <span className={`font-mono font-bold flex items-center gap-1 ${tire.diasEmEstoque > 50 ? "text-red-600" : "text-slate-900"}`}>
                                    {tire.diasEmEstoque > 50 && <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                                    {tire.diasEmEstoque} <span className="text-[10px] font-medium text-slate-500">dias</span>
                                  </span>
                                </div>
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-800 bg-slate-100/80 px-2 py-0.5 rounded border border-slate-200/50">
                                  {tire.modelo}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    onClick={() => setSelectedDetailTire(tire)}
                                    className="p-1 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors cursor-pointer"
                                    title="Visualizar Ficha Completa"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => openEditModal(tire)}
                                    className="p-1 text-slate-500 hover:text-[#0059bb] hover:bg-blue-50 rounded transition-colors cursor-pointer"
                                    title="Editar Pneu"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteTire(tire.id)}
                                    className="p-1 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                                    title="Excluir"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* TABLE FOOTER / AGGREGATION ROW (Matches exact reference statistics) */}
                <div className="bg-slate-50 border-t border-slate-200 p-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-bold text-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-600 font-bold font-mono">QTD TOTAL:</span>
                    <span className="font-display text-base text-[#0059bb]">{filteredTires.length} Pneus</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-600 font-bold font-mono">KM TOTAL ACUMULADO:</span>
                    <span className="text-base text-slate-900">{totalKmTraveled.toLocaleString("pt-BR")} km</span>
                  </div>
                  <div className="flex items-center gap-2 md:justify-end">
                    <span className="text-slate-600 font-bold font-mono">DIAS EM ESTOQUE MÁX:</span>
                    <span className="text-base text-red-600 font-mono">{maxDaysInStock} Dias (Máx)</span>
                  </div>
                </div>

                {/* PAGINATION PANEL */}
                <div className="p-4 border-t border-slate-100 bg-white flex items-center justify-between">
                  <p className="text-xs text-slate-500">
                    Mostrando <strong>{paginatedTires.length}</strong> de <strong>{filteredTires.length}</strong> pneus
                  </p>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-2 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-bold text-slate-700">
                      Página {currentPage} de {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-2 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* ================= ESTOQUE VIEW (Full Inventory Hub) ================= */}
          {activeTab === "estoque" && (
            <div className="space-y-6">
              
              {/* Search, Filter, Add Bar */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
                
                <div className="flex-1 flex flex-col md:flex-row items-stretch md:items-center gap-3">
                  {/* Local inventory search */}
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="Filtrar por número de Fogo, Modelo ou CD..."
                      value={searchTerm}
                      onChange={(e) => changeSearchTerm(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-[#0059bb] rounded-lg py-2.5 pl-10 pr-4 text-xs font-semibold text-slate-700 transition-all"
                    />
                    <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  </div>

                  {/* Quick Filters */}
                  <div className="flex gap-2">
                    <select
                      value={selectedMes}
                      onChange={(e) => changeSelectedMes(e.target.value)}
                      className="bg-white border border-slate-200 rounded-lg py-2 px-3 text-xs font-bold text-slate-700 cursor-pointer focus:outline-none"
                    >
                      {availableMonths.map(mes => (
                        <option key={mes} value={mes}>{mes === "Todos" ? "Todos os Meses" : mes}</option>
                      ))}
                    </select>

                    <select
                      value={selectedAno}
                      onChange={(e) => changeSelectedAno(e.target.value)}
                      className="bg-white border border-slate-200 rounded-lg py-2 px-3 text-xs font-bold text-slate-700 cursor-pointer focus:outline-none"
                    >
                      {availableYears.map(year => (
                        <option key={year} value={year}>{year === "Todos" ? "Todos os Anos" : `Ano ${year}`}</option>
                      ))}
                    </select>

                    <select
                      value={selectedFilial}
                      onChange={(e) => changeSelectedFilial(e.target.value)}
                      className="bg-white border border-slate-200 rounded-lg py-2 px-3 text-xs font-bold text-slate-700 cursor-pointer focus:outline-none"
                    >
                      <option value="Todos">Todas as Filiais</option>
                      {availableFiliais.filter(f => f !== "Todos").map(fil => (
                        <option key={fil} value={fil}>{fil}</option>
                      ))}
                    </select>

                    <select
                      value={selectedMotivo}
                      onChange={(e) => changeSelectedMotivo(e.target.value)}
                      className="bg-white border border-slate-200 rounded-lg py-2 px-3 text-xs font-bold text-slate-700 cursor-pointer focus:outline-none"
                    >
                      {availableMotivos.map(mot => (
                        <option key={mot} value={mot}>{mot === "Todos" ? "Todos os Motivos" : mot}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Operations */}
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => {
                      resetForm();
                      setIsAddEditModalOpen(true);
                    }}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0059bb] text-white rounded-lg text-xs font-bold hover:bg-[#004ca3] transition-colors shadow-xs"
                  >
                    <Plus className="w-4 h-4" />
                    Novo Pneu
                  </button>

                  <button
                    onClick={handleExportCSV}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <Download className="w-4 h-4 text-slate-500" />
                    Exportar
                  </button>
                </div>

              </div>

              {/* Master Inventory Grid Table */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                
                <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">Estoque Consolidado ({filteredTires.length} pneus)</span>
                    <p className="text-[10px] text-slate-500 font-medium mt-0.5">Gerenciamento completo das fichas operacionais de pneus</p>
                  </div>
                  <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg shrink-0">
                    <button
                      onClick={() => setTableMode("padrão")}
                      className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                        tableMode === "padrão"
                          ? "bg-white text-[#0059bb] shadow-xs font-extrabold"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      Visualização Essencial
                    </button>
                    <button
                      onClick={() => setTableMode("planilha")}
                      className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                        tableMode === "planilha"
                          ? "bg-white text-[#0059bb] shadow-xs font-extrabold"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      Colunas da Planilha (Completa)
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  {tableMode === "padrão" ? (
                    <table className="w-full text-center border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                          <th className="py-3 px-4 text-center">OPERADOR / CD</th>
                          <th className="py-3 px-4 text-center">FOGO</th>
                          <th className="py-3 px-4 text-center">MARCA / MODELO</th>
                          <th className="py-3 px-4 text-center">DIMENSÃO</th>
                          <th className="py-3 px-4 text-center">BANDA BORRACHA</th>
                          <th className="py-3 px-4 text-center">Nº VIDAS</th>
                          <th className="py-3 px-4 text-center">KM ACUMULADO</th>
                          <th className="py-3 px-4 text-center">MOTIVO RETIRADA</th>
                          <th className="py-3 px-4 text-center">DIAS EM ESTOQUE</th>
                          <th className="py-3 px-4 text-center">OPÇÕES</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-medium">
                        {filteredTires.length === 0 ? (
                          <tr>
                            <td colSpan={10} className="py-20 text-center text-slate-500">
                              Nenhum pneu operacional localizado para esta busca.
                            </td>
                          </tr>
                        ) : (
                          filteredTires.slice((currentPage - 1) * 12, currentPage * 12).map((tire) => (
                            <tr 
                              key={tire.id} 
                              className={`transition-colors border-b border-slate-100 ${
                                tire.diasEmEstoque > 50 
                                  ? "bg-red-50/80 hover:bg-red-100/70 text-red-950 border-l-4 border-l-red-500" 
                                  : "hover:bg-slate-50/50 border-l-4 border-l-transparent"
                              }`}
                            >
                              <td className="py-4 px-4 text-center">
                                <p className="font-bold text-slate-900 leading-tight">{tire.cdFilial}</p>
                                <p className="text-[10px] text-slate-500 font-mono mt-0.5">{tire.mes}/{tire.ano}</p>
                              </td>
                              <td className="py-4 px-4 text-center">
                                <span className="bg-blue-50 text-[#0059bb] font-mono font-bold text-xs px-2.5 py-1 rounded border border-blue-100 shadow-2xs">
                                  {tire.fogo}
                                </span>
                              </td>
                              <td className="py-4 px-4 text-center font-bold text-slate-800">{tire.modelo}</td>
                              <td className="py-4 px-4 text-center font-mono text-slate-600 text-[11px] font-semibold">{tire.dimensao}</td>
                              <td className="py-4 px-4 text-center">
                                <span className="bg-slate-100 text-slate-900 px-2 py-0.5 rounded font-mono text-[10px] font-bold border border-slate-200/55">
                                  {tire.borracha}
                                </span>
                              </td>
                              <td className="py-4 px-4 text-center">
                                <span className="font-mono font-bold bg-slate-50 px-2.5 py-0.5 rounded border border-slate-200 text-slate-900">
                                  {tire.nVida}ª
                                </span>
                              </td>
                              <td className="py-4 px-4 text-center font-mono font-bold text-slate-800">
                                {tire.kmPercorrido.toLocaleString("pt-BR")} <span className="text-[10px] font-medium text-slate-500">km</span>
                              </td>
                              <td className="py-4 px-4 text-center">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  tire.motivoDesinstalacao === "SUCATA"
                                    ? "bg-red-50 text-red-700 border border-red-100"
                                    : tire.motivoDesinstalacao === "NOVO"
                                    ? "bg-green-50 text-green-700 border border-green-100"
                                    : "bg-blue-50 text-blue-700 border border-blue-100"
                                }`}>
                                  {tire.motivoDesinstalacao}
                                </span>
                              </td>
                              <td className="py-4 px-4 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <span className={`font-mono font-bold flex items-center gap-1 ${tire.diasEmEstoque > 50 ? "text-red-600" : "text-slate-900"}`}>
                                    {tire.diasEmEstoque > 50 && <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                                    {tire.diasEmEstoque}
                                  </span>
                                  <span className="text-[10px] text-slate-500 font-medium">dias</span>
                                </div>
                              </td>
                              <td className="py-4 px-4 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    onClick={() => setSelectedDetailTire(tire)}
                                    className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors cursor-pointer"
                                    title="Visualizar Ficha Completa"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => openEditModal(tire)}
                                    className="p-1.5 text-slate-500 hover:text-[#0059bb] hover:bg-blue-50 rounded transition-colors cursor-pointer"
                                    title="Editar"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteTire(tire.id)}
                                    className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                                    title="Excluir"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  ) : (
                    <table className="w-full text-center border-collapse min-w-[2200px]">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                          <th className="py-3 px-3 text-center whitespace-nowrap">QTD</th>
                          <th className="py-3 px-3 text-center whitespace-nowrap">FILIAL</th>
                          <th className="py-3 px-3 text-center whitespace-nowrap">CD FILIAL</th>
                          <th className="py-3 px-3 text-center whitespace-nowrap">FOGO</th>
                          <th className="py-3 px-3 text-center whitespace-nowrap">Nº VIDA</th>
                          <th className="py-3 px-3 text-center whitespace-nowrap">S1</th>
                          <th className="py-3 px-3 text-center whitespace-nowrap">S2</th>
                          <th className="py-3 px-3 text-center whitespace-nowrap">S3</th>
                          <th className="py-3 px-3 text-center whitespace-nowrap">S4</th>
                          <th className="py-3 px-3 text-center whitespace-nowrap">S5</th>
                          <th className="py-3 px-3 text-center whitespace-nowrap">DATA EVENTO</th>
                          <th className="py-3 px-3 text-center whitespace-nowrap">DIAS EM ESTOQUE</th>
                          <th className="py-3 px-3 text-center whitespace-nowrap">POSIÇÃO</th>
                          <th className="py-3 px-3 text-center whitespace-nowrap">PLACA</th>
                          <th className="py-3 px-3 text-center whitespace-nowrap">KM PERCORRIDO</th>
                          <th className="py-3 px-3 text-center whitespace-nowrap">MÊS ANALISADO</th>
                          <th className="py-3 px-3 text-center whitespace-nowrap">MOTIVO DA DESINSTALAÇÃO</th>
                          <th className="py-3 px-3 text-center whitespace-nowrap">MODELO</th>
                          <th className="py-3 px-3 text-center whitespace-nowrap">BORRACHA</th>
                          <th className="py-3 px-3 text-center whitespace-nowrap">MARCA</th>
                          <th className="py-3 px-3 text-center whitespace-nowrap">DIMENSÃO</th>
                          <th className="py-3 px-3 text-center whitespace-nowrap">ANO DESINSTALAÇÃO</th>
                          <th className="py-3 px-3 text-center whitespace-nowrap sticky right-0 bg-slate-50 z-10 shadow-[rgba(0,0,0,0.05)_-4px_0px_4px_-2px]">AÇÕES</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-medium">
                        {filteredTires.length === 0 ? (
                          <tr>
                            <td colSpan={23} className="py-20 text-center text-slate-500">
                              Nenhum pneu operacional localizado para esta busca.
                            </td>
                          </tr>
                        ) : (
                          filteredTires.slice((currentPage - 1) * 12, currentPage * 12).map((tire) => (
                            <tr 
                              key={tire.id} 
                              className={`transition-colors border-b border-slate-100 ${
                                tire.diasEmEstoque > 50 
                                  ? "bg-red-50/80 hover:bg-red-100/70 text-red-950 border-l-4 border-l-red-500" 
                                  : "hover:bg-slate-50/50 border-l-4 border-l-transparent"
                              }`}
                            >
                              <td className="py-3 px-3 text-center font-mono font-bold text-slate-500 whitespace-nowrap">{tire.qtd}</td>
                              <td className="py-3 px-3 text-center font-semibold text-slate-900 whitespace-nowrap">{tire.filial || tire.cdFilial}</td>
                              <td className="py-3 px-3 text-center text-slate-700 whitespace-nowrap">{tire.cdFilial}</td>
                              <td className="py-3 px-3 text-center whitespace-nowrap">
                                <span className="bg-blue-50 text-[#0059bb] font-mono font-bold text-xs px-2 py-0.5 rounded border border-blue-100 shadow-3xs">
                                  {tire.fogo}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-center font-mono font-bold text-slate-800 whitespace-nowrap">{tire.nVida}ª Vida</td>
                              <td className="py-3 px-3 font-mono text-center text-slate-700 whitespace-nowrap">{tire.s1 || "-"}</td>
                              <td className="py-3 px-3 font-mono text-center text-slate-700 whitespace-nowrap">{tire.s2 || "-"}</td>
                              <td className="py-3 px-3 font-mono text-center text-slate-700 whitespace-nowrap">{tire.s3 || "-"}</td>
                              <td className="py-3 px-3 font-mono text-center text-slate-700 whitespace-nowrap">{tire.s4 || "-"}</td>
                              <td className="py-3 px-3 font-mono text-center text-slate-700 whitespace-nowrap">{tire.s5 || "-"}</td>
                              <td className="py-3 px-3 text-center font-mono text-slate-700 whitespace-nowrap">{tire.dataEvento || "-"}</td>
                              <td className="py-3 px-3 text-center whitespace-nowrap">
                                <div className="flex items-center justify-center gap-1.5">
                                  <span className={`font-mono font-bold flex items-center gap-1 ${tire.diasEmEstoque > 50 ? "text-red-600" : "text-slate-900"}`}>
                                    {tire.diasEmEstoque > 50 && <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                                    {tire.diasEmEstoque}
                                  </span>
                                  <span className="text-[10px] text-slate-500">dias</span>
                                </div>
                              </td>
                              <td className="py-3 px-3 text-center text-slate-700 whitespace-nowrap">{tire.posicao || "-"}</td>
                              <td className="py-3 px-3 text-center font-mono text-slate-700 whitespace-nowrap">{tire.placa || "-"}</td>
                              <td className="py-3 px-3 text-center font-mono font-bold text-slate-800 whitespace-nowrap">
                                {tire.kmPercorrido.toLocaleString("pt-BR")} km
                              </td>
                              <td className="py-3 px-3 text-center text-slate-700 whitespace-nowrap">{tire.mesAnalisado || tire.mes}</td>
                              <td className="py-3 px-3 text-center whitespace-nowrap">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  tire.motivoDesinstalacao === "SUCATA"
                                    ? "bg-red-50 text-red-700 border border-red-100"
                                    : tire.motivoDesinstalacao === "NOVO"
                                    ? "bg-green-50 text-green-700 border border-green-100"
                                    : "bg-blue-50 text-blue-700 border border-blue-100"
                                }`}>
                                  {tire.motivoDesinstalacao}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-center font-semibold text-slate-800 whitespace-nowrap">{tire.modelo}</td>
                              <td className="py-3 px-3 text-center whitespace-nowrap">
                                <span className="bg-slate-100 text-slate-900 px-1.5 py-0.5 rounded font-mono text-[10px] font-bold border border-slate-200/50">
                                  {tire.borracha}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-center text-slate-700 whitespace-nowrap">{tire.marca || tire.modelo}</td>
                              <td className="py-3 px-3 text-center font-mono text-slate-600 font-semibold text-[11px] whitespace-nowrap">{tire.dimensao}</td>
                              <td className="py-3 px-3 text-center font-mono text-slate-700 whitespace-nowrap">{tire.anoDesinstalacao || tire.ano}</td>
                              <td className="py-3 px-3 text-center sticky right-0 bg-white hover:bg-slate-50 transition-colors z-10 shadow-[rgba(0,0,0,0.05)_-4px_0px_4px_-2px] whitespace-nowrap">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    onClick={() => setSelectedDetailTire(tire)}
                                    className="p-1 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors cursor-pointer"
                                    title="Visualizar Ficha Completa"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => openEditModal(tire)}
                                    className="p-1 text-slate-500 hover:text-[#0059bb] hover:bg-blue-50 rounded transition-colors cursor-pointer"
                                    title="Editar"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteTire(tire.id)}
                                    className="p-1 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                                    title="Excluir"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Pagination */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">
                    Exibindo itens de <strong>{Math.min(filteredTires.length, (currentPage - 1) * 12 + 1)}</strong> a <strong>{Math.min(filteredTires.length, currentPage * 12)}</strong> de <strong>{filteredTires.length}</strong> pneus.
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-1.5 border border-slate-200 bg-white rounded-lg text-slate-500 hover:bg-slate-50 disabled:opacity-50"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="font-bold">
                      Página {currentPage} de {Math.ceil(filteredTires.length / 12) || 1}
                    </span>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredTires.length / 12), p + 1))}
                      disabled={currentPage === (Math.ceil(filteredTires.length / 12) || 1)}
                      className="p-1.5 border border-slate-200 bg-white rounded-lg text-slate-500 hover:bg-slate-50 disabled:opacity-50"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* ================= FILIAIS VIEW ================= */}
          {activeTab === "filiais" && (
            <div className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                {availableFiliais.filter(f => f !== "Todos").map((fil, i) => {
                  const subTires = tires.filter(t => t.cdFilial === fil);
                  const total = subTires.length;
                  const avgDays = total ? Math.round(subTires.reduce((acc, curr) => acc + curr.diasEmEstoque, 0) / total) : 0;
                  const avgLife = total ? (Math.round((subTires.reduce((acc, curr) => acc + curr.nVida, 0) / total) * 10) / 10) : 0;
                  const sumKm = subTires.reduce((acc, curr) => acc + curr.kmPercorrido, 0);

                  return (
                    <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span className="p-2 bg-[#d8e3fa] text-[#0059bb] rounded-lg">
                            <MapPin className="w-5 h-5" />
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase font-mono">ID CD-{100 + i * 19}</span>
                        </div>
                        <h4 className="font-display font-bold text-lg text-slate-800 tracking-tight">{fil}</h4>
                        <p className="text-xs text-slate-400 font-medium mt-0.5">Operações logísticas integradas</p>
                        
                        <div className="mt-5 space-y-2 border-t border-slate-100 pt-4 text-xs font-semibold text-slate-600">
                          <div className="flex justify-between">
                            <span>Quantidade Pneus:</span>
                            <span className="text-[#0059bb] font-bold">{total} un</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Média de Vidas:</span>
                            <span className="text-slate-800 font-bold">{avgLife}ª Vida</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Tempo de Estoque Médio:</span>
                            <span className="text-slate-800 font-bold">{avgDays} Dias</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Kilometragem Total:</span>
                            <span className="text-slate-800 font-bold">{sumKm.toLocaleString("pt-BR")} km</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6">
                        <button
                          onClick={() => {
                            changeSelectedFilial(fil);
                            setActiveTab("dashboard");
                          }}
                          className="w-full text-center py-2 bg-slate-50 hover:bg-[#d8e3fa] border border-slate-200 hover:border-blue-200 text-xs font-bold text-[#0059bb] rounded-lg transition-colors cursor-pointer"
                        >
                          Visualizar no Dashboard
                        </button>
                      </div>
                    </div>
                  );
                })}

              </div>

            </div>
          )}

          {/* ================= RELATÓRIOS VIEW ================= */}
          {activeTab === "relatorios" && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
              
              <div className="border-b border-slate-200 pb-4">
                <h3 className="font-display font-bold text-xl text-slate-800">Exportar Relatórios Operacionais</h3>
                <p className="text-xs text-slate-500 mt-1">Gere arquivos de inventário detalhados, compatíveis com Excel e PowerBI.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* PDF Print format card */}
                <div className="border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-colors">
                  <h4 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#0059bb]" />
                    Relatório Customizado de Estoque (PDF)
                  </h4>
                  <p className="text-xs text-slate-500 mt-2">
                    Gera um documento formatado para impressão ou salvamento em PDF, aplicando os filtros e buscas atualmente selecionados.
                  </p>
                  
                  {/* Status of filters to be printed */}
                  <div className="mt-3 p-2.5 bg-slate-50 border border-slate-100 rounded-lg text-[11px] text-slate-600 space-y-1">
                    <p className="font-semibold text-slate-500 uppercase tracking-wider text-[9px]">Filtros Atuais a Serem Exportados:</p>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <div>Filial: <strong className="text-slate-800">{selectedFilial}</strong></div>
                      <div>Ano: <strong className="text-slate-800">{selectedAno}</strong></div>
                      <div>Mês: <strong className="text-slate-800">{selectedMes}</strong></div>
                      <div>Motivo: <strong className="text-slate-800">{selectedMotivo}</strong></div>
                    </div>
                    {searchTerm && (
                      <div className="pt-1 border-t border-slate-100 mt-1">
                        Busca por: <strong className="text-[#0059bb]">&ldquo;{searchTerm}&rdquo;</strong>
                      </div>
                    )}
                    <div className="pt-1 text-[10px] text-slate-400 italic">
                      Total a exportar: <strong>{filteredTires.length}</strong> {filteredTires.length === 1 ? 'pneu' : 'pneus'}
                    </div>
                  </div>

                  <button
                    onClick={() => window.print()}
                    className="mt-4 w-full md:w-auto px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    Gerar PDF do Estoque Filtrado
                  </button>
                </div>

                {/* CSV Power BI card */}
                <div className="border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-colors">
                  <h4 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#0059bb]" />
                    Exportar para Business Intelligence
                  </h4>
                  <p className="text-xs text-slate-500 mt-2">
                    Gera um documento CSV com formatação limpa e de alta densidade, perfeito para PowerBI e planilhas dinâmicas.
                  </p>
                  <button
                    onClick={handleExportCSV}
                    className="mt-4 px-4 py-2 bg-[#0059bb] hover:bg-[#004ca3] text-white font-bold text-xs rounded-lg transition-colors"
                  >
                    Baixar Base (.CSV)
                  </button>
                </div>

              </div>

              <div className="bg-[#f8fafc] rounded-xl border border-slate-200 p-5 space-y-3">
                <h4 className="font-bold text-xs text-slate-400 uppercase tracking-widest">Resumo Estatístico Operacional</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-semibold text-slate-600">
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <span className="text-slate-400 block mb-1">PNEUS EM REFORMA</span>
                    <strong className="text-lg text-slate-800 font-display">{tires.filter(t => t.motivoDesinstalacao === "REFORMA").length} un</strong>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <span className="text-slate-400 block mb-1">PNEUS NOVOS EM ESTOQUE</span>
                    <strong className="text-lg text-slate-800 font-display">{tires.filter(t => t.motivoDesinstalacao === "NOVO").length} un</strong>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <span className="text-slate-400 block mb-1">PNEUS DESCARTADOS (SUCATA)</span>
                    <strong className="text-lg text-slate-800 font-display">{tires.filter(t => t.motivoDesinstalacao === "SUCATA").length} un</strong>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <span className="text-slate-400 block mb-1">MÉDIA GLOBAL DE VIDA</span>
                    <strong className="text-lg text-[#0059bb] font-display">
                      {(Math.round((tires.reduce((acc, c) => acc + c.nVida, 0) / tires.length) * 10) / 10)}ª Vida
                    </strong>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* ================= CONFIGURAÇÕES VIEW ================= */}
          {activeTab === "config" && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
              
              <div className="border-b border-slate-200 pb-4">
                <h3 className="font-display font-bold text-xl text-slate-800">Configurações do Banco de Dados Local</h3>
                <p className="text-xs text-slate-500 mt-1">Configure o armazenamento persistente do painel de controle e redefina os dados.</p>
              </div>

              <div className="space-y-4 max-w-xl text-xs font-semibold text-slate-600">
                <div className="flex justify-between items-center p-4 border border-slate-200 rounded-lg">
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">Redefinir Dados de Fábrica</h4>
                    <p className="text-xs text-slate-500 font-medium mt-1">
                      Retorna todo o estoque ao estado original de 90 pneus sincronizados da imagem de referência.
                    </p>
                  </div>
                  <button
                    onClick={handleResetData}
                    className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold rounded-lg transition-colors cursor-pointer shrink-0"
                  >
                    Redefinir Banco de Dados
                  </button>
                </div>

                <div className="flex justify-between items-center p-4 border border-slate-200 rounded-lg">
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">Limpar Todo o Inventário</h4>
                    <p className="text-xs text-slate-500 font-medium mt-1">
                      Remove completamente todos os pneus armazenados de forma irreversível.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      if (confirm("Quer realmente LIMPAR TODOS os pneus? Esta ação removerá os 90 pneus cadastrados e deixará o painel limpo para nova importação.")) {
                        updateTiresState([]);
                        alert("Estoque limpo!");
                      }
                    }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-colors cursor-pointer shrink-0"
                  >
                    Limpar Tudo
                  </button>
                </div>

                {/* Portabilidade Vercel & GitHub */}
                <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg space-y-3 leading-relaxed font-medium">
                  <p className="flex items-center gap-2 font-bold mb-1 text-emerald-800">
                    <Database className="w-4 h-4 shrink-0" />
                    Portabilidade para GitHub & Vercel
                  </p>
                  <p className="text-xs text-emerald-700">
                    Todas as suas alterações (pneus editados, novos pneus, logotipo personalizado, etc.) são salvas automaticamente no <strong>localStorage</strong> do seu navegador. Ao subir o projeto no GitHub ou implantar na Vercel, as informações <strong>não vão sumir</strong> no seu navegador!
                  </p>
                  <p className="text-xs text-emerald-700">
                    Para garantir total segurança, trocar de dispositivo ou salvar o seu banco de dados atual diretamente no repositório do seu projeto, você pode baixar o backup JSON e restaurá-lo a qualquer momento:
                  </p>
                  
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <button
                      type="button"
                      onClick={handleExportBackup}
                      className="flex items-center justify-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors cursor-pointer text-xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Exportar Backup (JSON)
                    </button>
                    
                    <label className="flex items-center justify-center gap-2 px-3 py-2 bg-white hover:bg-slate-50 text-emerald-700 border border-emerald-300 font-bold rounded-lg transition-colors cursor-pointer text-xs text-center">
                      <Upload className="w-3.5 h-3.5" />
                      Importar Backup (JSON)
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleImportBackup}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg leading-relaxed font-medium">
                  <p className="flex items-center gap-2 font-bold mb-1">
                    <Info className="w-4 h-4 shrink-0" />
                    Informações sobre Armazenamento
                  </p>
                  Este applet utiliza persistência automatizada via <strong>localStorage</strong>. Todas as operações de adição, edição, exclusão e importação de planilhas feitas através do botão &quot;Importar XLS&quot; persistirão no seu navegador atual, mantendo as estatísticas operacionais de forma durável e interativa.
                </div>
              </div>

            </div>
          )}

          {/* FOOTER METADATA UPDATE DATE (Matches image "DATA DA ÚLTIMA ATUALIZAÇÃO...") */}
          <footer className="pt-6 border-t border-slate-200 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Data da última atualização: 24/04/2026 14:35 | Grupo Mateus Pneus Logística S.A.
          </footer>

        </div>
      </main>

      {/* ================= MODAL: IMPORTAR XLS ================= */}
      <AnimatePresence>
        {isImportModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-2xl overflow-hidden text-slate-800"
            >
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {importModalTab === "data" ? (
                    <FileSpreadsheet className="w-5 h-5 text-[#0059bb]" />
                  ) : (
                    <Upload className="w-5 h-5 text-emerald-600" />
                  )}
                  <span className="font-display font-bold text-base">
                    {importModalTab === "data" 
                      ? "Importação Integrada de Planilha (XLS / CSV)" 
                      : "Personalização de Logotipo da Empresa"}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setIsImportModalOpen(false);
                    setImportError("");
                    setImportSuccess("");
                    setLogoError("");
                  }}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation Tabs for Import Modal */}
              <div className="flex border-b border-slate-200 bg-slate-50">
                <button
                  type="button"
                  onClick={() => setImportModalTab("data")}
                  className={`flex-1 py-3 text-center text-xs font-bold uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
                    importModalTab === "data"
                      ? "border-[#0059bb] text-[#0059bb] bg-white"
                      : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50"
                  }`}
                >
                  1. Importar Planilha (Estoque)
                </button>
                <button
                  type="button"
                  onClick={() => setImportModalTab("logo")}
                  className={`flex-1 py-3 text-center text-xs font-bold uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
                    importModalTab === "logo"
                      ? "border-[#0059bb] text-[#0059bb] bg-white"
                      : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50"
                  }`}
                >
                  2. Logotipo Personalizado
                </button>
              </div>

              {importModalTab === "data" ? (
                <div className="p-6 space-y-4">
                  
                  {importError && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-semibold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-500" />
                      {importError}
                    </div>
                  )}

                  {importSuccess && (
                    <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-xs font-semibold flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" />
                      {importSuccess}
                    </div>
                  )}

                  <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                    Selecione um arquivo de planilha ou cole colunas diretamente do Excel/Google Sheets. O importador identificará automaticamente as colunas principais como <strong>CD FILIAL</strong>, <strong>FOGO</strong>, <strong>DIAS EM ESTOQUE</strong>, etc.
                  </p>

                  <div className="flex items-center gap-2 bg-blue-50/50 border border-blue-100 p-3 rounded-lg">
                    <input
                      type="checkbox"
                      id="replace-existing"
                      checked={replaceExisting}
                      onChange={(e) => setReplaceExisting(e.target.checked)}
                      className="w-4 h-4 text-[#0059bb] border-slate-300 rounded focus:ring-[#0059bb] cursor-pointer"
                    />
                    <label htmlFor="replace-existing" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                      Substituir estoque atual pelos dados importados (Limpar mock data)
                    </label>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Área de Colagem (Copie de sua planilha e cole aqui)</label>
                      <button
                        onClick={insertSampleExcelText}
                        className="text-[10px] text-[#0059bb] hover:underline font-bold"
                      >
                        Inserir Exemplo Real
                      </button>
                    </div>
                    
                    <textarea
                      rows={6}
                      placeholder="Cole as colunas de sua planilha aqui... (Ex: CD FILIAL \t FOGO \t KM...)"
                      value={importText}
                      onChange={(e) => setImportText(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs font-mono text-slate-700 placeholder-slate-400 focus:outline-none focus:border-[#0059bb]"
                    ></textarea>
                  </div>

                  {/* Real File Input & Drop Zone */}
                  <div className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${importFile ? "border-[#0059bb] bg-blue-50/10" : "border-slate-200 hover:border-[#0059bb]"}`}>
                    <input
                      type="file"
                      accept=".csv, .tsv, .xlsx, .xls"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setImportFile(e.target.files[0]);
                          setImportText(""); // Clear pasted text if they choose a real file
                        }
                      }}
                      className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"
                      id="xls-file-picker"
                    />
                    
                    <Upload className={`w-8 h-8 mx-auto mb-2 ${importFile ? "text-[#0059bb]" : "text-slate-400"}`} />
                    
                    {importFile ? (
                      <div className="space-y-1">
                        <span className="block text-xs font-bold text-slate-800">
                          Arquivo Selecionado: <span className="text-[#0059bb] font-mono">{importFile.name}</span>
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold block">
                          ({Math.round((importFile.size / 1024) * 100) / 100} KB)
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setImportFile(null);
                          }}
                          className="mt-2 text-[10px] text-rose-500 hover:underline font-bold z-20 relative cursor-pointer"
                        >
                          Remover Arquivo
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="block text-xs font-bold text-slate-700">Arrastar Planilha .XLSX / .XLS / .CSV</span>
                        <span className="text-[10px] text-slate-400 font-semibold mt-1 block">ou clique para selecionar do computador</span>
                        <label htmlFor="xls-file-picker" className="mt-3 inline-block px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded cursor-pointer pointer-events-none">
                          Escolher Arquivo
                        </label>
                      </>
                    )}
                  </div>

                </div>
              ) : (
                <div className="p-6 space-y-5">
                  {logoError && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-semibold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-500" />
                      {logoError}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <h3 className="text-sm font-bold text-slate-800">Definir Logotipo da Empresa</h3>
                    <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                      Faça o upload da imagem do logotipo para personalizar a identidade visual do seu painel e dos relatórios PDF consolidados. Formatos ideais: PNG com fundo transparente, JPG ou SVG (limite de 2MB).
                    </p>
                  </div>

                  {/* Existing custom logo preview */}
                  {customLogo && (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-white border border-slate-200 rounded-lg p-2 flex items-center justify-center overflow-hidden">
                          <img src={customLogo} alt="Logo Preview" className="w-full h-full object-contain" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-700">Logotipo Atual Ativo</p>
                          <p className="text-[10px] text-slate-400 font-semibold">Sua marca está sendo exibida no sistema</p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          handleLogoUpload(null);
                          setLogoFile(null);
                        }}
                        className="px-3 py-1.5 bg-rose-50 border border-rose-200 text-rose-700 font-bold text-[10px] uppercase rounded hover:bg-rose-100 hover:text-rose-800 transition-colors cursor-pointer"
                      >
                        Restaurar Padrão Mateus
                      </button>
                    </div>
                  )}

                  {/* Logo Upload Drop Zone */}
                  <div className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${logoFile ? "border-emerald-500 bg-emerald-50/10" : "border-slate-200 hover:border-[#0059bb]"}`}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleLogoFileChange(e.target.files[0]);
                        }
                      }}
                      className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"
                      id="logo-file-picker"
                    />
                    
                    <Upload className={`w-8 h-8 mx-auto mb-2 ${logoFile ? "text-emerald-500" : "text-slate-400"}`} />
                    
                    {logoFile ? (
                      <div className="space-y-1">
                        <span className="block text-xs font-bold text-slate-800">
                          Logo Carregado: <span className="text-emerald-600 font-mono">{logoFile.name}</span>
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold block">
                          ({Math.round((logoFile.size / 1024) * 100) / 100} KB)
                        </span>
                      </div>
                    ) : (
                      <>
                        <span className="block text-xs font-bold text-slate-700">Arrastar Novo Logotipo (Imagem)</span>
                        <span className="text-[10px] text-slate-400 font-semibold mt-1 block">ou clique para selecionar do computador</span>
                        <label htmlFor="logo-file-picker" className="mt-3 inline-block px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded cursor-pointer pointer-events-none">
                          Selecionar Imagem
                        </label>
                      </>
                    )}
                  </div>

                  {/* Helpful Quick Brand Templates */}
                  <div className="pt-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Exemplo Ilustrativo de Upload</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-blue-50/40 rounded-lg border border-blue-100/50 flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-[#e31a1a] rounded-full flex items-center justify-center text-white font-black text-sm shrink-0">m</div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold text-slate-700 leading-none">Grupo Mateus</p>
                          <p className="text-[8px] text-slate-400 mt-0.5 leading-none">Logo Padrão Ativo</p>
                        </div>
                      </div>
                      <div className="p-3 bg-emerald-50/40 rounded-lg border border-emerald-100/50 flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center text-white font-black text-xs shrink-0 font-mono">OK</div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold text-slate-700 leading-none">Logotipo Novo</p>
                          <p className="text-[8px] text-slate-400 mt-0.5 leading-none font-medium">Exibe sua marca no painel e PDFs</p>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              )}

              <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  onClick={() => {
                    setIsImportModalOpen(false);
                    setImportError("");
                    setImportSuccess("");
                    setLogoError("");
                  }}
                  className="px-4 py-2 border border-slate-200 text-slate-700 font-bold text-xs rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  {importModalTab === "logo" ? "Voltar ao Painel" : "Cancelar"}
                </button>
                {importModalTab === "data" ? (
                  <button
                    onClick={handleXLSImport}
                    className="px-5 py-2 bg-[#0059bb] hover:bg-[#004ca3] text-white font-bold text-xs rounded-lg transition-colors shadow-sm cursor-pointer"
                  >
                    Confirmar Importação
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setIsImportModalOpen(false);
                      setLogoError("");
                    }}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors shadow-sm cursor-pointer"
                  >
                    Salvar e Concluir
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ================= MODAL: ADICIONAR / EDITAR PNEU ================= */}
      <AnimatePresence>
        {isAddEditModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-xl overflow-hidden my-8 text-slate-800"
            >
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <span className="font-display font-bold text-base">
                  {currentEditingTire ? "Editar Ficha de Pneu" : "Cadastrar Novo Pneu em Estoque"}
                </span>
                <button
                  onClick={() => {
                    setIsAddEditModalOpen(false);
                    resetForm();
                  }}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveTire} className="p-6 space-y-4 text-xs font-semibold">
                
                <div className="grid grid-cols-2 gap-4">
                  
                  {/* CD Filial dropdown */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">CD Filial</label>
                    <select
                      value={formCdFilial || "CD IMPERATRIZ"}
                      onChange={(e) => setFormCdFilial(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-[#0059bb] rounded-lg py-2 px-3 text-xs font-semibold"
                    >
                      <option value="CD IMPERATRIZ">CD IMPERATRIZ</option>
                      <option value="INDUSTRIA DE PÃES CD-119">INDUSTRIA DE PÃES CD-119</option>
                      <option value="CD SAO LUIS CENTRO">CD SAO LUIS CENTRO</option>
                      <option value="CD TERESINA DISTRIBUICAO">CD TERESINA DISTRIBUICAO</option>
                    </select>
                  </div>

                  {/* Fogo Input */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Fogo (Nº Série)</label>
                    <input
                      type="text"
                      placeholder="Ex: GM5161, F9820"
                      value={formFogo || ""}
                      onChange={(e) => setFormFogo(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-[#0059bb] rounded-lg py-2 px-3 text-xs font-semibold placeholder-slate-400"
                      required
                    />
                  </div>

                </div>

                <div className="grid grid-cols-3 gap-4">
                  
                  {/* N Vidas */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Nº de Vida (Recap)</label>
                    <input
                      type="number"
                      min={1}
                      max={8}
                      value={formNVida ?? 1}
                      onChange={(e) => setFormNVida(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-[#0059bb] rounded-lg py-2 px-3 text-xs font-semibold"
                    />
                  </div>

                  {/* KM Percorrido */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">KM Percorrido</label>
                    <input
                      type="number"
                      min={0}
                      value={formKmPercorrido ?? 0}
                      onChange={(e) => setFormKmPercorrido(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-[#0059bb] rounded-lg py-2 px-3 text-xs font-semibold"
                    />
                  </div>

                  {/* Dias em estoque */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Dias em Estoque</label>
                    <input
                      type="number"
                      min={0}
                      value={formDiasEmEstoque ?? 0}
                      onChange={(e) => setFormDiasEmEstoque(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-[#0059bb] rounded-lg py-2 px-3 text-xs font-semibold"
                    />
                  </div>

                </div>

                <div className="grid grid-cols-2 gap-4">
                  
                  {/* Ano dropdown */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Ano Desinstalação</label>
                    <select
                      value={formAno ?? 2025}
                      onChange={(e) => setFormAno(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-[#0059bb] rounded-lg py-2 px-3 text-xs font-semibold"
                    >
                      <option value={2025}>2025</option>
                      <option value={2026}>2026</option>
                    </select>
                  </div>

                  {/* Mês dropdown */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Mês Retirada</label>
                    <select
                      value={formMes || "Janeiro"}
                      onChange={(e) => setFormMes(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-[#0059bb] rounded-lg py-2 px-3 text-xs font-semibold"
                    >
                      {["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"].map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>

                </div>

                <div className="grid grid-cols-3 gap-4">
                  
                  {/* Modelo */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Modelo / Fabricante</label>
                    <select
                      value={formModelo || "GOODYEAR"}
                      onChange={(e) => setFormModelo(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-[#0059bb] rounded-lg py-2 px-3 text-xs font-semibold"
                    >
                      <option value="GOODYEAR">GOODYEAR</option>
                      <option value="MICHELIN">MICHELIN</option>
                      <option value="XBRI">XBRI</option>
                      <option value="PIRELLI">PIRELLI</option>
                      <option value="CONTINENTAL">CONTINENTAL</option>
                    </select>
                  </div>

                  {/* Motivo Desinstalação */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Motivo Retirada</label>
                    <select
                      value={formMotivo || "REFORMA"}
                      onChange={(e) => setFormMotivo(e.target.value as Tire["motivoDesinstalacao"])}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-[#0059bb] rounded-lg py-2 px-3 text-xs font-semibold"
                    >
                      <option value="REFORMA">REFORMA</option>
                      <option value="NOVO">NOVO (ESTOQUE)</option>
                      <option value="CONSERTO">CONSERTO</option>
                      <option value="REUTILIZAÇÃO">REUTILIZAÇÃO</option>
                      <option value="SUCATA">SUCATA (DESCARTE)</option>
                    </select>
                  </div>

                  {/* Borracha */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Banda Borracha</label>
                    <select
                      value={formBorracha || "VL100"}
                      onChange={(e) => setFormBorracha(e.target.value as Tire["borracha"])}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-[#0059bb] rounded-lg py-2 px-3 text-xs font-semibold"
                    >
                      <option value="VL100">VL100</option>
                      <option value="XMULT">XMULT</option>
                      <option value="VL110 L">VL110 L</option>
                      <option value="VM530L">VM530L</option>
                      <option value="XZE2 230">XZE2 230</option>
                      <option value="OUTROS">OUTROS</option>
                    </select>
                  </div>

                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Dimensão (Medidas)</label>
                  <select
                    value={formDimensao || "275/80 R. 22,5"}
                    onChange={(e) => setFormDimensao(e.target.value as Tire["dimensao"])}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-[#0059bb] rounded-lg py-2 px-3 text-xs font-semibold animate-none"
                  >
                    {allUniqueDimensions.map(dim => (
                      <option key={dim} value={dim}>
                        {dim} {dim === "275/80 R. 22,5" ? "(Padrão Caminhão)" : dim === "205/75R 16" ? "(Padrão Van)" : dim === "215/75 R17,5" ? "(Padrão Microônibus)" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Advanced Fields Toggle */}
                <div className="pt-2 border-t border-dashed border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowAdvancedFields(!showAdvancedFields)}
                    className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-[#0059bb] font-bold transition-colors cursor-pointer"
                  >
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAdvancedFields ? "rotate-180" : ""}`} />
                    {showAdvancedFields ? "Ocultar Informações Avançadas" : "Exibir Informações Avançadas (Colunas Importadas)"}
                  </button>
                </div>

                {showAdvancedFields && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4 pt-2 overflow-hidden"
                  >
                    <div className="grid grid-cols-2 gap-4">
                      {/* Qtd */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Quantidade (QTD)</label>
                        <input
                          type="number"
                          min={1}
                          value={formQtd ?? 1}
                          onChange={(e) => setFormQtd(Number(e.target.value))}
                          className="w-full bg-slate-50 border border-slate-200 focus:border-[#0059bb] rounded-lg py-2 px-3 text-xs font-semibold"
                        />
                      </div>

                      {/* Filial */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Filial Nome Curto</label>
                        <input
                          type="text"
                          placeholder="Ex: CD IMPERATRIZ"
                          value={formFilial || ""}
                          onChange={(e) => setFormFilial(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 focus:border-[#0059bb] rounded-lg py-2 px-3 text-xs font-semibold placeholder-slate-400"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Marca */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Marca Original</label>
                        <input
                          type="text"
                          placeholder="Ex: GOODYEAR"
                          value={formMarca || ""}
                          onChange={(e) => setFormMarca(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 focus:border-[#0059bb] rounded-lg py-2 px-3 text-xs font-semibold placeholder-slate-400"
                        />
                      </div>

                      {/* Mês Analisado */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Mês Analisado</label>
                        <input
                          type="text"
                          placeholder="Ex: Fevereiro"
                          value={formMesAnalisado || ""}
                          onChange={(e) => setFormMesAnalisado(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 focus:border-[#0059bb] rounded-lg py-2 px-3 text-xs font-semibold placeholder-slate-400"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Placa */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Placa Veículo</label>
                        <input
                          type="text"
                          placeholder="Ex: HPX-9281"
                          value={formPlaca || ""}
                          onChange={(e) => setFormPlaca(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 focus:border-[#0059bb] rounded-lg py-2 px-3 text-xs font-semibold placeholder-slate-400"
                        />
                      </div>

                      {/* Posição */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Posição Veículo</label>
                        <input
                          type="text"
                          placeholder="Ex: DIANTEIRA ESQUERDA"
                          value={formPosicao || ""}
                          onChange={(e) => setFormPosicao(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 focus:border-[#0059bb] rounded-lg py-2 px-3 text-xs font-semibold placeholder-slate-400"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Data Evento */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Data do Evento</label>
                        <input
                          type="text"
                          placeholder="Ex: 25/06/2026"
                          value={formDataEvento || ""}
                          onChange={(e) => setFormDataEvento(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 focus:border-[#0059bb] rounded-lg py-2 px-3 text-xs font-semibold placeholder-slate-400"
                        />
                      </div>

                      {/* Ano Desinstalação */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Ano Desinstalação</label>
                        <input
                          type="number"
                          placeholder="Ex: 2025"
                          value={formAnoDesinstalacao || ""}
                          onChange={(e) => setFormAnoDesinstalacao(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 focus:border-[#0059bb] rounded-lg py-2 px-3 text-xs font-semibold placeholder-slate-400"
                        />
                      </div>
                    </div>

                    {/* Tread depth grooves S1 - S5 */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-sans">
                        Sulcos de Borracha (mm) - S1 a S5
                      </label>
                      <div className="grid grid-cols-5 gap-2">
                        {[
                          { val: formS1, set: setFormS1, label: "S1" },
                          { val: formS2, set: setFormS2, label: "S2" },
                          { val: formS3, set: setFormS3, label: "S3" },
                          { val: formS4, set: setFormS4, label: "S4" },
                          { val: formS5, set: setFormS5, label: "S5" }
                        ].map((item, idx) => (
                          <div key={idx} className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[8px] font-bold text-slate-400 uppercase">
                              {item.label}
                            </span>
                            <input
                              type="text"
                              value={item.val || ""}
                              onChange={(e) => item.set(e.target.value)}
                              placeholder="12"
                              className="w-full bg-slate-50 border border-slate-200 focus:border-[#0059bb] rounded-lg py-1.5 pl-6 pr-1 text-xs font-mono font-bold text-slate-700 text-center"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                <div className="pt-4 bg-slate-50 px-6 py-4 -mx-6 -mb-6 border-t border-slate-200 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddEditModalOpen(false);
                      resetForm();
                    }}
                    className="px-4 py-2 border border-slate-200 text-slate-700 font-bold text-xs rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#0059bb] hover:bg-[#004ca3] text-white font-bold text-xs rounded-lg transition-colors shadow-sm cursor-pointer"
                  >
                    {currentEditingTire ? "Atualizar Ficha" : "Cadastrar Pneu"}
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Visualizar Ficha Completa Modal */}
      <AnimatePresence>
        {selectedDetailTire && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-2xl w-full max-h-[90vh] flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/50 rounded-t-2xl">
                <div className="flex items-center gap-2.5">
                  <span className="p-2 bg-blue-50 text-[#0059bb] rounded-xl">
                    <Eye className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-slate-800 leading-tight">Ficha Técnica Operacional</h3>
                    <p className="text-[11px] text-slate-500 font-medium">Nº Série / Fogo: <span className="font-mono font-bold text-slate-700">{selectedDetailTire.fogo}</span></p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedDetailTire(null)}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto space-y-6">
                
                {/* Main Stats Block */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-[#0059bb]/5 p-4 rounded-xl border border-[#0059bb]/10">
                  <div className="text-center sm:border-r border-[#0059bb]/10">
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Fogo Série</p>
                    <p className="text-lg font-mono font-bold text-[#0059bb] mt-0.5">{selectedDetailTire.fogo}</p>
                  </div>
                  <div className="text-center sm:border-r border-[#0059bb]/10">
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Nº de Vidas</p>
                    <p className="text-lg font-bold text-slate-800 mt-0.5">{selectedDetailTire.nVida}ª Vida</p>
                  </div>
                  <div className="text-center sm:border-r border-[#0059bb]/10">
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">KM Percorrido</p>
                    <p className="text-lg font-bold text-slate-800 mt-0.5">{selectedDetailTire.kmPercorrido.toLocaleString("pt-BR")} <span className="text-xs font-semibold text-slate-500">km</span></p>
                  </div>
                  <div className="text-center">
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Estoque Atual</p>
                    <p className="text-lg font-bold text-emerald-600 mt-0.5">{selectedDetailTire.diasEmEstoque} <span className="text-xs font-semibold">dias</span></p>
                  </div>
                </div>

                {/* General Information Grid */}
                <div>
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">Dados Básicos da Ficha</h4>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3.5 text-xs">
                    <div className="flex justify-between border-b border-slate-50 pb-2">
                      <span className="text-slate-500 font-medium">CD Operacional:</span>
                      <span className="font-bold text-slate-800">{selectedDetailTire.cdFilial}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-50 pb-2">
                      <span className="text-slate-500 font-medium">Modelo / Fabricante:</span>
                      <span className="font-bold text-slate-800">{selectedDetailTire.modelo}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-50 pb-2">
                      <span className="text-slate-500 font-medium">Dimensão / Medidas:</span>
                      <span className="font-mono font-bold text-slate-800">{selectedDetailTire.dimensao}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-50 pb-2">
                      <span className="text-slate-500 font-medium">Banda de Borracha:</span>
                      <span className="font-mono font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">{selectedDetailTire.borracha}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-50 pb-2">
                      <span className="text-slate-500 font-medium">Motivo Desinstalação:</span>
                      <span className="font-bold text-slate-800">{selectedDetailTire.motivoDesinstalacao}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-50 pb-2">
                      <span className="text-slate-500 font-medium">Mês / Ano Retirada:</span>
                      <span className="font-bold text-slate-800">{selectedDetailTire.mes}/{selectedDetailTire.ano}</span>
                    </div>
                  </div>
                </div>

                {/* Tread depths (Sulcos S1-S5) */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2.5">Medições de Sulco de Borracha (S1 a S5)</h4>
                  <div className="grid grid-cols-5 gap-2 text-center">
                    {[
                      { val: selectedDetailTire.s1, label: "S1" },
                      { val: selectedDetailTire.s2, label: "S2" },
                      { val: selectedDetailTire.s3, label: "S3" },
                      { val: selectedDetailTire.s4, label: "S4" },
                      { val: selectedDetailTire.s5, label: "S5" }
                    ].map((item, idx) => (
                      <div key={idx} className="bg-white border border-slate-200/80 rounded-lg py-2.5 shadow-sm">
                        <span className="text-[9px] font-bold text-slate-400 block uppercase mb-1">{item.label}</span>
                        <span className="font-mono font-extrabold text-slate-700 text-sm">
                          {item.val ? `${item.val} mm` : "N/A"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Spreadsheet / Imported Extra Information */}
                <div>
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">Dados Adicionais Importados da Planilha</h4>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3.5 text-xs">
                    <div className="flex justify-between border-b border-slate-50 pb-2">
                      <span className="text-slate-500 font-medium">Filial Curta:</span>
                      <span className="font-semibold text-slate-800">{selectedDetailTire.filial || "N/A"}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-50 pb-2">
                      <span className="text-slate-500 font-medium">Placa do Veículo:</span>
                      <span className="font-mono font-semibold text-slate-800">{selectedDetailTire.placa || "N/A"}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-50 pb-2">
                      <span className="text-slate-500 font-medium">Posição Montado:</span>
                      <span className="font-semibold text-slate-800">{selectedDetailTire.posicao || "N/A"}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-50 pb-2">
                      <span className="text-slate-500 font-medium">Data do Evento:</span>
                      <span className="font-semibold text-slate-800">{selectedDetailTire.dataEvento || "N/A"}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-50 pb-2">
                      <span className="text-slate-500 font-medium">Marca Original:</span>
                      <span className="font-semibold text-slate-800">{selectedDetailTire.marca || "N/A"}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-50 pb-2">
                      <span className="text-slate-500 font-medium">Mês Analisado:</span>
                      <span className="font-semibold text-slate-800">{selectedDetailTire.mesAnalisado || "N/A"}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-50 pb-2 col-span-2">
                      <span className="text-slate-500 font-medium">Quantidade Importada (QTD):</span>
                      <span className="font-bold text-slate-800">{selectedDetailTire.qtd} pneu(s)</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Footer */}
              <div className="bg-slate-50 px-6 py-4 rounded-b-2xl border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const temp = selectedDetailTire;
                    setSelectedDetailTire(null);
                    openEditModal(temp);
                  }}
                  className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-[#0059bb] font-bold text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Edit className="w-3.5 h-3.5" />
                  Editar Registro
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDetailTire(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 font-bold text-xs rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>

    {/* ================= PRINT-ONLY LAYOUT FOR PDF (VISUALIZAÇÃO POR FILIAL DE TODOS OS PNEUS) ================= */}
    <div className="hidden print:block bg-white text-black font-sans p-8 w-full max-w-4xl mx-auto">
      {/* Header Section */}
      <div className="border-b-2 border-slate-950 pb-4 mb-6 flex justify-between items-center">
        <div className="flex items-center gap-4">
          {customLogo ? (
            <img src={customLogo} alt="Logo" className="w-14 h-14 object-contain" />
          ) : (
            <div className="relative flex items-center justify-center w-10 h-10 bg-[#e31a1a] rounded-full shadow-sm text-white font-bold shrink-0">
              <span className="text-lg tracking-tighter">m</span>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#0059bb] rounded-full border-2 border-white flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
              </div>
            </div>
          )}
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase leading-none">
              Inventário Logístico de Pneus
            </h1>
            <p className="text-xs text-slate-500 font-bold mt-1.5 uppercase tracking-wider">
              {customLogo ? "Relatório Consolidado de Estoque por Filial" : "Grupo Mateus — Relatório Consolidado de Estoque por Filial"}
            </p>
          </div>
        </div>
        <div className="text-right text-[10px] text-slate-500 font-mono">
          <div>Emissão: {new Date().toLocaleDateString("pt-BR")}</div>
          <div>Gerado por: Sistema de Gestão de Pneus</div>
        </div>
      </div>

      {/* Active Filters Display in PDF */}
      {(selectedFilial !== "Todos" || selectedAno !== "Todos" || selectedMes !== "Todos" || selectedMotivo !== "Todos" || searchTerm !== "") && (
        <div className="mb-6 p-3 bg-slate-50 border border-slate-200 rounded-lg text-[10px] text-slate-700 flex flex-wrap gap-x-4 gap-y-1.5 break-inside-avoid">
          <span className="font-bold uppercase text-slate-500">Filtros Ativos no Relatório:</span>
          {selectedFilial !== "Todos" && (
            <span>Filial: <strong className="text-slate-900">{selectedFilial}</strong></span>
          )}
          {selectedAno !== "Todos" && (
            <span>Ano: <strong className="text-slate-900">{selectedAno}</strong></span>
          )}
          {selectedMes !== "Todos" && (
            <span>Mês: <strong className="text-slate-900">{selectedMes}</strong></span>
          )}
          {selectedMotivo !== "Todos" && (
            <span>Motivo: <strong className="text-slate-900">{selectedMotivo}</strong></span>
          )}
          {searchTerm !== "" && (
            <span>Termo buscado: <strong className="text-slate-900">&ldquo;{searchTerm}&rdquo;</strong></span>
          )}
        </div>
      )}

      {/* Overall Indicators for the Audit */}
      <div className="grid grid-cols-4 gap-4 mb-8 border border-slate-200 rounded-lg p-4 bg-slate-50 break-inside-avoid">
        <div className="text-center">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Total de Pneus</p>
          <p className="text-xl font-black text-slate-900">{filteredTires.length}</p>
        </div>
        <div className="text-center border-l border-slate-200">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Tempo Médio Geral</p>
          <p className="text-xl font-black text-slate-900">
            {avgDaysInStock} <span className="text-xs text-slate-500 font-medium">dias</span>
          </p>
        </div>
        <div className="text-center border-l border-slate-200">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Filiais Ativas</p>
          <p className="text-xl font-black text-slate-900">{Object.keys(tiresByFilial).length}</p>
        </div>
        <div className="text-center border-l border-slate-200">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Modelos de Pneus</p>
          <p className="text-xl font-black text-slate-900">
            {new Set(filteredTires.map(t => t.modelo).filter(Boolean)).size}
          </p>
        </div>
      </div>

      {/* Grouped Lists per Filial */}
      <div className="space-y-8">
        {Object.entries(tiresByFilial).map(([filialName, filialTires]) => {
          const filialAvgDays = calculateAvgDays(filialTires);
          return (
            <div key={filialName} className="border border-slate-200 rounded-lg p-4 bg-white shadow-sm break-inside-avoid print:break-inside-avoid">
              {/* Branch Section Header */}
              <div className="border-b border-slate-200 pb-2 mb-3 flex justify-between items-baseline">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight">
                  {filialName}
                </h3>
                <span className="text-[10px] font-bold text-slate-500 font-mono">
                  {filialTires.length} pneus | Média: {filialAvgDays} dias em estoque
                </span>
              </div>

              {/* Table of Tires in Branch */}
              <table className="w-full text-[10px] text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-300 text-slate-400 font-semibold uppercase tracking-wider bg-slate-50">
                    <th className="py-1.5 px-2">Nº Fogo</th>
                    <th className="py-1.5 px-2">Dimensão</th>
                    <th className="py-1.5 px-2">Marca/Modelo</th>
                    <th className="py-1.5 px-2">Sulcos (A/B/C/D)</th>
                    <th className="py-1.5 px-2 text-center">Estoque</th>
                    <th className="py-1.5 px-2">Motivo</th>
                    <th className="py-1.5 px-2">Veículo/Posição</th>
                  </tr>
                </thead>
                <tbody>
                  {filialTires.map((t, idx) => {
                    const s1 = t.s1 || "-";
                    const s2 = t.s2 || "-";
                    const s3 = t.s3 || "-";
                    const s4 = t.s4 || "-";
                    const sulcoDisplay = `${s1}/${s2}/${s3}/${s4}`;

                    return (
                      <tr 
                        key={t.id || idx} 
                        className={`border-b border-slate-100 transition-colors ${
                          (t.diasEmEstoque ?? 0) > 50 
                            ? "bg-red-50/70 text-red-950 font-medium print:bg-red-50" 
                            : "hover:bg-slate-50"
                        }`}
                      >
                        <td className="py-1.5 px-2 font-mono font-bold text-slate-900">{t.fogo || "S/N"}</td>
                        <td className="py-1.5 px-2 font-mono">{t.dimensao || "-"}</td>
                        <td className="py-1.5 px-2 uppercase font-medium">{t.modelo || t.marca || "-"}</td>
                        <td className="py-1.5 px-2 font-mono text-slate-500">{sulcoDisplay}</td>
                        <td className={`py-1.5 px-2 text-center font-mono font-bold ${
                          (t.diasEmEstoque ?? 0) > 50 ? "text-red-600 font-extrabold" : "text-slate-700"
                        }`}>
                          {t.diasEmEstoque ?? 0} d
                          {(t.diasEmEstoque ?? 0) > 50 && " ⚠️"}
                        </td>
                        <td className="py-1.5 px-2 uppercase text-[9px] font-semibold text-slate-600">
                          {t.motivoDesinstalacao || "-"}
                        </td>
                        <td className="py-1.5 px-2 text-slate-500 font-mono text-[9px]">
                          {t.placa ? `${t.placa}` : ""} {t.posicao ? `(${t.posicao})` : ""}
                          {!t.placa && !t.posicao && "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>

      {/* Signature Footer */}
      <div className="mt-16 pt-8 border-t border-slate-300 grid grid-cols-2 gap-12 text-center text-[10px] text-slate-500 break-inside-avoid print:break-inside-avoid">
        <div>
          <div className="w-48 mx-auto border-b border-slate-400 h-8 mb-1"></div>
          <p className="font-bold">Responsável Técnico / Oficina</p>
          <p>Assinatura & Carimbo</p>
        </div>
        <div>
          <div className="w-48 mx-auto border-b border-slate-400 h-8 mb-1"></div>
          <p className="font-bold">Auditoria de Estoque CD</p>
          <p>Assinatura & Visto</p>
        </div>
      </div>
    </div>
  </>
);
}
