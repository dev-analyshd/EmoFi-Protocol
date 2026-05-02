import { Router, type IRouter } from "express";
import healthRouter from "./health";
import usersRouter from "./users";
import tokensRouter from "./tokens";
import vaultsRouter from "./vaults";
import marketplaceRouter from "./marketplace";
import stakingRouter from "./staking";
import governanceRouter from "./governance";
import oracleRouter from "./oracle";
import dashboardRouter from "./dashboard";
import seedRouter from "./seed";

const router: IRouter = Router();

router.use(healthRouter);
router.use(usersRouter);
router.use(tokensRouter);
router.use(vaultsRouter);
router.use(marketplaceRouter);
router.use(stakingRouter);
router.use(governanceRouter);
router.use(oracleRouter);
router.use(dashboardRouter);
router.use(seedRouter);

export default router;
