import { lookupCatalogTool } from "../tools/catalog.js";
import { bookAppointmentTool } from "../tools/booking.js";
import { handoffTool } from "../tools/handoff.js";
import { searchPoliciesTool } from "../tools/policies.js";
import type { PolicyStore } from "../rag/store.js";
import type { ToolHandler } from "../tools/types.js";

// Tools in a fixed order: the tool list is part of the cached prefix, so its order must not change.
export function storeTools(policies: PolicyStore): ToolHandler[] {
  return [lookupCatalogTool(), searchPoliciesTool(policies), bookAppointmentTool(), handoffTool()];
}
