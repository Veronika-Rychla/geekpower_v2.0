import { getDictionary } from "@/lib/dictionary";

export default async function DictionaryPage() {
  const t = (await getDictionary()).placeholder;
  return (
    <div className="flex flex-1 items-center justify-center">
      <h1 className="text-2xl font-semibold">{t.dictionary}</h1>
    </div>
  );
}
