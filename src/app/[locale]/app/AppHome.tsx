"use client";

import { useTranslations } from "next-intl";
import { StorageNotice } from "@/components/layout/StorageNotice";
import { PomodoroTimer } from "@/modules/pomodoros/ui/PomodoroTimer";
import { useTimerSession } from "@/modules/pomodoros/ui/TimerProvider";
import { BlockSummary } from "@/modules/tareas/ui/BlockSummary";
import { TasksBlock } from "@/modules/tareas/ui/TasksBlock";

interface AppHomeProps {
	user: { email: string } | null;
}

export function AppHome({ user }: AppHomeProps) {
	const t = useTranslations("App");
	const { sesion, bloqueCompletado } = useTimerSession();

	return (
		<main className="mx-auto flex min-h-[calc(100svh-var(--header-h))] w-full max-w-3xl flex-1 flex-col justify-start gap-6 px-6 pt-8 pb-12">
			{user ? (
				<div className="space-y-1">
					<h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
					<p className="text-sm text-muted">{t("subtitle")}</p>
				</div>
			) : null}

			<PomodoroTimer />

			{sesion?.modo === "focus" ? (
				<TasksBlock bloqueId={sesion.bloque.id} focusId={sesion.id} />
			) : null}

			{!sesion && bloqueCompletado ? <BlockSummary bloqueId={bloqueCompletado.id} /> : null}

			<StorageNotice />
		</main>
	);
}
