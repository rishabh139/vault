---
publish: true
created: 2026-02-05T22:47:54.251+01:00
modified: 2026-02-13T01:59:41.237+01:00
tags:
  - x/tud/thesis
  - neuroscience
  - data-science
cssclasses: ""
---


---

### 1. Electrophysiological Features (The "Signals")
*Features describing the raw and processed bioelectrical activity.*

**Field Potentials (fEPSP & LFP)**
*   **fEPSP Slope:** Rate of rise; measure of synaptic strength. *[LTP], [Nature/Nurture]*
*   **fEPSP Amplitude:** Peak-to-peak magnitude ($\mu V$). *[LTP], [Nature/Nurture]*
*   **Normalized fEPSP %:** Baseline vs. post-tetanic comparison. *[LTP]*
*   **LTP Induction Threshold:** Specific slope value required to trigger plasticity. *[LTP]*
*   **LTP Success Criterion:** Response $>40\%$ above baseline. *[LTP]*
*   **Synaptic Tuning Curve:** Slope response relative to stimulus intensity (20–130 $\mu$A). *[Nature/Nurture]*
*   **LFP Amplitude:** Magnitude of spontaneous local field potentials. *[MEA-seqX], [Nature/Nurture]*
*   **LFP Rate / Frequency:** Events per minute. *[MEA-seqX]*
*   **LFP Event Delay:** Latency between distinct LFP events. *[MEA-seqX]*
*   **LFP Energy:** Power/intensity of the oscillation. *[MEA-seqX]*
*   **Peak Counts:** Count of positive (upward) and negative (downward) deflections. *[MEA-seqX]*

**Spiking & Unit Activity**
*   **Population Spikes (PS):** Synchronous firing signatures (specifically in SP and GCL). *[LTP]*
*   **Mean Firing Rate (MFR):** Events per recording time (spikes/sec or events/min). *[MEA-seqX], [Multimodal], [Sleep/Memory]*
*   **Multi-unit Spiking Activity (MUA):** High-frequency extracellular firing. *[Multimodal]*
*   **Bursting Activity:** Patterns of rapid, clustered spiking. *[Multimodal]*
*   **Spike Latency / Post-stimulation Latency:** Time delay between stimulus and response. *[LTP]*
*   **Reasonable Firing Range Criteria:** 0.1–15 Hz (Spikes); 0.1–60 events/min (LFP). *[Multimodal]*

**Network Oscillations & Rhythms**
*   **Delta ($\delta$):** 1–4 Hz. *[Multimodal]*
*   **Theta ($\theta$):** 5–12 Hz. *[Multimodal], [Sleep/Memory]*
*   **Beta ($\beta$):** 13–35 Hz. *[Multimodal]*
*   **Gamma ($\gamma$):** 35–100 Hz. *[Multimodal], [Sleep/Memory]*
*   **Sharp-Wave Ripples (SWRs):** ~140–220 Hz (approx. 150 Hz peak), ~50ms duration. *[Multimodal], [Sleep/Memory]*
*   **Barrage of Action Potentials (BARRs):** ~250 Hz, up to 300ms duration (localized to CA2). *[Sleep/Memory]*
*   **Oscillatory Waveform Shapes:** Classified via PCA/Clustering. *[MEA-seqX]*

**Sleep & Pathological Metrics**
*   **SWR/BARR Anti-correlation:** The temporal alternation between ripple and barrage events. *[Sleep/Memory]*
*   **Reactivation Strength:** Statistical measure of learning-neuron firing during sleep. *[Sleep/Memory]*
*   **Excitation/Inhibition Balance:** *[Sleep/Memory]*
*   **Coding Precision:** *[Sleep/Memory]*
*   **Network Hyperactivity:** (Phenotype for AD). *[Sleep/Memory]*

---

### 2. Spatiotemporal & Network Features (The "Map")
*Features describing how activity is distributed across the electrode grid.*

**Spatial Distribution**
*   **Active Electrode Count:** Total number of electrodes detecting signal. *[LTP]*
*   **$\Delta$ Active Electrodes:** Change in count (Post-tetanic % minus Baseline %). *[LTP]*
*   **Center of Activity Trajectories (CAT):** Spatiotemporal propagation path. *[MEA-seqX]*
*   **CAT Duration:** Time for an event to traverse the circuit. *[MEA-seqX]*
*   **Activation Zones:** Spatial coordinates of firing clusters. *[LTP]*
*   **Voltage Variation Maps:** Pseudo-color visualization of grid-wide voltage. *[LTP]*
*   **Quiescence/Recruitment:** Identification of previously "silent" assemblies that activate later. *[LTP]*
*   **Clustering Groups:** Initial, Central, and Terminal wave clusters (based on timing). *[LTP]*

**Connectivity & Flow**
*   **Cross-correlation / Cross-covariance:** Relationship between pairs of active electrodes. *[Nature/Nurture], [Multimodal]*
*   **Directional Information Flow:** Computed via Granger Causality/DTF. *[Nature/Nurture], [Multimodal]*
*   **Maximum Propagation Velocity:** Filter set at 400 mm/s. *[Multimodal]*
*   **Inhibitory Connections (FNCCH):** Negative peaks in cross-correlation histograms. *[Multimodal]*

---

### 3. Graph Theory & Topological Parameters (The "Connectome")
*Metrics treating the slice as a mathematical graph (nodes and edges).*

