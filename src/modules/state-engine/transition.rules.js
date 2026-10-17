
/**
 * Defines all valid transaction state transitions and
 * validates transitions before the state engine applies them.
 *
 * Important:
 * A failed transaction with debited funds cannot be resolved
 *   until the reversal is completed.
 */


import { TRANSACTION_STATES } from "./state.constants.js";

// Defines which state transitions are allowed by DalaTrust.
export const ALLOWED_TRANSITIONS = {
  INITIATED: ["AUTHENTICATED", "FAILED"],
  AUTHENTICATED: ["DEBITED", "FAILED"],
  DEBITED: ["PROCESSING", "FAILED", "REVERSED"],
  PROCESSING: ["SUCCESS", "FAILED", "TIMEOUT"],
  SUCCESS: ["CONFIRMED", "INVESTIGATE", "DISPUTED"],
  FAILED: ["REVERSED", "INVESTIGATE"],
  TIMEOUT: ["SUCCESS", "FAILED", "INVESTIGATE"],
  CONFIRMED: ["DISPUTED", "RESOLVED"],
  REVERSED: ["RESOLVED"],
  INVESTIGATE: ["CONFIRMED", "REVERSED", "RESOLVED"],
  DISPUTED: ["INVESTIGATE", "RESOLVED"],
  RESOLVED: [],
};

// Check whether a state belongs to our list of valid states.
export const isValidState = (state) => {
  return Object.values(TRANSACTION_STATES).includes(state);
};

// Check whether moving from one state to another is permitted.
export const isAllowedTransition = (fromState, toState) => {
  if (!isValidState(fromState) || !isValidState(toState)) {
    return false;
  }

  return ALLOWED_TRANSITIONS[fromState].includes(toState);
};

// Protect funds that were debited but have not been reversed.
export const violatesFundsGuard = (transaction, toState) => {
  // This rule specifically applies when resolving a failed transaction.
  if (transaction.current_state !== "FAILED" || toState !== "RESOLVED") {
    return false;
  }

  const fundsWereDebited = transaction.debited === true;
  const reversalCompleted = transaction.reversal_status === "COMPLETED";

  // Do not resolve the failed transaction until its reversal is completed.
  return fundsWereDebited && !reversalCompleted;
};

// Validate both the state transition and the funds safety rule.
export const validateTransition = (transaction, toState) => {
  const fromState = transaction.current_state;

  if (!isAllowedTransition(fromState, toState)) {
    return {
      valid: false,
      reason: `Transition from ${fromState} to ${toState} is not allowed.`,
    };
  }

  if (violatesFundsGuard(transaction, toState)) {
    return {
      valid: false,
      reason:
        "Cannot resolve a failed transaction with debited funds before reversal is completed.",
    };
  }

  return {
    valid: true,
    reason: null,
  };
};
