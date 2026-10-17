
import sequelize from "../../config/database.js";
import { Transaction, TransactionEvent } from "../../models/index.js";

// Find a transaction and lock its row while processing an event.
// This prevents concurrent workers from changing the same transaction
// at the same time.
export const findTransactionForUpdate = async ( dbTransaction, reference) => {
  return await Transaction.findOne({
    where: { reference },
    transaction: dbTransaction,
    lock: dbTransaction.LOCK.UPDATE,
  });
};

// Check whether this source event has already been recorded.
export const eventExists = async (  dbTransaction,  source,  sourceEventId) => {
  const existingEvent = await TransactionEvent.findOne({
    where: {
      source,
      source_event_id: sourceEventId,
    },
    transaction: dbTransaction,
  });

  return Boolean(existingEvent);
};

// Save an incoming event in the transaction history.
// Existing events must never be edited or deleted.
export const insertTransactionEvent = async (
  dbTransaction,
  transactionRecord,
  event,
  options = {}
) => {
  return await TransactionEvent.create(
    {
      txn_id: transactionRecord.id,
      seq: event.seq,
      source: event.source,
      source_event_id: event.source_event_id,
      event_type: event.event_type,
      from_state:
        event.from_state ?? transactionRecord.current_state,
      to_state: event.to_state ?? null,
      occurred_at: event.occurred_at,
      failure_code: event.failure_code ?? null,
      response_ms: event.response_ms ?? null,
      late: options.late ?? false,
      gap: options.gap ?? false,
      payload: event,
    },
    {
      transaction: dbTransaction,
    }
  );
};

// Update the transaction's current state and related fields.
// Call this only after the transition has been validated.
export const updateTransactionState = async (
  dbTransaction,
  transactionRecord,
  event
) => {
  return await transactionRecord.update(
    {
      previous_state: transactionRecord.current_state,
      current_state: event.to_state,
      state_entered_at: new Date(),
      last_seq: event.seq,

      // Preserve the existing value when the event omits the field.
      debited: event.debited ?? transactionRecord.debited,
      failure_code:
        event.failure_code ?? transactionRecord.failure_code,
      response_ms:
        event.response_ms ?? transactionRecord.response_ms,
    },
    {
      transaction: dbTransaction,
    }
  );
};

// Execute related database operations as one atomic transaction.
// If an operation fails, Sequelize rolls back the changes.
export const withDatabaseTransaction = async (callback) => {
  return await sequelize.transaction(async (dbTransaction) => {
    return await callback(dbTransaction);
  });
};
