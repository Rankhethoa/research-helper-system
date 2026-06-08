/* 
   RULE-BASED FALLBACK ENGINE
   Topics are composed from four layers:
     1. Discipline template bank  — 2-3 seed topics per field
     2. Methodology modifier      — shapes the angle based on method preference
     3. Level modifier            — adjusts scope/framing for academic level
     4. Keyword injection         — weaves user keywords into titles/questions
 */

const TOPIC_BANK = {
"Computer Science & AI": [
  {
    title:            "Bias mitigation in large language models for low-resource languages",
    summary:          "Investigates how training data imbalances produce systematic bias in LLMs when applied to underrepresented languages, and proposes debiasing strategies that preserve linguistic fidelity.",
    researchQuestion: "How do existing debiasing techniques perform across typologically diverse low-resource languages, and what novel approaches best reduce bias without degrading fluency?",
    gap:              "Most debiasing research focuses on English; cross-lingual and low-resource contexts remain understudied, particularly for agglutinative and tonal languages.",
    methods:          ["Cross-lingual benchmark evaluation", "Fine-tuning with curated multilingual corpora", "Human evaluation with native speaker panels"],
    interdisc:        "Draws on linguistics, sociolinguistics, and ethics in AI to frame and assess fairness criteria.",
    variations: [
      { title: "Fairness metrics for multilingual NLP pipelines",          angle: "Focuses on evaluation rather than mitigation, proposing new fairness metrics suited to code-switched text." },
      { title: "Low-resource language adaptation via transfer learning",   angle: "Examines how knowledge from high-resource languages can be transferred without amplifying existing biases." },
      { title: "Community-driven dataset curation for minority languages", angle: "Explores participatory data collection as a structural solution to representation gaps." },
    ],
  },
  {
    title:            "Explainability of deep reinforcement learning agents in safety-critical systems",
    summary:          "Examines methods for generating human-interpretable explanations of decisions made by deep RL agents deployed in healthcare, autonomous vehicles, and industrial control.",
    researchQuestion: "Which post-hoc and ante-hoc explainability techniques most reliably expose the reasoning of deep RL agents without compromising task performance?",
    gap:              "Explainability research has matured for supervised learning but lags significantly for RL, where sequential decision-making and sparse rewards complicate attribution.",
    methods:          ["Saliency mapping and attention visualisation", "Counterfactual trajectory analysis", "User studies with domain experts"],
    interdisc:        "Connects human-computer interaction, cognitive science, and regulatory compliance.",
    variations: [
      { title: "Reward shaping for inherently interpretable RL policies",     angle: "Designs reward functions that encourage the agent to adopt interpretable decision rules from the outset." },
      { title: "Natural-language policy summarisation for RL agents",         angle: "Automatically generates plain-English descriptions of learned policies for non-expert stakeholders." },
      { title: "Auditing RL systems in clinical decision support",            angle: "Applies explainability auditing frameworks specifically to treatment-recommendation agents." },
    ],
  },
  {
    title:            "Energy-efficient federated learning for edge IoT networks",
    summary:          "Proposes adaptive aggregation protocols that reduce the communication and computation overhead of federated learning on resource-constrained IoT edge devices.",
    researchQuestion: "How can federated learning algorithms be redesigned to minimise energy consumption on heterogeneous edge devices while maintaining model accuracy and data privacy?",
    gap:              "Current federated learning frameworks assume relatively capable clients; the specific constraints of ultra-low-power IoT hardware are rarely addressed.",
    methods:          ["Simulation on NS-3 / TensorFlow Federated", "Energy profiling on embedded hardware", "Differential privacy analysis"],
    interdisc:        "Bridges distributed systems, network engineering, and sustainability computing.",
    variations: [
      { title: "Asynchronous federated learning for unreliable sensor networks",       angle: "Handles intermittent connectivity by decoupling local training from global aggregation rounds." },
      { title: "Model compression techniques for on-device federated training",        angle: "Applies pruning and quantisation before local training to fit models onto microcontrollers." },
      { title: "Privacy-preserving federated anomaly detection in smart grids",        angle: "Applies the framework to energy infrastructure monitoring as a motivating use case." },
    ],
  },
],

"Biology & Life Sciences": [
  {
    title:            "CRISPR-Cas12 off-target editing rates in primary human haematopoietic stem cells",
    summary:          "Systematically characterises the frequency and genomic distribution of unintended CRISPR-Cas12 edits in clinically relevant stem cell populations, comparing delivery modalities.",
    researchQuestion: "Do electroporation-delivered ribonucleoprotein complexes produce fewer off-target edits than lentiviral delivery in human haematopoietic stem cells, and which genomic loci are most vulnerable?",
    gap:              "Off-target profiling has focused on transformed cell lines; primary stem cells present distinct chromatin accessibility and repair pathway activity that alters editing fidelity.",
    methods:          ["GUIDE-seq and CIRCLE-seq off-target detection", "Long-read whole-genome sequencing", "Flow cytometry for cell-type validation"],
    interdisc:        "Interfaces with clinical haematology, bioethics of germline editing, and regulatory genomics.",
    variations: [
      { title: "Base editing precision in patient-derived iPSCs for sickle cell disease",        angle: "Narrows focus to single-nucleotide correction strategies with lower double-strand break risk." },
      { title: "Epigenomic consequences of CRISPR editing in quiescent stem cells",              angle: "Investigates whether editing alters DNA methylation patterns beyond the target locus." },
      { title: "High-throughput screening of guide RNA designs for minimal off-target activity", angle: "Develops a scalable pipeline to rank guide RNAs by predicted and measured fidelity." },
    ],
  },
  {
    title:            "Gut microbiome composition as a mediator of antidepressant treatment response",
    summary:          "Explores the bidirectional gut-brain axis to determine whether baseline microbiome diversity predicts SSRI efficacy and whether microbiome modulation enhances treatment outcomes.",
    researchQuestion: "Does pre-treatment gut microbiome alpha diversity predict remission in patients with major depressive disorder receiving SSRIs, and which taxa are most predictive?",
    gap:              "Clinical trials rarely collect microbiome data alongside psychiatric outcomes; the mechanistic link between specific microbial metabolites and serotonin signalling is poorly characterised.",
    methods:          ["16S rRNA amplicon sequencing", "Shotgun metagenomics", "Longitudinal mixed-effects modelling"],
    interdisc:        "Bridges psychiatry, microbiology, nutritional science, and pharmacology.",
    variations: [
      { title: "Probiotic supplementation as adjunct therapy in treatment-resistant depression",     angle: "Tests whether targeted probiotic administration improves outcomes for non-responders." },
      { title: "Faecal microbiota transplantation effects on anxiety in murine models",             angle: "Uses animal models to establish mechanistic causal pathways before clinical translation." },
      { title: "Dietary fibre intake, microbiome diversity, and mood disorder incidence",           angle: "Takes an epidemiological approach using dietary recall data and population biobanks." },
    ],
  },
  {
    title:            "Thermal plasticity of coral photosymbiont communities under projected ocean warming",
    summary:          "Quantifies how Symbiodiniaceae community composition shifts under elevated sea surface temperatures and whether symbiont switching confers bleaching resistance in keystone coral species.",
    researchQuestion: "Do corals that harbour thermally tolerant Durusdinium clades show significantly higher survival rates under +2°C warming, and what drives inter-colony variation in symbiont shuffling?",
    gap:              "Most bleaching studies use a single temperature treatment; the dynamics of symbiont community reassembly across a temperature gradient over recovery periods are understudied.",
    methods:          ["ITS2 amplicon sequencing of Symbiodiniaceae", "PAM fluorometry for photosynthetic efficiency", "Mesocosm thermal stress experiments"],
    interdisc:        "Connects marine ecology, climate science, conservation biology, and evolutionary biology.",
    variations: [
      { title: "Assisted evolution: inoculating corals with thermally tolerant symbionts",               angle: "Tests active intervention as a reef conservation strategy." },
      { title: "Epigenetic memory of thermal stress in successive coral generations",                    angle: "Investigates whether prior heat exposure primes offspring for improved tolerance." },
      { title: "Combined stressor effects: acidification and warming on Symbiodiniaceae diversity",      angle: "Extends the thermal focus to include ocean acidification as an interacting variable." },
    ],
  },
],

"Physics & Astronomy": [
  {
    title:            "Gravitational wave signatures and neutron star equation-of-state constraints",
    summary:          "Uses matched-filter analysis of LIGO-Virgo-KAGRA merger events to constrain the nuclear equation of state of dense matter, with implications for understanding quark-hadron transitions.",
    researchQuestion: "Which equation-of-state models are most consistent with the tidal deformability parameters extracted from observed binary neutron star merger waveforms?",
    gap:              "Current event samples are small; systematic uncertainties in waveform modelling at high frequencies introduce degeneracies that limit equation-of-state discrimination.",
    methods:          ["Bayesian parameter estimation (LALInference / Bilby)", "Gaussian process emulators for equation-of-state models", "Simulation of post-merger oscillation spectra"],
    interdisc:        "Spans nuclear physics, general relativity, and observational astrophysics.",
    variations: [
      { title: "Post-merger gravitational wave emission and remnant neutron star stability",                angle: "Focuses on the kilohertz signal after merger to probe maximum neutron star mass." },
      { title: "Multi-messenger constraints combining gravitational waves and X-ray pulse profiles",       angle: "Integrates NICER radius measurements with GW tidal data for joint inference." },
      { title: "Equation-of-state sensitivity of dynamical ejecta in neutron star mergers",               angle: "Links nuclear physics to kilonova light-curve predictions." },
    ],
  },
  {
    title:            "Topological phase transitions in two-dimensional quantum materials under strain",
    summary:          "Investigates how mechanical strain engineering tunes topological invariants in monolayer transition metal dichalcogenides, enabling on-demand switching between trivial and non-trivial phases.",
    researchQuestion: "At what critical strain thresholds do monolayer MoS₂ and WSe₂ undergo topological phase transitions, and how do edge state signatures manifest in transport measurements?",
    gap:              "Theoretical predictions of strain-induced topological transitions outpace experimental verification; reproducible strain application at the monolayer scale remains technically demanding.",
    methods:          ["Density functional theory with spin-orbit coupling", "Scanning tunnelling microscopy and spectroscopy", "Four-probe transport under controlled biaxial strain"],
    interdisc:        "Bridges condensed matter physics, materials science, and nanotechnology.",
    variations: [
      { title: "Defect-tolerant topological edge states in strained van der Waals heterostructures",  angle: "Tests whether topological protection persists in the presence of realistic lattice defects." },
      { title: "Piezoelectric control of topological phase in ferroelectric/TMD hybrid devices",      angle: "Uses built-in electric fields from ferroelectric substrates to modulate strain dynamically." },
      { title: "Machine learning prediction of topological invariants from DFT band structures",      angle: "Develops a regression model to accelerate computational screening of topological candidates." },
    ],
  },
],

"Chemistry & Materials": [
  {
    title:            "Solid-state electrolyte design for lithium-metal batteries: suppressing dendrite formation",
    summary:          "Develops and characterises composite ceramic-polymer solid electrolytes that combine high ionic conductivity with mechanical rigidity sufficient to suppress lithium dendrite penetration.",
    researchQuestion: "Which composite electrolyte architecture — ceramic-in-polymer versus polymer-in-ceramic — provides superior dendrite suppression at room-temperature cycling rates?",
    gap:              "Individual ceramic and polymer electrolytes each address one failure mode; composites lack systematic structure-property relationships linking morphology to dendrite resistance.",
    methods:          ["Electrochemical impedance spectroscopy", "Cryogenic transmission electron microscopy", "Symmetric cell cycling under pressure"],
    interdisc:        "Connects electrochemistry, polymer science, and battery engineering.",
    variations: [
      { title: "Halide-based superionic conductors for room-temperature all-solid-state batteries",    angle: "Focuses on a newer electrolyte class with promising conductivity but limited stability data." },
      { title: "Interfacial chemistry between lithium metal and garnet-type oxide electrolytes",      angle: "Zooms into the critical anode-electrolyte interface as the primary failure locus." },
      { title: "Self-healing polymer electrolytes for mechanically robust solid-state cells",         angle: "Introduces dynamic covalent chemistry to repair micro-cracks caused by volume changes." },
    ],
  },
  {
    title:            "Photocatalytic CO₂ reduction to multi-carbon fuels using earth-abundant metal catalysts",
    summary:          "Designs and evaluates heterogeneous photocatalysts based on copper, iron, and manganese complexes for selective reduction of CO₂ to C2+ products such as ethylene and ethanol.",
    researchQuestion: "How do catalyst morphology and surface oxidation state govern the selectivity toward C–C bond formation during photocatalytic CO₂ reduction?",
    gap:              "Noble metal catalysts dominate the literature; earth-abundant alternatives struggle with selectivity and stability, and mechanistic understanding of C–C coupling remains incomplete.",
    methods:          ["In-situ DRIFTS spectroscopy", "Isotope labelling (¹³CO₂) with GC-MS product analysis", "DFT reaction pathway mapping"],
    interdisc:        "Connects sustainable chemistry, atmospheric science, and chemical engineering.",
    variations: [
      { title: "Z-scheme heterojunction photocatalysts for improved charge separation in CO₂ reduction",   angle: "Focuses on band alignment engineering to maximise photogenerated electron lifetime." },
      { title: "Molecular copper electrocatalysts for selective ethylene production from CO₂",            angle: "Shifts from photo- to electrocatalysis, enabling independent control of light and potential." },
      { title: "Plasmonic enhancement of CO₂ photoreduction over bimetallic nanoparticle arrays",        angle: "Exploits localised surface plasmon resonance to concentrate light at the catalytic site." },
    ],
  },
],

"Medicine & Public Health": [
  {
    title:            "Longitudinal cardiovascular risk trajectories following COVID-19 in non-hospitalised adults",
    summary:          "Analyses electronic health record and biobank data to characterise the incidence and temporal evolution of cardiovascular events in adults with mild-to-moderate COVID-19 compared to matched controls.",
    researchQuestion: "Does prior SARS-CoV-2 infection independently increase the 3-year risk of major adverse cardiovascular events in adults who were not hospitalised during acute illness?",
    gap:              "Most post-COVID cardiovascular research focuses on hospitalised or severe cases; the risk profile of the much larger mild-disease population remains undercharacterised.",
    methods:          ["Propensity-score matched retrospective cohort analysis", "Competing-risks survival modelling", "Mendelian randomisation for causal inference"],
    interdisc:        "Bridges cardiology, epidemiology, immunology, and health data science.",
    variations: [
      { title: "Myocardial inflammation on cardiac MRI in post-COVID athletes",                    angle: "Uses imaging to quantify structural cardiac changes in a physically active cohort." },
      { title: "Platelet hyperactivation as a mediator of thrombotic risk after mild COVID-19",   angle: "Investigates a specific mechanistic pathway linking infection to clotting events." },
      { title: "Vaccination status as a modifier of post-COVID cardiovascular risk",              angle: "Tests whether prior vaccination attenuates long-term cardiac sequelae." },
    ],
  },
  {
    title:            "Effectiveness of community health worker programmes for hypertension control in sub-Saharan Africa",
    summary:          "Evaluates task-shifting models in which trained community health workers deliver blood pressure monitoring and adherence support in low-resource primary care settings across three countries.",
    researchQuestion: "Do structured community health worker programmes achieve clinically meaningful reductions in systolic blood pressure compared to facility-only care in hypertensive adults in sub-Saharan Africa?",
    gap:              "Randomised evidence on task-shifting for non-communicable diseases in Africa is sparse; most trials are small and do not address implementation fidelity or long-term sustainability.",
    methods:          ["Cluster-randomised controlled trial", "Implementation science mixed-methods evaluation", "Health economic modelling"],
    interdisc:        "Spans global health, health systems research, anthropology, and health economics.",
    variations: [
      { title: "mHealth-supported self-monitoring for hypertension management in rural Uganda",          angle: "Tests a technology-enabled variation of task-shifting using basic mobile phones." },
      { title: "Integrating hypertension and HIV care through community health worker platforms",        angle: "Leverages existing HIV infrastructure to address the growing NCD burden." },
      { title: "Social determinants of antihypertensive medication adherence in peri-urban South Africa", angle: "Takes a qualitative approach to understanding why adherence rates remain low." },
    ],
  },
],

"Psychology & Neuroscience": [
  {
    title:            "Neural correlates of cognitive reappraisal in adolescents at risk for depression",
    summary:          "Uses fMRI to compare prefrontal-amygdala connectivity during emotion regulation in adolescents with and without depression risk factors, linking neural profiles to clinical outcomes.",
    researchQuestion: "Does attenuated prefrontal down-regulation of amygdala reactivity during cognitive reappraisal differentiate adolescents with familial depression risk from low-risk peers?",
    gap:              "Most emotion regulation neuroimaging studies recruit adults; adolescence — a critical window for depression onset — is underrepresented, especially in longitudinal designs.",
    methods:          ["Task-based fMRI (emotion regulation paradigm)", "Psychophysiological interaction analysis", "Longitudinal follow-up with clinical interviews"],
    interdisc:        "Connects developmental psychology, clinical psychiatry, and cognitive neuroscience.",
    variations: [
      { title: "Mindfulness-based intervention effects on amygdala reactivity in at-risk adolescents",  angle: "Tests whether brief mindfulness training normalises the identified neural signature." },
      { title: "Resting-state default mode network connectivity as a biomarker of rumination",         angle: "Shifts from task-based to resting fMRI to capture spontaneous thought patterns." },
      { title: "Longitudinal prediction of first depressive episode from early adolescent brain structure", angle: "Uses structural MRI to identify morphological predictors preceding symptom onset." },
    ],
  },
  {
    title:            "Social media use patterns and sleep quality in university students: a daily diary study",
    summary:          "Employs ecological momentary assessment to capture within-person variation in social media use, psychological need satisfaction, and sleep parameters across an academic term.",
    researchQuestion: "Does evening passive social media consumption predict next-day sleep latency and subjective sleep quality over and above baseline trait anxiety in university students?",
    gap:              "Cross-sectional studies dominate the social media-sleep literature; within-person daily fluctuations and the distinction between passive and active use are rarely examined simultaneously.",
    methods:          ["Ecological momentary assessment via smartphone app", "Wrist actigraphy for objective sleep estimation", "Multilevel modelling of daily diary data"],
    interdisc:        "Bridges health psychology, communication science, chronobiology, and higher education research.",
    variations: [
      { title: "Platform-specific effects of TikTok versus Instagram use on sleep timing in adolescents", angle: "Compares short-form video versus static image platforms as distinct exposure types." },
      { title: "Fear of missing out as a mediator of social media use and sleep disturbance",            angle: "Tests a specific psychological mechanism linking use to sleep impairment." },
      { title: "Digital detox intervention effects on sleep and wellbeing in heavy social media users",  angle: "Evaluates a practical behaviour-change programme in a randomised design." },
    ],
  },
],

"Economics & Finance": [
  {
    title:            "Climate transition risk pricing in corporate bond markets",
    summary:          "Examines whether bond markets systematically price carbon emission intensity and regulatory transition risk into credit spreads, and how pricing efficiency has evolved post-Paris Agreement.",
    researchQuestion: "Do high-emission firms pay a measurable and growing transition risk premium in investment-grade bond markets, and does ESG disclosure quality moderate this relationship?",
    gap:              "Equity-focused climate finance literature is extensive; bond market pricing of transition risks is comparatively underexplored, especially across credit rating tiers.",
    methods:          ["Panel regression with firm and time fixed effects", "Text analysis of ESG disclosures using NLP", "Difference-in-differences around regulatory announcements"],
    interdisc:        "Connects environmental economics, corporate finance, and regulatory policy.",
    variations: [
      { title: "Green bond yield premiums and the greenium across sovereign and corporate issuers",        angle: "Investigates whether investors accept lower yields on labelled green bonds and under what conditions." },
      { title: "Physical climate risk and mortgage default rates in US coastal flood zones",              angle: "Shifts focus to physical rather than transition risk in the retail lending market." },
      { title: "Carbon border adjustment mechanisms and emerging market trade finance",                   angle: "Analyses a specific regulatory instrument and its financial sector consequences." },
    ],
  },
  {
    title:            "Algorithmic collusion in digital platform markets: detection and regulation",
    summary:          "Investigates whether pricing algorithms deployed by competing firms on digital marketplaces independently converge on supra-competitive prices without explicit communication.",
    researchQuestion: "Under what market structures and algorithm design parameters does tacit algorithmic collusion emerge, and how can regulators detect it from observable price data?",
    gap:              "Antitrust frameworks were designed for human decision-makers; detecting and prosecuting algorithmic coordination raises novel evidentiary and liability questions.",
    methods:          ["Agent-based modelling of algorithmic price competition", "Empirical analysis of marketplace price data", "Experimental economics with human-algorithm interaction"],
    interdisc:        "Bridges industrial organisation, computer science, and competition law.",
    variations: [
      { title: "Reinforcement learning pricing agents and the emergence of tacit collusion",         angle: "Uses RL simulation to study how learning dynamics drive competitive or collusive outcomes." },
      { title: "Consumer harm estimation from algorithmic pricing in the hotel booking market",      angle: "Applies the framework to a specific, data-rich market to estimate welfare losses." },
      { title: "Regulatory sandboxes for testing algorithm auditing tools in digital markets",       angle: "Proposes a policy mechanism for regulators to pre-screen algorithm behaviour." },
    ],
  },
],

"Sociology & Political Science": [
  {
    title:            "Digital disinformation and electoral participation among first-time voters",
    summary:          "Analyses the relationship between exposure to political misinformation on social media and voting intention, trust in institutions, and information-seeking behaviour in young adults.",
    researchQuestion: "Does repeated exposure to political misinformation on social media reduce voting intention among first-time voters, and do digital media literacy skills moderate this effect?",
    gap:              "Research on misinformation effects concentrates on attitudes rather than behaviour; first-time voters receive little dedicated attention in longitudinal studies.",
    methods:          ["Two-wave panel survey with misinformation exposure measures", "Structural equation modelling", "Content analysis of misinformation narratives"],
    interdisc:        "Connects political communication, media studies, cognitive psychology, and electoral science.",
    variations: [
      { title: "Platform-level interventions and their effect on misinformation sharing",          angle: "Evaluates fact-checking labels, reduced amplification, and interstitial warnings." },
      { title: "Cross-national variation in misinformation vulnerability and media system type",   angle: "Examines whether public broadcasting environments buffer against misinformation effects." },
      { title: "Prebunking versus debunking strategies for vaccine misinformation in young adults", angle: "Tests inoculation theory in a health communication rather than electoral context." },
    ],
  },
  {
    title:            "Racial residential segregation and intergenerational educational mobility in post-industrial cities",
    summary:          "Examines how neighbourhood racial composition and school district boundaries in declining industrial cities shape educational attainment and earnings mobility across two generations.",
    researchQuestion: "Does growing up in a racially segregated neighbourhood independently reduce intergenerational educational mobility after controlling for school quality, family income, and peer effects?",
    gap:              "Most mobility research uses national datasets that obscure local spatial variation; mechanisms linking neighbourhood segregation to mobility in post-industrial contexts are underspecified.",
    methods:          ["Linked census and administrative records (longitudinal)", "Spatial econometrics and boundary discontinuity designs", "Qualitative interviews with parents and young adults"],
    interdisc:        "Bridges urban sociology, economics of education, and geography.",
    variations: [
      { title: "School integration policies and long-run labour market outcomes in US metropolitan areas", angle: "Tests the causal effect of busing and magnet school programmes using historical policy variation." },
      { title: "Neighbourhood effects on aspirations: a mixed-methods study in the UK Midlands",         angle: "Combines quantitative mobility analysis with ethnographic fieldwork." },
      { title: "Gentrification, displacement, and educational disruption among low-income families",      angle: "Focuses on consequences of forced mobility rather than static neighbourhood exposure." },
    ],
  },
],

"Engineering": [
  {
    title:            "Structural health monitoring of ageing bridges using distributed fibre-optic sensing",
    summary:          "Develops a real-time SHM framework using distributed Brillouin scattering sensors embedded in concrete bridges to detect early-stage cracking, corrosion, and deformation.",
    researchQuestion: "Can distributed fibre-optic sensing achieve sub-millimetre spatial resolution sufficient for early crack detection in post-tensioned concrete bridge beams under operational loading?",
    gap:              "Traditional point sensors provide poor spatial coverage; distributed sensing offers continuous profiles but data processing pipelines for real-time damage localisation are underdeveloped.",
    methods:          ["Brillouin optical time-domain analysis (BOTDA)", "Finite element model updating", "Machine learning-based anomaly detection on sensor streams"],
    interdisc:        "Connects structural engineering, photonics, and data science.",
    variations: [
      { title: "Drone-mounted LiDAR and photogrammetry for routine bridge condition assessment",         angle: "Compares non-contact remote sensing to embedded sensor approaches." },
      { title: "Digital twin framework for lifecycle management of concrete infrastructure",              angle: "Integrates SHM data into a continuously updated simulation model." },
      { title: "Corrosion-induced prestress loss estimation using acoustic emission",                    angle: "Uses passive acoustic methods to detect wire breaks invisible to visual inspection." },
    ],
  },
  {
    title:            "Additive manufacturing of topology-optimised heat exchangers for aerospace applications",
    summary:          "Combines computational topology optimisation with metal additive manufacturing to produce heat exchanger geometries inaccessible to conventional machining, improving thermal performance.",
    researchQuestion: "Does topology-optimised lattice-core heat exchanger geometry produced by selective laser melting outperform conventionally manufactured corrugated-fin designs in specific thermal conductance per unit mass?",
    gap:              "Topology optimisation tools and metal AM processes have matured independently; validated end-to-end design-to-manufacture workflows for thermally functional aerospace components are lacking.",
    methods:          ["SIMP topology optimisation (ANSYS/OptiStruct)", "Selective laser melting of Ti-6Al-4V", "Experimental thermal performance testing in wind tunnel"],
    interdisc:        "Bridges mechanical engineering, materials science, and aerospace design.",
    variations: [
      { title: "Bioinspired vascular networks for self-cooling structural panels via AM",                    angle: "Draws on biological circulatory systems to inspire cooling channel layouts." },
      { title: "Multi-material AM for gradient thermal conductivity in turbine blade cooling",              angle: "Uses compositionally graded alloys to manage thermal gradients in rotating components." },
      { title: "Manufacturability constraints in topology optimisation: overhang and support minimisation", angle: "Tackles the practical barrier of support structure removal in complex AM geometries." },
    ],
  },
],

"Environmental Science": [
  {
    title:            "Microplastic accumulation in urban riverine sediments and trophic transfer to benthic invertebrates",
    summary:          "Characterises the concentration, size distribution, and polymer type of microplastics in riverbed sediments along urban gradients and quantifies uptake and trophic transfer in benthic invertebrate communities.",
    researchQuestion: "Does microplastic concentration in urban river sediments correlate with trophic transfer efficiency in benthic invertebrate food webs, and which particle sizes and polymer types are preferentially accumulated?",
    gap:              "Pelagic microplastic research far exceeds benthic work; the role of riverbed sediments as long-term sinks and their ecological consequences for invertebrate communities are poorly understood.",
    methods:          ["μ-FTIR spectroscopy for polymer identification", "Stable isotope analysis for trophic transfer quantification", "Hydrodynamic modelling of sediment transport"],
    interdisc:        "Bridges aquatic ecology, analytical chemistry, and urban hydrology.",
    variations: [
      { title: "Weathering-induced changes in microplastic surface chemistry and ecotoxicity",         angle: "Examines how environmental degradation alters the toxicological profile of plastic particles." },
      { title: "Stormwater runoff as a pathway for microplastic export from urban catchments",         angle: "Focuses on event-driven transport to connect land-use to aquatic contamination." },
      { title: "Macroinvertebrate community composition as a bioindicator of microplastic pollution",  angle: "Proposes biological assessment tools for regulatory water quality monitoring." },
    ],
  },
  {
    title:            "Carbon sequestration potential of rewetted temperate peatlands under changing precipitation regimes",
    summary:          "Quantifies net ecosystem carbon exchange in rewetted peat bogs under contrasting precipitation scenarios to evaluate peatland restoration as a nature-based climate solution.",
    researchQuestion: "Does rewetting of degraded temperate peatlands restore net carbon sink function within a decade, and how does summer drought frequency modify the GHG balance?",
    gap:              "Carbon flux measurements in restored peatlands rarely extend beyond five years; the interaction between rewetting and projected precipitation variability is poorly constrained.",
    methods:          ["Eddy covariance CO₂ and CH₄ flux monitoring", "Peat core dating and carbon stock estimation", "Climate scenario modelling with downscaled RCP projections"],
    interdisc:        "Connects biogeochemistry, restoration ecology, and climate policy.",
    variations: [
      { title: "Methane emission dynamics during the early phase of peatland rewetting",               angle: "Focuses on the transient CH₄ pulse that can offset early carbon benefits of rewetting." },
      { title: "Remote sensing of peatland water table depth using SAR coherence time series",         angle: "Develops a satellite-based monitoring approach for large-scale restoration programmes." },
      { title: "Biodiversity co-benefits of peatland restoration: vascular plant and invertebrate recovery", angle: "Evaluates ecological recovery alongside carbon metrics for policy-relevant assessments." },
    ],
  },
],

"Mathematics & Statistics": [
  {
    title:            "Optimal transport methods for distribution shift detection in machine learning pipelines",
    summary:          "Develops computationally efficient optimal transport-based divergence measures to detect and quantify covariate and concept shift in deployed machine learning models.",
    researchQuestion: "Can sliced Wasserstein distances provide a statistically powerful and computationally tractable alternative to maximum mean discrepancy for detecting distribution shift in high-dimensional feature spaces?",
    gap:              "Existing shift detection methods either lack theoretical power guarantees or scale poorly to high dimensions; optimal transport offers principled geometry but has not been systematically evaluated in streaming data settings.",
    methods:          ["Sliced Wasserstein distance computation", "Permutation-based hypothesis testing", "Benchmark evaluation on real-world tabular and image datasets"],
    interdisc:        "Bridges probability theory, computational geometry, and applied machine learning.",
    variations: [
      { title: "Online change point detection using martingale-based testing with Wasserstein statistics", angle: "Adapts the framework to sequential data streams with sequential probability ratio tests." },
      { title: "Conditional distribution shift detection for fairness monitoring in deployed classifiers", angle: "Extends univariate shift detection to conditional distributions relevant to algorithmic fairness." },
      { title: "Minimax optimal rates for two-sample testing under sparsity constraints",                 angle: "Provides a theoretical characterisation of fundamental detection limits." },
    ],
  },
  {
    title:            "Causal discovery in high-dimensional observational health data",
    summary:          "Evaluates and extends constraint-based causal discovery algorithms for identifying plausible causal structures in electronic health record datasets with hundreds of correlated clinical variables.",
    researchQuestion: "How do the FCI and RFCI algorithms perform under realistic clinical data conditions — including missing data, measurement error, and hidden confounders — compared to score-based alternatives?",
    gap:              "Causal discovery benchmarks rely on synthetic data; performance under real-world clinical data imperfections is poorly characterised, limiting uptake in health research applications.",
    methods:          ["Simulation studies with ground-truth clinical DAGs", "Application to UK Biobank and MIMIC-IV datasets", "Sensitivity analysis for hidden confounder assumptions"],
    interdisc:        "Connects causal inference, graphical models, and clinical epidemiology.",
    variations: [
      { title: "Incorporating background clinical knowledge as prior constraints in causal graph search", angle: "Tests whether domain knowledge injection improves causal discovery accuracy in EHR data." },
      { title: "Causal feature selection for survival prediction models in oncology",                    angle: "Applies causal discovery to reduce spurious feature use in cancer prognosis models." },
      { title: "Identifiability of treatment effect heterogeneity from observational data under unmeasured confounding", angle: "Provides theoretical bounds on what can be learned from EHR data without randomisation." },
    ],
  },
],

"Humanities & History": [
  {
    title:            "Postcolonial memory politics and the repatriation of cultural heritage objects in European museums",
    summary:          "Examines how national museums in France, the UK, and Germany construct official narratives around contested artefacts and how repatriation negotiations reflect asymmetric power relations between former colonial powers and source countries.",
    researchQuestion: "How do European national museum discourses frame the legitimacy of retaining contested colonial-era objects, and in what ways do these framings align with or diverge from international legal instruments?",
    gap:              "Legal and philosophical debates on repatriation are extensive, but discourse-analytic studies of how museums actively construct and defend their retention narratives are rare.",
    methods:          ["Critical discourse analysis of museum statements and exhibition texts", "Semi-structured interviews with museum curators and heritage officials", "Comparative case study design"],
    interdisc:        "Bridges postcolonial studies, museum studies, international law, and cultural policy.",
    variations: [
      { title: "Source community perspectives on repatriation: Benin bronzes and Ghanaian royal regalia", angle: "Centres voices from origin communities rather than museum institutions." },
      { title: "Digital repatriation as a partial solution: 3D scanning, open access, and its limits",   angle: "Evaluates technological alternatives to physical return and their reception." },
      { title: "The role of UNESCO and UNIDROIT conventions in shaping national repatriation policy",    angle: "Focuses on how international law is translated or resisted at the national level." },
    ],
  },
  {
    title:            "Labour, resistance, and identity formation among female factory workers in early industrialising Japan",
    summary:          "Reconstructs the everyday experiences, collective actions, and identity narratives of women employed in textile mills during the Meiji and Taisho periods using archival and oral history sources.",
    researchQuestion: "How did female textile workers in Meiji-era Japan negotiate gender, class, and regional identity within factory disciplinary regimes, and what forms of resistance did they develop?",
    gap:              "Existing industrial histories of Meiji Japan prioritise economic metrics and male labour; women workers appear primarily as subjects of welfare discourse rather than as agents of their own history.",
    methods:          ["Archival research in prefectural and company records", "Analysis of labour newspapers and petitions", "Oral history interviews with descendants and local historians"],
    interdisc:        "Combines social history, gender studies, and Japanese studies.",
    variations: [
      { title: "Migration, dormitory life, and regional identities among Meiji silk reelers",             angle: "Examines how geographic displacement shaped collective and individual identity." },
      { title: "Health, body, and labour legislation in Taisho Japan",                                   angle: "Analyses how women's bodies became sites of regulatory and political contestation." },
      { title: "Female textile labour and resistance in Japan and British India, 1890–1930",             angle: "Places the Japanese case in a global colonial-industrial frame." },
    ],
  },
],
};

