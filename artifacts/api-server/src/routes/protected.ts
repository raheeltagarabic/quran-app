import { Router } from "express";
import { jwtAuth } from "../middlewares/jwtAuth";

const router = Router();

router.get("/", jwtAuth, (req, res) => {
  res.json({
    message: "You are authorized ✅",
    user: req.user
  });
});

export default router;
