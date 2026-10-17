
import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

// Records the outcome of transaction event-processing attempts.
// This is separate from transaction_events because rejected events
// may not represent valid transaction state changes.
const StateEngineAudit = sequelize.define(
  "StateEngineAudit",
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },

    // Transaction reference associated with the event, if available.
    txn_reference: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    // System or service that produced the event.
    source: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    // Unique identifier assigned to the event by its source.
    source_event_id: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    // Type of event received.
    event_type: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    // State the event attempted to move the transaction into.
    requested_state: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    // Outcome, such as REJECTED, STALE, or INVALID_EVENT.
    status: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    // Explanation for the processing outcome.
    reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    // Original event payload for auditing and troubleshooting.
    payload: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },

    // Time when the processing outcome was recorded.
    processed_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "state_engine_audits",
    timestamps: false,

    indexes: [
      {
        fields: ["txn_reference", "processed_at"],
      },
      {
        fields: ["source", "source_event_id"],
      },
    ],
  }
);

export default StateEngineAudit;