// Methodology modifiers 
const METHOD_MODIFIERS = {
"Quantitative / empirical": {
  note:    "The approach is primarily quantitative, relying on statistical analysis of empirical data.",
  methods: ["Statistical hypothesis testing", "Regression analysis", "Large-scale dataset collection"],
},
"Qualitative / ethnographic": {
  note:    "The research takes a qualitative, interpretive stance, centring participant perspectives.",
  methods: ["In-depth interviews", "Ethnographic observation", "Thematic analysis"],
},
"Computational / simulation": {
  note:    "Computational modelling and simulation are the primary investigative tools.",
  methods: ["Agent-based simulation", "Numerical modelling", "High-performance computing"],
},
"Experimental (lab-based)": {
  note:    "Controlled laboratory experiments form the empirical core of the study.",
  methods: ["Controlled experimental design", "Randomised conditions", "Instrumented measurement"],
},
"Systematic review / meta-analysis": {
  note:    "The study synthesises existing literature through systematic review and meta-analytic methods.",
  methods: ["PRISMA-compliant systematic search", "Meta-analytic pooling", "Risk-of-bias assessment"],
},
"Theoretical / mathematical": {
  note:    "The work develops formal theoretical or mathematical contributions.",
  methods: ["Formal proof and theorem development", "Mathematical modelling", "Axiomatic analysis"],
},
"Mixed methods": {
  note:    "The research integrates quantitative and qualitative methods for triangulation.",
  methods: ["Sequential explanatory design", "Concurrent triangulation", "Integration of statistical and narrative data"],
},
};

