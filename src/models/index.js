
import Transaction from "./transaction.model.js";
import TransactionEvent from "./transaction-event.model.js";
import StateEngineAudit from "./state-engine-audit.model.js";

// One transaction can have many events in its history.
Transaction.hasMany(TransactionEvent, {
  foreignKey: "txn_id",
  as: "events",
});

// Each event belongs to one transaction.
TransactionEvent.belongsTo(Transaction, {
  foreignKey: "txn_id",
  as: "transaction",
});

export { Transaction, TransactionEvent, StateEngineAudit };
