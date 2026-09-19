// schemaVersion migration entry point (Character Master §13 Versioning).
// schemaVersion = structural migration; contentVersionAtCreation = balance/content tracking only.
import { SAVE_SCHEMA_VERSION, type SaveData } from './schema';

export function migrateSave(input: SaveData): SaveData {
  if (input.schemaVersion === SAVE_SCHEMA_VERSION) return input;
  // TODO(PHASE2+): add stepwise migrations when schemaVersion increments.
  throw new Error(`Unsupported save schemaVersion: ${String((input as { schemaVersion: unknown }).schemaVersion)}`);
}
