import express from "express";
import cors from "cors";
import notesRouter from "./routes/notes.routes.js";
import createError from "http-errors";
import { errorHandler } from "./middleware/error.middleware.js";
import { connectDB } from "./config/db.js";

connectDB();

const allowedOrigins = ["http://localhost:5173", process.env.CLIENT_URL];

const app = express();
app.use(
  cors({
    origin: allowedOrigins,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API
app.use("/api/notes", notesRouter);

// health
app.get("/health", (req, res) => res.json({ ok: true }));

// 404
app.use((req, res, next) => next(createError(404, "Route not found")));

// error handler
app.use(errorHandler);

export default app;
