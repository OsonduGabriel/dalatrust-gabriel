
import "dotenv/config";
import { Sequelize } from "sequelize";

// Create one Sequelize instance for the entire application.
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 5432,
    dialect: "postgres",
    logging: false,

    // Use a connection pool to manage database connections.
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  }
);

// Test the connection when the application starts.
export const connectDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log("PostgreSQL connected successfully.");
  } catch (error) {
    console.error("PostgreSQL connection failed:", error.message);
    throw error;
  }
};

export default sequelize;
