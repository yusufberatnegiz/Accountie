import { z } from "zod";

export const loginCredentialsSchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(128),
});

export const registrationCredentialsSchema = loginCredentialsSchema.extend({
  name: z.string().trim().min(2).max(100),
  passwordAgain: z.string().min(8).max(128),
}).refine((data) => data.password === data.passwordAgain, { path: ["passwordAgain"] });