*   **Node Degree ($k_i$):** Number of links per electrode. *[MEA-seqX], [Nature/Nurture], [Multimodal]*
*   **Node Strength:** Weighted connectivity of a node. *[MEA-seqX], [Nature/Nurture], [Multimodal]*
*   **Degree Centrality:** Influence of a node within the network. *[Nature/Nurture]*
*   **Hub Score:** Composite of strength, clustering, and efficiency (0–3). *[MEA-seqX]*
*   **Clustering Coefficient:** Measure of local segregation. *[MEA-seqX], [Nature/Nurture]*
*   **Rich-Club Coefficient ($\phi(k)$):** Connectivity density among high-degree nodes. *[MEA-seqX]*
*   **Network Efficiency:** Speed/ease of information exchange. *[MEA-seqX]*
*   **Transitivity:** Global network segregation metric. *[Nature/Nurture]*
*   **Average Shortest Path Length:** Integration metric. *[Nature/Nurture]*
*   **Modularity:** Division of network into functional communities. *[MEA-seqX], [Nature/Nurture]*
*   **Interaction Link Counts:** Uni-directional vs. Bi-directional link totals. *[Nature/Nurture]*
*   **Small-World Properties:** Validated via Power-Law Tail / Degree Distribution. *[MEA-seqX]*

---

### 4. Histological & Morphological Features (The "Structure")
*Physical characteristics of the tissue used for phenotype definition.*

*   **Anatomical Layering (Hippocampus):** CA1–CA3 (SO, SP, SR, SLM); DG (ML, GCL, Hilus, Supra/Infrapyramidal blades). *[LTP], [MEA-seqX], [Multimodal]*
*   **Anatomical Layering (Cortex):** Entorhinal (EC), Perirhinal (PC). *[Nature/Nurture], [Multimodal]*
*   **Olfactory Bulb Layers:** ONL, GL, EPL, MCL, GCL. *[Multimodal]*
*   **Adult Hippocampal Neurogenesis (AHN):** Count of CldU-positive cells. *[Nature/Nurture]*
*   **Newborn Neuron Variance:** Inter-individual variability in cell counts. *[Nature/Nurture]*
*   **Phenotypic Age Differences:** E.g., Potentiation Amplitude reduction in aged mice. *[LTP]*

---

### 5. Behavioral & Phenotypic Inputs (The "Subject")
*Metrics defining the animal's behavior prior to slice recording.*

*   **Roaming Entropy (RE):** Measure of territorial coverage/exploration. *[Nature/Nurture]*
*   **Cumulative RE:** Longitudinal exploration trajectory. *[Nature/Nurture]*
*   **Learning Success:** % correct visits (normalized). *[Nature/Nurture]*
*   **Learning Trajectory:** Intercept (baseline), Slope (rate), Endpoint (final). *[Nature/Nurture]*
*   **Flexibility:** % visits to previous correct corner (unlearning). *[Nature/Nurture]*
*   **Repeatability ($R$):** Stability of individual uniqueness over time. *[Nature/Nurture]*
*   **Rank-order Consistency:** Spearman’s $\rho$ of performance ranking. *[Nature/Nurture]*

---

### 6. Statistical & Computational Metrics (The "Math")
*Derived quantities used to validate differences or create models.*

**Statistical Tests**
*   **Kolmogorov–Smirnov (K-S):** Comparing distributions. *[LTP], [MEA-seqX]*
*   **ANOVA (One/Two-way):** Group comparisons. *[LTP], [MEA-seqX]*
*   **Tukey’s Posthoc:** Specific group differences. *[LTP]*
*   **Brown-Forsythe:** Comparing variance (not means). *[Nature/Nurture]*
*   **Linear Mixed-Effect Models:** For longitudinal behavioral analysis. *[Nature/Nurture]*
*   **Bootstrap Analysis:** Simulation of Null Models. *[Nature/Nurture]*
*   **Standard Error (SEM) / IQR:** Variability metrics. *[LTP]*

**Computational Modeling & Machine Learning**
*   **kCSD (Kernel Current Source Density):** Sinks vs. Sources; Normalized Fold-change. *[LTP]*
*   **Principal Component Analysis (PCA):** Dimensionality reduction of waveforms. *[LTP], [MEA-seqX]*
*   **K-means Clustering:** Classification of waveforms. *[LTP], [MEA-seqX]*
*   **Confusion Matrix Accuracy:** Validation of synaptic pattern classification. *[LTP]*
*   **XGBoost Accuracy:** Prediction of LFP from Transcriptomics. *[MEA-seqX]*
*   **NMF (Non-Negative Matrix Factorization):** Includes Factor Weights, W-Matrix (Basis), H-Matrix (Coefficients). *[MEA-seqX]*
*   **Mutual Information ($MI$) / Distance Scores:** Dependence between variables. *[MEA-seqX]*
*   **Pearson Correlation ($r$) & Spearman Correlation ($\rho$).** *[MEA-seqX], [Nature/Nurture], [Multimodal]*
*   **Coefficient of Determination ($R^2$).** *[MEA-seqX]*

---

**Key to Sources:**
*   **[LTP]** = *Dynamic Mapping of Network Level LTP*
*   **[MEA-seqX]** = *MEA-seqX*
*   **[Nature/Nurture]** = *Beyond nature, nurture and chance*
*   **[Sleep/Memory]** = *Balancing memory in Sleep*
*   **[Multimodal]** = *Recording and Analyzing Multimodal Neuronal Ensemble Dynamics*