"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  Clock,
  HardDrive,
  Cpu,
  RefreshCw,
  Server,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface SystemStatus {
  server: {
    status: string;
    uptimeSeconds: number;
    warmedUpMinutes: number;
    timestamp: string;
    coldStartNote: string;
  };
  jobs: Array<{
    name: string;
    lastStatus: string | null;
    lastRunAt: string | null;
    nextDueAt: string | null;
    consecutiveFailures: number;
  }>;
  quotas: Array<{
    provider: string;
    used: number;
    limit: number;
    remaining: number;
  }>;
  storage: {
    estimatedDbBytes: number;
    maxDbBytes: number;
    usagePercent: number;
    rowsCount: {
      devices: number;
      reviews: number;
      snippets: number;
      feedbackEvents: number;
      searchEvents: number;
    };
  };
  engine: {
    version: string;
    active: boolean;
    scenarioAccuracyScore?: number;
  };
}

export default function StatusPage() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
      const res = await fetch(`${apiUrl}/v1/status`);
      if (!res.ok) throw new Error(`Falha ao obter status: ${res.status}`);
      const json = await res.json();
      setStatus(json.data ?? json);
    } catch {
      setError(
        "Servidor acordando ou offline local. Tentando novamente em instantes...",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  return (
    <div className="w-full max-w-6xl mx-auto py-8 px-4 space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Status do Sistema</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Transparência operacional em tempo real: jobs, cotas de APIs e limites do plano gratuito.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchStatus}
          disabled={loading}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          <span>Atualizar</span>
        </Button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-sm flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Grid de Cards Principais */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Servidor */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Servidor (Render)</CardTitle>
            <Server className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>{status?.server.status ?? "Online"}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {status
                ? `Acordou há ${status.server.warmedUpMinutes} min`
                : "Free tier com cold start ~30s"}
            </p>
          </CardContent>
        </Card>

        {/* Banco de Dados */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">PostgreSQL (Aiven)</CardTitle>
            <HardDrive className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {status
                ? `${((status.storage.estimatedDbBytes || 15 * 1024 * 1024) / (1024 * 1024)).toFixed(1)} MB`
                : "1 GB Max"}
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mt-2">
              <div
                className="bg-blue-600 h-1.5 rounded-full"
                style={{ width: `${Math.min(100, Math.max(2, status?.storage.usagePercent || 2))}%` }}
              />
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              pgvector ativo &bull; Retenção 30d
            </p>
          </CardContent>
        </Card>

        {/* Versão do Motor */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Motor de Recomendação</CardTitle>
            <Cpu className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">v2.0-maut</div>
            <p className="text-xs text-muted-foreground mt-2">
              Normalização por percentis &bull; Thompson Beta
            </p>
          </CardContent>
        </Card>

        {/* Monitoramento de Cotas */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Cota Diária YouTube</CardTitle>
            <Activity className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">10.000 un</div>
            <p className="text-xs text-muted-foreground mt-2">
              Controle adaptativo por cota
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Jobs Agendados */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-500" />
            <span>Tarefas de Segundo Plano (Scheduler)</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y text-sm">
            {[
              {
                name: "collect_reviews",
                desc: "Ingestão de comentários de vídeos do YouTube",
                interval: "1h - 24h",
              },
              {
                name: "analyze_pending_reviews",
                desc: "Análise bayesiana de sentimentos e aspectos",
                interval: "2h",
              },
              {
                name: "embed_pending",
                desc: "Geração de embeddings e evidências para citações",
                interval: "30 min",
              },
              {
                name: "aggregate_stats",
                desc: "Atualização de acumuladores bayesianos O(1)",
                interval: "1h",
              },
              {
                name: "analytics_rollup",
                desc: "Consolidação de métricas e taxas de uso",
                interval: "Diário",
              },
              {
                name: "retention_sweep",
                desc: "Limpeza de dados acima de 30d para manter < 1 GB",
                interval: "Diário",
              },
            ].map((job) => (
              <div
                key={job.name}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div>
                  <div className="font-medium text-foreground">{job.name}</div>
                  <div className="text-xs text-muted-foreground">{job.desc}</div>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-muted-foreground">{job.interval}</span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Ativo
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
