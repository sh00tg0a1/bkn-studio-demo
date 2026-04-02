export interface ConversationMeta {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  /** 置顶会话排在列表前，由侧栏 Pin 切换 */
  pinned?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  messages: unknown[];
}
