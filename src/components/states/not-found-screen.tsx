import Link from "next/link";
import {
  ArrowLeft,
  Compass,
  Home,
  LayoutDashboard,
  MessageSquare,
  Users,
  type LucideIcon,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type NotFoundContext = "public" | "app" | "admin";

interface NotFoundScreenProps {
  context: NotFoundContext;
}

const actionsByContext = {
  public: [
    { href: "/", label: t.errors.actions.home, icon: Home, variant: "default" },
    { href: "/login", label: t.errors.actions.login, icon: ArrowLeft, variant: "outline" },
  ],
  app: [
    {
      href: "/dashboard",
      label: t.errors.actions.dashboard,
      icon: LayoutDashboard,
      variant: "default",
    },
    { href: "/students", label: t.errors.actions.students, icon: Users, variant: "outline" },
  ],
  admin: [
    { href: "/admin", label: t.errors.actions.admin, icon: LayoutDashboard, variant: "default" },
    { href: "/admin/users", label: t.errors.actions.users, icon: Users, variant: "outline" },
    {
      href: "/admin/feedback",
      label: t.errors.actions.feedback,
      icon: MessageSquare,
      variant: "outline",
    },
  ],
} satisfies Record<
  NotFoundContext,
  {
    href: string;
    label: string;
    icon: LucideIcon;
    variant: "default" | "outline";
  }[]
>;

export function NotFoundScreen({ context }: NotFoundScreenProps) {
  const fullPage = context === "public";
  const actions = actionsByContext[context];

  return (
    <div
      className={cn(
        "flex items-center justify-center",
        fullPage ? "min-h-dvh bg-background px-4 py-10" : "min-h-[calc(100dvh-10rem)]",
      )}
    >
      <section className="w-full max-w-2xl rounded-lg border bg-card p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
            <Compass className="size-6" />
          </div>

          <div className="min-w-0 space-y-5">
            <div className="space-y-2">
              <p className="text-sm font-medium text-primary">{t.errors.notFoundEyebrow}</p>
              <h1 className="text-2xl font-semibold tracking-tight">{t.errors.notFoundTitle}</h1>
              <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
                {t.errors.notFoundDescription}
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              {actions.map(({ href, label, icon: Icon, variant }) => (
                <Link
                  key={href}
                  href={href}
                  className={buttonVariants({ variant, className: "w-full sm:w-auto" })}
                >
                  <Icon className="size-4" />
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
