export interface SkillMeta {
  name: string;
  description: string;
  path: string;
}

export interface SkillContent extends SkillMeta {
  content: string;
}
