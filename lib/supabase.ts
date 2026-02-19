import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: { params: { eventsPerSecond: 10 } },
});

export function createServerClient() {
  return createClient(
    supabaseUrl,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
```

El cambio: se eliminó `import type { Database }` y se quitó `<Database>` de los dos `createClient`. El tipo `Database` no existe en tu `types/database.ts`.

---

## Fix 2: `agentstack/app/dashboard/page.tsx`

GitHub → `agentstack/app/dashboard/page.tsx` → lápiz → **Ctrl+F** busca:
```
timeAgo ? `${Math.floor((Date.now() - new Date(agent.last_burn_at).getTime()) / 3600000)}h ago` : ''
```

Reemplaza con:
```
timeAgo(agent.last_burn_at)
```

La línea completa queda:
```
<span className="font-mono text-xs text-muted/30">Last burn {timeAgo(agent.last_burn_at)}</span>
