/*
 Single source of truth for all environment variables and constants.
 */

import dotenv from "dotenv";
dotenv.config();

// Server
export const PORT = process.env.PORT || 5001;

// MongoDB 
export const MONGO_URI   = process.env.MONGO_URI  || "mongodb://localhost:27017";
export const DB_NAME     = process.env.DB_NAME    || "researchHelper";
export const COLLECTION_PROFESSORS = "professors";
export const COLLECTION_STUDENTS   = "students";

// DeepSeek 
export const DEEPSEEK_KEY      = process.env.DEEPSEEK_API_KEY || "";
export const DEEPSEEK_URL      = "https://api.deepseek.com/chat/completions";
export const DEEPSEEK_MODEL    = "deepseek-chat";
export const DEEPSEEK_MAX_TOKENS = 1000;



// Semantic Scholar
export const SS_BASE    = "https://api.semanticscholar.org/graph/v1";
export const SS_FIELDS  = "title,abstract,year,fieldsOfStudy,citationCount";
export const SS_LIMIT   = 5;
export const SS_API_KEY = process.env.SEMANTIC_SCHOLAR_API_KEY || null;

// OpenAlex 
export const OPENALEX_EMAIL = process.env.CONTACT_EMAIL || "yourapp@example.com";

export const CONCEPT_IDS = {
  "Computer Science":      "C41008148",
  "Machine Learning":      "C119857082",
  "NLP":                   "C204321447",
  "Computational Biology": "C70721500",
  "Physics":               "C121332964",
  "Mathematics":           "C33923547",
};

export const TYPE_MAP = {
  "Journal Article":  "article",
  "Conference Paper": "proceedings-article",
  "Preprint":         "preprint",
  "Thesis":           "dissertation",
  "Book":             "book",
  "Book Chapter":     "book-chapter",
  "Review":           "review",
  "Dataset":          "dataset",
  "Report":           "report",
};