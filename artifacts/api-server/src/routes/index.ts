import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import studentsRouter from "./students";
import topicsRouter from "./topics";
import questionsRouter from "./questions";
import resultsRouter from "./results";
import recordingsRouter from "./recordings";
import usersRouter from "./users";
import progressRouter from "./progress";
import attendanceRouter from "./attendance";
import feesRouter from "./fees";
import parentRouter from "./parent";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(studentsRouter);
router.use(topicsRouter);
router.use(questionsRouter);
router.use(resultsRouter);
router.use(recordingsRouter);
router.use(usersRouter);
router.use(progressRouter);
router.use(attendanceRouter);
router.use(feesRouter);
router.use(parentRouter);

export default router;
