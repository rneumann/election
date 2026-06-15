import z from 'zod';

export const candidateInfoSchema = z
  .object({
    candidate_uid: z
      .string('Candidate UID must be a string')
      .min(1, 'Candidate UID must be at least 1 character long')
      .max(30, 'Candidate UID must be at most 30 characters long'),
    info: z.string().max(200, 'Info must be at most 200 characters long').optional(),
    picture_content_type: z.string().optional(),
    picture_data: z.instanceof(Buffer).optional(),
  })
  .refine(
    (data) =>
      (data.picture_content_type && data.picture_data) ||
      (!data.picture_content_type && !data.picture_data),
    {
      message: 'Both picture_content_type and picture_data must be provided together or not at all',
    },
  );
