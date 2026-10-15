
/*
 * Purpose:
 * Defines all valid transaction states used by DalaTrust.
 *
 * These constants help us avoid spelling mistakes when checking
 * or updating a transaction's current state.
 */

// Define the valid states a transaction can pass through.
export const TRANSACTION_STATES = Object.freeze({
  INITIATED: "INITIATED",
  AUTHENTICATED: "AUTHENTICATED",
  DEBITED: "DEBITED",
  PROCESSING: "PROCESSING",
  SUCCESS: "SUCCESS",
  FAILED: "FAILED",
  TIMEOUT: "TIMEOUT",
  CONFIRMED: "CONFIRMED",
  REVERSED: "REVERSED",
  INVESTIGATE: "INVESTIGATE",
  DISPUTED: "DISPUTED",
  RESOLVED: "RESOLVED",
});

/*
 * Export the state names as an array.
 *
 * This is useful when validating incoming requests to check
 * whether a supplied state name is valid.
 */
export const VALID_TRANSACTION_STATES = Object.freeze(
  Object.values(TRANSACTION_STATES)
);
