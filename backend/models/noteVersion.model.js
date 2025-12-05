import mongoose from "mongoose";

const noteVersionSchema = new mongoose.Schema({
  noteId: { type: mongoose.Schema.Types.ObjectId, ref: "Note", required: true },
  content: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
  meta: { type: Object, default: {} }
});

export default mongoose.model("NoteVersion", noteVersionSchema);
