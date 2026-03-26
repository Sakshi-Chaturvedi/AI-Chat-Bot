import mongoose from "mongoose";

const connectToDb = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URL);

    console.log(`MongoDB Connected: ${conn.connection.host} ✅`);
  } catch (error) {
    console.error("DB Connection Failed ❌", error.message);
    process.exit(1);
  }
};

// ! connection events
mongoose.connection.on("disconnected", () => {
  console.log("MongoDB disconnected ⚠️");
});

mongoose.connection.on("reconnected", () => {
  console.log("MongoDB reconnected 🔄");
});

export default connectToDb;