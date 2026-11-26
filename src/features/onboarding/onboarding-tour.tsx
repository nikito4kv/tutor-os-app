"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type CSSProperties,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  GraduationCap,
  LayoutDashboard,
  Link2,
  RotateCcw,
  WalletCards,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  ONBOARDING_ACTION_EVENT,
  ONBOARDING_ACTIONS,
  ONBOARDING_RESTART_EVENT,
  ONBOARDING_SIGNUP_START_STORAGE_KEY,
  ONBOARDING_STATE_EVENT,
  ONBOARDING_STORAGE_KEY,
  type OnboardingAction,
} from "./constants";
import { consumeOnboardingActionIntent } from "./events";
import {
  computePlacement,
  DEFAULT_PLACEMENT_OPTIONS as PLACEMENT,
  type ArrowPosition,
  type Size,
  type Viewport,
} from "./placement";

type StepId = OnboardingAction;
type OnboardingStatus = "active" | "skipped" | "completed";

type TargetSpec = {
  targets: string[];
  href: string;
};

type OnboardingStep = {
  id: StepId;
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action: string;
  resolveTarget: (pathname: string) => TargetSpec;
};

type OnboardingState = {
  status: OnboardingStatus;
  currentStepId: StepId;
  completedStepIds: StepId[];
  completedOnce?: boolean;
  /** Whether the one-time welcome card has been dismissed. */
  welcomeSeen?: boolean;
};

type OnboardingActionEvent = Event & {
  detail?: { action?: OnboardingAction };
};

type TargetMatch = { element: HTMLElement; target: string };

type TargetPosition = {
  rect: DOMRectReadOnly | null;
  found: boolean;
  /** The matched target was a `nav-*` fallback — i.e. we're not on the action's page yet. */
  isFallbackNav: boolean;
  /** Which `data-onboarding-target` actually matched (to tell the real action button apart). */
  matchedTarget: string | null;
};

const SPOTLIGHT_PADDING = 8;
const SPOTLIGHT_RADIUS = 12;
const ARROW_SIZE = PLACEMENT.arrowSize;

const EMPTY_TARGET: TargetPosition = {
  rect: null,
  found: false,
  isFallbackNav: false,
  matchedTarget: null,
};

function createInitialState(firstStepId: StepId, completedOnce = false): OnboardingState {
  return {
    status: "active",
    currentStepId: firstStepId,
    completedStepIds: [],
    completedOnce,
    welcomeSeen: false,
  };
}

function isOnboardingStatus(value: unknown): value is OnboardingStatus {
  return value === "active" || value === "skipped" || value === "completed";
}

function isStepId(value: unknown, stepIds: readonly StepId[]): value is StepId {
  return typeof value === "string" && stepIds.includes(value as StepId);
}

function normalizeCompletedStepIds(value: unknown, stepIds: readonly StepId[]): StepId[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is StepId => isStepId(item, stepIds));
}

function readStoredState(firstStepId: StepId, stepIds: readonly StepId[]): OnboardingState | null {
  const stored = window.localStorage.getItem(ONBOARDING_STORAGE_KEY);
  if (!stored) return null;

  // Compatibility with the previous implementation that stored a plain "done".
  if (stored === "done") {
    return {
      status: "completed",
      currentStepId: firstStepId,
      completedStepIds: [],
      completedOnce: true,
      welcomeSeen: true,
    };
  }

  try {
    const parsed: unknown = JSON.parse(stored);
    if (typeof parsed !== "object" || parsed === null) return null;

    const candidate = parsed as {
      status?: unknown;
      currentStepId?: unknown;
      completedStepIds?: unknown;
      completedOnce?: unknown;
      welcomeSeen?: unknown;
    };

    if (!isOnboardingStatus(candidate.status)) return null;

    return {
      status: candidate.status,
      currentStepId: isStepId(candidate.currentStepId, stepIds)
        ? candidate.currentStepId
        : firstStepId,
      completedStepIds: normalizeCompletedStepIds(candidate.completedStepIds, stepIds),
      completedOnce: candidate.completedOnce === true || candidate.status === "completed",
      welcomeSeen: candidate.welcomeSeen === true,
    };
  } catch {
    return null;
  }
}

function nextIncompleteStep(steps: OnboardingStep[], completedStepIds: StepId[]): StepId {
  return steps.find((step) => !completedStepIds.includes(step.id))?.id ?? steps[0]!.id;
}

