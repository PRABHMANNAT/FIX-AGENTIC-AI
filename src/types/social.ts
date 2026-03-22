export type SocialPlatform = 'linkedin' | 'twitter' | 'instagram' | 'whatsapp'

export type PostType =
  | 'founder_story'
  | 'product_launch'
  | 'milestone'
  | 'educational'
  | 'opinion'
  | 'thread'
  | 'behind_scenes'
  | 'customer_success'
  | 'job_posting'
  | 'weekly_update'

export interface SocialPost {
  id?: string
  user_id?: string
  content_linkedin: string
  content_twitter: string
  content_instagram: string
  content_whatsapp: string
  original_prompt: string
  status: 'draft' | 'scheduled' | 'published'
  scheduled_at?: string
  platform?: SocialPlatform
  post_type?: PostType
  tags?: string[]
  created_at?: string
}

export interface PostGenerationRequest {
  prompt: string
  post_type?: PostType
  platforms?: SocialPlatform[]
  tone?: 'professional' | 'casual' | 'inspiring' | 'educational'
  brand_voice?: string
  include_hashtags?: boolean
  include_emojis?: boolean
}

export interface SocialChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  artifactType?: string
  artifactData?: unknown
  fallback?: boolean
}

export type SocialArtifactType =
  | 'post'
  | 'thread'
  | 'calendar'
  | 'analytics'
  | 'competitor'
  | 'brand_voice'
  | 'content_ideas'