// Level modifiers 
const LEVEL_MODIFIERS = {
"Undergraduate thesis":  "scoped as an undergraduate thesis with a focused, feasible empirical component",
"Master's dissertation": "designed for a Master's dissertation with original data collection and analysis",
"PhD dissertation":      "conceived as a multi-year PhD project with original theoretical and empirical contributions",
"Postdoctoral research": "framed as a postdoctoral programme building on doctoral expertise with an independent contribution",
"Grant proposal":        "structured as a grant proposal with clear objectives, methodology, and expected impact",
};

const GENERIC_GAP      = "Existing literature addresses proximate questions but leaves a clear gap around the specific intersection of variables examined here. This study is positioned to fill that gap with rigorous, original inquiry.";
const GENERIC_INTERDISC = "This research draws on methods and theories from adjacent disciplines, enabling a richer and more transferable contribution than single-discipline approaches typically allow.";

// Rule engine 
function generateFallbackTopic() {
const discipline     = selectedDiscipline;
const subfield       = document.getElementById("subfield")?.value.trim()  || "";
const level          = document.getElementById("researchLevel")?.value     || "";
const methodology    = document.getElementById("methodology")?.value       || "";
const keywords       = document.getElementById("keywords")?.value.trim()   || "";
const wantGap        = document.getElementById("togGap")?.checked;
const wantMethod     = document.getElementById("togMethod")?.checked;
const wantVariations = document.getElementById("togVariations")?.checked;
const wantInterdisc  = document.getElementById("togInterdisciplinary")?.checked;

// Pick a bank entry, rotating by time so repeated clicks get different topics
const pool  = TOPIC_BANK[discipline] || TOPIC_BANK["Computer Science & AI"];
const base  = pool[Math.floor(Date.now() / 1000) % pool.length];
const topic = JSON.parse(JSON.stringify(base)); // deep clone

// Inject keywords
if (keywords) {
  const kw = keywords.split(/[,;]/)[0].trim();
  topic.title            = injectKeyword(topic.title,            kw);
  topic.researchQuestion = injectKeyword(topic.researchQuestion, kw);
  topic.summary         += ` This study pays particular attention to ${kw} as a focal concern.`;
}

// Inject subfield
if (subfield) {
  topic.title   = `${topic.title} — a ${subfield} perspective`;
  topic.summary = `Situated within ${subfield}, this research ${topic.summary.charAt(0).toLowerCase()}${topic.summary.slice(1)}`;
}

// Apply level modifier
if (level && LEVEL_MODIFIERS[level]) {
  topic.summary += ` The study is ${LEVEL_MODIFIERS[level]}.`;
}

// Apply methodology modifier
if (methodology && METHOD_MODIFIERS[methodology]) {
  const mod = METHOD_MODIFIERS[methodology];
  topic.summary += ` ${mod.note}`;
  topic.methodologies = wantMethod
    ? [...mod.methods, ...(topic.methods || [])].slice(0, 5)
    : null;
} else {
  topic.methodologies = wantMethod ? (topic.methods || []) : null;
}

// Conditionally include optional sections
topic.gapAnalysis                  = wantGap       ? (topic.gap      || GENERIC_GAP)       : null;
topic.interdisciplinaryConnections = wantInterdisc ? (topic.interdisc || GENERIC_INTERDISC) : null;
topic.variations                   = wantVariations ? topic.variations : null;

// Remove internal-only fields
delete topic.gap;
delete topic.interdisc;
delete topic.methods;

return topic;
}

