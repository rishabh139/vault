---
publish: true
created: 2026-02-05T22:49:35.442+01:00
modified: 2026-02-05T22:54:11.303+01:00
cssclasses: ""
---


## **Title:** Unsupervised Computational Framework for Data-driven Phenotyping of Large-scale Neural Dynamics in Stress-related Brain Networks

---

### **1. Scientific Context & Problem Statement**
Prenatal stress induces divergent neurodevelopmental trajectories: while some offspring develop pathology (Susceptible), others maintain normal function despite the insult (Resilient). Understanding the intrinsic network dynamics that confer this resilience is critical for early biomarker detection.

However, standard analytical methods rely on supervised classification using *a priori* biological labels. This approach biases discovery toward known features and fails to capture heterogeneity within groups. Furthermore, the analysis of high-density microelectrode array (HD-MEA) data is plagued by signal processing challenges—specifically, the difficulty in distinguishing biologically significant silence (inhibition) from technical artifacts (dead channels).

**Core Hypothesis:** An unsupervised machine learning framework, operating on rigorously cleaned spatiotemporal tensors of neural activity, can identify latent functional phenotypes that align with biological resilience, without prior exposure to experimental labels.

---

### **2. The Data Ecosystem: Nature, Volume, and Discrepancies**

This project utilizes a complex, high-dimensional dataset derived from hippocampal slices (Mouse: *Mus musculus*) recorded on the 3Brain CorePlate™ HD-MEA platform.

#### **A. Data Nature & Volume**
*   **Instrumentation:** 4,096 simultaneous recording channels (64x64 grid).
*   **Experimental Model:** 4-Aminopyridine (4-AP) induced seizure model, generating hypersynchronous traveling waves.
*   **Dataset Size:** 9 animals (3 Susceptible, 3 Resilient, 3 Control) $\times$ 6 slices/animal = **54 biological replicates**.
*   **Unit of Analysis:** Spontaneous Network Bursts. Estimated $N \approx 1300–1500$ distinct burst events.
*   **Input Modalities:**
    1.  **LFP (Local Field Potential):** < 100 Hz. Represents synaptic currents and defining the "global clock" of network events.
    2.  **Spikes:** > 300 Hz. Represents local population firing outputs.

#### **B. Critical Data Discrepancies & Resolution Strategies**
The raw data contains inherent contradictions and noise sources that disqualify standard spike-sorting pipelines.

| Discrepancy Type | Description | Computational Resolution (Implemented in Phase 1) |
| :--- | :--- | :--- |
| **The "Seizure Hash"** | During 4-AP bursts, waveform overlap prevents single-unit spike sorting. | **MUA Power Envelopes:** Transformation of raw voltage to continuous RMS energy (20ms bins) to measure total local excitability rather than discrete spike counts. |
| **The "Signal vs. Silence" Paradox** | A silent electrode could be a *resilient* region (active inhibition) or a *broken* sensor. | **The "Union Strategy":** A channel is valid if it has historically fired (Global Trust Mask) **OR** creates a transient high-SNR event (Local Recruitment). This preserves "biological silence" while rejecting hardware failure. |
| **Phantom Artifacts** | Mechanical shocks create instantaneous, chip-wide voltage deflections. | **"Blast Radius" Masking:** Vectorized density detection removes timepoints where >30% of the chip fires within 20ms, creating "Forbidden Intervals" for analysis. |
| **Spatial Sparsity** | 4,096 channels are too sparse for dense ML models. | **Gaussian Supernodes:** Spatially smoothed downsampling ($\sigma=1.5$) transforms the 64x64 grid into **8x8 Density Tensors**, standardizing input geometry across variable slice anatomies. |

---

### **3. Methodological Framework**

The project is structured into three sequential phases, moving from raw signal processing to latent space discovery.

#### **Phase 1: Dual-Stream Preprocessing & Tensor Construction (Completed)**
*   **Objective:** Transform raw HDF5 recordings into standardized, artifact-free Burst Tensors.
*   **Method:**
    *   **LFP Stream:** Detects network-wide events to define $T_{start}$ and $T_{end}$ of bursts.
    *   **MUA Stream:** Extracts high-frequency energy using the "Union Strategy" to ensure signal integrity.
    *   **Tensor Generation:** Alignment of spatial activity into 4D structures: `(N_Bursts, Time_Steps, 8, 8)`.
*   **Output:** A clean dataset of ~1,500 spatiotemporal tensors representing discrete network events.

#### **Phase 2: Quantitative Feature Engineering (Current Status)**
*   **Objective:** Generate a "tabular" representation of network dynamics for statistical profiling.
*   **Method:** Computation of explicit engineering features from the tensors:
    *   **Temporal:** Burst Duration, Inter-Burst Interval (IBI), Global Firing Rate.
    *   **Spatial:** Participation Rate (Active Area), Propagation Speed (Wavefront Velocity).
    *   **Complexity:** Shannon Entropy of spatial activation, Synchrony Index.
*   **Deliverable:** A feature matrix $X_{features}$ used for initial PCA visualization and statistical baselining.

#### **Phase 3: Unsupervised Manifold Learning (The Core ML Task)**
*   **Objective:** Discover latent phenotypes without access to biological labels (Susceptible/Resilient).
*   **Method:**
    1.  **Deep Embedding:** Train a **Spatio-Temporal Autoencoder (ST-AE)** (e.g., Convolutional LSTM or Transformer) to compress Burst Tensors into a low-dimensional latent vector $z$.
    2.  **Clustering:** Apply clustering algorithms (K-Means / HDBSCAN) on the latent space $z$ to identify natural groupings.
    3.  **Post-Hoc Validation:** Unblind the labels to assess if the discovered clusters correspond to the biological groups (Resilient vs. Susceptible).
*   **Hypothesis Test:** Do "Resilient" brains occupy a distinct region of the latent manifold compared to "Susceptible" brains?

---

### **4. Thesis Deliverables**

1.  **The Pipeline:** A reusable, open-source Python library for HD-MEA preprocessing that solves the specific artifacts of seizure models.
2.  **The Atlas:** A quantitative characterization of feature differences (e.g., "Resilient networks exhibit 20% higher spatial entropy than Susceptible networks").
3.  **The Model:** An unsupervised Deep Learning model capable of categorizing brain slices based purely on intrinsic dynamics.

---

### **5. Summary for Supervisor**
This project represents a shift from *predictive classification* to *phenomenological discovery*. By rigorously handling the "Signal vs. Silence" discrepancy in Phase 1, we ensure that the unsupervised models in Phase 3 are learning biological variance (inhibition/excitation balance) rather than technical noise. The resulting framework provides a non-biased method for identifying the neural signatures of stress resilience.