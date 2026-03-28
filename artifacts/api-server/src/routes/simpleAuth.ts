import { Router } from "express";
import jwt from "jsonwebtoken";

const router = Router();
const SECRET = "mysecret123";

router.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (email === "admin@test.com" && password === "123456") {
    const token = jwt.sign({ email }, SECRET, { expiresIn: "1h" });
    return res.json({ token });
  }

  return res.status(401).json({ error: "Invalid credentials" });
});

export default router;
