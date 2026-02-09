"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Bot, Sparkles, ShieldCheck, MessageCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export default function HomePage() {
  const { user, loading } = useAuth();

  return (
    <main className="flex min-h-screen w-full flex-col items-center bg-background">
      <section className="relative w-full max-w-6xl px-4 pt-24 pb-12">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-pink-500/10 via-transparent to-transparent" />
        <div className="text-center">
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-4xl font-bold tracking-tight sm:text-5xl bg-clip-text text-transparent
             inline-block
             bg-[linear-gradient(90deg,#ef4444,#f59e0b,#ec4899,#8b5cf6,#3b82f6,#1e3a8a)]"
          >
            Encontre seu Novo Motorola!
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="mx-auto mt-3 max-w-2xl text-lg text-muted-foreground"
          >
            O <span className="font-semibold">Moto Match</span> é um sistema de
            recomendação com IA que traduz suas preferências em sugestões
            certeiras de celulares Motorola.
          </motion.p>
        </div>
      </section>

      {/* Como funciona */}
      <section className="w-full max-w-6xl px-4 pb-8">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: MessageCircle,
              title: "Conte suas preferências",
              text: "Preço, câmeras, bateria, tamanho, desempenho… do seu jeito.",
            },
            {
              icon: Bot,
              title: "IA analisa por você",
              text: "Nosso modelo cruza especificações e feedbacks para entender o que importa.",
            },
            {
              icon: Sparkles,
              title: "Receba recomendações",
              text: "Veja os modelos ideais, compare e salve seus favoritos.",
            },
          ].map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ delay: 0.05 * i }}
            >
              <Card className="h-full">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl p-2 shadow-sm ring-1 ring-border">
                      <step.icon className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-xl">{step.title}</CardTitle>
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

      {/* Destaques do sistema */}
      <section className="w-full max-w-6xl px-4 pb-8">
        <Card>
          <CardContent className="grid gap-6 py-6 sm:grid-cols-3">
            <Feature
              title="Recomendações transparentes"
              text="Explicamos por que cada modelo apareceu para você (ex.: bateria + câmera)."
            />
            <Feature
              title="Comparação simples"
              text="Compare lado a lado preços, RAM/ROM, câmeras e autonomia."
            />
            <Feature
              title="Privacidade em primeiro lugar"
              text="Seus dados de preferência são usados só para melhorar sua experiência."
              icon={ShieldCheck}
            />
          </CardContent>
        </Card>
      </section>

      {/* Chamada final */}
      <section className="w-full max-w-6xl px-4 pb-16">
        <Card className="overflow-hidden">
          <CardContent className="relative flex flex-col items-center gap-4 py-10 text-center">
            <div className="absolute inset-0 -z-10 bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-blue-500/10" />
            <h2 className="text-2xl font-semibold">
              Pronto para dar Match com seu próximo Motorola?
            </h2>
            {!loading && !user && (
              <Button
                size="lg"
                asChild
                className="bg-[linear-gradient(90deg,#ef4444,#f59e0b,#ec4899,#8b5cf6,#3b82f6,#1e3a8a)] text-white shadow-md hover:opacity-90 focus-visible:ring-white/40"
              >
                <Link href="/login">Ir para o login</Link>
              </Button>
            )}
            <p className="max-w-2xl text-muted-foreground">
              Leva menos de 1 minuto para dizer o que você quer. A IA cuida do
              resto.
            </p>
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
      <div className="rounded-2xl p-2 shadow-sm ring-1 ring-border">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}
