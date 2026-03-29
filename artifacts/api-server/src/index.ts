import app from "./app";
import { logger } from "./lib/logger";
import { seedQuestions } from "./seed";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(process.env.PORT) || 3000;

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  });

  // Confirm which database is in use (host only, never log full URL with credentials)
  try {
    const url = new URL(process.env["DATABASE_URL"]!);
    logger.info({ host: url.hostname, database: url.pathname.slice(1) }, "DB connected");
  } catch {
    logger.info("DB connected: DATABASE_URL is set");
  }

  seedQuestions(msg => logger.info(msg)).catch(e =>
    logger.error({ err: e }, "Seed error"),
  );
});
