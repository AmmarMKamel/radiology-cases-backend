import { Schema, model } from "mongoose";

const caseSchema = new Schema(
  {
    title: { type: String, required: true },
    thumbnail: { type: String, required: true },
    data: [
      {
        title: { type: String },
        thumbnail: { type: String, required: true },
        images: [String],
      },
    ],
  },
  { timestamps: true }
);

const Case = model("Case", caseSchema);

export default Case;