function stepIndexOf(steps: OnboardingStep[], stepId: StepId): number {
  const index = steps.findIndex((step) => step.id === stepId);
  return index >= 0 ? index : 0;
}

function isStudentCardPath(pathname: string): boolean {
  return /^\/students\/[^/]+$/.test(pathname);
}

function isElementMeasurable(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);
  return (
    style.visibility !== "hidden" && style.display !== "none" && rect.width > 0 && rect.height > 0
  );
}

function findTargetElement(targets: string[]): TargetMatch | null {
  const candidates = Array.from(document.querySelectorAll<HTMLElement>("[data-onboarding-target]"));

  for (const target of targets) {
    const element = candidates.find(
      (node) => node.dataset.onboardingTarget === target && isElementMeasurable(node),
    );
    if (element) return { element, target };
  }

  return null;
}

/** A Radix modal dialog is open — step aside so the tour never fights with it. */
function isModalOpen(): boolean {
  return document.querySelector('[role="dialog"][data-state="open"]') !== null;
}

/** Honour the OS "reduce motion" setting: smooth auto-scroll only when allowed. */
function scrollBehavior(): ScrollBehavior {
  return typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? "auto"
    : "smooth";
}

function spotlightStyle(rect: DOMRectReadOnly): CSSProperties {
  return {
    left: rect.left - SPOTLIGHT_PADDING,
    top: rect.top - SPOTLIGHT_PADDING,
    width: rect.width + SPOTLIGHT_PADDING * 2,
    height: rect.height + SPOTLIGHT_PADDING * 2,
    borderRadius: SPOTLIGHT_RADIUS,
    // A crisp teal ring hugging the cut-out, then the dimming scrim behind it.
    boxShadow: "0 0 0 2px hsl(var(--primary)), 0 0 0 9999px hsl(var(--overlay) / 0.6)",
  };
}

function arrowStyle(arrow: ArrowPosition): CSSProperties {
  const half = ARROW_SIZE / 2;
  const base: CSSProperties = { width: ARROW_SIZE, height: ARROW_SIZE };
  switch (arrow.side) {
    case "bottom":
      return { ...base, top: -half, left: (arrow.left ?? 0) - half };
    case "top":
      return { ...base, bottom: -half, left: (arrow.left ?? 0) - half };
    case "right":
      return { ...base, left: -half, top: (arrow.top ?? 0) - half };
    case "left":
      return { ...base, right: -half, top: (arrow.top ?? 0) - half };
  }
}

/** Which two borders draw the beak, depending on the corner that points at the target. */
function arrowBorders(side: ArrowPosition["side"]): string {
  switch (side) {
    case "bottom":
      return "border-l border-t";
    case "top":
      return "border-r border-b";
    case "right":
      return "border-l border-b";
    case "left":
      return "border-r border-t";
  }
}

