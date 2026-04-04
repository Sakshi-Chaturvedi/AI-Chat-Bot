import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import router from "./routes/auth.routes.js";


const app = express();

// ! Security headers
app.use(helmet());

// ! Logging (dev / prod based)
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// ! Body parser
app.use(express.json({ limit: "10kb" }));

// ! Cookie-Parser
app.use(cookieParser());

// ! CORS configuration
const allowedOrigins = [process.env.FRONTEND_URL];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);

// ✅ Health check route (important for deployment)
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is healthy 🚀",
  });
});

// ! Example route
app.get("/", (req, res) => {
  res.send("API is running...");
});

// ! Auth Routes
app.use("/api/v1/auth/",router)

// ❗ 404 Handler (route not found)
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: "Route Not Found",
  });
});

// ❗ Global Error Handler
app.use((err, req, res, next) => {
  console.error("ERROR 💥:", err.message);

  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

export default app;
