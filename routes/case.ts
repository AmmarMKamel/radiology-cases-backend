import { Router } from "express";
import { body } from "express-validator";

import * as caseController from "../controllers/case";

const router = Router();

// Add Case
router.post("/", body("url").notEmpty().isURL(), caseController.createCase);

// Get All Cases
router.get("/", caseController.getCases);

// Get Case
router.get("/:id", caseController.getCase);

export default router;
