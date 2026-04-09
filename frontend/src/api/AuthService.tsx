import { API_BASE_URL } from './config';
import { apiFetch } from './http';
const API_URL = API_BASE_URL + "/api/Auth";

function notifyAuthChange() {
    window.dispatchEvent(new Event("auth-change"));
}

export type CurrentUser = {
    email: string;
    displayName: string;
    roles: string[];
};

export const AuthService = {
    register: async (email: string, displayName: string, password: string) => {
        const response = await apiFetch(`${API_URL}/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, displayName, password }),
        });
        return response;
    },

    login: async (email: string, password: string) => {
        const response = await apiFetch(`${API_URL}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include", // THIS IS REQUIRED FOR COOKIES TO WORK
            body: JSON.stringify({ email, password }),
        });
        return response;
    },

    me: async (): Promise<CurrentUser> => {
        const response = await apiFetch(`${API_URL}/me`, {
            method: "GET",
            credentials: "include",
        });

        if (!response.ok) {
            throw new Error(`Failed to load current user: ${response.status}`);
        }

        return await response.json();
    },

    logout: async () => {
        try {
            await apiFetch(`${API_URL}/logout`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
            });
        } finally {
            notifyAuthChange();
        }
    },

    setAuthenticated: () => {
        notifyAuthChange();
    },

    isAuthenticated: () => {
        return false;
    },
};

