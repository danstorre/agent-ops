import { z } from "zod";
import { parseInput, toInputSchema, ToolInputError, type ToolHandler } from "./types.js";

export const bookAppointmentInput = z.object({
  service: z.enum(["gait_analysis", "shoe_fitting"]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "use YYYY-MM-DD"),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "use HH:MM, 24h"),
  customer_name: z.string().trim().min(1).max(80),
});
export type BookAppointmentInput = z.infer<typeof bookAppointmentInput>;

const SERVICES = {
  gait_analysis: { minutes: 30, price_usd: 40 },
  shoe_fitting: { minutes: 20, price_usd: 0 },
} as const;

// Store hours from data/policies/store-and-appointments.md. Index = day of week, 0 = Sunday.
const HOURS: Array<{ open: number; close: number } | null> = [
  null,
  { open: 10 * 60, close: 20 * 60 },
  { open: 10 * 60, close: 20 * 60 },
  { open: 10 * 60, close: 20 * 60 },
  { open: 10 * 60, close: 20 * 60 },
  { open: 10 * 60, close: 20 * 60 },
  { open: 10 * 60, close: 18 * 60 },
];
const LAST_SLOT_BEFORE_CLOSE = 30;

export interface Booking extends BookAppointmentInput {
  confirmation_id: string;
}

// Checks the slot against store rules and existing bookings. Throws ToolInputError with a
// reason Claude can relay to the customer ("we're closed on Sundays").
export function bookAppointment(input: BookAppointmentInput, bookings: Booking[], today: string): Booking {
  if (input.date < today) throw new ToolInputError(`${input.date} is in the past`);
  const day = new Date(`${input.date}T00:00:00Z`).getUTCDay();
  const hours = HOURS[day];
  if (!hours) throw new ToolInputError("the store is closed on Sundays");
  const [h, m] = input.time.split(":").map(Number) as [number, number];
  const start = h * 60 + m;
  if (start < hours.open || start > hours.close - LAST_SLOT_BEFORE_CLOSE) {
    throw new ToolInputError(`outside appointment hours for that day (last slot starts 30 minutes before closing)`);
  }
  const taken = bookings.some((b) => b.date === input.date && b.time === input.time && b.service === input.service);
  if (taken) throw new ToolInputError(`that slot is already booked`);
  const booking = { ...input, confirmation_id: `APT-${String(bookings.length + 1).padStart(4, "0")}` };
  bookings.push(booking);
  return booking;
}

export function bookAppointmentTool(bookings: Booking[] = [], today = () => new Date().toISOString().slice(0, 10)): ToolHandler {
  return {
    definition: {
      name: "book_appointment",
      description:
        "Book a gait analysis (30 min, USD 40) or a shoe fitting (20 min, free) at the store, Monday to Saturday during store hours. Needs the customer's name, the date (YYYY-MM-DD) and the start time (HH:MM, 24h). Returns a confirmation id, or the reason the slot is not available.",
      input_schema: toInputSchema(bookAppointmentInput),
    },
    run: async (input) => {
      const booking = bookAppointment(parseInput(bookAppointmentInput, input), bookings, today());
      const { minutes, price_usd } = SERVICES[booking.service];
      return JSON.stringify({ ...booking, duration_min: minutes, price_usd });
    },
  };
}
