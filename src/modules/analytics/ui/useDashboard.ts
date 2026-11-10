"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { DashboardResumen } from "../domain/dashboard";

export const dashboardKeys = {
	all: ["dashboard"] as const,
	detalle: (userId: string, range: number, deviceId: string | null) =>
		["dashboard", userId, range, deviceId ?? "all"] as const,
};

interface UseDashboardOptions {
	userId: string;
	range: number;
	deviceId: string | null;
	initialData?: DashboardResumen;
}

export function useDashboard({ userId, range, deviceId, initialData }: UseDashboardOptions) {
	return useQuery({
		queryKey: dashboardKeys.detalle(userId, range, deviceId),
		queryFn: () => fetchDashboard(range, deviceId),
		initialData,
		staleTime: 60_000,
		gcTime: 10 * 60_000,
		placeholderData: keepPreviousData,
	});
}

async function fetchDashboard(range: number, deviceId: string | null): Promise<DashboardResumen> {
	const params = new URLSearchParams({ range: String(range) });

	if (deviceId) {
		params.set("device", deviceId);
	}

	const response = await fetch(`/api/dashboard?${params.toString()}`, {
		credentials: "include",
		cache: "no-store",
	});

	if (!response.ok) {
		const cuerpo = (await response.json().catch(() => null)) as { error?: string } | null;
		throw new Error(cuerpo?.error ?? "No se pudo cargar el dashboard");
	}

	return (await response.json()) as DashboardResumen;
}
