import Image from "next/image";

type RenderDeviceImageProps = {
  title: string;
  imageUrl?: string;
};

export function RenderDeviceImage({
  title,
  imageUrl,
}: Readonly<RenderDeviceImageProps>) {
  return (
    <div className="flex flex-col items-center self-start gap-6 lg:items-start">
      {imageUrl ? (
        <div className="relative w-full max-w-md aspect-[3/4] rounded-lg overflow-hidden border border-gray-200 bg-background">
          <Image
            src={imageUrl}
            alt={title}
            fill
            priority
            className="object-contain"
            sizes="(max-width: 768px) 100vw, 600px"
          />
        </div>
      ) : (
        <div className="flex items-center justify-center w-full max-w-md aspect-[3/4] rounded-lg border border-gray-200 bg-muted">
          <p className="text-muted-foreground">Sem imagem deste disponível</p>
        </div>
      )}
    </div>
  );
}
