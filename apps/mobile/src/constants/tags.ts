export interface CommonTag {
  label: string;
  value: string;
  techTags: string[];
}

export const COMMON_TAGS: CommonTag[] = [
  { label: '프론트엔드', value: 'frontend', techTags: ['react', 'typescript', 'nextjs', 'swift', 'frontend', 'reactnative', 'flutter', 'vue', 'angular', 'css', 'html'] },
  { label: '백엔드', value: 'backend', techTags: ['java', 'python', 'golang', 'kotlin', 'nodejs', 'database', 'backend', 'msa', 'rust', 'php', 'spring', 'django', 'fastapi'] },
  { label: 'DevOps', value: 'devops', techTags: ['devops', 'kubernetes', 'docker', 'aws', 'cloud', 'linux', 'nginx', 'cicd', 'terraform', 'gcp', 'azure'] },
  { label: 'AI / ML', value: 'ai', techTags: ['ai', 'llm', 'gpt', 'ml', 'deeplearning', 'nlp', 'pytorch', 'tensorflow', 'huggingface'] },
  { label: '데이터베이스', value: 'database', techTags: ['database', 'mysql', 'postgresql', 'mongodb', 'redis', 'elasticsearch', 'sqlite', 'supabase'] },
  { label: '보안', value: 'security', techTags: ['security', 'auth', 'encryption', 'hacking', 'pentest', 'oauth', 'jwt'] },
  { label: '모바일', value: 'mobile', techTags: ['mobile', 'ios', 'android', 'swift', 'kotlin', 'reactnative', 'flutter'] },
  { label: '게임개발', value: 'game', techTags: ['game', 'unity', 'unreal', 'gamedev', 'graphics'] },
];

/** Category values → flat list of unique tech tags for API query */
export function expandTagsForQuery(categoryValues: string[]): string[] {
  const expanded = new Set<string>();
  for (const val of categoryValues) {
    const cat = COMMON_TAGS.find((t) => t.value === val);
    if (cat) cat.techTags.forEach((t) => expanded.add(t));
  }
  return Array.from(expanded);
}

/** profile.tags (tech tags) → which categories are "active" */
export function tagsToCategories(techTags: string[]): string[] {
  return COMMON_TAGS
    .filter((cat) => cat.techTags.some((t) => techTags.includes(t)))
    .map((cat) => cat.value);
}

/** Selected categories → expanded tech tags to save in subscriptions */
export function expandTagsForSave(categoryValues: string[]): string[] {
  return expandTagsForQuery(categoryValues);
}
