import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:4000/api",
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor
API.interceptors.request.use(
  (config) => {
    console.log(`API ${config.method.toUpperCase()}: ${config.url}`);
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
API.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("API Error:", error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Create a note
export const createNote = async ({ title }) => {
  try {
    const res = await API.post("/notes", { title });
    if (res.data.success) return res.data.data;
    throw new Error(res.data.message || "Failed to create note");
  } catch (err) {
    throw new Error(err.response?.data?.message || err.message || "Network error");
  }
};

// Fetch note by ID
export const fetchNoteById = async (id) => {
  try {
    const res = await API.get(`/notes/${id}`);
    if (res.data.success) return res.data.data;
    throw new Error(res.data.message || "Failed to fetch note");
  } catch (err) {
    throw new Error(err.response?.data?.message || err.message || "Network error");
  }
};

// Update note content
export const updateNoteById = async (id, content) => {
  try {
    const res = await API.put(`/notes/${id}`, { content });
    if (res.data.success) return res.data.data;
    throw new Error(res.data.message || "Failed to update note");
  } catch (err) {
    throw new Error(err.response?.data?.message || err.message || "Network error");
  }
};