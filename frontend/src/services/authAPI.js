import httpClient from "./httpClient";

export const authAPI = {
  register: (name, email, password) =>
    httpClient.post("/auth/register", { name, email, password }),

  login: (email, password) =>
    httpClient.post("/auth/login", { email, password }),

  getMe: () => httpClient.get("/auth/me"),

  logout: () => httpClient.post("/auth/logout"),
};
