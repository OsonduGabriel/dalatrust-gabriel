
import redis from "../../config/redis.js";
import { processTransactionEvent } from "./state-engine.service.js";

// Redis Stream and consumer group names.
const STREAM_NAME = "txn.events";
const GROUP_NAME = "state-engine-group";
const CONSUMER_NAME = process.env.WORKER_NAME || "state-engine-1";

// Create the consumer group if it does not already exist.
const createConsumerGroup = async () => {
  try {
    await redis.xGroupCreate(
      STREAM_NAME,
      GROUP_NAME,
      "0",
      { MKSTREAM: true }
    );
  } catch (error) {
    // BUSYGROUP means another startup already created the group.
    if (!error.message.includes("BUSYGROUP")) {
      throw error;
    }
  }
};

// Start consuming transaction events.
export const startStateEngineWorker = async () => {
  await createConsumerGroup();

  console.log("State Engine Worker started.");

  while (true) {
    try {
      // Read new messages from the stream.
      const messages = await redis.xReadGroup(
        GROUP_NAME,
        CONSUMER_NAME,
        [{ key: STREAM_NAME, id: ">" }],
        { COUNT: 10, BLOCK: 5000 }
      );

      if (!messages) continue;

      for (const stream of messages) {
        for (const message of stream.messages) {
          const { id, message: fields } = message;

          try {
            // The producer must serialize the event as JSON in the "data" field.
            if (!fields.data) {
              console.error("Event is missing its data field:", id);
              // Leave it pending until a dead-letter policy is implemented.
              continue;
            }

            const event = JSON.parse(fields.data);
            const result = await processTransactionEvent(event);

            if (result.accepted || [
              "DUPLICATE",
              "STALE",
              "REJECTED",
              "UNSUPPORTED_EVENT",
              "INVALID_EVENT",
            ].includes(result.status)) {
              // Acknowledge events whose outcomes have been recorded
              // or deliberately classified by the processing policy.
              await redis.xAck(STREAM_NAME, GROUP_NAME, id);
            } else {
              // Keep GAP_PENDING and transient failures pending for retry.
              // A pending-event retry strategy must be added next.
              console.warn("Event requires retry:", id, result.status);
            }
          } catch (error) {
            // Do not acknowledge failed events.
            // They remain pending for recovery or retry.
            console.error("Failed to process event:", id, error.message);
          }
        }
      }
    } catch (error) {
      console.error("State Engine Worker error:", error.message);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
};
