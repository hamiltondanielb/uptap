import Image from "next/image";

export function CardPreview({
  imageSmall,
  imageNormal,
  name
}: {
  imageSmall: string | null;
  imageNormal: string | null;
  name: string;
}) {
  if (!imageSmall) {
    return <div className="aspect-[5/7] w-10 shrink-0 rounded bg-muted" />;
  }

  return (
    <div className="group relative shrink-0">
      <div className="relative aspect-[5/7] w-10 overflow-hidden rounded">
        <Image alt={name} className="object-contain" fill sizes="40px" src={imageSmall} />
      </div>
      <div className="pointer-events-none absolute left-12 top-1/2 z-30 w-56 -translate-y-1/2 opacity-0 drop-shadow-2xl transition-opacity duration-150 group-hover:opacity-100">
        <div className="relative aspect-[5/7] overflow-hidden rounded-xl">
          <Image alt={name} className="object-contain" fill sizes="224px" src={imageNormal ?? imageSmall} />
        </div>
      </div>
    </div>
  );
}