export function OnboardingTour() {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<OnboardingState | null>(null);
  const [targetPosition, setTargetPosition] = useState<TargetPosition>(EMPTY_TARGET);
  const [viewport, setViewport] = useState<Viewport | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [cardSize, setCardSize] = useState<Size | null>(null);
  const observerRef = useRef<ResizeObserver | null>(null);
  // Имя цели, к которой уже прокрутили: чтобы скроллить при её появлении/смене, но не
  // дёргать экран при каждом пересчёте и не мешать ручной прокрутке пользователя.
  const lastScrolledTargetRef = useRef<string | null>(null);

  const steps = useMemo<OnboardingStep[]>(
    () => [
      {
        id: ONBOARDING_ACTIONS.overview,
        icon: LayoutDashboard,
        title: t.onboarding.steps.overview.title,
        description: t.onboarding.steps.overview.description,
        action: t.onboarding.steps.overview.action,
        resolveTarget: () => ({ targets: ["nav-overview"], href: "/dashboard" }),
      },
      {
        id: ONBOARDING_ACTIONS.students,
        icon: GraduationCap,
        title: t.onboarding.steps.students.title,
        description: t.onboarding.steps.students.description,
        action: t.onboarding.steps.students.action,
        resolveTarget: () => ({
          targets: ["add-student", "nav-students"],
          href: "/students",
        }),
      },
      {
        id: ONBOARDING_ACTIONS.balance,
        icon: WalletCards,
        title: t.onboarding.steps.balance.title,
        description: t.onboarding.steps.balance.description,
        action: t.onboarding.steps.balance.action,
        resolveTarget: (currentPathname) => ({
          targets: ["add-package", "student-tab-packages", "student-row", "nav-students"],
          href: isStudentCardPath(currentPathname)
            ? `${currentPathname}?tab=packages`
            : "/students",
        }),
      },
      {
        id: ONBOARDING_ACTIONS.share,
        icon: Link2,
        title: t.onboarding.steps.share.title,
        description: t.onboarding.steps.share.description,
        action: t.onboarding.steps.share.action,
        resolveTarget: () => ({
          targets: ["copy-share-link", "student-tab-overview", "student-row", "nav-students"],
          href: "/students",
        }),
      },
      {
        id: ONBOARDING_ACTIONS.schedule,
        icon: CalendarDays,
        title: t.onboarding.steps.schedule.title,
        description: t.onboarding.steps.schedule.description,
        action: t.onboarding.steps.schedule.action,
        resolveTarget: () => ({
          targets: ["add-lesson", "nav-schedule"],
          href: "/schedule",
        }),
      },
      {
        id: ONBOARDING_ACTIONS.complete,
        icon: CheckCircle2,
        title: t.onboarding.steps.complete.title,
        description: t.onboarding.steps.complete.description,
        action: t.onboarding.steps.complete.action,
        resolveTarget: () => ({
          targets: ["lesson-row", "nav-schedule"],
          href: "/schedule",
        }),
      },
      {
        id: ONBOARDING_ACTIONS.homework,
        icon: BookOpenCheck,
        title: t.onboarding.steps.homework.title,
        description: t.onboarding.steps.homework.description,
        action: t.onboarding.steps.homework.action,
        resolveTarget: () => ({
          targets: ["add-homework", "student-tab-homework", "student-row", "nav-students"],
          href: "/students",
        }),
      },
      {
        id: ONBOARDING_ACTIONS.settings,
        icon: RotateCcw,
        title: t.onboarding.steps.settings.title,
        description: t.onboarding.steps.settings.description,
        action: t.onboarding.steps.settings.action,
        resolveTarget: (currentPathname) => ({
          targets:
            currentPathname === "/settings"
              ? ["restart-onboarding", "nav-settings"]
              : ["nav-settings"],
          href: "/settings",
        }),
      },
    ],
    [],
  );

  const stepIds = useMemo(() => steps.map((step) => step.id), [steps]);
  const firstStepId = steps[0]!.id;
  const currentStepId = state?.currentStepId ?? firstStepId;
  const stepIndex = stepIndexOf(steps, currentStepId);
  const currentStep = steps[stepIndex] ?? steps[0]!;
  const targetSpec = useMemo(() => currentStep.resolveTarget(pathname), [currentStep, pathname]);
  const completedCount = state?.completedStepIds.length ?? 0;
  const progress = (completedCount / steps.length) * 100;
  const isFirstStep = stepIndex === 0;
  const StepIcon = currentStep.icon;
  const active = state?.status === "active";
  const showWelcome = active && state?.welcomeSeen !== true;

  // Just update state. Persisting to localStorage and notifying other tour-aware
  // components happens in the effect below — never inside a setState updater.
  const persist = useCallback((nextState: OnboardingState) => {
    setState(nextState);
  }, []);

  const completeStep = useCallback(
    (stepId: StepId) => {
      setState((current) => {
        if (!current || current.status !== "active") return current;
        if (current.completedStepIds.includes(stepId)) return current;

        const completedStepIds = [...current.completedStepIds, stepId];
        const completed = completedStepIds.length >= steps.length;
        const nextState: OnboardingState = {
          status: completed ? "completed" : "active",
          currentStepId: completed ? stepId : nextIncompleteStep(steps, completedStepIds),
          completedStepIds,
          completedOnce: current.completedOnce === true || completed,
          welcomeSeen: current.welcomeSeen,
        };
        return nextState;
      });
    },
    [steps],
  );

  // Persist every state change and let the settings panel re-sync its notice.
  // Kept in an effect (commit phase) so dispatching the event can never trigger
  // another component's setState during render.
  useEffect(() => {
    if (!state) return;
    window.localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new Event(ONBOARDING_STATE_EVENT));
  }, [state]);

  useEffect(() => {
    const storedState = readStoredState(firstStepId, stepIds);
    const shouldStartAfterSignup =
      window.localStorage.getItem(ONBOARDING_SIGNUP_START_STORAGE_KEY) === "1";

    if (shouldStartAfterSignup) {
      window.localStorage.removeItem(ONBOARDING_SIGNUP_START_STORAGE_KEY);
      const initialState = createInitialState(firstStepId, storedState?.completedOnce === true);
      persist(initialState);
    } else {
      setState(storedState);
    }

    function handleRestart() {
      const currentState = readStoredState(firstStepId, stepIds);
      persist(createInitialState(firstStepId, currentState?.completedOnce === true));
    }

    function handleAction(event: Event) {
      const action = (event as OnboardingActionEvent).detail?.action;
      if (action) completeStep(action);
    }

    window.addEventListener(ONBOARDING_RESTART_EVENT, handleRestart);
    window.addEventListener(ONBOARDING_ACTION_EVENT, handleAction);
    return () => {
      window.removeEventListener(ONBOARDING_RESTART_EVENT, handleRestart);
      window.removeEventListener(ONBOARDING_ACTION_EVENT, handleAction);
    };
  }, [completeStep, firstStepId, persist, stepIds]);

  useEffect(() => {
    if (!state || state.status !== "active" || state.welcomeSeen !== true) return;

    if (state.currentStepId === ONBOARDING_ACTIONS.overview && pathname === "/dashboard") {
      completeStep(ONBOARDING_ACTIONS.overview);
      return;
    }

    if (
      state.currentStepId === ONBOARDING_ACTIONS.students &&
      isStudentCardPath(pathname) &&
      consumeOnboardingActionIntent(ONBOARDING_ACTIONS.students)
    ) {
      completeStep(ONBOARDING_ACTIONS.students);
    }
  }, [completeStep, pathname, state]);

  // Track the target, the viewport and whether a modal is open. Re-measured on
  // resize/scroll (capture: true also catches the scrollable <main>) and on DOM
  // changes (tab switches, dialogs opening) via a MutationObserver.
  useEffect(() => {
    if (!active) return;

    let frame = 0;

    function measure(shouldScroll: boolean) {
      const match = findTargetElement(targetSpec.targets);
      if (match) {
        // Прокручиваем к подсвеченной кнопке при первом измерении шага И когда она
        // только что появилась/сменилась (переключили вкладку карточки, догрузился
        // список) — иначе на мобильной «Скопировать ссылку»/«Добавить ДЗ» остаётся за
        // кадром. Плавно, но не повторяем скролл, пока цель та же (не мешаем вручную).
        if (shouldScroll || lastScrolledTargetRef.current !== match.target) {
          match.element.scrollIntoView({
            behavior: scrollBehavior(),
            block: "center",
            inline: "nearest",
          });
          lastScrolledTargetRef.current = match.target;
        }
      } else {
        lastScrolledTargetRef.current = null;
      }
      setTargetPosition({
        rect: match ? match.element.getBoundingClientRect() : null,
        found: match !== null,
        isFallbackNav: match ? match.target.startsWith("nav-") : false,
        matchedTarget: match ? match.target : null,
      });
      setViewport({ width: window.innerWidth, height: window.innerHeight });
      setModalOpen(isModalOpen());
    }

    function scheduleMeasure(shouldScroll = false) {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => measure(shouldScroll));
    }

    function handleViewportChange() {
      scheduleMeasure();
    }

    scheduleMeasure(true);
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);
    const mutations = new MutationObserver(() => scheduleMeasure());
    mutations.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["data-state"],
    });
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
      mutations.disconnect();
    };
  }, [active, pathname, targetSpec.targets]);

  // Засчитываем шаг, когда пользователь нажимает САМУ подсвеченную кнопку действия
  // (первый таргет шага — реальная «Добавить …»/«Скопировать …»/строка урока, не
  // nav-фолбэк и не «перезапуск тура»). Так счётчик растёт от реальных нажатий по
  // выделенным кнопкам, а не от «Далее». Слушаем на capture, чтобы поймать клик до
  // того, как откроется диалог и тур спрячется.
  useEffect(() => {
    if (!active) return;
    const primaryTarget = targetSpec.targets[0];
    if (
      !primaryTarget ||
      primaryTarget.startsWith("nav-") ||
      primaryTarget === "restart-onboarding"
    ) {
      return;
    }

    function handleTargetClick(event: MouseEvent) {
      const node = event.target as HTMLElement | null;
      if (node?.closest(`[data-onboarding-target="${primaryTarget}"]`)) {
        completeStep(currentStepId);
      }
    }

    document.addEventListener("click", handleTargetClick, true);
    return () => document.removeEventListener("click", handleTargetClick, true);
  }, [active, targetSpec.targets, currentStepId, completeStep]);

  // Callback ref: (re)measure the card whenever it mounts and on any size change
  // (text length, button wrapping, theme/font). Measured height drives placement,
  // which is what keeps the footer buttons inside the viewport.
  const setCardNode = useCallback((node: HTMLElement | null) => {
    observerRef.current?.disconnect();
    observerRef.current = null;
    if (!node) {
      setCardSize(null);
      return;
    }
    const read = () => {
      const rect = node.getBoundingClientRect();
      setCardSize((prev) =>
        prev && prev.width === rect.width && prev.height === rect.height
          ? prev
          : { width: rect.width, height: rect.height },
      );
    };
    read();
    const observer = new ResizeObserver(read);
    observer.observe(node);
    observerRef.current = observer;
  }, []);

  const layoutTarget = showWelcome ? null : targetPosition.rect;
  const layout = useMemo(
    () => computePlacement(layoutTarget, cardSize, viewport ?? { width: 1024, height: 768 }),
    [layoutTarget, cardSize, viewport],
  );

  function skipTour() {
    if (!state) return;
    persist({ ...state, status: "skipped" });
  }

  function dismissWelcome() {
    if (!state) return;
    persist({ ...state, welcomeSeen: true });
  }

  function prevStep() {
    if (!state) return;
    const previous = steps[stepIndex - 1];
    if (!previous) return;
    persist({ ...state, currentStepId: previous.id });
  }

  // Manual "Дальше": walk to the next step by index (marking the current one done).
  // Unlike completeStep — which is driven by real actions and jumps to the first
  // *incomplete* step — this keeps working after going Back to an already-completed
  // step (where completeStep would be a no-op).
  function advanceStep() {
    if (!state || state.status !== "active") return;
    const completedStepIds = state.completedStepIds.includes(currentStep.id)
      ? state.completedStepIds
      : [...state.completedStepIds, currentStep.id];
    const next = steps[stepIndex + 1];
    if (!next) {
      persist({
        status: "completed",
        currentStepId: currentStep.id,
        completedStepIds,
        completedOnce: true,
        welcomeSeen: state.welcomeSeen,
      });
      return;
    }
    persist({
      status: "active",
      currentStepId: next.id,
      completedStepIds,
      completedOnce: state.completedOnce === true,
      welcomeSeen: state.welcomeSeen,
    });
  }

  // «Далее»/«Завершить» продвигают тур только на шагах без ручного действия: обзор и
  // настройки засчитываются автоматически. На шагах с действием шаг закрывается, когда
  // пользователь нажимает САМУ подсвеченную кнопку (эффект ниже) или реально выполняет
  // действие (notifyOnboardingAction) — карточка не «проматывает» шаг кнопкой «Далее».
  const overviewHere = currentStep.id === ONBOARDING_ACTIONS.overview && pathname === "/dashboard";
  const settingsHere = currentStep.id === ONBOARDING_ACTIONS.settings && pathname === "/settings";
  const canAdvanceHere = overviewHere || settingsHere;
  // Подсвечена ИМЕННО кнопка действия этого шага (первый таргет), а не nav/таб-фолбэк
  // для перехода к ней: тогда ждём клик по ней, а карточка лишь подсказывает это.
  const awaitingAction =
    !canAdvanceHere &&
    targetPosition.found &&
    !targetPosition.isFallbackNav &&
    targetPosition.matchedTarget === targetSpec.targets[0];

  function handlePrimary() {
    if (!state || state.status !== "active") return;
    if (canAdvanceHere) {
      advanceStep();
      return;
    }
    // Кнопка карточки только ведёт к действию (на нужную страницу/раздел). Само
    // продвижение — по клику подсвеченной кнопки или реальному выполнению действия.
    router.push(targetSpec.href);
  }

  if (!state || state.status !== "active" || !viewport) return null;
  // Stand aside while a modal dialog is open (the user acts inside it; closing it
  // and performing the action advances the tour). Effects keep running.
  if (modalOpen) return null;

  const primaryLabel = settingsHere
    ? t.onboarding.finish
    : canAdvanceHere
      ? t.onboarding.next
      : currentStep.action;

  const cardStyle: CSSProperties = {
    left: layout.left,
    top: layout.top,
    width: layout.width,
    maxHeight: layout.maxHeight,
    opacity: cardSize ? 1 : 0,
  };

  return (
    <>
      {!showWelcome && targetPosition.rect ? (
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-40">
          <div
            className="absolute transition-[left,top,width,height] duration-200 motion-reduce:transition-none"
            style={spotlightStyle(targetPosition.rect)}
          />
        </div>
      ) : null}

      <section
        ref={setCardNode}
        aria-live="polite"
        className={cn(
          "fixed z-50 flex flex-col rounded-md border bg-card text-card-foreground shadow-xl",
          "transition-[left,top,opacity] duration-200 motion-reduce:transition-none",
        )}
        style={cardStyle}
      >
        {layout.arrow ? (
          <div
            aria-hidden="true"
            className={cn("absolute rotate-45 bg-card", arrowBorders(layout.arrow.side))}
            style={arrowStyle(layout.arrow)}
          />
        ) : null}

        {showWelcome ? (
          <WelcomeBody onStart={dismissWelcome} onLater={skipTour} />
        ) : (
          <StepBody
            icon={StepIcon}
            title={currentStep.title}
            description={currentStep.description}
            stepIndex={stepIndex}
            stepCount={steps.length}
            completedCount={completedCount}
            progress={progress}
            showTargetMissing={!targetPosition.found}
            awaitingAction={awaitingAction}
            isFirstStep={isFirstStep}
            primaryLabel={primaryLabel}
            onSkip={skipTour}
            onBack={prevStep}
            onPrimary={handlePrimary}
          />
        )}
      </section>
    </>
  );
}

