export function resolveAssistantChild(
  children: { id: string; name: string }[],
  question: string,
): { childId?: string; clarification?: string };
