import type { SocialPost } from '@/types/social';

export const MOCK_USER = {
  name: 'Adhiraj Dogra',
  handle: '@adhirajdogra',
  company: 'AssembleOne',
  industry: 'AI / SaaS',
  followers: { linkedin: 2847, twitter: 1203 },
  avatar_initials: 'AD'
};

export const MOCK_POSTS: SocialPost[] = [
  {
    id: 'mock-1',
    content_linkedin: `I quit my job 8 months ago to build AssembleOne.

Here's what nobody tells you about building an AI company as a solo founder:

The product is not the hard part.

The hard part is staying focused when 47 different people tell you to build 47 different things.

This week I said no to:
→ A partnership that would have made us ₹3L but distracted us for 3 months
→ A feature request from our biggest client that didn't fit our vision
→ An investor meeting that felt off from the first email

Revenue is up 18% this month.
Clarity is the actual product.

What did you say no to this week?

#buildinpublic #solofounder #startupindia #saas #entrepreneurship`,

    content_twitter: `I quit my job 8 months ago to build an AI company.

Biggest lesson: the product isn't the hard part.

Saying NO is.

This week I said no to 3 things that would have made money but killed focus.

Revenue up 18%.

Clarity > revenue.

What did you say no to this week?`,

    content_instagram: `8 months of building in public 🧵

The thing nobody tells you about being a solo founder?

You don't fail because of bad code.
You fail because you say yes to everything.

This week I protected my focus and said no to:
- A ₹3L partnership (wrong timing)
- A feature that didn't fit our vision
- An investor call that felt off

Result? Best revenue month yet. 📈

Drop a 🙌 if you're also learning to say no.

#buildinpublic #solofounder #startuplife #entrepreneur #indiemaker #saas #focusmode`,

    content_whatsapp: `Hey! Sharing a quick founder update 👋

Said no to 3 big opportunities this week that would have distracted us.

Revenue up 18% as a result.

Sometimes the best move is to do less. What are you saying no to?`,

    original_prompt: 'Write a founder story post about saying no',
    status: 'published',
    post_type: 'founder_story',
    tags: ['buildinpublic', 'solofounder', 'startupindia', 'saas'],
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'mock-2',
    content_linkedin: `We just hit ₹2.4L MRR at AssembleOne. 🎉

18 months ago I was copy-pasting data between 6 tools every Monday morning.

Now our AI co-worker does it while I sleep.

Here's what the journey looked like:

Month 1: ₹0 — building alone, no customers
Month 3: ₹12K — first paying customer (they found us on LinkedIn)
Month 6: ₹68K — product market fit starting to click
Month 9: ₹1.1L — crossed ₹1L MRR
Month 12: ₹1.8L — team of 3
Month 18: ₹2.4L — 47 customers, AI co-worker for 200+ founders

The biggest unlock? Stopping to build features and starting to build for
a specific type of founder.

Solo founder. Indian startup. Wants to move fast without burning out.

That's our person. Everything else is noise.

Who are you building for?

#milestonepost #startupindia #mrr #buildinpublic #saas #aitools`,

    content_twitter: `We hit ₹2.4L MRR today 🎉

18 months ago I was manually copying data between 6 tools every Monday.

Now our AI does it.

Month 1: ₹0
Month 6: ₹68K
Month 12: ₹1.8L
Month 18: ₹2.4L

The unlock: building for ONE specific person instead of everyone.

Who are you building for?`,

    content_instagram: `₹2.4L MRR milestone 🚀✨

18 months of building, failing, pivoting, and shipping.

The real story behind the number:

Month 1 → ₹0 (just vibes and a Notion doc)
Month 6 → ₹68K (first sign of PMF)
Month 18 → ₹2.4L (47 customers who actually pay)

What changed everything? 

Picking ONE customer and saying no to everyone else.

Solo founders building Indian startups who want to move fast.

That's it. That's the whole strategy.

Save this if you're on the journey 💾

#startuplife #mrr #buildinpublic #indiemaker #saas #milestone #entrepreneurship`,

    content_whatsapp: `Big news! 🎉 We hit ₹2.4L MRR at AssembleOne!

18 months ago this was just an idea. Now 47 founders use it daily.

The secret? Building for one specific person instead of trying to please everyone.

Thanks for the support on this journey! 🙏`,

    original_prompt: 'Write a milestone post about hitting 2.4L MRR',
    status: 'published',
    post_type: 'milestone',
    tags: ['milestonepost', 'startupindia', 'mrr', 'buildinpublic'],
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'mock-3',
    content_linkedin: `The biggest lie in productivity: work harder.

I tracked every hour for 30 days. Here's what I found:

→ 11 hours per week in meetings where I spoke less than 5 minutes
→ 4 hours per week re-reading the same Slack messages
→ 3 hours per week in "quick calls" that could have been a Loom

Total: 18 hours of wasted effort. Every. Single. Week.

That's 936 hours a year. 

23 full work weeks.

The fix wasn't working harder. It was eliminating before optimizing.

I now have one rule: if I can't explain why a meeting needs me specifically,
I don't attend.

My deep work hours went from 6/week to 22/week.
Productivity tripled. Stress halved.

What's your biggest time leak?

#productivity #founder #deepwork #timemanagement #solofounder`,

    content_twitter: `I tracked every hour for 30 days.

Found 18 hours of wasted effort per week.

The culprits:
- 11 hrs — meetings where I barely spoke
- 4 hrs — re-reading Slack messages
- 3 hrs — "quick calls" that weren't

936 hours wasted per year = 23 full work weeks.

The fix: eliminate before optimize.

Deep work: 6hrs → 22hrs/week.

What's your biggest time leak?`,

    content_instagram: `I wasted 936 hours last year 😬

And I didn't even notice until I tracked everything.

Here's what I found after 30 days of time tracking:

⏰ 11 hrs/week — meetings where I barely spoke
💬 4 hrs/week — re-reading the same Slack messages
📞 3 hrs/week — "quick calls" that ran 45 mins

That's 18 hours EVERY WEEK going nowhere.

The fix wasn't hustle. It was elimination.

I now ask one question before every meeting:
"Can I explain why this needs ME specifically?"

If I can't — I don't attend.

Deep work went from 6 to 22 hours per week.
Stress dropped. Output tripled.

What would you do with 18 extra hours every week? 👇

#productivity #founder #deepwork #timemanagement #focustime`,

    content_whatsapp: `Quick insight: I tracked my time for 30 days and found 18 hours of wasted effort every week. Mostly meetings and Slack. Cut them ruthlessly. Deep work tripled. Worth doing if you haven't tracked your time recently!`,

    original_prompt: 'Write a productivity post about time tracking results',
    status: 'draft',
    post_type: 'educational',
    tags: ['productivity', 'founder', 'deepwork', 'timemanagement'],
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  }
];

