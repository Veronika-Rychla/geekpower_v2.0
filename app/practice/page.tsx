import { getDictionary } from "@/lib/dictionary";

export default async function PracticePage() {
  const t = (await getDictionary()).placeholder;
  return (
    <div className="flex flex-1 items-center justify-center">
      <h1 className="text-2xl font-semibold">{t.practice}</h1>
    </div>
  );
}
