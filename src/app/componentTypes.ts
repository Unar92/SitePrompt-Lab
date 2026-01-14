// Component types
export const COMPONENT_TYPES = [
  'hero-banner',
  'services',
  'team-members',
  'case-studies'
] as const;

export type ComponentType = typeof COMPONENT_TYPES[number];

// Component data structures
export const getComponentDataStructure = (componentType: ComponentType): string => {
  const structures: Record<ComponentType, string> = {
    'hero-banner': `{
  "title": "string (max 3 words)",
  "subtitle": "string",
  "introCardId": "number (optional)",
  "backgroundImage": "string"
}`,
    'services': `{
  "selectedServiceIds": [number],
  "priorityOrder": [number]
}`,
    'team-members': `{
  "selectedMemberIds": [number],
  "priorityOrder": [number]
}`,
    'case-studies': `{
  "selectedStudyIds": [number],
  "priorityOrder": [number]
}`
  };
  return structures[componentType] || '{}';
};

export const getComponentSchema = (componentType: ComponentType): any => {
  const baseSchema = {
    type: "object",
    properties: {
      componentData: {
        type: "object",
        properties: {},
        // Explicitly type required as string[] so we can assign string keys below
        required: [] as string[],
        additionalProperties: false
      }
    },
    required: ["componentData"],
    additionalProperties: false
  };

  switch (componentType) {
    case 'hero-banner':
      baseSchema.properties.componentData.properties = {
        title: { type: "string", description: "Hero Title (max 3 words)" },
        subtitle: { type: "string", description: "Hero Description (40-60 chars max)" },
        introCardId: { type: ["number", "null"], description: "ID of the selected intro card, or null if none selected" },
        backgroundImage: { type: "string", description: "URL of the background image" }
      };
      baseSchema.properties.componentData.required = ["title", "subtitle", "introCardId", "backgroundImage"];
      break;
      
    case 'services':
      baseSchema.properties.componentData.properties = {
        selectedServiceIds: { 
          type: "array", 
          items: { type: "number" },
          description: "Array of selected service IDs"
        },
        priorityOrder: { 
          type: "array", 
          items: { type: "number" },
          description: "Array of service IDs in priority order"
        }
      };
      baseSchema.properties.componentData.required = ["selectedServiceIds", "priorityOrder"];
      break;

    case 'awards':
      baseSchema.properties.componentData.properties = {
        selectedAwardIds: { 
          type: "array", 
          items: { type: "number" },
          description: "Array of selected award IDs"
        },
        priorityOrder: { 
          type: "array", 
          items: { type: "number" },
          description: "Array of award IDs in priority order"
        }
      };
      baseSchema.properties.componentData.required = ["selectedAwardIds", "priorityOrder"];
      break;

    case 'team-members':
      baseSchema.properties.componentData.properties = {
        selectedMemberIds: { 
          type: "array", 
          items: { type: "number" },
          description: "Array of selected team member IDs"
        },
        priorityOrder: { 
          type: "array", 
          items: { type: "number" },
          description: "Array of team member IDs in priority order"
        }
      };
      baseSchema.properties.componentData.required = ["selectedMemberIds", "priorityOrder"];
      break;

    case 'case-studies':
      baseSchema.properties.componentData.properties = {
        selectedStudyIds: { 
          type: "array", 
          items: { type: "number" },
          description: "Array of selected case study IDs"
        },
        priorityOrder: { 
          type: "array", 
          items: { type: "number" },
          description: "Array of case study IDs in priority order"
        }
      };
      baseSchema.properties.componentData.required = ["selectedStudyIds", "priorityOrder"];
      break;

    case 'background':
      baseSchema.properties.componentData.properties = {
        heading: { type: "string", description: "Section heading" },
        text: { type: "string", description: "Descriptive text (80-150 chars)" }
      };
      baseSchema.properties.componentData.required = ["heading", "text"];
      break;
  }

  return {
    name: `${componentType}_response`,
    strict: true,
    schema: baseSchema
  };
};

