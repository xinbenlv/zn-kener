// zn-kener fork (cpq-cornerstone-9): general email-template management.
// GET /api/v4/email-templates -> list (email_templates.read)
import { json, type RequestHandler } from "@sveltejs/kit";
import { GetAllGeneralEmailTemplates } from "$lib/server/controllers/generalTemplateController";

export const GET: RequestHandler = async () => {
  const templates = await GetAllGeneralEmailTemplates();
  return json({ email_templates: templates });
};