function WelcomeBody({ onStart, onLater }: { onStart: () => void; onLater: () => void }) {
  return (
    <>
      <div className="flex shrink-0 items-start gap-3 p-4 pb-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <GraduationCap className="size-5" />
        </div>
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-medium uppercase text-primary">{t.onboarding.eyebrow}</p>
          <h2 className="text-base font-semibold leading-snug">{t.onboarding.welcome.title}</h2>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4">
        <p className="text-sm leading-relaxed text-muted-foreground">
          {t.onboarding.welcome.description}
        </p>
      </div>

      <div className="flex shrink-0 flex-col gap-2 p-4 pt-3">
        <Button type="button" size="sm" className="w-full" onClick={onStart}>
          {t.onboarding.welcome.start}
        </Button>
        <Button type="button" variant="ghost" size="sm" className="w-full" onClick={onLater}>
          {t.onboarding.welcome.later}
        </Button>
      </div>
    </>
  );
}

function StepBody({
  icon: Icon,
  title,
  description,
  stepIndex,
  stepCount,
  completedCount,
  progress,
  showTargetMissing,
  awaitingAction,
  isFirstStep,
  primaryLabel,
  onSkip,
  onBack,
  onPrimary,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  stepIndex: number;
  stepCount: number;
  completedCount: number;
  progress: number;
  showTargetMissing: boolean;
  awaitingAction: boolean;
  isFirstStep: boolean;
  primaryLabel: string;
  onSkip: () => void;
  onBack: () => void;
  onPrimary: () => void;
}) {
  return (
    <>
      <div className="flex shrink-0 items-start gap-3 p-4 pb-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="size-5" />
        </div>
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-medium uppercase text-primary">{t.onboarding.eyebrow}</p>
          <h2 className="text-base font-semibold leading-snug">{title}</h2>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4">
        <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>{t.onboarding.progress(stepIndex + 1, stepCount)}</span>
            <span>{t.onboarding.completed(completedCount, stepCount)}</span>
          </div>
          <Progress value={progress} aria-label={t.onboarding.progressLabel} />
        </div>

        {showTargetMissing ? (
          <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
            {t.onboarding.targetMissing}
          </p>
        ) : null}
      </div>

      {/* Primary action gets its own full-width row so a long label can never
          push the buttons past the card edge; Skip + Back share the row above. */}
      <div className="flex shrink-0 flex-col gap-2 p-4 pt-3">
        <div className="flex items-center justify-between gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onSkip}>
            {t.onboarding.skip}
          </Button>
          <Button type="button" variant="outline" size="sm" disabled={isFirstStep} onClick={onBack}>
            {t.common.back}
          </Button>
        </div>
        {awaitingAction ? (
          // Подсвечена сама кнопка действия — ведём к нажатию ИМЕННО её (не дублируем
          // «Далее»/«Перейти», чтобы текст не расходился с реальным действием).
          <p className="rounded-md bg-primary/10 px-3 py-2 text-center text-xs font-medium text-primary">
            {t.onboarding.pressHighlighted}
          </p>
        ) : (
          <Button type="button" size="sm" className="w-full" onClick={onPrimary}>
            {primaryLabel}
          </Button>
        )}
      </div>
    </>
  );
}
