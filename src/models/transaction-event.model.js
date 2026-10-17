
import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

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

// Define the transaction_events table.
const TransactionEvent = sequelize.define(
  "TransactionEvent",
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },

    txn_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "transactions",
        key: "id",
      },
      onDelete: "RESTRICT",
    },

    seq: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    source: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    source_event_id: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    event_type: {
      type: DataTypes.ENUM(
        "STATE_CHANGE",
        "STUCK_FLAG",
        "LATE_CONFIRMATION"
      ),
      allowNull: false,
    },

    from_state: {
      type: DataTypes.ENUM(...TRANSACTION_STATES),
      allowNull: true,
    },

    to_state: {
      type: DataTypes.ENUM(...TRANSACTION_STATES),
      allowNull: true,
    },

    occurred_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },

    received_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },

    failure_code: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    response_ms: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    late: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    gap: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    // Keep the original event payload for auditing and troubleshooting.
    payload: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
  },
  {
    tableName: "transaction_events",
    timestamps: false,

    // Prevent the same source event or transaction sequence from being inserted more than once.
    indexes: [
      {
        unique: true,
        fields: ["source", "source_event_id"],
      },
      {
        unique: true,
        fields: ["txn_id", "seq"],
      },
    ],
  }
);

export default TransactionEvent;