function injectKeyword(text, keyword) {
if (!keyword || text.toLowerCase().includes(keyword.toLowerCase())) return text;
return `${text} with a focus on ${keyword}`;
}

// State and UI 
let selectedDiscipline = "";
let lastGeneratedText  = "";
const history          = [];

function selectDisc(el) {
document.querySelectorAll(".disc-chip").forEach(c => c.classList.remove("selected"));
el.classList.add("selected");
selectedDiscipline = el.dataset.val;
}

const loadingMessages = [
"Consulting the literature…",
"Identifying research gaps…",
"Surveying recent publications…",
"Mapping the knowledge frontier…",
"Synthesising interdisciplinary angles…",
];
let loadingInterval = null;

function showLoading() {
const overlay = document.getElementById("loadingOverlay");
const status  = document.getElementById("loadingStatus");
if (!overlay) return;
overlay.style.display = "flex";
let i = 0;
status.textContent = loadingMessages[0];
loadingInterval = setInterval(() => {
  i = (i + 1) % loadingMessages.length;
  status.textContent = loadingMessages[i];
}, 1800);
}

function hideLoading() {
clearInterval(loadingInterval);
const overlay = document.getElementById("loadingOverlay");
if (overlay) overlay.style.display = "none";
}

function showError(msg) {
const box = document.getElementById("errorBox");
if (!box) return;
box.textContent       = msg;
box.style.display     = "block";
box.style.background  = "";
box.style.color       = "";
box.style.borderColor = "";
}

