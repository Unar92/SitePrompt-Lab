import { ComponentType } from './componentTypes';
import { ClientInfoForm } from './types';
import { TEAM_SYSTEM_PROMPT, CASE_STUDY_SYSTEM_PROMPT, AWARDS_SYSTEM_PROMPT, SERVICES_SYSTEM_PROMPT, BACKGROUND_SYSTEM_PROMPT } from './prompts';

// Generate component system prompt
export const generateComponentSystemPrompt = (componentType: ComponentType, clientInfo: ClientInfoForm, rawData?: string): string => {
  // Use Lead Strategist persona for all components
  const strategistPrompt = `You are a Lead Strategist and Copywriter generating bespoke pitch content for a specific client.

YOUR BRAND PERSONA: "The Strategic Partner"
You do not just sell services; you are an architect of impact. You sit at the intersection of culture, technology, and strategy. Your tone is sophisticated, professional, and results-oriented. You bridge vision with execution.

TONE & VOICE GUIDELINES:
1. IMPACT OVER FEATURES: Never list a service without stating its transformation. Use the structure: [Service] + to + [Impact Verb] + [Outcome].
   - Bad: "We do social media management."
   - Good: "We build human-centric narratives that drive meaningful engagement."
2. VOCABULARY: Use professional, impactful language.
   - Keywords: Transformation, Innovation, Strategic, Insight-driven, Timeless, Immersive, Ecosystem, Legacy, Excellence.
   - Modifiers: Use "Quality Modifiers" (e.g., instead of "good video," use "high-quality content").
3. CLIENT INTELLIGENCE: 
   - If the client is Government/Institutional: Speak of "Legacy," "Strategic Impact," "Heritage," and "Long-term Vision." Be professional and ambitious.
   - If the client is Commercial: Speak of "Performance," "ROI," "Market Leadership," and "Captivating Audiences."
4. CONFIDENCE: Use the "Active Voice." Never be passive. We partner. We deliver. We transform.

CRITICAL TECHNICAL RULES:
- Return ONLY valid JSON.
- Content must be English (en) and LTR. No "dir" or "lang" attributes.
- No markdown formatting in the output.`;

  // Use existing prompts for team-members and case-studies as base but wrap with persona
  if (componentType === 'team-members') {
    return TEAM_SYSTEM_PROMPT;
  }
  
  if (componentType === 'case-studies') {
    return CASE_STUDY_SYSTEM_PROMPT;
  }
  
  if (componentType === 'awards') {
    return AWARDS_SYSTEM_PROMPT;
  }
  
  if (componentType === 'services') {
    return SERVICES_SYSTEM_PROMPT;
  }

  if (componentType === 'background') {
    return BACKGROUND_SYSTEM_PROMPT;
  }

  // Special handling for hero-banner
  if (componentType === 'hero-banner') {
    // Parameters are used by other component types, but not needed here
    void clientInfo;
    void rawData;
    
    return `You are a Pitch Architect constructing content for the "Hero Banner" component. This is the very first slide a potential partner sees. It must establish immediate connection, relevance, and alignment with their vision.

### THE BRAND VOICE
- **Persona:** The Strategic Architect.
- **Tone:** Professional, confident, and human.
- **Keywords:** Impact, Excellence, Transformation, Innovation, Quality.

### INSTRUCTIONS
1. **Title:** Generate a main headline. It can be a powerful statement, a direct address to the client's ambition, or a polished welcome. It must be short, punchy, and high-impact.
2. **Subtitle:** A single, engaging sentence that connects the specific "Client Need" with the organization's ability to deliver.
3. **Intro Card Selection (Logic):**
   - You will receive a list of **Team Members** with their Job Titles and IDs.
   - You must analyze the **Client Industry** and **Client Need** to decide who is the best point of contact.
   - **Production/Content Needs:** Assign to a "Head of Production" or similar production role.
   - **Social/Community Needs:** Assign to the "Social" or "Community" lead.
   - **Creative/Design Needs:** Assign to the "Chief Creative Officer" or "Executive Creative Director".
   - **Strategic/Commercial/Government Needs:** Assign to the "CEO" or "Chief Commercial Officer".
   - **Regional Specific:** If the client is based in a specific region, prioritize team members with relevant regional expertise if available.`;
  }

  return strategistPrompt;
};