export const MOCK_THREAD = {
  platform: 'twitter',
  topic: 'How I use AI to run my startup solo',
  hook_score: 9,
  posts: [
    {
      order: 1,
      content: "I run a ₹2.4L MRR startup alone.\n\nNo team. No co-founder. No VA.\n\nHere's how I use AI to do the work of 5 people 🧵",
      char_count: 112
    },
    {
      order: 2,
      content: "2/ Every Monday at 8am I get a briefing.\n\nMRR, burn, churn, anomalies.\n\nI didn't write it. My AI co-worker did.\n\nWhile I was sleeping.",
      char_count: 128
    },
    {
      order: 3,
      content: "3/ When a lead goes cold I don't write the follow-up.\n\nI type: 'Draft a follow-up for Rahul who saw the demo 5 days ago'\n\nDone in 8 seconds.",
      char_count: 138
    },
    {
      order: 4,
      content: "4/ Every invoice, report, and pitch deck gets generated from a single sentence.\n\n'Generate my March investor update'\n\nPDF in 15 seconds.",
      char_count: 131
    },
    {
      order: 5,
      content: "5/ The secret isn't replacing yourself.\n\nIt's removing the 80% of work that doesn't need a founder.\n\nSo you can focus on the 20% that does.",
      char_count: 140
    },
    {
      order: 6,
      content: "6/ Tools I use:\n→ AssembleOne for business ops\n→ Cursor for code\n→ Notion for docs\n→ Groq for fast AI\n\nTotal cost: ₹8,000/month\nTime saved: 30 hrs/week",
      char_count: 152
    },
    {
      order: 7,
      content: "7/ The solo founder era is just starting.\n\nIn 2 years a single person will run a ₹10Cr business.\n\nThe question isn't whether — it's who gets there first.\n\nFollow for the playbook 🔔",
      char_count: 177
    }
  ]
};

export const MOCK_CALENDAR = [
  {
    id: 'sched-1',
    post_id: 'mock-1',
    platform: 'linkedin',
    scheduled_at: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'pending',
    content_preview: 'I quit my job 8 months ago to build AssembleOne...'
  },
  {
    id: 'sched-2',
    post_id: 'mock-3',
    platform: 'twitter',
    scheduled_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'pending',
    content_preview: 'I tracked every hour for 30 days. Found 18 hours...'
  },
  {
    id: 'sched-3',
    post_id: 'mock-2',
    platform: 'linkedin',
    scheduled_at: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'pending',
    content_preview: 'We just hit ₹2.4L MRR at AssembleOne...'
  }
];

