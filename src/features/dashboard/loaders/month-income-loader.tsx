import { listPaymentAmountsInRange } from "@/features/payments/queries";
import { monthRange, startOfMonth } from "@/lib/date";
import { MonthIncomeCard } from "../month-income-card";
import { sumAmounts } from "../aggregate";
import { getDashboardCurrency } from "../shared";

export async function MonthIncomeLoader() {
  const month = monthRange(startOfMonth(new Date()));
  const [amounts, currency] = await Promise.all([
    listPaymentAmountsInRange(month.from, month.to),
    getDashboardCurrency(),
  ]);
  return <MonthIncomeCard amount={sumAmounts(amounts)} currency={currency} />;
}
