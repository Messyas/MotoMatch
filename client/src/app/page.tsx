"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Bot, Sparkles, ShieldCheck, MessageCircle, ArrowRight, Server } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  const [coldStartNotice, setColdStartNotice] = useState(false);
  const [isWarmingUp, setIsWarmingUp] = useState(false);

  useEffect(() => {
    // Cold start health check early
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
    const timer = setTimeout(() => {
      setIsWarmingUp(true);
    }, 1500);

    fetch(`${apiUrl}/health`)
      .then(() => {
        clearTimeout(timer);
        setIsWarmingUp(false);
      })
      .catch(() => {
        clearTimeout(timer);
        setColdStartNotice(true);
        setIsWarmingUp(false);
      });

    return () => clearTimeout(timer);
  }, []);

  return (
    <main className="flex min-h-screen w-full flex-col items-center bg-background">
      {/* Cold start status indicator banner if warming up */}
      {(isWarmingUp || coldStartNotice) && (
        <div className="w-full bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-center text-xs text-amber-700 dark:text-amber-400 flex items-center justify-center gap-2">
          <Server className="h-4 w-4 animate-pulse" />
          <span>
            {isWarmingUp
              ? "Acordando o servidor (plano gratuito Render, ~30s). O catálogo local e recursos estáticos já estão prontos!"
              : "Servidor em modo de espera ou offline local. Navegue usando os dados do catálogo em cache."}
          </span>
        </div>
      )}

      {/* Hero Section */}
      <section className="relative w-full max-w-6xl px-4 pt-20 pb-12">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-500/10 via-transparent to-transparent" />
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-500/20 bg-blue-50/50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 text-xs font-semibold mb-4">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Recomendador Inteligente Multi-marca</span>
          </div>

          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-4xl font-extrabold tracking-tight sm:text-6xl bg-clip-text text-transparent inline-block bg-[linear-gradient(90deg,#2563eb,#4f46e5,#7c3aed,#db2777)]"
          >
            Encontre o Celular Perfeito Para Você
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground"
          >
            O <span className="font-semibold text-foreground">PhoneMatch</span> combina especificações reais de qualquer fabricante com análise bayesiana de opiniões do YouTube, dominância de Pareto e aprendizado coletivo sem cadastro.
          </motion.p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Button size="lg" asChild className="h-12 px-8 text-base bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/25">
              <Link href="/chat" className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                <span>Conversar com a IA</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="h-12 px-6">
              <Link href="/dados">Ver dados de uso</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section className="w-full max-w-6xl px-4 pb-8">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: MessageCircle,
              title: "Diga o que você precisa",
              text: "Preço máximo, bateria monstra, câmeras para fotos noturnas ou celular para jogos.",
            },
            {
              icon: Bot,
              title: "Análise bayesiana real",
              text: "Centenas de comentários do YouTube filtrados por relevância e agregados com modelo probabilístico.",
            },
            {
              icon: Sparkles,
              title: "Recomendações com evidência",
              text: "Veja o ranking MAUT e citações reais de donos de cada aparelho antes de decidir.",
            },
          ].map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ delay: 0.05 * i }}
            >
              <Card className="h-full border-slate-200/80 shadow-sm dark:border-slate-800">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl p-2.5 bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
                      <step.icon className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-lg">{step.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{step.text}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Destaques Técnicos e Transparência */}
      <section className="w-full max-w-6xl px-4 pb-12">
        <Card className="border-slate-200/80 shadow-sm dark:border-slate-800">
          <CardContent className="grid gap-6 py-8 sm:grid-cols-3">
            <Feature
              title="Sem viés comercial"
              text="Algoritmo determinístico baseado em utilidade multicritério (MAUT) e fronteira de Pareto."
            />
            <Feature
              title="Crítica conversacional"
              text="Ajuste os resultados com 1 clique: 'mais barato', 'mais bateria' ou 'parecido com este'."
            />
            <Feature
              title="100% Anônimo"
              text="Sem cadastro, sem cookies invasivos. Favoritos salvos no seu navegador via localStorage."
              icon={ShieldCheck}
            />
          </CardContent>
        </Card>
      </section>

      {/* Chamada Final */}
      <section className="w-full max-w-6xl px-4 pb-20">
        <Card className="overflow-hidden border-0 bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-xl">
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold">
              Pronto para encontrar o smartphone ideal?
            </h2>
            <p className="max-w-xl text-blue-100 text-sm sm:text-base">
              Leva menos de 30 segundos. Digite em português livre o que procura ou use os filtros.
            </p>
            <Button
              size="lg"
              variant="secondary"
              asChild
              className="mt-2 h-11 px-8 font-semibold shadow-md"
            >
              <Link href="/chat">Começar agora</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

function Feature({
  title,
  text,
  icon: Icon = Sparkles,
}: Readonly<{
  title: string;
  text: string;
  icon?: typeof Sparkles;
}>) {
  return (
    <div className="flex items-start gap-3">
      <div className="rounded-xl p-2 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}
