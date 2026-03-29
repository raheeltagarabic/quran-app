import { Router } from "express";
import { authMiddleware } from "../middlewares/auth";

const router = Router();

router.get("/", authMiddleware, (req, res) => {
  res.json({
    message: "You are authorized ✅",
    user: req.user
  });
});

export default router;
