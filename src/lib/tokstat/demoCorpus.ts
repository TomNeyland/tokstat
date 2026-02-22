export const demoCorpus = [
  {
    path: 'demo/movie-aggregation-001.json',
    parsed: {
      record_type: 'movie_review_aggregation',
      title: 'Glass Harbor',
      release_context: {
        year: 2025,
        genres: ['Mystery', 'Drama', 'Thriller'],
        viewing_context: { platform: 'theatrical', runtime_minutes: 118, language: 'English' },
      },
      critic_reviews: [
        {
          outlet: 'The Daily Screen',
          critic_name: 'Mara Ellison',
          score_normalized: 0.84,
          sentiment: { label: 'positive', confidence: 0.92, rationale: 'Strong performances and a controlled final act.' },
          review_summary: 'A moody coastal mystery elevated by restrained direction and a sharp lead performance.',
          quote_spans: [
            { quote: 'the film weaponizes silence', topic: 'direction', emphasis: 'high' },
            { quote: 'a final reveal that lands', topic: 'ending', emphasis: 'medium' },
          ],
          complaints: [{ topic: 'pacing', detail: 'Slow first act setup', severity: 'low' }],
          spoiler_notes: null,
        },
        {
          outlet: 'Weekend Popcorn',
          critic_name: 'Jules Carter',
          score_normalized: 0.58,
          sentiment: { label: 'mixed', confidence: 0.74, rationale: 'Atmosphere works, but character motivations feel underwritten.' },
          review_summary: 'Beautifully shot and occasionally gripping, but too many twists arrive without enough setup.',
          quote_spans: [
            { quote: 'all fog and no map', topic: 'screenplay', emphasis: 'high' },
          ],
          complaints: [
            { topic: 'characterization', detail: 'Supporting cast is thinly sketched', severity: 'medium' },
            { topic: 'twist_logic', detail: 'Late reveals strain plausibility', severity: 'medium' },
          ],
          spoiler_notes: 'Review mentions the harbor fire flashback reveal in the last paragraph.',
        },
      ],
      critic_consensus: {
        headline: 'Strong atmosphere and performances outweigh some messy plotting.',
        short_blurb: 'A stylish mystery with enough emotional payoff to satisfy most viewers.',
        extended_rationale: null,
        supporting_themes: [
          { theme: 'atmosphere', prevalence: 0.9, explanation: 'Frequent mentions of fog, sound design, and mood.' },
          { theme: 'performances', prevalence: 0.82, explanation: 'Lead and supporting performances repeatedly cited as strengths.' },
          { theme: 'plot_clarity', prevalence: 0.48, explanation: 'Twist logic and motivation criticism appears in mixed reviews.' },
        ],
      },
      audience_takeaways: [
        {
          segment: 'mystery_fans',
          likely_reaction: 'positive',
          reasons: ['tense mood', 'good ending payoff'],
          counterpoint: null,
        },
        {
          segment: 'plot_logic_sensitive',
          likely_reaction: 'mixed',
          reasons: ['twists may feel abrupt'],
          counterpoint: 'Viewers who prioritize mood over procedural logic may still enjoy it.' ,
        },
      ],
      content_advisories: {
        overall_intensity: 'moderate',
        categories: [
          { category: 'violence', severity: 'moderate', examples: ['harbor fire aftermath', 'brief fight sequence'], guidance_note: null },
          { category: 'language', severity: 'mild', examples: ['infrequent strong language'], guidance_note: null },
          { category: 'themes', severity: 'moderate', examples: ['grief', 'guilt'], guidance_note: 'Emotional themes are sustained throughout.' },
        ],
      },
      watch_recommendation: {
        who_should_watch: 'Viewers who enjoy character-driven mysteries with a moody visual style.',
        who_might_skip: 'Anyone looking for fast-paced procedural plotting.',
        comparison_titles: ['Mare of Easttown', 'Wind River'],
      },
      alternate_marketing_copy: null,
    },
  },
  {
    path: 'demo/movie-aggregation-002.json',
    parsed: {
      record_type: 'movie_review_aggregation',
      title: 'Turbo Pets: City Shift',
      release_context: {
        year: 2026,
        genres: ['Animation', 'Comedy', 'Family'],
        viewing_context: { platform: 'streaming', runtime_minutes: 94, language: 'English' },
      },
      critic_reviews: [
        {
          outlet: 'KidScreen Weekly',
          critic_name: 'Nina Park',
          score_normalized: 0.79,
          sentiment: { label: 'positive', confidence: 0.88, rationale: 'Bright pacing and reliable humor for younger viewers.' },
          review_summary: 'A fast, funny sequel with enough visual inventiveness to keep parents engaged.',
          quote_spans: [
            { quote: 'a sugar-rush done right', topic: 'pacing', emphasis: 'medium' },
          ],
          complaints: [{ topic: 'villain', detail: 'Villain arc feels rushed', severity: 'low' }],
          spoiler_notes: null,
        },
      ],
      critic_consensus: {
        headline: 'Energetic family sequel with strong visuals and thin but effective storytelling.',
        short_blurb: 'More fun than memorable, but easy to recommend for family movie night.',
        extended_rationale: 'Reviewers consistently praise color design, joke density, and kid appeal, while noting familiar sequel plotting.',
        supporting_themes: [
          { theme: 'visual_style', prevalence: 0.91, explanation: 'Animation quality is the most repeated praise point.' },
          { theme: 'family_humor', prevalence: 0.78, explanation: 'Reviews mention jokes that land for both kids and adults.' },
          { theme: 'story_originality', prevalence: 0.39, explanation: 'Many reviews call the plot predictable.' },
        ],
      },
      audience_takeaways: [
        { segment: 'young_kids', likely_reaction: 'positive', reasons: ['bright visuals', 'talking-animal comedy'], counterpoint: null },
        { segment: 'animation_fans', likely_reaction: 'mixed', reasons: ['great design work'], counterpoint: 'Story may feel conventional compared with top-tier animation releases.' },
      ],
      content_advisories: {
        overall_intensity: 'mild',
        categories: [
          { category: 'cartoon_peril', severity: 'mild', examples: ['vehicle chase', 'comic falls'], guidance_note: null },
          { category: 'language', severity: 'very_mild', examples: ['name-calling'], guidance_note: null },
        ],
      },
      watch_recommendation: {
        who_should_watch: 'Families with kids under 12 and viewers looking for a light, colorful comedy.',
        who_might_skip: 'Adults wanting a more ambitious animated story.',
        comparison_titles: ['The Secret Life of Pets', 'Teenage Mutant Ninja Turtles: Mutant Mayhem'],
      },
      alternate_marketing_copy: {
        short_tagline: 'Big city, bigger chaos, fastest paws in town.',
        platform_blurb: 'A lovable crew of super-speed pets races across the city to save their neighborhood from a flashy tech tycoon.',
        social_caption_variants: [
          'Family movie night just got faster.',
          'Color, chaos, and comedy in one turbo-charged sequel.',
          null,
        ],
      },
    },
  },
  {
    path: 'demo/tv-recap-001.json',
    parsed: {
      record_type: 'tv_episode_recap',
      series_title: 'Stonebridge',
      season_number: 2,
      episode_number: 5,
      episode_title: 'What the River Keeps',
      recap: {
        cold_open: {
          summary: 'The episode opens on a nighttime dredging crew discovering a damaged lockbox in the riverbed.',
          unresolved_hooks: ['Who placed the lockbox there?', 'Why does Lena recognize the insignia?'],
        },
        story_threads: [
          {
            thread_name: 'Lena investigates the lockbox',
            importance: 'primary',
            beat_sequence: [
              {
                beat: 'Lena hides the insignia from the rest of the task force',
                motivation: 'She suspects a link to her brother’s disappearance.',
                evidence_quotes: [
                  'I need one hour before this gets logged.',
                  'If this seal is what I think it is, we do this quietly.',
                ],
                consequence: 'Trust tension grows with Omar.',
              },
              {
                beat: 'She meets a retired dockmaster who identifies the mark',
                motivation: 'Confirm whether the symbol belonged to a smuggling route.',
                evidence_quotes: ['That stamp died with the old ferry syndicate.'],
                consequence: 'Points the team toward a warehouse ledger.',
              },
            ],
            thread_resolution: null,
          },
          {
            thread_name: 'Omar and June tail the campaign donor',
            importance: 'secondary',
            beat_sequence: [
              {
                beat: 'The donor abandons a phone near city hall',
                motivation: 'Create a false trail before the hearing.',
                evidence_quotes: null,
                consequence: 'The tail operation fractures and June misses the pickup.',
              },
            ],
            thread_resolution: 'They recover partial audio from the discarded phone but miss the handoff.',
          },
        ],
        ending_explained: {
          cliffhanger: 'Lena opens the ledger and finds her brother’s signature on an entry dated after his presumed death.',
          plain_english_explanation: 'The episode reveals he may have survived long enough to work with the ferry syndicate, raising doubts about Lena’s memories and the original case timeline.',
          alternate_interpretations: [
            'The signature could be forged to manipulate Lena.',
            null,
            'A records clerk may have reused his initials as shorthand, not a literal signature.',
          ],
        },
      },
      character_arcs: [
        {
          character: 'Lena',
          episode_shift: 'moves from procedural caution to personal secrecy',
          supporting_moments: [
            { moment: 'withholds evidence photo', impact: 'trust erosion', confidence: 0.86 },
            { moment: 'lies to Omar about dockmaster meeting', impact: 'trust erosion', confidence: 0.81 },
          ],
          open_questions: ['Is Lena protecting someone in her family?', null],
        },
        {
          character: 'June',
          episode_shift: 'becomes more assertive in field operations',
          supporting_moments: [{ moment: 'disobeys stand-down order during tail', impact: 'competence signal', confidence: 0.69 }],
          open_questions: null,
        },
      ],
      viewer_guidance: {
        spoiler_free_hook: 'A river discovery reopens the show’s central mystery and pushes Lena into risky decisions.',
        if_you_lost_the_plot: 'Focus on the ferry syndicate symbol and the recovered ledger; those are the key developments.',
        skip_or_watch_recommendation: 'watch',
      },
      recap_variants: {
        one_sentence: 'A riverbed lockbox ties Lena’s personal history to the ferry syndicate and ends with a signature that changes the case timeline.',
        social_thread: null,
      },
    },
  },
  {
    path: 'demo/tv-recap-002.json',
    parsed: {
      record_type: 'tv_episode_recap',
      series_title: 'Kitchen Kingdom',
      season_number: 1,
      episode_number: 8,
      episode_title: 'Heat Check',
      recap: {
        cold_open: {
          summary: 'The chefs arrive to find the pantry divided into “sweet” and “savory” zones with a surprise pastry challenge twist.',
          unresolved_hooks: ['Why is chef Marisol missing during roll call?'],
        },
        story_threads: [
          {
            thread_name: 'Pastry twist destabilizes front-runners',
            importance: 'primary',
            beat_sequence: [
              {
                beat: 'Dante burns his caramel and pivots to a brittle garnish',
                motivation: 'Avoid restarting after losing time',
                evidence_quotes: ['I can save this if I stop chasing perfection.'],
                consequence: 'Judges praise adaptability despite uneven plating.',
              },
            ],
            thread_resolution: 'Dante survives and moves into the top three.',
          },
          {
            thread_name: 'Marisol returns with an injury update',
            importance: 'secondary',
            beat_sequence: [
              {
                beat: 'She reveals a wrist strain but refuses immunity option',
                motivation: 'Wants to earn a finals spot without accommodation',
                evidence_quotes: ['If I go through, I want it to count.'],
                consequence: 'Creates emotional centerpiece of the episode.',
              },
            ],
            thread_resolution: null,
          },
        ],
        ending_explained: {
          cliffhanger: 'A surprise double elimination is announced after the challenge scores are read.',
          plain_english_explanation: 'The episode sets up a compressed semifinal, raising stakes for weaker contestants who would normally survive another round.',
          alternate_interpretations: [null, 'Producers may reverse one elimination in a later twist, based on editing emphasis.'],
        },
      },
      character_arcs: [
        {
          character: 'Marisol',
          episode_shift: 'from underdog to emotional frontrunner',
          supporting_moments: [{ moment: 'competes through wrist strain', impact: 'audience sympathy', confidence: 0.94 }],
          open_questions: ['Will the injury affect next week?', 'Can she handle another dessert challenge?'],
        },
      ],
      viewer_guidance: {
        spoiler_free_hook: 'A pastry twist and injury reveal turn a routine challenge into the season’s most dramatic episode.',
        if_you_lost_the_plot: null,
        skip_or_watch_recommendation: 'watch',
      },
      recap_variants: {
        one_sentence: 'A surprise pastry challenge scrambles the leaderboard and ends with a double-elimination cliffhanger.',
        social_thread: [
          'Episode 8 opens with a pantry split twist that immediately catches the front-runners off guard.',
          'Marisol returns with a wrist strain and refuses a softer path, which becomes the emotional core of the hour.',
          null,
          'The judges announce a double elimination, setting up a brutal semifinal.',
        ],
      },
    },
  },
  {
    path: 'demo/catalog-enrichment-001.json',
    parsed: {
      record_type: 'streaming_catalog_enrichment',
      title: 'Glass Harbor',
      title_type: 'movie',
      storefront_copy: {
        headline: 'A quiet harbor town. A buried secret. A detective who knows too much.',
        synopsis_short: 'A detective revisits a cold case after a river dredging crew uncovers evidence tied to a decades-old fire.',
        synopsis_long: 'When a damaged lockbox is pulled from the harbor floor, a detective is forced to confront a case that shaped her family and divided the town. As old alliances resurface, the investigation exposes a smuggling network and a trail of compromised memories.',
        why_youll_like_it: [
          { audience: 'mystery fans', reason: 'Tense atmosphere and layered clues', evidence_style: 'critic_consensus' },
          { audience: 'drama viewers', reason: 'Strong character conflict and grief themes', evidence_style: 'review_excerpts' },
        ],
      },
      discovery_labels: {
        mood: ['tense', 'moody', 'melancholic'],
        themes: [
          { theme: 'grief', explanation: 'The plot repeatedly returns to unresolved family trauma.' },
          { theme: 'corruption', explanation: 'Local institutions and donors are implicated in the cover-up.' },
          { theme: 'memory', explanation: null },
        ],
        content_signals: { violence: 'moderate', language: 'mild', frightening_images: 'moderate' },
      },
      recommendation_blurbs: {
        because_you_watched: [
          { seed_title: 'Mare of Easttown', blurb: 'Another bleak, character-forward mystery anchored by a grieving investigator.' },
          { seed_title: 'Broadchurch', blurb: 'Slow-burn coastal mystery with emotional fallout at the center.' },
        ],
        skip_note: null,
      },
      localization_variants: [
        {
          locale: 'en-US',
          synopsis_short_variant: null,
          promotional_taglines: ['Secrets don\'t stay buried forever.', 'The harbor remembers.'],
        },
        {
          locale: 'en-GB',
          synopsis_short_variant: 'A detective revisits a cold case after a dredging crew surfaces evidence tied to an old harbour fire.',
          promotional_taglines: ['The harbour keeps its own ledger.'],
        },
      ],
      artwork_copy_overrides: {
        hero_image_text: 'Every town has a version of the truth.',
        trailer_hook: null,
      },
    },
  },
  {
    path: 'demo/catalog-enrichment-002.json',
    parsed: {
      record_type: 'streaming_catalog_enrichment',
      title: 'Turbo Pets: City Shift',
      title_type: 'movie',
      storefront_copy: {
        headline: 'Fast paws. Big city. Bigger trouble.',
        synopsis_short: 'A team of super-speed pets races across the city to stop a flashy tech mogul from rewriting neighborhood life.',
        synopsis_long: null,
        why_youll_like_it: [
          { audience: 'family movie night', reason: 'Colorful visuals and rapid-fire jokes', evidence_style: 'audience_takeaways' },
          { audience: 'animation fans', reason: 'Inventive city design and energetic action staging', evidence_style: 'critic_reviews' },
        ],
      },
      discovery_labels: {
        mood: ['playful', 'chaotic', 'uplifting'],
        themes: [
          { theme: 'friendship', explanation: 'The team dynamic drives the plot and resolution.' },
          { theme: 'community', explanation: 'Neighborhood stakes are central to the conflict.' },
          { theme: 'technology', explanation: 'A gadget-heavy villain frames the city-wide disruption.' },
        ],
        content_signals: { violence: 'very_mild', language: 'very_mild', frightening_images: null },
      },
      recommendation_blurbs: {
        because_you_watched: [
          { seed_title: 'The Secret Life of Pets', blurb: 'Animal-led comedy with big-city chaos and kid-friendly pacing.' },
        ],
        skip_note: 'Adults seeking a more emotionally layered animated film may find the story too thin.',
      },
      localization_variants: [
        {
          locale: 'en-US',
          synopsis_short_variant: null,
          promotional_taglines: ['The city is their playground.', 'Ready. Set. Zoom.'],
        },
      ],
      artwork_copy_overrides: {
        hero_image_text: null,
        trailer_hook: 'One upgrade. One villain. One wildly overqualified pet squad.',
      },
    },
  },
] as const
