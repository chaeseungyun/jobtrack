import { z } from "zod";

const careerTypeSchema = z.enum(["new", "experienced", "any"]);
const sourceSchema = z.enum(["saramin", "jobkorea", "company", "linkedin", "etc"]);
const stageSchema = z.enum([
  "interest",
  "applied",
  "document_pass",
  "assignment",
  "interview",
  "final_pass",
  "rejected",
]);
const eventTypeSchema = z.enum(["deadline", "result", "interview"]);

export const applicationsListQuerySchema = z.object({
  stage: stageSchema.optional(),
  search: z.string().trim().min(1).optional(),
});

export const createApplicationSchema = z.object({
  company_name: z.string().trim().min(1),
  position: z.string().trim().min(1),
  career_type: careerTypeSchema,
  job_url: z.string().url().optional().nullable(),
  source: sourceSchema.optional().nullable(),
  merit_tags: z.array(z.string()).max(10).optional(),
  current_stage: stageSchema.optional(),
  company_memo: z.string().optional().nullable(),
  cover_letter: z.string().optional().nullable(),
  deadline: z.string().datetime({ offset: true }).optional(),
});

export const updateApplicationSchema = createApplicationSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });

export const createEventSchema = z.object({
  event_type: eventTypeSchema,
  scheduled_at: z.string().datetime({ offset: true }),
  location: z.string().optional().nullable(),
  interview_round: z.number().int().positive().optional().nullable(),
});

export const updateEventSchema = z
  .object({
    event_type: eventTypeSchema.optional(),
    scheduled_at: z.string().datetime({ offset: true }).optional(),
    location: z.string().optional().nullable(),
    interview_round: z.number().int().positive().optional().nullable(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });
