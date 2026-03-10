export type {
  IApplicationRepository,
  CreateApplicationInput,
  UpdateApplicationInput,
} from "./application.repository";

export type {
  IEventRepository,
  CreateEventInput,
  UpdateEventInput,
  NotificationTarget,
  UpcomingEvent,
} from "./event.repository";

export type {
  IDocumentRepository,
  CreateDocumentInput,
} from "./document.repository";

export type { IUserRepository } from "./user.repository";


export type {
  IJobCacheRepository,
  JobParsingCacheRow,
} from "./job-cache.repository";

export type { IAnalyticsRepository } from "./analytics.repository";
