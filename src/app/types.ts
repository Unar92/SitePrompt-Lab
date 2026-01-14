// Client info form interface - simplified to a single global context field
export interface ClientInfoForm {
  /**
   * Global context field that can contain any information needed for the prompt.
   * Users can structure this however they want - it's completely flexible.
   */
  context: string;
}

export const DEFAULT_CLIENT_INFO: ClientInfoForm = {
  context: ""
};

// Team member interface (for AI - no images)
export interface TeamMember {
  id: number;
  name: string;
  role: string;
  description: string;
}

// Industry options for the dropdown
export const INDUSTRY_OPTIONS = [
  "Select an industry...",
  "Real estate",
  "Tourism",
  "Automotive",
  "Sustainability",
  "Entertainment",
  "Events",
  "KSA Specific",
  "UAE Specific",
  "Generic Nation Builders/Gov."
];