export const MOCK_CALENDAR_SUGGESTIONS = [
  {
    day: 'Monday',
    platform: 'linkedin',
    post_type: 'founder_story',
    title: 'The decision that changed everything',
    hook: 'I almost shut down AssembleOne in month 4.',
    why_now: 'Your MRR grew 18% — people want to know the journey behind the numbers'
  },
  {
    day: 'Tuesday',
    platform: 'twitter',
    post_type: 'educational',
    title: '5 AI tools every solo founder needs',
    hook: 'I replaced a 4-person team with these 5 tools.',
    why_now: 'AI tools content is getting 3x normal engagement this week'
  },
  {
    day: 'Wednesday',
    platform: 'linkedin',
    post_type: 'milestone',
    title: '18 months of building in public — what I learned',
    hook: '18 months ago I had 0 customers. Here is what changed.',
    why_now: 'Milestone content drives highest engagement on LinkedIn Wednesdays'
  },
  {
    day: 'Thursday',
    platform: 'twitter',
    post_type: 'opinion',
    title: 'The VC funding narrative is wrong',
    hook: 'Everyone says you need VC funding to build a real startup. I disagree.',
    why_now: 'Contrarian takes perform well on Thursday afternoons'
  },
  {
    day: 'Friday',
    platform: 'linkedin',
    post_type: 'weekly_update',
    title: 'Week 73 of building in public',
    hook: 'Week 73. Still here. Still shipping.',
    why_now: 'Weekly updates on Friday get saved for Monday reading'
  }
];

export const MOCK_ANALYTICS = {
  metrics: {
    total_impressions: 47832,
    total_likes: 1847,
    total_shares: 423,
    total_comments: 312,
    avg_engagement_rate: 5.4,
    best_performing_platform: 'LinkedIn',
    follower_growth_total: 284,
    posts_published: 12
  },
  weekly_data: [
    { week: 'Week 1', linkedin: 8200, twitter: 3100 },
    { week: 'Week 2', linkedin: 9400, twitter: 2800 },
    { week: 'Week 3', linkedin: 11200, twitter: 4200 },
    { week: 'Week 4', linkedin: 14800, twitter: 4100 }
  ],
  top_posts: [
    {
      content: 'I quit my job 8 months ago to build AssembleOne...',
      platform: 'linkedin',
      impressions: 14832,
      likes: 423,
      comments: 89
    },
    {
      content: 'We just hit ₹2.4L MRR today 🎉...',
      platform: 'linkedin',
      impressions: 11204,
      likes: 312,
      comments: 67
    },
    {
      content: 'I tracked every hour for 30 days...',
      platform: 'twitter',
      impressions: 8421,
      likes: 287,
      comments: 44
    }
  ],
  brief: {
    top_win: 'Founder story post reached 14.8K impressions — 3.2x your average',
    top_opportunity: 'Twitter engagement dropped 18% — posting consistency needs work',
    change_this_week: 'Post your first video or carousel — image posts get 2x your current reach',
    one_line_summary: 'Strong LinkedIn week with record impressions, Twitter needs more frequency'
  }
};

