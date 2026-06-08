import express from "express";
import cors    from "cors";
import path    from "path";
import { fileURLToPath } from "url";

import { connectDB }      from "./backend/config/db.js";
import { PORT }           from "./backend/config/config.js";

import professorsRouter from "./backend/routes/supervisor.js";
import studentsRouter   from "./backend/routes/students.js";
import searchRouter     from "./backend/routes/search.js";
import papersRouter     from "./backend/routes/papers.js";
import chatRouter       from "./backend/routes/chat.js";
import topicsRouter     from "./backend/routes/topics.js";
import litReviewRouter  from "./backend/routes/litReview.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app = express();

/* Global Middleware */
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));


app.get("/api", (_req, res) => res.json({ status: "ok" }));
app.get("/test", (_req, res) => res.send("TEST OK"));

/* Routes */
app.use("/api/professors", professorsRouter);
app.use("/api/students",   studentsRouter);
app.use("/api",            searchRouter);   // POST /api/search
app.use("/api",            papersRouter);   // GET  /api/papers
app.use("/api",            chatRouter);     // POST /api/session, /api/message, /api/clear
app.use("/api",            topicsRouter);   // POST /api/generate-topic, /api/refine-topic, etc.
app.use("/api/lit-review",  litReviewRouter);  // POST /api/lit-review, /api/lit-review/upload


app.use((_req, res) => res.status(404).json({ error: "Route not found." }));


connectDB()
  .then(() => {
    app.listen(PORT, () =>
      console.log(`🚀  Running on http://localhost:${PORT}`)
    );
  })
  .catch((err) => {
    console.error("❌  MongoDB connection failed:", err.message);
    process.exit(1);
  });