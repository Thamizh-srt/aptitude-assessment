import mongoose from "mongoose";
import { AssessmentSettings } from "../../models/AssessmentSettings.js";
import { AppError } from "../../middleware/error.middleware.js";
import type { AssessmentSettingsInput } from "./admin-settings.validation.js";

const SETTINGS_KEY = "singleton";

type SettingsRecord = {
  durationMinutes: number;
  passPercentage: number;
  updatedAt: Date;
};

function settingsDto(settings: SettingsRecord) {
  return {
    durationMinutes: settings.durationMinutes,
    passPercentage: settings.passPercentage,
    updatedAt: settings.updatedAt,
  };
}

function isDuplicateKeyError(error: unknown) {
  return error instanceof mongoose.mongo.MongoServerError && error.code === 11000;
}

export async function getAdminAssessmentSettings() {
  let settings;
  try {
    settings = await AssessmentSettings.findOneAndUpdate(
      { key: SETTINGS_KEY },
      {
        $setOnInsert: {
          key: SETTINGS_KEY,
          durationMinutes: 15,
          passPercentage: 60,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true },
    ).lean();
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error;
    settings = await AssessmentSettings.findOne({ key: SETTINGS_KEY }).lean();
  }

  if (!settings) {
    throw new AppError(503, "Assessment settings are unavailable.", "SETTINGS_UNAVAILABLE");
  }
  return settingsDto(settings);
}

export async function updateAdminAssessmentSettings(
  input: AssessmentSettingsInput,
) {
  let settings;
  try {
    settings = await AssessmentSettings.findOneAndUpdate(
      { key: SETTINGS_KEY },
      {
        $set: input,
        $setOnInsert: { key: SETTINGS_KEY },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true },
    ).lean();
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error;
    settings = await AssessmentSettings.findOneAndUpdate(
      { key: SETTINGS_KEY },
      { $set: input },
      { new: true, runValidators: true },
    ).lean();
  }

  if (!settings) {
    throw new AppError(503, "Assessment settings are unavailable.", "SETTINGS_UNAVAILABLE");
  }
  return settingsDto(settings);
}
