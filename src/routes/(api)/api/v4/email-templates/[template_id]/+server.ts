// zn-kener fork (cpq-cornerstone-9): single email-template operations.
// GET   /api/v4/email-templates/{template_id} -> get one (email_templates.read)
// PATCH /api/v4/email-templates/{template_id} -> update subject/body (email_templates.write)
import { json, type RequestHandler } from "@sveltejs/kit";
import {
  GetGeneralEmailTemplateById,
  UpdateGeneralEmailTemplate,
} from "$lib/server/controllers/generalTemplateController";
import type { UpdateEmailTemplateRequest, BadRequestResponse, NotFoundResponse } from "$lib/types/api";

export const GET: RequestHandler = async ({ params }) => {
  const templateId = params.template_id!;
  const tpl = await GetGeneralEmailTemplateById(templateId);
  if (!tpl) {
    const err: NotFoundResponse = { error: { code: "NOT_FOUND", message: `Email template '${templateId}' not found` } };
    return json(err, { status: 404 });
  }
  return json({ email_template: tpl });
};

export const PATCH: RequestHandler = async ({ params, request }) => {
  const templateId = params.template_id!;
  const existing = await GetGeneralEmailTemplateById(templateId);
  if (!existing) {
    const err: NotFoundResponse = { error: { code: "NOT_FOUND", message: `Email template '${templateId}' not found` } };
    return json(err, { status: 404 });
  }
  let body: UpdateEmailTemplateRequest;
  try {
    body = await request.json();
  } catch {
    const err: BadRequestResponse = { error: { code: "BAD_REQUEST", message: "Invalid JSON body" } };
    return json(err, { status: 400 });
  }
  const result = await UpdateGeneralEmailTemplate(templateId, {
    template_subject: body.template_subject,
    template_html_body: body.template_html_body,
    template_text_body: body.template_text_body,
  });
  if (!result.success) {
    const err: BadRequestResponse = { error: { code: "BAD_REQUEST", message: result.error || "Failed to update template" } };
    return json(err, { status: 400 });
  }
  const updated = await GetGeneralEmailTemplateById(templateId);
  return json({ email_template: updated });
};
