import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
      <p className="text-5xl font-extrabold text-primary">404</p>
      <h1 className="mt-3 text-2xl font-bold">Сторінку не знайдено</h1>
      <p className="mt-2 text-muted-foreground">Можливо, посилання застаріло або сторінку перенесли.</p>
      <Button render={<Link href="/" />} nativeButton={false} className="mt-6">
        На головну
      </Button>
    </div>
  );
}
