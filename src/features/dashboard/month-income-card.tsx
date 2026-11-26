import { Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney, type CurrencyCode } from "@/lib/currency";
import { formatMonthLabel } from "@/lib/date";
import { t } from "@/lib/i18n";

/** Compact stat card: total payments recorded in the current month. */
export function MonthIncomeCard({ amount, currency }: { amount: number; currency: CurrencyCode }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {t.dashboard.monthIncome}
        </CardTitle>
        <Wallet className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold">{formatMoney(amount, currency)}</div>
        <p className="mt-1 text-sm capitalize text-muted-foreground">
          {formatMonthLabel(new Date())}
        </p>
      </CardContent>
    </Card>
  );
}
