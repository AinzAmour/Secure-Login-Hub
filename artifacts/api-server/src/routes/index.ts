import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import accountRouter from "./account";
import handoffRouter from "./handoff";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(accountRouter);
router.use(handoffRouter);

export default router;
