export function UserGreeting({ name }: { name?: string | null }) {
  return <span className="text-sm text-muted-foreground">Hello {name}</span>;
}