export const MOCK_COMPETITORS = [
  {
    id: 'comp-1',
    name: 'Notion AI',
    linkedin_url: 'https://linkedin.com/company/notion',
    twitter_handle: '@NotionHQ',
    notes: 'Posts 3x per week, mostly product updates and use cases',
    analysis: {
      content_gaps: [
        'Founder personal stories — they never post these',
        'Indian market specific content',
        'Pricing and ROI focused content'
      ],
      differentiation_opportunities: [
        'Lead with founder authenticity vs corporate voice',
        'Show real revenue numbers — they never do this',
        'Target Indian startup ecosystem specifically'
      ],
      posting_frequency_estimate: '3-4 times per week',
      tone_estimate: 'Professional, product-focused, minimal personality',
      recommended_response_strategy: 'Counter their product content with founder story content — opposite positioning'
    }
  },
  {
    id: 'comp-2',
    name: 'Linear',
    linkedin_url: 'https://linkedin.com/company/linear',
    twitter_handle: '@linear',
    notes: 'Design-focused content, very aesthetic, minimal posting',
    analysis: {
      content_gaps: [
        'Customer success stories',
        'Pricing transparency',
        'Founder journey content'
      ],
      differentiation_opportunities: [
        'More raw and authentic vs their polished aesthetic',
        'Indian startup focus',
        'Revenue and metrics transparency'
      ],
      posting_frequency_estimate: '2-3 times per week',
      tone_estimate: 'Minimal, design-forward, almost cold',
      recommended_response_strategy: 'Be the warm, authentic alternative — show the human behind the product'
    }
  },
  {
    id: 'comp-3',
    name: 'Superhuman',
    linkedin_url: 'https://linkedin.com/company/superhuman',
    twitter_handle: '@superhuman',
    notes: 'Heavy on productivity content, targets high performers',
    analysis: {
      content_gaps: [
        'Solo founder content',
        'Indian market',
        'Affordable tier content'
      ],
      differentiation_opportunities: [
        'Accessible and relatable vs their premium positioning',
        'Focus on solo founders vs their enterprise users',
        'Show real usage vs aspirational lifestyle'
      ],
      posting_frequency_estimate: '5-7 times per week',
      tone_estimate: 'Aspirational, high-performance, slightly elitist',
      recommended_response_strategy: 'Position as the real founder tool vs the premium aspirational tool'
    }
  }
];

export const MOCK_BRAND_VOICE = {
  voice_summary: 'Authentic and direct founder voice with strong numbers-first storytelling. Writes like a smart friend who happens to run a successful startup — never corporate, always real. Uses data to tell human stories.',
  characteristics: [
    {
      trait: 'Numbers-first storytelling',
      description: 'Always opens with a specific number or metric before any narrative',
      example: '"I quit my job 8 months ago" and "₹2.4L MRR"'
    },
    {
      trait: 'Radical transparency',
      description: 'Shares actual revenue, failures, and decisions publicly',
      example: '"Month 1: ₹0" and "I almost shut down in month 4"'
    },
    {
      trait: 'Short punchy sentences',
      description: 'Rarely writes sentences over 12 words. Uses line breaks aggressively.',
      example: '"The product is not the hard part. The hard part is staying focused."'
    },
    {
      trait: 'Question closers',
      description: 'Almost always ends with a question to drive comments',
      example: '"What did you say no to this week?" and "Who are you building for?"'
    }
  ],
  do_list: [
    'Start with a specific number or timeframe',
    'Use short lines with generous white space',
    'End with a question that invites the reader to share their experience',
    'Include real revenue numbers and metrics',
    'Write in first person, past tense for stories'
  ],
  dont_list: [
    'Never use corporate buzzwords like leverage, synergy, or ecosystem',
    'Never write paragraphs longer than 3 lines',
    'Never start with "I am excited to announce"',
    'Never hide behind vague language when a number will do',
    'Never post without a clear point of view'
  ],
  tone_words: ['Authentic', 'Direct', 'Transparent', 'Human', 'Data-driven', 'Approachable'],
  writing_prompt: 'Write like a smart, successful Indian startup founder who shares their real journey openly. Use specific numbers. Short sentences. First person. End with a question. Never use corporate language. Sound like a person, not a brand.'
};

export const MOCK_CHAT_MESSAGES = [
  {
    id: 'mock-msg-1',
    role: 'assistant' as const,
    content: "Hey! I'm your Social Media Agent. I can write LinkedIn posts, Twitter threads, repurpose your content, and help you build a consistent presence. What would you like to create today?",
    timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString()
  },
  {
    id: 'mock-msg-2',
    role: 'user' as const,
    content: 'Write me a LinkedIn post about hitting ₹2.4L MRR',
    timestamp: new Date(Date.now() - 4 * 60 * 1000).toISOString()
  },
  {
    id: 'mock-msg-3',
    role: 'assistant' as const,
    content: "Great milestone to share! I've written a post for all 4 platforms. The LinkedIn version leads with the journey (Month 1 to Month 18) which tends to get 3x more engagement than just announcing the number. Check the right panel — you can edit any version before publishing.",
    timestamp: new Date(Date.now() - 3 * 60 * 1000).toISOString()
  },
  {
    id: 'mock-msg-4',
    role: 'user' as const,
    content: 'Can you also make it shorter for Twitter?',
    timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString()
  },
  {
    id: 'mock-msg-5',
    role: 'assistant' as const,
    content: "Updated the Twitter version — cut it to 8 lines, leads with the number, ends with the question. 247 characters. The LinkedIn version is unchanged.",
    timestamp: new Date(Date.now() - 1 * 60 * 1000).toISOString()
  }
];
