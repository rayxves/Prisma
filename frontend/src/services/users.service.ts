import { api } from "./api";
import type { User, UserRole } from "@/types";

export interface CreateUserInput {
	name: string;
	email: string;
	password: string;
	role: UserRole;
}

export interface UpdateUserInput {
	name?: string;
	email?: string;
	role?: UserRole;
}

export const usersService = {
	list() {
		return api.get<User[]>("/api/users");
	},
	getById(id: string) {
		return api.get<User>(`/api/users/${id}`);
	},
	create(data: CreateUserInput) {
		return api.post<User>("/api/users", data);
	},
	update(id: string, data: UpdateUserInput) {
		return api.put<User>(`/api/users/${id}`, data);
	},
	remove(id: string) {
		return api.delete<void>(`/api/users/${id}`);
	},
	changePassword(
		id: string,
		data: {
			currentPassword?: string;
			newPassword: string;
			confirmPassword: string;
		},
	) {
		return api.patch<{ message: string }>(`/api/users/${id}/password`, data);
	},
};
