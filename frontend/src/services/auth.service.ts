import { api } from "./api";
import type { LoginResponse, User } from "@/types";

export interface RegisterInput {
	companyName: string;
	cnpj: string;
	adminName: string;
	email: string;
	password: string;
}

export interface RegisterResponse {
	tenantId: string;
	userId: string;
}
export const authService = {
	login(email: string, password: string) {
		return api.post<LoginResponse>("/api/auth/login", { email, password });
	},
	me() {
		return api.get<User>("/api/auth/me");
	},
	logout() {
		return api.post<{ message: string }>("/api/auth/logout", {});
	},
	register(data: RegisterInput) {
		return api.post<RegisterResponse>("/api/auth/register", data);
	},
};
