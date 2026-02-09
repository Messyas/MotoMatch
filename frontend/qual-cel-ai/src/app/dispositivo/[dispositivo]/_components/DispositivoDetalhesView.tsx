"use client";

import type { PhoneItem } from "@/types/phones";
import { ListComments } from "@/components/dispositivo/comments/ListComments";
import { RenderDeviceImage } from "@/components/dispositivo/renderImage/RenderDeviceImage";
import { DeviceSpecs } from "@/components/dispositivo/listSpecifications/ListSpecifications";
import { DeviceCommentSummary } from "@/components/dispositivo/summary/DeviceCommentSummary";
import { DeviceCommentScores } from "@/components/dispositivo/summary/DeviceCommentScores";

type DispositivoDetalhesViewProps = {
  dispositivo: PhoneItem;
};

export function DispositivoDetalhesView({
  dispositivo,
}: DispositivoDetalhesViewProps) {
  return (
    <main className="container py-12">
      <div className="mx-auto max-w-5xl space-y-12">
        <header className="text-center lg:text-left">
          <h1 className="text-3xl font-bold tracking-tight text-foreground lg:text-4xl">
            {dispositivo.title}
          </h1>
        </header>

        <div className="grid items-start gap-8 lg:gap-10 lg:grid-cols-[0.95fr_1.05fr]">
          <RenderDeviceImage
            title={dispositivo.title}
            imageUrl={dispositivo.imageUrls[0]}
          />
          <div className="flex flex-col gap-6">
            <DeviceCommentScores dispositivoId={dispositivo.id} />
            <DeviceCommentSummary dispositivoId={dispositivo.id} />
          </div>

          <div className="lg:col-span-2">
            <DeviceSpecs specs={dispositivo.specs} />
          </div>

          <div className="lg:col-span-2">
            <ListComments dispositivoId={dispositivo.id} />
          </div>
        </div>
      </div>
    </main>
  );
}
