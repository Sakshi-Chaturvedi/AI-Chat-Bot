import express from "express";

const router = express.Router();

router.get("/check", (req, res) => {
  res.send("API testing");
});


export default router
