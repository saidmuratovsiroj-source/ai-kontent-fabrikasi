import express from "express";
import cors from "cors";
import { env } from "./config/env";
import { connectDb } from "./db/db";
import healthRouter from "./routes/health";
import chatRouter from "./routes/chat";
import researchRouter from "./routes/research";
import pipelineStreamRouter from "./routes/pipelineStream";
import budgetRouter from "./routes/budget";
import knowledgeRouter from "./routes/knowledge";
import runsRouter from "./routes/runs";
import testsRouter from "./routes/tests";
import tasksRouter from "./routes/tasks";
import contentPlanRouter from "./routes/contentPlan";
import channelsRouter from "./routes/channels";
import maqsadRouter from "./routes/maqsad";
import analyticsRouter from "./routes/analytics";
import trendsRouter from "./routes/trends";
import viralRouter from "./routes/viral";
import projectsRouter from "./routes/projects";
import ideasRouter from "./routes/ideas";
import videoFoldersRouter from "./routes/videoFolders";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api", healthRouter);
app.use("/api", chatRouter);
app.use("/api", researchRouter);
app.use("/api", pipelineStreamRouter);
app.use("/api", budgetRouter);
app.use("/api", knowledgeRouter);
app.use("/api", runsRouter);
app.use("/api", testsRouter);
app.use("/api", tasksRouter);
app.use("/api", contentPlanRouter);
app.use("/api", channelsRouter);
app.use("/api", maqsadRouter);
app.use("/api", analyticsRouter);
app.use("/api", trendsRouter);
app.use("/api", viralRouter);
app.use("/api", projectsRouter);
app.use("/api", ideasRouter);
app.use("/api", videoFoldersRouter);

async function start() {
  await connectDb();
  app.listen(env.port, () => {
    console.log(`✅ Server ishga tushdi: http://localhost:${env.port}`);
    console.log(`   Pipeline:   POST /api/pipeline/stream`);
    console.log(`   Yugurishlar: GET  /api/runs`);
    console.log(`   Byudjet:     GET  /api/budget`);
  });
}

start().catch((err) => {
  console.error("Server ishga tushmadi:", err);
  process.exit(1);
});
