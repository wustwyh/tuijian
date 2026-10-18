// Local LLM response schemas. Public JSON models remain docs/api-contract.md.
const str = { type: 'string', minLength: 1 };
const strings = (minItems = 1) => ({ type: 'array', items: str, minItems });
const object = (properties) => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false });
export const personaSchema = object({ personas: {
  type: 'array', minItems: 2, maxItems: 3, items: object({
    name: str, typical_tasks: strings(), pain_points: strings(), buying_triggers: strings(),
    objections: strings(), content_angle: str, evidence_ids: strings(), assumptions: strings(), pending_checks: strings(),
  }),
} });
export const strategySchema = object({
  main_conflict: str, primary_persona: str, key_message: str, proof_points: strings(),
  outline: strings(), cta: str, risk_notes: strings(),
});
export const contentSchema = object({
  title_options: { ...strings(3), maxItems: 3 }, selected_title: str, body: str, cta: str,
  image_plan: { type: 'array', items: object({
    evidence_id: str, position: { enum: ['cover', 'body', 'ending'] }, caption: str, purpose: str,
  }) },
});
export const reviewSchema = object({ checks: {
  type: 'array', minItems: 4, items: object({
    type: { enum: ['fact', 'image', 'platform', 'compliance'] }, item: str,
    status: { enum: ['passed', 'pending', 'rejected'] }, reason: str, evidence_ids: strings(0),
  }),
}, manual_actions: strings(0) });

export function matchesSchema(value, schema, path = '$') {
  if (schema.enum && !schema.enum.includes(value)) throw new Error(`${path}: invalid enum`);
  if (schema.type === 'string' && (typeof value !== 'string' || !value.trim())) throw new Error(`${path}: expected nonempty string`);
  if (schema.type === 'array') {
    if (!Array.isArray(value) || value.length < (schema.minItems ?? 0) || value.length > (schema.maxItems ?? Infinity)) throw new Error(`${path}: invalid array length`);
    value.forEach((item, i) => matchesSchema(item, schema.items, `${path}[${i}]`));
  }
  if (schema.type === 'object') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${path}: expected object`);
    for (const key of schema.required) {
      if (!Object.hasOwn(value, key)) throw new Error(`${path}.${key}: required`);
      matchesSchema(value[key], schema.properties[key], `${path}.${key}`);
    }
    if (Object.keys(value).some((key) => !Object.hasOwn(schema.properties, key))) throw new Error(`${path}: unexpected field`);
  }
  return value;
}
