"use client";

import {
	createContext,
	useCallback,
	useEffect,
	useState,
	type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/services/auth.service";
import type { User } from "@/types";

interface AuthContextValue {
	user: User | null;
	loading: boolean;
	login: (email: string, password: string) => Promise<void>;
	logout: () => void;
	refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(
	undefined,
);

const USER_STORAGE_KEY = "prisma-user";
const TOKEN_COOKIE_DAYS = 7;

function setTokenCookie(token: string) {
	const expires = new Date(
		Date.now() + TOKEN_COOKIE_DAYS * 24 * 60 * 60 * 1000,
	).toUTCString();
	document.cookie = `token=${encodeURIComponent(token)}; path=/; expires=${expires}; SameSite=Lax`;
}

function clearTokenCookie() {
	document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
}

function getStoredUser(): User | null {
	if (typeof window === "undefined") return null;
	try {
		const raw = localStorage.getItem(USER_STORAGE_KEY);
		return raw ? (JSON.parse(raw) as User) : null;
	} catch {
		return null;
	}
}

export function AuthProvider({ children }: { children: ReactNode }) {
	const [user, setUser] = useState<User | null>(null);
	const [loading, setLoading] = useState(true);
	const router = useRouter();

	useEffect(() => {
		const stored = getStoredUser();
		if (stored) {
			setUser(stored);
			authService
				.me()
				.then((fresh) => {
					setUser(fresh);
					localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(fresh));
				})
				.catch(() => {
					clearTokenCookie();
					setUser(null);
					localStorage.removeItem(USER_STORAGE_KEY);
				})
				.finally(() => setLoading(false));
		} else {
			setLoading(false);
		}
	}, []);

	const login = useCallback(
		async (email: string, password: string) => {
			const { token, user: loggedUser } = await authService.login(email, password);
			setTokenCookie(token);
			const fullUser: User = { ...loggedUser, tenantId: "" };
			setUser(fullUser);
			localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(fullUser));
			const me = await authService.me();
			setUser(me);
			localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(me));
		},
		[],
	);

	const logout = useCallback(() => {
		clearTokenCookie();
		localStorage.removeItem(USER_STORAGE_KEY);
		setUser(null);
		router.push("/login");
	}, [router]);

	const refreshUser = useCallback(async () => {
		const me = await authService.me();
		setUser(me);
		localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(me));
	}, []);

	return (
		<AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
			{children}
		</AuthContext.Provider>
	);
}
