
import { Op } from "sequelize";
import { Transaction } from "../../models/index.js";

// How often the scanner runs, in milliseconds.
const SCAN_INTERVAL_MS = 60_000;

// Example thresholds
const STUCK_THRESHOLDS_MS = {
  INITIATED: 5 * 60_000,
  AUTHENTICATED: 5 * 60_000,
  DEBITED: 5 * 60_000,
  PROCESSING: 5 * 60_000,
  TIMEOUT: 10 * 60_000,
};

// Find transactions that have remained in a state too long.
export const scanForStuckTransactions = async () => {
  const now = Date.now();
  const flaggedTransactions = [];

  for (const [state, thresholdMs] of Object.entries(
    STUCK_THRESHOLDS_MS
  )) {
    const cutoff = new Date(now - thresholdMs);

    const transactions = await Transaction.findAll({
      where: {
        current_state: state,
        state_entered_at: {
          [Op.lte]: cutoff,
        },
        stuck: false,
      },
      attributes: ["id", "reference", "current_state", "state_entered_at"],
    });

    for (const transaction of transactions) {
      // Mark the transaction for investigation.
      // A later improvement should emit a STUCK_FLAG event through
      // the event stream instead of letting the scanner change state.
      await transaction.update({ stuck: true });

      flaggedTransactions.push({
        reference: transaction.reference,
        state: transaction.current_state,
        stateEnteredAt: transaction.state_entered_at,
      });
    }
  }

  if (flaggedTransactions.length > 0) {
    console.log(
      `Scanner flagged ${flaggedTransactions.length} stuck transactions.`
    );
  }

  return flaggedTransactions;
};

// Run the scanner repeatedly.
export const startStateEngineScanner = () => {
  const runScan = async () => {
    try {
      await scanForStuckTransactions();
    } catch (error) {
      console.error("State Engine Scanner error:", error.message);
    }
  };

  // Run once at startup, then on the configured interval.
  void runScan();
  return setInterval(runScan, SCAN_INTERVAL_MS);
};
