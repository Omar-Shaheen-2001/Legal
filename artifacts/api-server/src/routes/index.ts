import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import dashboardRouter from "./dashboard";
import aiRouter from "./ai";
import sessionsRouter from "./sessions";
import settingsRouter from "./settings";
import reportsRouter from "./reports";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(dashboardRouter);
router.use(aiRouter);
router.use(sessionsRouter);
router.use(settingsRouter);
router.use(reportsRouter);

export default router;
