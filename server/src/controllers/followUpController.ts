import type { NextFunction, Request, Response } from "express";
import { createFollowUpRepository } from "../repositories/supabaseFollowUpRepository.js";
import { FollowUpService } from "../services/followUpService.js";

function serviceFor(req: Request): FollowUpService { const token = req.header("authorization")?.slice(7); if (!token) throw new Error("Authentication token is missing"); return new FollowUpService(createFollowUpRepository(token)); }
function idFrom(req: Request): string { return req.params.id; }
export async function listFollowUps(req: Request, res: Response, next: NextFunction): Promise<void> { try { res.json(await serviceFor(req).list()); } catch (error) { next(error); } }
export async function createFollowUp(req: Request, res: Response, next: NextFunction): Promise<void> { try { res.status(201).json(await serviceFor(req).create(req.body)); } catch (error) { next(error); } }
export async function updateFollowUp(req: Request, res: Response, next: NextFunction): Promise<void> { try { res.json(await serviceFor(req).update(idFrom(req), req.body)); } catch (error) { next(error); } }
export async function completeFollowUp(req: Request, res: Response, next: NextFunction): Promise<void> { try { res.json(await serviceFor(req).complete(idFrom(req))); } catch (error) { next(error); } }
export async function deleteFollowUp(req: Request, res: Response, next: NextFunction): Promise<void> { try { await serviceFor(req).remove(idFrom(req)); res.status(204).send(); } catch (error) { next(error); } }