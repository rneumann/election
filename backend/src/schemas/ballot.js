import z from 'zod';

export const ballotCandidateInputSchema = z.object({
  listnum: z.number().int().min(1, 'The list number must be greater than 0'),
  votes: z.number().int().min(0, 'The number of votes must be greater than or equal to 0'),
});

export const freeSlotInputSchema = z.object({
  voterUid: z.string().trim().min(1, 'voterUid darf nicht leer sein'),
  votes: z.number().int().min(1, 'The number of votes must be greater than 0'),
});

export const ballotInputSchema = z
  .object({
    electionId: z.uuid({ message: 'The election ID must be a valid UUID' }),
    valid: z.boolean({ message: 'The valid field must be a boolean' }),
    voteDecision: z.array(ballotCandidateInputSchema).optional(),
    freeSlots: z.array(freeSlotInputSchema).optional(),
  })
  .superRefine((data, ctx) => {
    const hasVotes =
      (data.voteDecision && data.voteDecision.length > 0) ||
      (data.freeSlots && data.freeSlots.length > 0);
    if (data.valid === true && !hasVotes) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'voteDecision or freeSlots is required when valid = true',
        path: ['voteDecision'],
      });
    }
  });
