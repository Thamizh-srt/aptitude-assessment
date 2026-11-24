import { z } from "zod";

export const candidateRegistrationSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Enter your full name (at least 2 characters).")
    .max(50, "Your name must be 50 characters or fewer.")
    .regex(/^[\p{L} ]+$/u, "Use letters and spaces only."),
  email: z
    .string()
    .trim()
    .email("Enter a valid email address.")
    .max(254, "Email address is too long.")
    .transform((value) => value.toLowerCase()),
  age: z
    .number({ message: "Enter your age." })
    .int("Age must be a whole number.")
    .min(18, "You must be at least 18 years old.")
    .max(60, "Age must be 60 or below."),
  phone: z
    .string()
    .regex(/^[0-9]{10}$/, "Enter a 10-digit phone number."),
  gender: z.enum(["Male", "Female", "Non-binary", "Prefer not to say"]).optional().or(z.literal("")),
  qualification: z
    .string()
    .trim()
    .min(1, "Select your highest qualification.")
    .max(100, "Qualification is too long."),
  city: z.string().trim().max(100, "City must be 100 characters or fewer.").optional(),
});

export type CandidateRegistrationInput = z.infer<typeof candidateRegistrationSchema>;
