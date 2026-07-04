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
        create: (data: any) => API.post("/rooms", data),
    },
    tenants:{
        getAll: () => API.get("/tenants"),
        register: (data:any) => API.post("/tenants", data),
    },
    billing:{
        getAll: () => API.get("/billing"),
        create: (data:any) => API.post("/billing", data),
    }
}