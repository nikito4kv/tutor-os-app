import { listPackageBalances } from "@/features/packages/queries";
import { LOW_BALANCE_THRESHOLD } from "@/lib/constants";
import { LowBalanceStudents } from "../low-balance-students";
import { selectLowBalanceStudents } from "../aggregate";
import { getStudentOptions } from "../shared";

export async function LowBalanceLoader() {
  // `getStudentOptions` is the same cache()-wrapped query the name map uses, so
  // this shares the single per-request student fetch rather than adding one.
  const [students, packages] = await Promise.all([getStudentOptions(), listPackageBalances()]);
  return (
    <LowBalanceStudents
      students={selectLowBalanceStudents(students, packages, LOW_BALANCE_THRESHOLD)}
    />
  );
}
