import Anthropic from '@anthropic-ai/sdk';
import { COMPONENT_TYPES, DEMO_FLOW } from '../../../shared/schema.js';

const MODEL = 'claude-3-5-sonnet-latest';

let anthropic = null;

function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    return null;
  }
  if (!anthropic) {
    anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return anthropic;
}

const SYSTEM_PROMPT = `You are a UX/UI prototype generator. You output JSON that defines mobile app screen flows.

Your output must be a valid JSON object matching this exact schema:

{
  "flow_id": "string - unique snake_case identifier",
  "name": "string - human readable name for this flow",
  "start_screen": "string - screen_id of the first screen to display",
  "screens": [
    {
      "screen_id": "string - unique snake_case identifier",
      "title": "string - screen title",
      "background": "white | gradient | dark",
      "status_bar": true,
      "components": [
        {
          "type": "component_type",
          ...component-specific properties
        }
      ]
    }
  ]
}

Available component types and their properties:

1. **heading** - { type: "heading", text: "string", level: 1|2|3 }
2. **text** - { type: "text", text: "string", variant: "body"|"caption"|"label" }
3. **button** - { type: "button", text: "string", variant: "primary"|"secondary"|"outline"|"destructive", on_tap: "screen_id" }
4. **text_input** - { type: "text_input", label: "string", placeholder: "string" }
5. **option_card** - { type: "option_card", text: "string", subtitle: "string", icon: "string", on_tap: "screen_id" }
6. **image_placeholder** - { type: "image_placeholder", aspect_ratio: "16:9"|"1:1"|"4:3", label: "string" }
7. **nav_bar** - { type: "nav_bar", title: "string", show_back: boolean, on_back: "screen_id" }
8. **tab_bar** - { type: "tab_bar", tabs: [{ text: "string", icon: "string", active: boolean, on_tap: "screen_id" }] }
9. **list_item** - { type: "list_item", title: "string", subtitle: "string", icon: "string", on_tap: "screen_id" }
10. **card** - { type: "card", children: [components...] }
11. **divider** - { type: "divider" }
12. **spacer** - { type: "spacer", size: "sm"|"md"|"lg" }
13. **pricing_tier** - { type: "pricing_tier", name: "string", price: "string", features: ["string"], cta_text: "string", highlighted: boolean, on_tap: "screen_id" }
14. **modal** - { type: "modal", title: "string", body: "string", buttons: [{ text: "string", variant: "primary"|"secondary"|"destructive", on_tap: "screen_id" }] }
15. **toggle** - { type: "toggle", label: "string", enabled: boolean }
16. **avatar** - { type: "avatar", name: "string", size: "sm"|"md"|"lg" }
17. **badge** - { type: "badge", text: "string", variant: "default"|"success"|"warning"|"error" }
18. **progress_bar** - { type: "progress_bar", value: number, max: number, label: "string" }
19. **search_bar** - { type: "search_bar", placeholder: "string" }
20. **icon_button** - { type: "icon_button", icon: "string", label: "string", on_tap: "screen_id" }
21. **hero_image** - { type: "hero_image", aspect_ratio: "16:9"|"1:1"|"4:3", label: "string" }
22. **chip_group** - { type: "chip_group", chips: [{ text: "string", selected: boolean }] }
23. **bottom_sheet** - { type: "bottom_sheet", title: "string", children: [components...] }
24. **stat_card** - { type: "stat_card", title: "string", value: "string", subtitle: "string", icon: "string" }

RULES:
- Generate 3-5 connected screens that form a realistic UX flow
- All on_tap values MUST reference valid screen_ids from the screens array
- Use realistic content - real names, real prices, real copy. NO lorem ipsum.
- Every screen should have a nav_bar (except splash/welcome screens)
- Use spacers between components for visual breathing room
- Make the flow feel like a real production app
- The last screen should feel like a natural endpoint (dashboard, confirmation, etc.)
- Output ONLY the JSON object. No markdown, no explanation, no code fences.`;

const EDIT_SYSTEM_PROMPT = `You are a UX/UI prototype editor. You receive a full prototype flow JSON and an instruction to edit a specific screen.

Your job is to return ONLY the modified screen object (not the full flow). The screen must:
- Keep the same screen_id
- Only reference screen_ids that exist in the original flow
- Follow the same component schema as the original
- Output ONLY the JSON screen object. No markdown, no explanation, no code fences.

Available component types: ${COMPONENT_TYPES.join(', ')}`;

export async function generateFlow(prompt) {
  const client = getClient();

  if (!client) {
    console.log('[LLM] No ANTHROPIC_API_KEY set, returning demo flow');
    return { ...DEMO_FLOW };
  }

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Generate a UX prototype flow for: ${prompt}`,
      },
    ],
  });

  const text = response.content[0].text.trim();

  // Try to extract JSON if wrapped in code fences
  let jsonStr = text;
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    jsonStr = fenceMatch[1].trim();
  }

  const flow = JSON.parse(jsonStr);
  return flow;
}

export async function editScreen(flow, screenId, editPrompt) {
  const client = getClient();

  if (!client) {
    console.log('[LLM] No ANTHROPIC_API_KEY set, returning original screen');
    const screen = flow.screens.find((s) => s.screen_id === screenId);
    if (!screen) {
      throw new Error(`Screen "${screenId}" not found in flow`);
    }
    return { ...screen };
  }

  const screen = flow.screens.find((s) => s.screen_id === screenId);
  if (!screen) {
    throw new Error(`Screen "${screenId}" not found in flow`);
  }

  const allScreenIds = flow.screens.map((s) => s.screen_id);

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: EDIT_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Here is the full flow JSON:
${JSON.stringify(flow, null, 2)}

Available screen_ids: ${allScreenIds.join(', ')}

Edit screen "${screenId}" with this instruction: ${editPrompt}

Return ONLY the modified screen JSON object.`,
      },
    ],
  });

  const text = response.content[0].text.trim();

  let jsonStr = text;
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    jsonStr = fenceMatch[1].trim();
  }

  const editedScreen = JSON.parse(jsonStr);
  return editedScreen;
}