function showFallbackNotice() {
const box = document.getElementById("errorBox");
if (!box) return;
box.textContent       = "ℹ AI unavailable — topic generated using built-in rules. Results may be less personalised.";
box.style.display     = "block";
box.style.background  = "#fffbeb";
box.style.color       = "#92400e";
box.style.borderColor = "#fbbf24";
}

function clearError() {
const box = document.getElementById("errorBox");
if (!box) return;
box.textContent       = "";
box.style.display     = "none";
box.style.background  = "";
box.style.color       = "";
box.style.borderColor = "";
}

function setBtnLoading(on) {
const btn     = document.getElementById("generateBtn");
const icon    = document.getElementById("btnIcon");
const text    = document.getElementById("btnText");
const spinner = document.getElementById("btnSpinnerEl");
if (!btn) return;
btn.disabled = on;
if (icon)    icon.style.display    = on ? "none"        : "inline-block";
if (spinner) spinner.style.display = on ? "inline-block": "none";
if (text)    text.textContent      = on ? "Generating…" : "Generate Research Topic";
}

function buildPrompt() {
const discipline     = selectedDiscipline || "any discipline";
const subfield       = document.getElementById("subfield")?.value.trim()  || "";
const level          = document.getElementById("researchLevel")?.value     || "";
const methodology    = document.getElementById("methodology")?.value       || "";
const keywords       = document.getElementById("keywords")?.value.trim()   || "";
const wantGap        = document.getElementById("togGap")?.checked;
const wantMethod     = document.getElementById("togMethod")?.checked;
const wantVariations = document.getElementById("togVariations")?.checked;
const wantInterdisc  = document.getElementById("togInterdisciplinary")?.checked;

return `Generate a well-scoped, original research topic based on:
- Discipline: ${discipline}
${subfield    ? `- Subfield: ${subfield}`           : ""}
${level       ? `- Level: ${level}`                 : ""}
${methodology ? `- Methodology: ${methodology}`     : ""}
${keywords    ? `- Keywords/interests: ${keywords}` : ""}

Respond with ONLY a valid JSON object using exactly this structure (no markdown fences, no extra text):
{
"title": "specific, compelling research topic title",
"summary": "2-3 sentence description of the topic and its significance",
"researchQuestion": "the core research question this addresses",
"gapAnalysis": ${wantGap        ? '"2-3 sentences on what gap in existing literature this addresses"' : "null"},
"methodologies": ${wantMethod   ? '["method 1", "method 2", "method 3"]'                            : "null"},
"interdisciplinaryConnections": ${wantInterdisc ? '"connections to adjacent disciplines"'           : "null"},
"variations": ${wantVariations
  ? '[{"title":"Variation A","angle":"brief explanation"},{"title":"Variation B","angle":"brief explanation"},{"title":"Variation C","angle":"brief explanation"}]'
  : "null"}
}`;
}

