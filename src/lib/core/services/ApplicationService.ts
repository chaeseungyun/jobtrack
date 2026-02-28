import { notFound } from "@/lib/core/errors";
import type {
  IApplicationRepository,
  CreateApplicationInput,
  UpdateApplicationInput,
} from "@/lib/core/repositories/interfaces";
import type {
  IEventRepository,
  UpcomingEvent,
} from "@/lib/core/repositories/interfaces";
import type { ApplicationRow, EventRow, StageType } from "@/lib/supabase/types";

export class ApplicationService {
  constructor(
    private readonly applicationRepo: IApplicationRepository,
    private readonly eventRepo: IEventRepository,
  ) {}

  async list(
    userId: string,
    params?: { stage?: StageType; search?: string },
  ): Promise<ApplicationRow[]> {
    return this.applicationRepo.findMany(userId, params);
  }

  async getById(id: string, userId: string): Promise<ApplicationRow> {
    const application = await this.applicationRepo.findById(id, userId);
    if (!application) throw notFound("Application not found");
    return application;
  }

  async getDetail(
    id: string,
    userId: string,
  ): Promise<ApplicationRow & { events: EventRow[] }> {
    const application = await this.applicationRepo.findById(id, userId);
    if (!application) throw notFound("Application not found");

    const events = await this.eventRepo.findByApplicationId(id);

    return { ...application, events };
  }

  async create(
    userId: string,
    input: CreateApplicationInput,
    deadline?: string,
  ): Promise<ApplicationRow> {
    const application = await this.applicationRepo.create(userId, input);

    if (deadline) {
      await this.eventRepo.create({
        application_id: application.id,
        event_type: "deadline",
        scheduled_at: deadline,
      });
    }

    return application;
  }

  async update(
    id: string,
    userId: string,
    input: UpdateApplicationInput & { deadline?: string | null },
  ): Promise<ApplicationRow> {
    const exists = await this.applicationRepo.existsForUser(id, userId);
    if (!exists) throw notFound("Application not found");

    const { deadline, ...applicationUpdate } = input;

    const updated = await this.applicationRepo.update(
      id,
      userId,
      applicationUpdate,
    );

    if (deadline !== undefined) {
      const events = await this.eventRepo.findByApplicationId(id);
      const existingDeadline = events.find((e) => e.event_type === "deadline");

      if (deadline && existingDeadline) {
        await this.eventRepo.update(existingDeadline.id, {
          scheduled_at: deadline,
        });
      } else if (deadline && !existingDeadline) {
        await this.eventRepo.create({
          application_id: id,
          event_type: "deadline",
          scheduled_at: deadline,
        });
      } else if (!deadline && existingDeadline) {
        await this.eventRepo.remove(existingDeadline.id);
      }
    }

    return updated;
  }

  async remove(id: string, userId: string): Promise<void> {
    const exists = await this.applicationRepo.existsForUser(id, userId);
    if (!exists) throw notFound("Application not found");
    await this.applicationRepo.remove(id, userId);
  }

  async listUpcomingEvents(
    applicationIds: string[],
  ): Promise<UpcomingEvent[]> {
    return this.eventRepo.findUpcoming(applicationIds);
  }
}
