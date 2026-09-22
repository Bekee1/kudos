import { Router, type IRouter } from "express";
import healthRouter from "./health";
import kudosRouter from "./kudos";

const router: IRouter = Router();

router.use(healthRouter);
router.use(kudosRouter);

export default router;
