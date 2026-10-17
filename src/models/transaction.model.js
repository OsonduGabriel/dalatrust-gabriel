
import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

// All transaction states
const TRANSACTION_STATES = [
  "INITIATED",
  "AUTHENTICATED",
  "DEBITED",
  "PROCESSING",
  "SUCCESS",
  "FAILED",
  "TIMEOUT",
  "CONFIRMED",
  "REVERSED",
  "INVESTIGATE",
  "DISPUTED",
  "RESOLVED",
];

// Define the transactions table.
const Transaction = sequelize.define(
  "Transaction",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    reference: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },

    customer_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },

    source_account_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },

    txn_type: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    channel_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    dest_institution_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    route: {
      type: DataTypes.JSONB,
      allowNull: true,
    },

    amount: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: true,
    },

    currency: {
      type: DataTypes.STRING(3),
      allowNull: true,
    },

    current_state: {
      type: DataTypes.ENUM(...TRANSACTION_STATES),
      allowNull: false,
      defaultValue: "INITIATED",
    },

    previous_state: {
      type: DataTypes.ENUM(...TRANSACTION_STATES),
      allowNull: true,
    },

    state_entered_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },

    // Sequence number of the last successfully processed event.
    last_seq: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },

    // Indicates whether funds have been debited.
    debited: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    reversal_status: {
      type: DataTypes.ENUM(
        "NONE",
        "PENDING",
        "COMPLETED",
        "FAILED"
      ),
      allowNull: false,
      defaultValue: "NONE",
    },

    failure_code: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    failure_reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    response_ms: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    stuck: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    is_synthetic: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    tableName: "transactions",
    timestamps: true,
    underscored: true,
  }
);

export default Transaction;
