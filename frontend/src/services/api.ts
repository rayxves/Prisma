const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

function getToken(): string | null {
	if (typeof window === "undefined") return null;
	const match = document.cookie.match(/(?:^|;\s*)token=([^;]+)/);
	return match ? decodeURIComponent(match[1]) : null;
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
	const token = getToken();

	const res = await fetch(`${API_URL}${path}`, {
		...options,
		headers: {
			"Content-Type": "application/json",
			...(token ? { Authorization: `Bearer ${token}` } : {}),
			...options?.headers,
		},
	});

	if (res.status === 401) {
		if (typeof window !== "undefined") {
			document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
			window.location.href = "/login";
		}
		throw new Error("Unauthorized");
	}

	if (!res.ok) {
		const err = await res.json().catch(() => ({ error: "Erro desconhecido" }));
		throw new Error(err.error ?? "Erro na requisição");
	}

	if (res.status === 204) return undefined as T;
	return res.json() as Promise<T>;
}

export async function apiUpload<T>(
	path: string,
	formData: FormData,
): Promise<T> {
	const token = getToken();

	const res = await fetch(`${API_URL}${path}`, {
		method: "POST",
		headers: token ? { Authorization: `Bearer ${token}` } : {},
		body: formData,
	});

	if (res.status === 401) {
		if (typeof window !== "undefined") {
			document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
			window.location.href = "/login";
		}
		throw new Error("Unauthorized");
	}

	if (!res.ok) {
		const err = await res.json().catch(() => ({ error: "Erro desconhecido" }));
		throw new Error(err.error ?? "Erro na requisição");
	}

	return res.json() as Promise<T>;
}

export async function apiDownload(path: string): Promise<Blob> {
	const token = getToken();

	const res = await fetch(`${API_URL}${path}`, {
		headers: token ? { Authorization: `Bearer ${token}` } : {},
	});

	if (!res.ok) {
		throw new Error("Falha ao baixar arquivo");
	}

	return res.blob();
}

export const api = {
	get: <T>(path: string) => apiFetch<T>(path),
	post: <T>(path: string, body: unknown) =>
		apiFetch<T>(path, { method: "POST", body: JSON.stringify(body) }),
	put: <T>(path: string, body: unknown) =>
		apiFetch<T>(path, { method: "PUT", body: JSON.stringify(body) }),
	patch: <T>(path: string, body: unknown) =>
		apiFetch<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
	delete: <T>(path: string) => apiFetch<T>(path, { method: "DELETE" }),
};

export { API_URL };
