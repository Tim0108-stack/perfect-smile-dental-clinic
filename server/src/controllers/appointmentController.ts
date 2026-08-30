import type { NextFunction, Request, Response } from "express";
import { createAppointmentRepository } from "../repositories/supabaseAppointmentRepository.js";
import { AppointmentService } from "../services/appointmentService.js";

function serviceFor(req: Request): AppointmentService {
  const token = req.header("authorization")?.slice(7);
  if (!token) throw new Error("Authentication token is missing");
  return new AppointmentService(createAppointmentRepository(token));
}

function idFrom(req: Request): string {
  return req.params.id;
}

export async function listAppointments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await serviceFor(req).list()); } catch (error) { next(error); }
}

export async function getAppointment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await serviceFor(req).get(idFrom(req))); } catch (error) { next(error); }
}

export async function createAppointment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.status(201).json(await serviceFor(req).create(req.body)); } catch (error) { next(error); }
}

export async function updateAppointment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await serviceFor(req).update(idFrom(req), req.body)); } catch (error) { next(error); }
}

export async function deleteAppointment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { await serviceFor(req).remove(idFrom(req)); res.status(204).send(); } catch (error) { next(error); }
}

export async function updateAppointmentStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await serviceFor(req).updateStatus(idFrom(req), req.body.status)); } catch (error) { next(error); }
}

export async function listTomorrowReminders(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await serviceFor(req).tomorrowReminders()); } catch (error) { next(error); }
}

export async function markAppointmentReminder(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await serviceFor(req).markReminder(idFrom(req))); } catch (error) { next(error); }
}