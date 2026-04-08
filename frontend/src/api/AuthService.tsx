import { API_BASE_URL } from './config';
const API_URL = API_BASE_URL + "/api/Auth";
const AUTH_STORAGE_KEY = "hearthHavenAuthenticated";

export const AuthService = {
    register: async (email: string, password: string) => {
        const response = await fetch(`${API_URL}/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
        });
        return response;
    },

    login: async (email: string, password: string) => {
        const response = await fetch(`${API_URL}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include", // THIS IS REQUIRED FOR COOKIES TO WORK
            body: JSON.stringify({ email, password }),
        });
        return response;
    },

    logout: async () => {
        try {
            await fetch(`${API_URL}/logout`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
            });
        } finally {
            localStorage.removeItem(AUTH_STORAGE_KEY);
            window.dispatchEvent(new Event("auth-change"));
        }
    },

    setAuthenticated: (isAuthenticated: boolean) => {
        if (isAuthenticated) {
            localStorage.setItem(AUTH_STORAGE_KEY, "true");
        } else {
            localStorage.removeItem(AUTH_STORAGE_KEY);
        }

        window.dispatchEvent(new Event("auth-change"));
    },

    isAuthenticated: () => {
        return localStorage.getItem(AUTH_STORAGE_KEY) === "true";
    }
};
