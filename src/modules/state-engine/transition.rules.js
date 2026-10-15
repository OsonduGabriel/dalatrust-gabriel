
import { TRANSACTION_STATES } from "./state.constants.js";

/**
 * Defines all valid transaction state transitions and
 * validates transitions before the state engine applies them.
 *
 * Important:
 * - RESOLVED is the terminal state.
 * - Only the state engine should change a transaction's state.
 * - A failed transaction with debited funds cannot be resolved
 *   until the reversal is completed.
 */

// Define the permitted transitions from each transaction state.
// These 27 transitions follow the DalaTrust Backend PRD.
export const ALLOWED_TRANSITIONS = {
  INITIATED: ["AUTHENTICATED", "FAILED"],

  AUTHENTICATED: ["DEBITED", "FAILED"],

  DEBITED: ["PROCESSING", "FAILED", "REVERSED"],

  PROCESSING: ["SUCCESS", "FAILED", "TIMEOUT"],

  SUCCESS: ["CONFIRMED", "INVESTIGATE", "DISPUTED"],

  FAILED: ["REVERSED", "INVESTIGATE", "RESOLVED"],

  TIMEOUT: ["SUCCESS", "FAILED", "INVESTIGATE"],

  CONFIRMED: ["DISPUTED", "RESOLVED"],

  REVERSED: ["RESOLVED"],

  INVESTIGATE: ["CONFIRMED", "REVERSED", "RESOLVED"],

  DISPUTED: ["INVESTIGATE", "RESOLVED"],

  // RESOLVED is terminal. No further transitions are allowed.
  RESOLVED: [],
};

/**
 * Check whether a state exists in our state constants.
 *
 * @param {string} state - Transaction state to validate.
 * @returns {boolean}
 */
export const isValidState = (state) => {
  return Object.values(TRANSACTION_STATES).includes(state);
};

/**
 * Check whether a transition is allowed by the state machine.
 *
 * This checks the transition table only.
 * Business rules and funds safety are checked separately.
 *
 * @param {string} fromState - Current transaction state.
 * @param {string} toState - Requested next state.
 * @returns {boolean}
 */
export const isAllowedTransition = (fromState, toState) => {
  // Reject unknown states before checking the transition.
  if (!isValidState(fromState) || !isValidState(toState)) {
    return false;
  }

  // Check whether the requested destination is permitted.
  return ALLOWED_TRANSITIONS[fromState].includes(toState);
};

/**
 * Check the funds-safety rule before applying a transition.
 *
 * A FAILED transaction whose funds were debited and have not
 * been reversed cannot move directly to RESOLVED.
 *
 * It must first move to REVERSED or INVESTIGATE.
 *
 * @param {object} transaction - Transaction details.
 * @param {string} toState - Requested destination state.
 * @returns {boolean} True when the transition violates the rule.
 */
export const violatesFundsGuard = (transaction, toState) => {
  // The rule applies only to failed transactions being resolved.
  if (transaction.current_state !== "FAILED" || toState !== "RESOLVED") {
    return false;
  }

  // Do not resolve a failed transaction if funds were debited
  // and the reversal has not been completed.
  const fundsWereDebited = transaction.debited === true;
  const reversalCompleted = transaction.reversal_completed === true;

  return fundsWereDebited && !reversalCompleted;
};

/**
 * Validate a requested state transition.
 *
 * Returns a structured result so the state engine service
 * can decide whether to proceed or reject the event.
 *
 * @param {object} transaction - Existing transaction record.
 * @param {string} toState - Requested destination state.
 * @returns {{valid: boolean, reason: string|null}}
 */
export const validateTransition = (transaction, toState) => {
  const fromState = transaction.current_state;

  // First, verify that both states exist and the transition is allowed.
  if (!isAllowedTransition(fromState, toState)) {
    return {
      valid: false,
      reason: `Transition from ${fromState} to ${toState} is not allowed.`,
    };
  }

  // Next, enforce the customer-funds safety rule.
  if (violatesFundsGuard(transaction, toState)) {
    return {
      valid: false,
      reason:
        "Cannot resolve a failed transaction with unreversed debited funds.",
    };
  }

  // All checks passed. The service can continue processing.
  return {
    valid: true,
    reason: null,
  };
};