// MAIN — AI first, rule-based fallback on any failure 
async function generateTopic() {
clearError();
if (!selectedDiscipline) {
  showError("Please select a discipline first.");
  return;
}

setBtnLoading(true);
showLoading();

// 1. Try AI via Node server 
try {
  const controller = new AbortController();
  const timeout    = setTimeout(() => controller.abort(), 15000);

  const response = await fetch("/api/generate-topic", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ prompt: buildPrompt() }),
    signal:  controller.signal,
  });

  clearTimeout(timeout);

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `Server error ${response.status}`);
  }

  const data = await response.json();
  if (!data.title || !data.summary || !data.researchQuestion) {
    throw new Error("AI response was incomplete.");
  }

  renderResult(data, false);

} catch (aiErr) {
  // 2. Fallback to rule-based engine
  console.warn("AI unavailable — using rule-based fallback:", aiErr.message);
  try {
    renderResult(generateFallbackTopic(), true);
  } catch (fbErr) {
    showError("Could not generate a topic. Please check your inputs and try again.");
    console.error("Fallback engine error:", fbErr);
  }
} finally {
  setBtnLoading(false);
  hideLoading();
}
}

// Render 
function renderResult(json, isFallback = false) {
const mainEl = document.getElementById("mainResult");
const varEl  = document.getElementById("variationsContainer");
const panel  = document.getElementById("resultPanel");
if (!mainEl || !panel) return;

if (isFallback) {
  showFallbackNotice();
} else {
  clearError();
}

mainEl.innerHTML = `
  <div class="result-label">
    Primary research topic
    ${isFallback ? '<span style="font-size:11px;opacity:.6;margin-left:8px">(rule-based)</span>' : ""}
  </div>
  <h2 class="result-title">${escHtml(json.title)}</h2>
  <p class="result-summary">${escHtml(json.summary)}</p>

  <div class="result-section">
    <div class="result-section-label">Research question</div>
    <p class="result-body">${escHtml(json.researchQuestion)}</p>
  </div>

  ${json.gapAnalysis ? `
  <div class="result-section">
    <div class="result-section-label">Research gap</div>
    <p class="result-body">${escHtml(json.gapAnalysis)}</p>
  </div>` : ""}

  ${json.methodologies?.length ? `
  <div class="result-section">
    <div class="result-section-label">Suggested methodologies</div>
    <ul class="result-list">
      ${json.methodologies.map(m => `<li>${escHtml(m)}</li>`).join("")}
    </ul>
  </div>` : ""}

  ${json.interdisciplinaryConnections ? `
  <div class="result-section">
    <div class="result-section-label">Interdisciplinary connections</div>
    <p class="result-body">${escHtml(json.interdisciplinaryConnections)}</p>
  </div>` : ""}
`;

if (varEl) {
  varEl.innerHTML = "";
  json.variations?.forEach((v, i) => {
    const card = document.createElement("div");
    card.className = "result-card variation-card";
    card.innerHTML = `
      <div class="result-label">Variation ${String.fromCharCode(65 + i)}</div>
      <h3 class="result-title">${escHtml(v.title)}</h3>
      <p class="result-body">${escHtml(v.angle)}</p>
    `;
    varEl.appendChild(card);
  });
}

lastGeneratedText = `${json.title}\n\n${json.summary}\n\nResearch question: ${json.researchQuestion}`;
if (json.gapAnalysis) lastGeneratedText += `\n\nResearch gap: ${json.gapAnalysis}`;

panel.style.display = "block";
panel.scrollIntoView({ behavior: "smooth", block: "start" });
addToHistory(json.title, selectedDiscipline, isFallback);
}

