import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import {
  createAppointment,
  deleteAppointment,
  getAppointment,
  listAppointments,
  updateAppointment,
  updateAppointmentStatus,
  listTomorrowReminders,
  markAppointmentReminder,
} from "../controllers/appointmentController.js";

export const appointmentsRouter = Router();
appointmentsRouter.use(requireAuth);
appointmentsRouter.get("/", listAppointments);
appointmentsRouter.get("/reminders/tomorrow", listTomorrowReminders);
appointmentsRouter.get("/:id", getAppointment);
appointmentsRouter.post("/", createAppointment);
appointmentsRouter.patch("/:id", updateAppointment);
appointmentsRouter.delete("/:id", deleteAppointment);
appointmentsRouter.patch("/:id/status", updateAppointmentStatus);
appointmentsRouter.patch("/:id/reminder", markAppointmentReminder);