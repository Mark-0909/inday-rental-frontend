import axios from "axios";

const API = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
    headers:{
        "Content-Type": "application/json",
    },
});

export const endpoints = {
    rooms:{
        getAll: () => API.get("/rooms"),
        create: (data: Record<string, unknown>) => API.post("/rooms", data),
        update: (id: number, data: Record<string, unknown>) => API.put(`/rooms/${id}`, data),
        remove: (id: number) => API.delete(`/rooms/${id}`),
    },
    tenants:{
        getAll: () => API.get("/tenants"),
        register: (data: Record<string, unknown>) => API.post("/tenants", data),
        update: (id: number, data: Record<string, unknown>) => API.put(`/tenants/${id}`, data),
        remove: (id: number) => API.delete(`/tenants/${id}`),
    },
    billing:{
        getAll: () => API.get("/billing"),
        create: (data: Record<string, unknown>) => API.post("/billing", data),
    }
}