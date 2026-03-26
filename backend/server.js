import 'dotenv/config';
import app from "./src/app.js";
import connectToDb from './src/config/db.js';

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION 💥:", err.message);
  process.exit(1);
});

const startServer = async () => {
  try {
    // ✅ Connect Database
    await connectToDb();

    // ✅ Use env PORT
    const PORT = process.env.PORT || 3000;

    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port: ${PORT}`);
    });

    // Handle unhandled promise rejections
    process.on("unhandledRejection", (err) => {
      console.error("UNHANDLED REJECTION 💥:", err.message);
      server.close(() => {
        process.exit(1);
      });
    });

  } catch (error) {
    console.error("❌ Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();