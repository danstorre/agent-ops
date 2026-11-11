import { describe, it, expect } from "vitest";
import { bookAppointment, type Booking } from "../src/tools/booking.js";

const today = "2026-11-10"; // a Tuesday
const base = { service: "gait_analysis" as const, customer_name: "Ana" };

describe("bookAppointment", () => {
  it("books a free slot inside store hours and returns a confirmation id", () => {
    const bookings: Booking[] = [];
    const booking = bookAppointment({ ...base, date: "2026-11-14", time: "10:00" }, bookings, today); // Saturday
    expect(booking.confirmation_id).toBe("APT-0001");
    expect(bookings).toHaveLength(1);
  });

  it("rejects Sundays", () => {
    expect(() => bookAppointment({ ...base, date: "2026-11-15", time: "11:00" }, [], today)).toThrow(/closed on Sundays/);
  });

  it("rejects a slot that starts less than 30 minutes before closing", () => {
    expect(() => bookAppointment({ ...base, date: "2026-11-14", time: "17:45" }, [], today)).toThrow(/outside appointment hours/);
  });

  it("rejects dates in the past", () => {
    expect(() => bookAppointment({ ...base, date: "2026-11-09", time: "11:00" }, [], today)).toThrow(/in the past/);
  });

  it("rejects a slot that is already booked", () => {
    const bookings: Booking[] = [];
    bookAppointment({ ...base, date: "2026-11-12", time: "15:00" }, bookings, today);
    expect(() => bookAppointment({ ...base, date: "2026-11-12", time: "15:00" }, bookings, today)).toThrow(/already booked/);
  });
});
