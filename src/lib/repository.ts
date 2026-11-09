import { supabase } from "./supabase";

// Supabase limita las respuestas a 1000 filas por defecto. No truncar balances.
export async function readAll(
  table:
    | "accounts"
    | "categories"
    | "transactions"
    | "savings_goals"
    | "savings_plans",
  userId: string,
) {
  if (!supabase) throw Error("Supabase no está configurado.");
  const rows: Record<string, unknown>[] = [];
  const pageSize = 500;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .eq("user_id", userId)
      .order("id")
      .range(offset, offset + pageSize - 1);
    if (error) throw Error(error.message);
    rows.push(...data);
    if (data.length < pageSize) break;
  }
  return rows;
}
