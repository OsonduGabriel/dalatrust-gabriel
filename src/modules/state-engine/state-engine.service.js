
import {
  findTransactionForUpdate,
  eventExists,
  insertTransactionEvent,
  updateTransactionState,
  withDatabaseTransaction,
} from "./state-engine.repository.js";

import { validateTransition } from "./transition.rules.js";
import { UniqueConstraintError } from "sequelize";

/**
 * Process a transaction state-change event.
 *
 * Responsibilities:
 * - Validate required event fields.
 * - Prevent duplicate event processing.
 * - Lock the transaction before processing.
 * - Check event sequence and current state.
 * - Enforce transition and funds-safety rules.
 * - Save the event and update the transaction atomically.
 */
export const processTransactionEvent = async (event) => {
  //Validate that an event object was supplied.
  if (!event || typeof event !== "object") {
    return {
      accepted: false,
      status: "INVALID_EVENT",
      reason: "A valid event object is required.",
    };
  }

  // Check the fields required to identify and process the event.
  if (!event.source || !event.source_event_id || !event.txn_reference || !event.event_type || !Number.isInteger(event.seq) || event.seq < 1 || !event.occurred_at ) {
    return {
      accepted: false,
      status: "INVALID_EVENT",
      reason: "Required event fields are missing or invalid.",
    };
  }

  // Make sure the event timestamp can be interpreted as a date.
  if (Number.isNaN(Date.parse(event.occurred_at))) {
    return {
      accepted: false,
      status: "INVALID_EVENT",
      reason: "The occurred_at timestamp is invalid.",
    };
  }

  // This first version handles state changes only.
  // STUCK_FLAG and LATE_CONFIRMATION need separate handling.
  if (event.event_type !== "STATE_CHANGE") {
    return {
      accepted: false,
      status: "UNSUPPORTED_EVENT",
      reason: "This event type is not handled yet.",
    };
  }

  try {
    //Group database operations into one atomic transaction.
    return await withDatabaseTransaction(async (dbTransaction) => {
      // Check whether the event was already processed.
      const duplicate = await eventExists(
        dbTransaction,
        event.source,
        event.source_event_id
      );

      if (duplicate) {
        return {
          accepted: false,
          status: "DUPLICATE",
          reason: "This event has already been processed.",
        };
      }

      // Lock the transaction row to prevent concurrent state changes.
      const transaction = await findTransactionForUpdate(
        dbTransaction,
        event.txn_reference
      );

      if (!transaction) {
        return {
          accepted: false,
          status: "TRANSACTION_NOT_FOUND",
          reason: "The transaction does not exist.",
        };
      }

      // Reject events that have already been superseded.
      if (event.seq <= transaction.last_seq) {
        return {
          accepted: false,
          status: "STALE",
          reason: "The event sequence has already been processed.",
        };
      }

      // Do not process an event while earlier sequence numbers are missing.
      // The event consumer must hold and retry this event according to
      // the PRD's sequence-gap policy.
      if (event.seq > transaction.last_seq + 1) {
        return {
          accepted: false,
          status: "GAP_PENDING",
          reason: "An earlier transaction event is missing.",
        };
      }

      // If supplied, from_state must match the actual current state.
      if (
        event.from_state &&
        event.from_state !== transaction.current_state
      ) {
        return {
          accepted: false,
          status: "STALE",
          reason: "The event's from_state does not match the current state.",
        };
      }

      // Validate the requested transition and the funds-safety rule.
      const validation = validateTransition(
        transaction,
        event.to_state
      );

      if (!validation.valid) {
        return {
          accepted: false,
          status: "REJECTED",
          reason: validation.reason,
        };
      }

      // A SUCCESS event received after TIMEOUT is a late confirmation.
      const isLate =
        transaction.current_state === "TIMEOUT" &&
        event.to_state === "SUCCESS";

      // Save the event history first, inside the same database transaction.
      await insertTransactionEvent(
        dbTransaction,
        transaction,
        event,
        { late: isLate }
      );

      // Update the current state only after validation succeeds.
      await updateTransactionState(
        dbTransaction,
        transaction,
        event
      );

      return {
        accepted: true,
        status: "PROCESSED",
        transactionReference: transaction.reference,
        previousState: transaction.current_state,
        currentState: event.to_state,
        sequence: event.seq,
        late: isLate,
      };
    });
  } catch (error) {
    if (error instanceof UniqueConstraintError) {
      return {
        accepted: false,
        status: "DUPLICATE",
        reason: "The event conflicts with an existing event record.",
      };
    }

    throw error;
  }
};
