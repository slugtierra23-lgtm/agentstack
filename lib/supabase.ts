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

---

## 3. `agentstack/components/market/PostTaskModal.tsx` → lápiz → Ctrl+F busca `0n;` → reemplaza por `BigInt(0);`

La línea completa cambia de:
```
  try { return parseUnits(String(amount), STACK_TOKEN_DECIMALS); } catch { return 0n; }
```
a:
```
  try { return parseUnits(String(amount), STACK_TOKEN_DECIMALS); } catch { return BigInt(0); }
