export const demoCorpus = [
  {
    path: 'demo/001.json',
    parsed: {
      pmid: '420001',
      title: 'Phase II immunotherapy response summary',
      population: { description: 'Adults with metastatic melanoma', sample_size: 128 },
      endpoints: [
        {
          endpoint_phrase: 'overall_response_rate',
          point_estimate: 0.42,
          confidence_interval: { lower: 0.34, upper: 0.5 },
          adverse_events: [
            { event: 'rash', mechanism_of_action: null, severity: '2' },
            { event: 'fatigue', mechanism_of_action: 'immune-mediated', severity: '1' },
          ],
        },
        {
          endpoint_phrase: 'progression_free_survival_6mo',
          point_estimate: 0.55,
          confidence_interval: { lower: 0.47, upper: 0.63 },
          adverse_events: null,
        },
      ],
      extraction_notes: null,
    },
  },
  {
    path: 'demo/002.json',
    parsed: {
      pmid: '420002',
      title: 'Dose escalation tolerability assessment',
      population: { description: 'Adults with solid tumors', sample_size: 64 },
      endpoints: [
        {
          endpoint_phrase: 'dose_limiting_toxicity_rate',
          point_estimate: 0.11,
          confidence_interval: { lower: 0.05, upper: 0.2 },
          adverse_events: [
            { event: 'transaminitis', mechanism_of_action: null, severity: '3' },
          ],
        },
      ],
      extraction_notes: 'Expand AE coding taxonomy next revision.',
    },
  },
  {
    path: 'demo/003.json',
    parsed: {
      pmid: '420003',
      title: 'Comparator arm efficacy snapshot',
      population: { description: 'Adults; heavily pre-treated', sample_size: 203 },
      endpoints: [
        {
          endpoint_phrase: 'overall_survival_12mo',
          point_estimate: 0.67,
          adverse_events: null,
          subgroup_breakouts: [
            { label: 'PD-L1 high', value: 0.74 },
            { label: 'PD-L1 low', value: 0.58 },
            { label: 'unknown', value: 0.61 },
          ],
        },
      ],
      extraction_notes: null,
      rationale_paragraph: 'Model often emits long prose here despite downstream consumer reading only the final score.',
    },
  },
  {
    path: 'demo/004.json',
    parsed: {
      pmid: '420004',
      title: 'Safety follow-up addendum',
      population: { description: 'Adults with renal impairment', sample_size: 47 },
      endpoints: [
        {
          endpoint_phrase: 'grade_3plus_adverse_events',
          point_estimate: 0.28,
          adverse_events: [
            { event: 'neutropenia', mechanism_of_action: null, severity: '3' },
            { event: 'anemia', mechanism_of_action: null, severity: '2' },
            { event: 'nausea', mechanism_of_action: null, severity: '1' },
          ],
        },
      ],
      extraction_notes: null,
    },
  },
] as const
