import z from 'zod';

export const candidateInfoSchema = z
  .object({
    candidate_id: z.uuid({ message: 'Candidate ID must be a valid UUID' }),
    info: z.string().max(200, 'Info must be at most 200 characters long').optional(),
    picture_content_type: z.string().optional(),
    picture_data: z.string().optional(),
  })
  .refine(
    ((data) =>
      (data.picture_content_type && data.picture_data) ||
      (!data.picture_content_type && !data.picture_data),
    {
      message: 'Both picture_content_type and picture_data must be provided together or not at all',
    }),
  );
