import axios from "axios";

const API = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export const endpoints = {
  rooms: {
    getAll: (page: number = 0, size: number = 10) => API.get("/rooms", { params: { page, size } }),
    create: (data: Record<string, unknown>) => API.post("/rooms", data),
    update: (id: number, data: Record<string, unknown>) => API.put(`/rooms/${id}`, data),
    remove: (id: number) => API.delete(`/rooms/${id}`),
  },
  tenants: {
    getAll: (page: number = 0, size: number = 10) => API.get("/tenants", { params: { page, size } }),
    register: (data: Record<string, unknown>) => API.post("/tenants", data),
    update: (id: number, data: Record<string, unknown>) => API.put(`/tenants/${id}`, data),
    remove: (id: number) => API.delete(`/tenants/${id}`),
  },
  billing: {
    getAll: (page: number = 0, size: number = 10) => API.get("/billing", { params: { page, size } }),
    create: (data: Record<string, unknown>) => API.post("/billing", data),
    update: (id: number, data: Record<string, unknown>) => API.put(`/billing/${id}`, data),
    remove: (id: number) => API.delete(`/billing/${id}`),
  },
};