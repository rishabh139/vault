---
publish: true
created: 2026-02-05T22:46:18.562+01:00
modified: 2026-02-13T01:57:27.730+01:00
tags:
  - x/tud/thesis
  - neuroscience
  - data-science
  - biology
  - europe
cssclasses: ""
---

[Full Feature Ranking](https://docs.google.com/spreadsheets/d/1crPWQX53Cv3haofLBTU5rAtgwFedOCYvDUD2l_G4gx0/edit?usp=sharing) | [Network Feature Approach](https://share.note.sx/o4xn45d5#TUT2ICvWbFfdf6j81WdH/1cn8NTwbAnx3LPU/XTNkX4)

---
## **1. Executive Summary**

Following the validation of the preprocessing pipeline (Phase 1), we have completed the **Feature Extraction and Statistical Analysis** phase. By processing the dataset ($N=6$ over 10 mins => 421 burst events) using the updated **LFP-Guided Spike Analysis** framework, we have mapped the functional architecture of stress resilience from this dataset.

Our central hypothesis is that **Resilience is not a passive return to baseline health.** Instead, it is an active, structurally demanding adaptation.

While Susceptible networks collapse into **"Fragmented Chaos"**—characterized by noisy incoherence and structural degradation—Resilient networks undergo a fundamental **Structural and Functional Reorganization**. They evolve into a **"Hyper-Ordered Network"**—forcing their activity into rigid, low-dimensional pathways and sacrificing firing flexibility to strictly contain the effects of stress.

---

## **2. Methodological Evolution**

To ensure the biomarkers discovered are robust, biologically specific, and free from bias, three specific technical refinements were implemented:

1.  **Bandwidth Specificity (0–100 Hz LFP):**
    We narrowed the LFP analysis to the canonical frequency bands (Delta, Theta, Beta, Gamma). This intentionally removes high-frequency ripple noise and multi-unit bleed-through, isolating the synaptic oscillations responsible for network coordination.
2.  **Spike Source Precision:**
    We now utilize discrete, timestamped spike events directly from BrainWave 4 > Spike Detection. 
3.  **Consensus Feature Ranking:**
    To prevent selection bias, we implemented a unified ranking system. Features were scored based on a consensus of **7 distinct algorithms**, including _Statistical_ (Kruskal-Wallis / ANOVA, Cohen's $d$), _Information Theoretic_ (Mutual Information), and _Machine Learning_ (SHAP, XGBoost, Random Forest, Step-Wise (Forward and Backward) Feature Selection).

---

## **3. Data Findings**

Our analysis confirms that we are observing three distinct functional architectures: **Control**, **Susceptible**, and **Resilient**. The data reveals a specific narrative of **Shared Pattern** between offsprings that went through pre-natal stress followed by **Divergent Adaptation** by the Resilient group.

### **Finding 1: Baseline Effects of Prenatal Stress**
**Hypothesis:** Do Resilient animals simply avoid the effects of stress?
**Verdict:** No. Both groups carry the physiological signatures of stress exposure.

Resilience is not the absence of damage; it is the *management* of it. Both Resilient and Susceptible networks share fundamental physiological alterations compared to Controls, indicating a **Shared Inheritance**:

*   **Elevated Excitability:**
    *   **Resilient (+14%)** and **Susceptible (+20%)** both exhibit significantly higher **LFP Global Energy** compared to Controls (Kruskal $p = 3.6 \times 10^{-11}$).
    *   **Biological Interpretation:** This aligns with the **glucocorticoid programming hypothesis** described by Kumar & Foster (2014), where early-life stress permanently downregulates hippocampal glucocorticoid receptors, impairing negative feedback and creating a hyperexcitable HPA axis. The elevated energy setpoint represents a **permanent tuning toward excitation** that both phenotypes must manage.

*   **Inhibitory Lag:**
    *   Both groups display a dramatically prolonged **Spike Decay Time**.
        *   **Resilient:** 0.16s (vs Control 0.08s)
        *   **Susceptible:** 0.19s (vs Control 0.08s)
    *   **Biological Interpretation:** This doubling of decay time indicates compromised **GABAergic clearance or K+ channel function**. (Yeh et al., 2012) (Bath et al., 2012). The "braking system" is damaged in all stress-exposed offspring, regardless of behavioral outcome.

*   **Temporal Synchrony Drop:**
    *   Both groups show a significant drop in **Golomb Synchrony** (Resilient −14.8%, Susceptible −12.1%).
    *   **Biological Interpretation:** The fine-tuned millisecond timing precision of the network is somehow degraded/damaged. This represents a loss of the precise spike-time coordination required for efficient neural coding.
     
    **Possible Conclusion:** The substrate for both phenotypes is a hyper-excitable, slow-inhibiting network. The divergence lies in how they manage this shared deficit.
    
    ![[Pasted image 20260210113317.png|center|820]]

---

### **Finding 2: Network Integrity & Modularity**
**Hypothesis:** Does the network hold together under stress?
**Verdict:** Susceptible networks suffer **Catastrophic Fragmentation**, while Resilient networks preserve **Modular Architecture**.

Using the topological network view (fixed 10% density), we corrected for signal volume to see the true wiring structure.

*   **The Susceptible Failure (Loss of Modularity):**
    *   **Modularity drops to 0.46** (Control: 0.51).
    *   **Biological Interpretation:** This represents the **dissolution of functional boundaries** (Valverde, 2017). The Susceptible network cannot segregate activity into discrete processing units. This "leakiness" allows noise to propagate unchecked, leading to a loss of global efficiency (0.66 vs Control 0.84). The network is physically active but functionally disconnected.

*   **The Resilient Adaptation (Preserved Structure):**
    *   **Modularity remains at 0.50** (statistically comparable to Control).
    *   **Biological Interpretation:** Despite the stress, the Resilient network actively maintains the segregation of its functional communities. This preservation of modularity is a known mechanism to **contain epileptiform spread**—by keeping communities distinct, the network prevents local high-energy bursts from cascading into a global seizure.
      
    ![[Pasted image 20260210113406.png|center|820]]

---

### **Finding 3: Hyper-Ordering (Entropy & Efficiency)**
**Hypothesis:** How is the network wired to support this functional preservation?
**Verdict:** Resilience is defined by **Dimensionality Reduction** (Lower Entropy).

**Spatial Entropy** served as a critical discriminator in our analysis.

*   **Susceptible: Failure to Adapt (High Entropy).**
    *   **Entropy (0.76):** Identical to Control (0.76).
    *   **Interpretation:** This is a failure of adaptation. Under high-stress load (Finding 1), retaining a "flexible" (high entropy) Control-like state is maladaptive. The network remains chaotic and noisy, unable to channel the excess energy, leading to the lowest **Global Efficiency (0.66)**.

*   **Resilient: The "Hyper-Ordered" State.**
    *   **Lowest Entropy (0.68):**
    *   **Interpretation:** The Resilient network does not mimic the Control; it is a totally seperate and unique phenotype. It forces activity into a **lower-entropy state**, effectively reducing the degrees of freedom in the system. This **Hyper-Order** creates rigid, efficient pathways for information flow, preventing the "stagnant chaos" seen in the Susceptible group.
    
    ![[Pasted image 20260210113453.png|center|820]]
---

### **Finding 4: Active Spike-LFP Decoupling**
**Hypothesis:** How does the network prevent seizures despite high energy input?
**Verdict:** Resilient networks implement a non-linear **Functional Decoupling** via Inhibition.

We analyzed the relationship between Input Energy and Spike Rate and found a critical divergence in coupling logic:

*   **Susceptible Connections:**
    *   **Correlation:** $R = -0.45$.
    *   **Biological Interpretation:** The network acts as a linear conduit. High synaptic drive (LFP) directly dictates spiking output. The system is **pathologically enslaved** to the population field, leading to **Hyperactive Output (26k Hz)**. This represents a failure of adaptive filtering—the network cannot decouple input from output, resulting in metabolic exhaustion.

*   **Resilient Adaptation:**
    *   **Correlation:** $R = -0.26$ (Significant weakening of the link).
    *   **Biological Interpretation:** The Resilient network has effectively "broken" the linear dependency. Hershenhoren et al. (2019) demonstrated that **Stimulus-Specific Adaptation (SSA)** reduces spike-LFP phase coupling by specifically blocking spikes that would occur during their "preferred phase." The Resilient phenotype shows **constitutive SSA-like decoupling**—a hard-wired preventive mechanism that allows the network to consume high input energy but **refuse to pass it on** as spikes.
    *   **Mechanism:** This is evidence of **massive shunting inhibition** (Larosa & Wong, 2022). By increasing Cl⁻ conductance through preserved GABA_A receptor function (particularly α1 subunit density), the network "shorts out" excitatory currents before they trigger action potentials. The result is **suppressed firing (16k Hz)** despite elevated drive.
      
    ![[Pasted image 20260210113544.png|center|820]]

---

### **Finding 5: Connectivity Volume vs. Topology**
**Hypothesis:** Is the Resilient network "patchy" or broken?
**Verdict:** Resilient networks execute **Strategic Downscaling**.

Our network analysis clarified the relationship between connection strength (Volume) and organization.

*   **Susceptible: The "Hollow" Network.**
    *   **Lowest Degree (103.03):** Despite having high LFP Energy (Finding 1), functional connectivity collapses.
    *   **Interpretation:** This resolves the paradox of "High Energy, Low Function." The Susceptible brain is "shouting" (High Energy) but no one is "listening" (Low Degree). The synaptic connections are functionally broken or saturated by noise.

*   **Resilient: Managed Downscaling.**
    *   **Intermediate Degree (127.27):** Lower than Control (146.57) but significantly preserved compared to Susceptible.
    *   **Interpretation:** The Resilient network accepts a reduction in total connectivity (likely due to synaptic pruning or inhibition) but maintains enough connectivity to support a **Small-Worldness (0.18)** that is actually *higher* than Control (0.15). This confirms Larosa & Wong’s (2022) hypothesis of **engram specificity**—sacrificing broad connectivity to preserve the efficiency of critical pathways.
      
    ![[Pasted image 20260210113605.png|center|820]]

---

### **Finding 6: Waveform Asymmetry (Ionic Retuning?)**
**Hypothesis:** Is the underlying ion-channel composition altered?
**Verdict:** Active Retuning of Synaptic Integration (Effect Size $d=0.87$).

The **LFP Waveform Skew** is significantly altered in stress-exposed groups.

-  **Biological Interpretation:**
	 LFP skewness reflects the **temporal asymmetry** of synaptic currents—the relative timing of excitation versus inhibition. The large effect size ($d=0.87$) suggests that Resilient and Susceptible networks have **fundamentally different E-I temporal dynamics**.
	
	This retuning of the E-I window may represent a second layer of protection alongside the Resilient Adaption—preventing high energy from triggering runaway excitation even when shunting inhibition is momentarily overwhelmed.
	
	![[Pasted image 20260210113628.png|center|820]]

### **Finding 7: Homeostatic Dysregulation (The Cost of Survival)**
**Hypothesis:** Does the Resilient network return to a healthy homeostatic baseline?
**Verdict:** No. Resilience represents a distinct, **Hyper-Dysregulated** state.

To distinguish between *complexity* (Shannon Entropy) and *biological abnormality* (Dysregulation), we computed the **Mahalanobis Distance (HD)** of each phenotype relative to the Control centroid.

*   **Control (Baseline):**
    *   **HD Score: -0.35.** Defines the homeostatic norm.
*   **Susceptible (Passive Drift):**
    *   **HD Score: 4.67.** Stress forces the network into a pathological trajectory, drifting far from the healthy covariance structure.
*   **Resilient (Active Excursion):**
    *   **HD Score: 5.14 (Highest Deviation).**
    *   **Biological Interpretation:** Surprisingly, Resilient networks are **statistically further from "Health" than Susceptible ones.** This confirms that Resilience is *not* a recovery of the original state. To survive the high-energy environment (Finding 1) without seizing, the network forces itself into an **extreme configuration**—rigid modularity and massive inhibition. This "Hyper-Ordered" state (Finding 3) is a metabolically expensive, structural departure from baseline, proving that survival requires a fundamental rewriting of network rules rather than a simple return to homeostasis.

---

## **4. Statistical Summary (The Complete Phenotypes)**

| Feature Domain         | **Feature**           | **Control (Baseline)** | **Susceptible (Fragmented Chaos)** | **Resilient (Hyper-Ordered)**   |
| :--------------------- | :-------------------- | :--------------------- | :--------------------------------- | :------------------------------ |
| **Energy Input**       | LFP Global Energy     | Baseline               | **High (+20%)** (Inherited)        | **Elevated (+14%)** (Inherited) |
| **Inhibitory Lag**     | Spike Decay Time      | 0.08s                  | **0.19s** (Severe Lag)             | **0.16s** (Significant Lag)     |
| **Excitability**       | Net_Degree_Vol        | 146.57                 | **103.03** (Collapsed)             | **127.27** (Preserved)          |
| **Connectivity**       | Net_Node_Strength     | 117.47                 | **84.67** (Weak)                   | **100.68** (Moderate)           |
| **Organization**       | Spat_Entropy          | 0.76 (Flexible)        | **0.76** (Maladaptive)             | **0.68** (**Hyper-Ordered**)    |
| **Structure**          | Net_Modularity_Top    | 0.51                   | **0.46** (Leaky)                   | **0.50** (Segregated)           |
| **Integration**        | Net_Global_Efficiency | 0.84                   | **0.66** (Inefficient)             | **0.81** (Efficient)            |
| **Timing**             | Net_Golomb_Synchrony  | 0.59                   | **0.52** (Jittered)                | **0.50** (Desynchronized)       |
| **Spike Output**       | Mean Rate (Hz)        | 29k Hz                 | **26k Hz** (Linear Coupling)       | **16k Hz** (**Suppressed**)     |
| **Recruitment**        | Active Neurons (%)    | 7.50%                  | 7.77% (Wasteful)                   | **6.08%** (Sparse)              |
| **LFP-Spike Coupling** | Pearson R             | $R=-0.42$              | $R=-0.45$ (Hyper-coupled)          | **$R=-0.27$** (Decoupled)       |

![[Pasted image 20260210113947.png|center|820]]
***

## **5. Phase 3 Strategy: Unsupervised Phenotyping**

With Phase 2 complete, we have validated a feature set that is biologically interpretable and statistically powerful. The discovery of the orthogonality between **Chaos (Susceptibility)** and **Order (Resilience)** confirms that the data contains the necessary structure for blind classification.

We may now start with a GMM/UMAP classical clustering approach and then perhaps move towards applying an **Autoencoder-based Clustering Framework** if necessary.
*   **Rationale:** Our findings regarding the LFP-Spike Decoupling are inherently **non-linear**. Standard linear methods (like PCA) might fully capture this functional gating.
*   **Approach:** Deep Autoencoders may be used to learn the non-linear manifold of the "Resilient State," allowing us to map the "probability landscape" of stress adaptation without human bias.

---

## **6. Critical Next Steps: Data Requirements**

To convert these Phase 2 findings into a robust, generalized Unsupervised Model for Phase 3, **the integration of the remaining dataset (N=48 slices) is important now.**

While our current analysis ($N=6$ => 421 bursts from initial slices) has shown that the *biomarkers* exist, our modeling highlights three critical factors that require the full sample size to resolve:

1.  **Animal-Level Variance:**
    In our preliminary heatmaps, we observed "dormancy": some Susceptible networks exhibit clear pathology, while others transiently resemble Controls.
    *   *Requirement:* We need the full $N=54$ dataset to statistically calculate the **"Probability of Collapse"**—quantifying how often a Susceptible network enters the pathological state versus the dormant state. This resolves whether the variance is noise or a biological feature.

2.  **Manifold Density for Deep Learning:**
    Our Phase 3 Autoencoder relies on learning the continuous "shape" (manifold) of neural activity. When running unsupervised clusteringr with the current sample size, the high-dimensional data appears as "disjointed islands."
    *   *Requirement:* The additional 48 slices are required to "fill the gaps" in the latent space. This ensures the Autoencoder learns the **general rules of Resilience** (the topology), rather than overfitting to the idiosyncrasies of specific pilot animals.

3.  **Generalizability & Diagnostic Power:**
    We must validate our biomarkers on more expansive data.
    *   *Requirement:* The full dataset allows for a rigorous **Train/Test split** (e.g., Train on 40, Test on 14). Successfully predicting the phenotype of unseen slices based on their "Entropy" and "Correlation" scores can serve as the final validation of the thesis and also of the above mentioned findings. As we can still see data pattern that challenges the above findings.

---

## **References**

1. Bath, K. G., Manzano-Nieves, G., & Goodwill, H. L. (2012). Prenatal stress and hippocampal BDNF expression: A fading imperative. *Neuroscience*, 239, 74-75.
2. Braun, U., Schäfer, A., Bassett, D. S., Rausch, F., Schweiger, J. I., Bilek, E., ... & Meyer-Lindenberg, A. (2018). From maps to multi-dimensional network mechanisms of mental disorders. *Neuron*, 97(1), 14-31.
3. Hershenhoren, I., Taaseh, N., Antunes, F. M., & Nelken, I. (2019). Stimulus-specific adaptation decreases the coupling of spikes to LFP phase. *Journal of Neuroscience*, 39(33), 6449-6461.
4. Kim, J. J., & Diamond, D. M. (2015). Stress effects on the hippocampus: A critical review. *Learning & Memory*, 22(9), 411-416.
5. Kumar, G., & Foster, T. C. (2014). Early-life stress impacts the developing hippocampus and primes seizure occurrence: Cellular, molecular, and epigenetic mechanisms. *Neurobiology of Disease*, 70, 166-184.
6. Larosa, A., & Wong, T. P. (2022). The hippocampus in stress susceptibility and resilience: Reviewing molecular and functional markers. *Progress in Neuro-Psychopharmacology and Biological Psychiatry*, 116, 110523.
7. Valverde, S. (2017). Breakdown of modularity in complex networks. *Physical Review E*, 96(6), 062301.
8. Yeh, C. M., Huang, C. C., & Hsu, K. S. (2012). Prenatal stress alters hippocampal synaptic plasticity in young rat offspring through preventing the proteolytic conversion of pro-brain-derived neurotrophic factor (BDNF) to mature BDNF. *Journal of Physiology*, 590(4), 991-1010.