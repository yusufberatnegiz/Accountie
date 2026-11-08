import type { Account, Rules } from "./default-rules";
import type { JournalLine } from "./journal";

type Line = Pick<JournalLine, "accountCode" | "accountName" | "debitKurus">;

/**
 * What an approval teaches about its seller: the expense account (the first debit line that is not 191 VAT) when it differs
 * from the category rule, null when it is the category rule again (forget any learned one), undefined when there is no expense line.
 */
export function learnedAccount(lines: readonly Line[], categoryAccount: Account): Account | null | undefined {
  const expense = lines.find((l) => l.debitKurus > 0 && !l.accountCode.startsWith("191"));
  if (!expense) return undefined;
  return expense.accountCode === categoryAccount.code ? null : { code: expense.accountCode, name: expense.accountName };
}

/** The rules with the seller's learned account in place of its category's, for this one receipt. */
export const withVendorAccount = (rules: Rules, category: string, account: Account | null): Rules =>
  account ? { ...rules, expense: { ...rules.expense, [category]: account } } : rules;
