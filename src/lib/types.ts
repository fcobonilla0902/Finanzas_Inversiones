import type { Account, Category, Transaction } from "./finance";
export type Context = {
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  write: (
    table: string,
    data: Record<string, unknown>,
    id?: string,
  ) => Promise<void>;
};
