import { notFound } from "@/lib/domain/errors";
import type {
  IApplicationRepository,
  IEventRepository,
  CreateEventInput,
  UpdateEventInput,
} from "@/lib/domain/repositories";
import type { EventRow } from "@/lib/supabase/types";

export class EventService {
  constructor(
    private readonly eventRepo: IEventRepository,
    private readonly applicationRepo: IApplicationRepository,
  ) {}

  async create(
    userId: string,
    applicationId: string,
    input: Omit<CreateEventInput, "application_id">,
  ): Promise<EventRow> {
    const exists = await this.applicationRepo.existsForUser(
      applicationId,
      userId,
    );
    if (!exists) throw notFound("Application not found");

    return this.eventRepo.create({ application_id: applicationId, ...input });
  }

  async update(
    userId: string,
    eventId: string,
    input: UpdateEventInput,
  ): Promise<EventRow> {
    const event = await this.eventRepo.findById(eventId);
    if (!event) throw notFound("Event not found");

    const exists = await this.applicationRepo.existsForUser(
      event.application_id,
      userId,
    );
    if (!exists) throw notFound("Event not found");

    return this.eventRepo.update(eventId, input);
  }

  async remove(userId: string, eventId: string): Promise<void> {
    const event = await this.eventRepo.findById(eventId);
    if (!event) throw notFound("Event not found");

    const exists = await this.applicationRepo.existsForUser(
      event.application_id,
      userId,
    );
    if (!exists) throw notFound("Event not found");

    await this.eventRepo.remove(eventId);
  }
}
