import { runCommand } from "./dev-slots-lib.mjs";
import { composeDown } from "./dev-slots-compose.mjs";

export async function deleteSlotData({
  id,
  confirmation,
  records,
  run = runCommand,
}) {
  const record = records.find((candidate) => candidate.id === id);
  if (!record) throw new Error("Slot owner no longer exists. Refresh and try again.");
  if (!record.deleteDataAllowed) {
    throw new Error("Stop the slot and resolve conflicts or unmanaged listeners first.");
  }
  const expected = `DELETE SLOT ${record.slot}`;
  if (confirmation !== expected) throw new Error(`Type ${expected} to delete this slot's data.`);
  return composeDown({ record, run, deleteVolumes: true });
}
