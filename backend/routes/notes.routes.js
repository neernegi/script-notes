import express from "express";
import { createNote, getNoteById, updateNote } from "../controllers/notes.controller.js";

const router = express.Router();

router.post("/", createNote);
router.get("/:id", getNoteById);
router.put("/:id", updateNote);

export default router;
