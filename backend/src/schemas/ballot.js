import z from 'zod';

export const ballotCandidateInputSchema = z.object({
  listnum: z.number().int().min(1, 'The list number must be greater than 0'),
  votes: z.number().int().min(0, 'The number of votes must be greater than or equal to 0'),
});

export const ballotInputSchema = z
  .object({
    electionId: z.string().uuid({ message: 'The election ID must be a valid UUID' }),
    valid: z.boolean({ message: 'The valid field must be a boolean' }),
    voteDecision: z.array(ballotCandidateInputSchema).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.valid === true && (!data.voteDecision || data.voteDecision.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'voteDecision is required when valid = true and must contain at least one entry',
        path: ['voteDecision'],
      });
    }
  });