// Generate component user prompt
export const generateComponentUserPrompt = (
  componentType: ComponentType,
  clientInfo: ClientInfoForm,
  rawData?: string
): string => {
  // Dedicated user prompt for services
  if (componentType === 'services') {
    // Parameters are used for other components; not needed to build this static template
    void clientInfo;
    void rawData;

    return `Select the service mix for this client pitch.

### CONTEXT
{{context}}

### SERVICE CATALOG
{{SERVICES}}

### ACTION
1. Identify the core services required based on the context provided.
2. Add a strategic "Wildcard" service to show innovation or breadth.
3. Order them from "Most Critical" to "Nice to Have".
4. Ensure the total selection is at least 3-4 services (or all, if relevant).

Output the JSON.`;
  }

  // Dedicated user prompt for team-members
  if (componentType === 'team-members') {
    // Parameters are used for other components; not needed to build this static template
    void clientInfo;
    void rawData;

    return `Assemble the team for this pitch.

### CONTEXT
{{context}}

### INTRO MEMBER (The Captain)
{{SELECTED_INTRO_MEMBER}}

### TALENT POOL
{{TEAM_MEMBERS}}

### ACTION
1. Place the \`Intro Member\` at position #1.
2. Select 7 other unique team members to form a squad of 8.
3. Prioritize Subject Matter Experts for the immediate slots (2-4) based on the context provided.
4. Fill the remaining slots (5-8) with Project/Business Directors to show reliability.

Output the JSON.`;
  }

  // Dedicated user prompt for case-studies
  if (componentType === 'case-studies') {
    // Parameters are used for other components; not needed to build this static template
    void clientInfo;
    void rawData;

    return `Select the Case Studies for this pitch.

### CONTEXT
{{context}}

### CASE STUDY PORTFOLIO
{{CASE_STUDIES}}

### ACTION
1. Select 4, 6, or 8 case studies.
2. Ensure 80% are directly relevant based on the context provided.
3. Ensure 20% are "Flex" projects (high-profile work outside their immediate sector).
4. Order them from "Most Relevant" to "Broad Capability".

Output the JSON.`;
  }

  // Simplified user prompt for hero-banner
  if (componentType === 'hero-banner') {
    // Parameters are used by other component types, but not needed here
    void clientInfo;
    void rawData;
    
    return `Generate the Hero Banner content for this client pitch.

### CONTEXT
{{context}}

### TEAM DATA (Available Contacts)
{{INTRO_CARDS}}

### ACTION
Analyze the context and the team list.
1. Write a **Title** that sets the right tone for this specific opportunity.
2. Write a **Subtitle** that acknowledges their specific need.
3. Select the most relevant **introCardId** based on the team member's Job Title and the context provided.`;
  }

  return `### CONTEXT
{{context}}

Component to build: ${componentType}

Create compelling content for this ${componentType} component based on the context provided.

REQUIREMENTS:
- Return ONLY valid JSON matching the exact structure shown
- Include ALL required fields
- For arrays, include at least 3 items
- Write from your organization's perspective (use "we", "our")
- Use the context to understand the client, their needs, and the situation
- Create content that builds trust and demonstrates value

EXAMPLES OF THE RIGHT TONE:
- Hero Banner: Create an engaging headline and subtitle that connects with the client
- Awards: Display relevant awards and recognition that establish credibility
- Team Members: Select team members whose expertise best matches the client's needs
- Case Studies: Showcase relevant projects that demonstrate your capabilities`;
};
