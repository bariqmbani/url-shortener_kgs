import mongoose, { Schema } from "mongoose";

const UniqueKeySchema = new Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    used: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: false,
  }
);

export const UniqueKey = mongoose.model("UniqueKey", UniqueKeySchema);