// Action buttons 
function searchScholar() {
if (!lastGeneratedText) return;
const q = encodeURIComponent(lastGeneratedText.split("\n")[0]);
window.open(`https://scholar.google.com/scholar?q=${q}`, "_blank");
}

function copyResult() {
if (!lastGeneratedText) return;
navigator.clipboard.writeText(lastGeneratedText).then(() => {
  const btn = document.querySelector('[onclick="copyResult()"]');
  if (!btn) return;
  const orig = btn.textContent;
  btn.textContent = "Copied!";
  setTimeout(() => { btn.textContent = orig; }, 2000);
});
}

// History
function addToHistory(title, discipline, isFallback) {
history.unshift({ title, discipline, isFallback, ts: new Date() });
if (history.length > 8) history.pop();
renderHistory();
}

function renderHistory() {
const section = document.getElementById("historySection");
const list    = document.getElementById("historyList");
if (!section || !list) return;
section.style.display = "block";
list.innerHTML = history.map(h => `
  <div class="history-item">
    <span class="history-disc">${escHtml(h.discipline)}</span>
    <span class="history-title">${escHtml(h.title)}</span>
    ${h.isFallback ? '<span style="font-size:10px;opacity:.55">(rule-based)</span>' : ""}
    <span class="history-ts">${h.ts.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
  </div>
`).join("");
}

// Utility 
function escHtml(s) {
return String(s || "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;")
  .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}