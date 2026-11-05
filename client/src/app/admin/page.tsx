"use client";

import { useEffect, useState, useCallback } from "react";
import {
  KeyRound,
  Plus,
  Search,
  Play,
  Youtube,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface AdminDeviceItem {
  id: string;
  brand: string;
  model: string;
  priceCents: number;
}

interface CatalogSearchResult {
  id: string;
  name: string;
}

export default function AdminPage() {
  const [adminKey, setAdminKey] = useState<string>("");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [keyInput, setKeyInput] = useState<string>("");
  const [keyError, setKeyError] = useState<string | null>(null);

  const [devices, setDevices] = useState<AdminDeviceItem[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);

  // Catalog search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CatalogSearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  // Manual device create form state
  const [brand, setBrand] = useState("Motorola");
  const [model, setModel] = useState("");
  const [priceReais, setPriceReais] = useState("1800");

  const [activeTab, setActiveTab] = useState<"devices" | "catalog" | "jobs">("devices");
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

  const loadDevices = useCallback(async () => {
    setLoadingDevices(true);
    try {
      const res = await fetch(`${apiUrl}/v1/devices`);
      if (res.ok) {
        const json = (await res.json()) as { items?: AdminDeviceItem[] };
        setDevices(json.items ?? []);
      }
    } catch {
      // Offline fallback
    } finally {
      setLoadingDevices(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    const saved = sessionStorage.getItem("phonematch_admin_key");
    if (saved) {
      setAdminKey(saved);
      setIsAuthenticated(true);
      loadDevices();
    }
  }, [loadDevices]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyInput.trim()) {
      setKeyError("Por favor informe a chave de administração");
      return;
    }
    sessionStorage.setItem("phonematch_admin_key", keyInput.trim());
    setAdminKey(keyInput.trim());
    setIsAuthenticated(true);
    setKeyError(null);
    loadDevices();
  };

  const handleLogout = () => {
    sessionStorage.removeItem("phonematch_admin_key");
    setAdminKey("");
    setIsAuthenticated(false);
  };

  const handleSearchCatalog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(
        `${apiUrl}/v1/admin/catalog/search?q=${encodeURIComponent(searchQuery)}`,
        { headers: { "X-Admin-Key": adminKey } },
      );
      if (res.ok) {
        const json = (await res.json()) as { items?: CatalogSearchResult[] };
        setSearchResults(json.items ?? []);
      }
    } catch {
      // error
    } finally {
      setSearching(false);
    }
  };

  const handleCreateDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${apiUrl}/v1/admin/devices`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Key": adminKey,
        },
        body: JSON.stringify({
          brand,
          model,
          priceCents: Math.round(parseFloat(priceReais) * 100),
          specs: [
            { key: "battery_mah", valueNum: 5000 },
            { key: "screen_refresh_hz", valueNum: 120 },
            { key: "is_5g", valueText: "true" },
          ],
        }),
      });

      if (res.ok) {
        setActionNotice(`Dispositivo ${brand} ${model} cadastrado com sucesso!`);
        setModel("");
        loadDevices();
      } else {
        const err = (await res.json()) as { message?: string };
        setActionNotice(`Erro: ${err.message ?? "desconhecido"}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setActionNotice(`Erro de conexão: ${msg}`);
    }
  };

  const handleRunJob = async (jobName: string) => {
    try {
      const res = await fetch(`${apiUrl}/v1/admin/jobs/${jobName}/run`, {
        method: "POST",
        headers: { "X-Admin-Key": adminKey },
      });
      if (res.ok) {
        setActionNotice(`Job ${jobName} disparado com sucesso!`);
      } else {
        setActionNotice(`Falha ao disparar ${jobName}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setActionNotice(`Erro ao disparar job: ${msg}`);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4">
        <Card className="w-full max-w-md border-slate-200 shadow-lg dark:border-slate-800">
          <CardHeader className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 mb-2">
              <KeyRound className="h-6 w-6" />
            </div>
            <CardTitle className="text-xl">Acesso ao Painel Admin</CardTitle>
            <CardDescription>
              Informe a chave <code className="text-xs font-mono">X-Admin-Key</code> configurada no servidor PhoneMatch.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <Input
                type="password"
                placeholder="Insira a chave admin..."
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                autoFocus
              />
              {keyError && <p className="text-xs text-red-500">{keyError}</p>}
              <Button type="submit" className="w-full">
                Entrar
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto py-8 px-4 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Painel Administrativo</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestão do catálogo multi-marca, espelho do Mercado Livre e controle de jobs.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={handleLogout}>
            Sair do Admin
          </Button>
        </div>
      </div>

      {actionNotice && (
        <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-sm flex items-center justify-between">
          <span>{actionNotice}</span>
          <button onClick={() => setActionNotice(null)} className="text-xs underline ml-4">
            Fechar
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab("devices")}
          className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "devices"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Dispositivos ({devices.length})
        </button>
        <button
          onClick={() => setActiveTab("catalog")}
          className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "catalog"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Espelho de Catálogo (ML)
        </button>
        <button
          onClick={() => setActiveTab("jobs")}
          className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "jobs"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Disparar Jobs
        </button>
      </div>

      {/* Tab: Devices */}
      {activeTab === "devices" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Plus className="h-5 w-5 text-blue-600" />
                <span>Cadastro Manual de Dispositivo</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateDevice} className="grid gap-4 sm:grid-cols-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Marca</label>
                  <Input value={brand} onChange={(e) => setBrand(e.target.value)} required />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Modelo</label>
                  <Input
                    placeholder="Ex: Moto G85 5G"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Preço (R$)</label>
                  <Input
                    type="number"
                    value={priceReais}
                    onChange={(e) => setPriceReais(e.target.value)}
                    required
                  />
                </div>
                <div className="flex items-end">
                  <Button type="submit" className="w-full">
                    Cadastrar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Aparelhos Ativos</CardTitle>
              <Button variant="ghost" size="sm" onClick={loadDevices}>
                <RefreshCw className={`h-4 w-4 ${loadingDevices ? "animate-spin" : ""}`} />
              </Button>
            </CardHeader>
            <CardContent>
              {devices.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Nenhum dispositivo cadastrado ainda.
                </p>
              ) : (
                <div className="divide-y text-sm">
                  {devices.map((d) => (
                    <div key={d.id} className="py-3 flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-foreground">
                          {d.brand} {d.model}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          R$ {(d.priceCents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setActionNotice(`Fontes do aparelho ${d.model} podem ser vinculadas via API POST /v1/admin/devices/${d.id}/sources`)}
                        >
                          <Youtube className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab: Catalog ML */}
      {activeTab === "catalog" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Buscar no Catálogo do Mercado Livre</CardTitle>
            <CardDescription>
              Pesquise qualquer celular para importar specs, atributos e preço mediano automaticamente.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSearchCatalog} className="flex gap-2">
              <Input
                placeholder="Ex: Galaxy S24, Moto G85, Redmi Note 13..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Button type="submit" disabled={searching}>
                {searching ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                <span className="ml-2">Buscar</span>
              </Button>
            </form>

            <div className="divide-y text-sm pt-4">
              {searchResults.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">
                  {searching ? "Buscando no ML..." : "Digite o nome de um modelo para buscar."}
                </p>
              ) : (
                searchResults.map((item) => (
                  <div key={item.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-xs text-muted-foreground">ID ML: {item.id}</div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => setActionNotice(`Importando produto ${item.id}...`)}
                    >
                      Importar
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab: Jobs */}
      {activeTab === "jobs" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Disparo Manual de Jobs</CardTitle>
            <CardDescription>
              Execute qualquer tarefa assíncrona sob demanda com prioridade imediata.
            </CardDescription>
          </CardHeader>
          <CardContent className="divide-y">
            {[
              { id: "collect_reviews", name: "Coleta de Reviews (YouTube)", desc: "Busca novos comentários dos canais e vídeos vinculados" },
              { id: "analyze_pending_reviews", name: "Análise de Sentimentos", desc: "Processa a fila com o Gemini e extrai aspectos" },
              { id: "embed_pending", name: "Geração de Evidências (pgvector)", desc: "Divide em trechos e calcula embeddings 768-dim" },
              { id: "aggregate_stats", name: "Agregação Bayesiana", desc: "Atualiza as médias e intervalos de confiança O(1)" },
              { id: "analytics_rollup", name: "Rollup de Métricas", desc: "Consolida as buscas e feedbacks do dia" },
              { id: "retention_sweep", name: "Varredura de Retenção", desc: "Apaga dados brutos com mais de 30 dias" },
            ].map((j) => (
              <div key={j.id} className="py-4 flex items-center justify-between">
                <div>
                  <div className="font-semibold">{j.name}</div>
                  <div className="text-xs text-muted-foreground">{j.desc}</div>
                </div>
                <Button size="sm" variant="outline" onClick={() => handleRunJob(j.id)}>
                  <Play className="h-3.5 w-3.5 mr-1" />
                  Executar
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
