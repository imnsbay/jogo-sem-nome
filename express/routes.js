import { loginController, registerController } from "./controller.js";
import express from "express";
const router = express();

router.get("/", (req, res) => {
  res.sendFile("/public/index.html", { root: "." });
});

router.get("/register", (req, res) => {
  res.sendFile("/public/register.html", { root: "." });
});

router.get("/register/:username/:email/:password", (req, res) => {
  registerController(req, res);
});

export default router;
