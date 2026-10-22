/**
 * evolutionaryBiologyFixture.js
 *
 * Realistic External AI Output for:
 * Domain D: Evolutionary Biology & Population Genetics
 *
 * Demonstrates Category D (A Different Domain - Life Sciences / Biological Mathematics):
 * - Rigorous mathematical biology: Wright-Fisher model, diffusion approximations, Coalescent theory, Price equation
 * - Anti-generic: goes far beyond high-school natural selection to stochastic gene genealogy and neutral theory
 * - Learning vs Doing separation: mathematical/mechanistic derivations distinct from sequence analysis & coalescent simulations
 */

export const EVOLUTIONARY_BIOLOGY_OUTPUT = {
  rawResponse: `# UNIVERSAL DEEP RESEARCH DOSSIER & ROADMAP
## Domain: Evolutionary Biology & Population Genetics
## Provider: Frontier AI / Evolutionary Synthesis Engine
## Timestamp: 2026-10-10

### PHASE 1 — FIELD RECONSTRUCTION
Evolutionary Biology and Population Genetics is the quantitative discipline investigating allele frequency dynamics, stochastic genealogical drift, natural selection, and genome architecture evolution under probabilistic mathematical frameworks.
- **Boundaries**: Strictly differentiated from descriptive organismal anatomy or informal evolutionary psychology; focuses on explicit mathematical models of frequency change, coalescent tree topology, and statistical genomics.
- **Taxonomies**:
  1. Classical Population Genetics (Deterministic selection, Wright-Fisher drift, mutation-selection balance)
  2. Diffusion Approximations & Neutral Theory (Kimura drift equations, fixation probabilities, nearly neutral dynamics)
  3. Coalescent Theory & Gene Genealogies (Kingman n-coalescent, time to most recent common ancestor [TMRCA], recombination graphs)
  4. Statistical Population Genomics & Demographic Inference (Site Frequency Spectrum, Tajima's D, selective sweep scans)

### PHASE 2 — HISTORICAL & INTELLECTUAL LINEAGE
- **Seminal Works**:
  - Fisher, R. A. "The Genetical Theory of Natural Selection" (Clarendon Press, 1930) [SRC-BIO-01]
  - Wright, S. "Evolution in Mendelian Populations" (Genetics, 1931) [SRC-BIO-02]
  - Kimura, M. "Evolutionary Rate at the Molecular Level" (Nature, 1968) [SRC-BIO-03]
  - Kingman, J. F. C. "The Coalescent" (Stochastic Processes and their Applications, 1982) [SRC-BIO-04]
  - Hudson, R. R. "Generating samples under a Wright-Fisher neutral model of genetic variation" (Bioinformatics, 2002) [SRC-BIO-05]
  - Wakeley, J. "Coalescent Theory: An Introduction" (Roberts & Company, 2009) [SRC-BIO-06]
`,
  canonicalJson: {
    schemaVersion: '2.3.0',
    learnerContext: {
      goal: 'Evolutionary Biology & Population Genetics',
      targetDestination: 'Computational Population Geneticist capable of modeling stochastic allele dynamics, performing coalescent demographic inference, and detecting selection signals from whole-genome sequences.',
      currentLevel: 'INTERMEDIATE',
      purpose: 'ACADEMIC_RESEARCH'
    },
    fieldIntelligence: {
      fieldDefinition: 'Quantitative mathematical modeling of genetic variation, allele frequency change, stochastic genealogical coalescence, and natural selection across populations.',
      historicalLineage: [
        { era: '1908-1930s', milestone: 'Modern Synthesis: Fisher, Wright, and Haldane reconcile Mendelian genetics with Darwinian selection via statistical mechanics.' },
        { era: '1968-1980s', milestone: 'Molecular Revolution & Neutral Theory: Motoo Kimura and Tomoko Ohta demonstrate that most molecular variation is driven by neutral or nearly neutral drift rather than positive selection.' },
        { era: '1982-2000s', milestone: 'Genealogical Inversion: J.F.C. Kingman formulates the coalescent, shifting population genetics from forward time projection to backward genealogical tree tracing.' },
        { era: '2010s-Present', milestone: 'Whole-genome sequencing, ancient DNA (aDNA) paleogenomics, and deep-learning inference of complex demographic histories.' }
      ],
      foundationalIdeas: [
        'Hardy-Weinberg equilibrium as null hypothesis of zero evolutionary forces',
        'Wright-Fisher stochastic binomial sampling drift and effective population size (Ne)',
        'Kimura neutral theory of molecular evolution: substitution rate equals neutral mutation rate (k = u)',
        'Kingman n-coalescent: pairwise coalescence probability as geometric/exponential random variable (lambda = choose(k, 2) / 2Ne)',
        'Site Frequency Spectrum (SFS) and neutrality test statistics (Tajima\'s D, Fay & Wu\'s H)'
      ],
      currentState: 'High-throughput bioinformatic analysis integrating millions of variant sites with Ancestral Recombination Graphs (ARGs) and biobank cohorts.',
      researchFrontier: [
        { topic: 'Scalable inference of full Ancestral Recombination Graphs (ARGs) across tens of thousands of whole genomes', status: 'ACTIVE' },
        { topic: 'Distinguishing polygenic adaptation from background selection and population stratification artifacts', status: 'ACTIVE' }
      ],
      openProblems: [
        'Resolving the "missing heritability" fraction partitioned between rare large-effect variants and ubiquitous tiny polygenic effects',
        'Accurate demographic inference in non-equilibrium populations experiencing continuous spatial gene flow and archaic introgression'
      ],
      durabilityMap: {
        durableSkills: ['Wright-Fisher mathematical modeling', 'Coalescent probability theory', 'Likelihood and Bayesian demographic inference', 'Matrix population dynamics'],
        transferableSkills: ['Stochastic process simulation', 'Markov Chain Monte Carlo (MCMC)', 'Statistical hypothesis testing'],
        toolDependentSkills: ['Specific short-read alignment flags (BWA-MEM)', 'Legacy file format manipulation scripts (VCF/BED tools)'],
        commoditizingSkills: ['Running boilerplate variant calling pipelines without custom quality filtering'],
        vulnerableKnowledge: ['Over-simplified single-locus selection models ignoring linkage disequilibrium and genetic background']
      },
      whatStandardRoadmapWouldMiss: [
        'Effective population size (Ne) vs census size (N): why variance in offspring number drastically accelerates genetic drift',
        'Background selection (Charlesworth): how purifying selection at linked sites mimics positive sweeps and distorts the SFS',
        'Coalescent time-scaling: why backward-in-time coalescent modeling is computationally millions of times faster than forward simulation'
      ],
      highLeverageConcepts: [
        'Coalescent Duality: Any neutral forward-time Wright-Fisher process can be solved backwards in time as a Markov jump process',
        'Tajima\'s D: D < 0 indicates excess of rare variants (selective sweep or population expansion); D > 0 indicates excess of intermediate variants (balancing selection or bottleneck)'
      ],
      bridgeConcepts: [
        'Diffusion equation (Kolmogorov backward/forward) bridging discrete Mendelian counts to continuous probability density functions',
        'Ancestral Recombination Graph (ARG) bridging tree-based coalescent genealogies to chromosome-wide linkage blocks'
      ],
      practicalFailureModes: [
        'Confusing census population size (N) with variance effective population size (Ne)',
        'Treating significant Tajima\'s D deviations as definitive proof of selection without controlling for demographic bottlenecks',
        'Ignoring linkage disequilibrium non-independence when performing genome-wide enrichment tests'
      ],
      sourceLedger: [
        {
          id: 'SRC-BIO-01',
          title: 'The Genetical Theory of Natural Selection',
          authors: ['R. A. Fisher'],
          year: 1930,
          type: 'LANDMARK_WORK',
          recency: 'HISTORICAL',
          verificationStatus: 'SOURCE_VERIFIED'
        },
        {
          id: 'SRC-BIO-03',
          title: 'Evolutionary Rate at the Molecular Level',
          authors: ['Motoo Kimura'],
          year: 1968,
          type: 'LANDMARK_WORK',
          recency: 'HISTORICAL',
          verificationStatus: 'SOURCE_VERIFIED'
        },
        {
          id: 'SRC-BIO-04',
          title: 'The Coalescent',
          authors: ['J. F. C. Kingman'],
          year: 1982,
          type: 'LANDMARK_WORK',
          recency: 'ESTABLISHED',
          verificationStatus: 'SOURCE_VERIFIED'
        },
        {
          id: 'SRC-BIO-06',
          title: 'Coalescent Theory: An Introduction',
          authors: ['John Wakeley'],
          year: 2009,
          type: 'TEXTBOOK_MONOGRAPH',
          recency: 'ESTABLISHED',
          verificationStatus: 'SOURCE_VERIFIED'
        }
      ],
      claims: [
        {
          claim: 'For neutral molecular evolution, the rate of substitution per generation equals the neutral mutation rate per gamete, independent of population size.',
          sourceId: 'SRC-BIO-03',
          confidence: 'HIGH'
        },
        {
          claim: 'In Kingman coalescent for a sample of n lineages, the time interval during which there are k lineages is exponentially distributed with rate k*(k-1)/(4*Ne).',
          sourceId: 'SRC-BIO-04',
          confidence: 'HIGH'
        }
      ],
      roadmapInfluences: [
        {
          finding: 'Kingman coalescent demonstrates that genealogies of neutral genes are determined solely by demographic history backwards in time.',
          whyItMatters: 'Enables rigorous demographic parameter estimation without simulating billions of non-ancestral individuals.',
          roadmapConsequence: 'Dedicated Arc on Coalescent Theory, Gene Genealogies, and TMRCA Inversion.',
          learningDepth: 'DEEP_MASTERY_TARGET',
          taskDesign: 'Derive expected pairwise coalescent time (2*Ne) and implement Kingman genealogical tree sampler in Python/R.',
          projectConsequence: 'Project 2 mandates building an Ancestral Recombination and Demographic Inference Simulator.'
        }
      ]
    },
    learningArcs: [
      {
        id: 'ARC-BIO-01',
        title: 'Allele Frequency Dynamics & Neutral Drift',
        description: 'Master deterministic selection equations, stochastic binomial drift, and the Wright-Fisher diffusion limit.',
        modules: [
          {
            id: 'MOD-BIO-01',
            title: 'Wright-Fisher Binomial Sampling and Heterozygosity Decay',
            learningUnits: [
              {
                title: 'Stochastic Binomial Transition Probabilities',
                depth: 'WORKING_FLUENCY',
                description: 'Understand how finite sample size variance causes random frequency fluctuations of variance p*(1-p)/(2Ne).'
              },
              {
                title: 'Heterozygosity Decay Rate',
                depth: 'WORKING_FLUENCY',
                description: 'Understand why expected heterozygosity decays by a factor of (1 - 1/(2Ne)) per generation under pure drift.'
              }
            ],
            doingTasks: [
              {
                title: 'Simulate Forward Wright-Fisher Population Trajectory',
                mode: 'simulate',
                subtasks: [
                  { title: 'Implement binomial random draws for generation-to-generation allele counts across 1000 replicates' },
                  { title: 'Track time to fixation or loss as a function of initial allele frequency p0 and effective size Ne' },
                  { title: 'Quantify empirical variance in allele frequency over generations and compare against theoretical prediction' }
                ]
              }
            ]
          },
          {
            id: 'MOD-BIO-02',
            title: 'Kingman Coalescent and Gene Genealogy Trees',
            learningUnits: [
              {
                title: 'Backward-in-Time Waiting Times and Tree Topologies',
                depth: 'DEEP_MASTERY_TARGET',
                description: 'Understand why pairwise coalescence dominates and why older branches occupy disproportionately more tree length.'
              }
            ],
            doingTasks: [
              {
                title: 'Implement Kingman Coalescent Tree Sampler',
                mode: 'implement',
                subtasks: [
                  { title: 'Sample exponential waiting times for k lineages down to 1' },
                  { title: 'Construct binary tree with branch lengths and calculate expected TMRCA' },
                  { title: 'Overlay Poisson neutral mutations onto tree branches to generate polymorphic site alignment' }
                ]
              }
            ]
          }
        ]
      },
      {
        id: 'ARC-BIO-02',
        title: 'Selection Signatures & Statistical Genomics',
        description: 'Detect selective sweeps, background selection, and infer demography using genome-wide polymorphism statistics.',
        modules: [
          {
            id: 'MOD-BIO-03',
            title: 'Neutrality Tests and Site Frequency Spectrum (SFS)',
            learningUnits: [
              {
                title: 'Tajima\'s D and Folded SFS Theoretical Expectation',
                depth: 'WORKING_FLUENCY',
                description: 'Understand the difference between pairwise difference estimator (pi) and segregating sites estimator (theta_W).'
              }
            ],
            doingTasks: [
              {
                title: 'Calculate Tajima\'s D from Simulated Sequence Alignments',
                mode: 'analyze',
                subtasks: [
                  { title: 'Extract segregating sites and compute nucleotide diversity (pi) and Watterson theta' },
                  { title: 'Evaluate Tajima\'s D statistic variance using simulated null distribution' },
                  { title: 'Contrast selective sweep signature against sudden demographic expansion' }
                ]
              }
            ]
          }
        ]
      }
    ],
    projects: [
      {
        id: 'PROJ-BIO-00',
        name: 'Forward Wright-Fisher Stochastic Simulation & Diffusion Fixation',
        description: 'Implement a discrete Wright-Fisher binomial sampling simulator and compare fixation probabilities against Kimura diffusion approximations.',
        scaffoldingLevel: 'GUIDED',
        prerequisites: ['Deterministic Selection & Stochastic Drift'],
        capabilitiesExercised: [
          'Binomial random generation in discrete generations',
          'Kimura fixation probability formula implementation',
          'Monte Carlo convergence verification'
        ],
        knowledgeReused: ['Hardy-Weinberg equilibrium', 'Binomial variance'],
        newConcepts: ['Absorption states', 'Diffusion Kolmogorov backward equation'],
        constraints: ['Replicate 10,000 independent trajectories under s=0.01 and Ne=500'],
        failureModes: [
          'Off-by-one generation indexing truncating trajectory prior to fixation/loss',
          'Floating point underflow during Kimura exponential integration'
        ],
        whatFailureTeaches: 'Demonstrates boundary behavior when allele frequencies approach 0 or 1 under strong selection.',
        evidenceExpected: 'Jupyter notebook with trajectory histograms and analytical curve overlay.',
        unlocksNext: 'Coalescent Demographic Inference Engine.'
      },
      {
        id: 'PROJ-BIO-01',
        name: 'Coalescent Demographic Inference Engine',
        description: 'Build a coalescent simulator that models exponential growth, bottlenecks, and infer population size history from genomic SFS.',
        scaffoldingLevel: 'PARTIALLY_GUIDED',
        prerequisites: ['Allele Frequency Dynamics & Neutral Drift'],
        capabilitiesExercised: [
          'Kingman coalescent simulation',
          'Site Frequency Spectrum calculation',
          'Demographic parameter estimation'
        ],
        knowledgeReused: ['Exponential waiting times', 'Poisson mutation distribution'],
        newConcepts: ['Composite likelihood inference', 'Demographic transition matrix'],
        constraints: [
          'Must run in under 5 seconds for sample size n=100',
          'Must accurately recover historical bottleneck parameters within 15% confidence interval'
        ],
        failureModes: [
          'Confusing mutations per site per generation with scaled population mutation rate theta = 4*Ne*u',
          'Failing to scale time in coalescent units (2*Ne generations)'
        ],
        whatFailureTeaches: 'Failure reveals how time parameterization in coalescent models depends critically on Ne.',
        evidenceExpected: 'Working Python script, validation plot comparing simulated SFS to analytical neutral expectation, and bottleneck parameter recovery curves.',
        unlocksNext: 'Ancestral Recombination Graph (ARG) chromosome-wide inference.'
      },
      {
        id: 'PROJ-BIO-02',
        name: 'Genome-Wide Selective Sweep Scanner on Empirical Polygenic Cohort',
        description: 'Design and execute a chromosome-wide scan detecting hard and soft selective sweeps across 1,000 whole-genome sequences using composite statistics.',
        scaffoldingLevel: 'OPEN_ENDED',
        prerequisites: ['Neutrality Tests and Site Frequency Spectrum'],
        capabilitiesExercised: [
          'Sliding-window Tajima D and Fay & Wu H calculation',
          'False discovery rate control on empirical genomic windows',
          'Distinguishing selective sweeps from background selection'
        ],
        knowledgeReused: ['Linkage disequilibrium', 'Recombination rate variation'],
        newConcepts: ['Haplotype homozygosity (H12)', 'Ancient DNA introgression masking'],
        constraints: ['Process 10 million variant sites across 22 autosomes without exceeding memory limits'],
        failureModes: [
          'Conflating demographic population crashes with selective sweeps in low-recombination deserts',
          'Uncorrected ascertainment bias in SNP genotyping arrays'
        ],
        whatFailureTeaches: 'Teaches how demographic history confounds empirical scans of positive selection.',
        evidenceExpected: 'Manhattan scan plots, calibrated FDR tables, and peer-review ready methodology report.',
        unlocksNext: 'Independent Population Genomics Research Practice.'
      }
    ],
    competencies: [
      {
        id: 'COMP-BIO-01',
        name: 'Coalescent Modeling & Genealogy Analysis',
        description: 'Ability to analytically solve and computationally simulate genealogical trees under Kingman coalescent.',
        criteria: ['Can derive expected TMRCA', 'Can simulate SFS under variable Ne']
      }
    ],
    specializations: [
      {
        id: 'SPEC-BIO-01',
        name: 'Paleogenomics & Ancient DNA Demography',
        description: 'Inference of archaic hominin introgression and prehistoric migrations using fragmented ancient genomes.'
      }
    ],
    adaptationRules: {
      rules: [
        {
          condition: 'Learner confuses census population size with effective population size',
          weaknessType: 'CONCEPTUAL',
          action: 'Provide Wright\'s sex ratio and offspring variance Ne derivations with numerical comparison.'
        }
      ]
    }
  }
};
