---
publish: true
created: 2025-10-13T20:24:57.495+02:00
modified: 2026-02-13T02:05:09.462+01:00
tags:
  - x/tud/ukd-internship
  - ai-ml
  - neuroscience
  - data-science
cssclasses: ""
---


### **Project:** Graph Attention Networks for Classification of ADHD using Go/NoGo Task Data.

[Timeline](https://share.note.sx/xfjyt3w8#/e9LvAuRt7FDExwT8UYcJGGM2VnpXIQLNDu+bDOhyTc) | [Detailed Specifications](https://share.note.sx/sp3688zn#yMNLtHag0Bet2FNjl+7Mpi7c4oyJl9Xd1t8RxCl6KGo)

---

#### **1. Executive Summary**

This document outlines a phased implementation strategy for developing a Graph Neural Network (GNN) classifier to distinguish between ADHD and Neurotypical participants. The primary challenge facing this project is the limited number of participant-level labels (N=122), which makes standard end-to-end deep learning approaches infeasible due to a high risk of overfitting.

The proposed solution is a **three-phase transfer learning approach**. This methodology is for applying deep learning to clinical datasets of this size. It de-risks the project by first leveraging our larger trial-level dataset (~5,000 samples) to learn robust neurophysiological features before fine-tuning a model for the final patient-level classification task. This ensures a methodical progression with clear validation checkpoints and maximizes the potential for developing a high-performing, generalizable, and scientifically rigorous model.

#### **2. Analysis of Project Constraints and Goals**

*   **Primary Objective:** To develop a model that accurately classifies participants as ADHD or Neurotypical.
*   **Core Technology:** EEG-GAT, a Graph Neural Network that can learn functional connectivity patterns directly from EEG data.
*   **Primary Constraint:** The number of labels for our primary objective is **small (N=122)**. Deep learning models, with their vast number of parameters, typically require thousands of labels to train effectively from scratch.
*   **Key Asset:** While patient labels are scarce, trial-level data is abundant. With ~5,000 labeled trials (ADHD vs. Control), we have a sufficiently large dataset for an auxiliary learning task.

#### **3. Proposed Three-Phase Implementation Strategy**

##### **Phase 1: Pre-training the Trial-Level Feature Extractor**

*   **Objective:** To train the core components of the EEG-GAT model to learn a rich representation of neurophysiological patterns relevant to ADHD.
*   **Methodology:**
    1.  **Task Definition:** The model will be trained on the trial-level classification task: predicting whether a given trial belongs to a participant from the ADHD group or the Control group.
    2.  **Data:** The full dataset of ~5,000 trials will be used, providing a dense learning signal.
    3.  **Architecture:** The model will consist of the EEGNet-style CNN backbone followed by GAT layers and a graph readout layer.
    4.  **Evaluation:** Training will be performed using a `GroupKFold` cross-validation scheme to ensure the model learns generalizable features rather than subject-specific idiosyncrasies.
*   **Expected Outcome:** A **pre-trained model** whose weights encode a meaningful "vocabulary" of neural features. This model serves as a powerful, automated feature extractor for the subsequent phases.

##### **Phase 2: Establishing a Baseline via Classical Machine Learning (The Checkpoint)**

*   **Objective:** To empirically validate that the features learned in Phase 1 contain a discriminative signal for patient-level classification and to establish a robust performance baseline.
*   **Methodology:**
    1.  **Feature Extraction:** The pre-trained model from Phase 1 will be frozen. All trials from all participants will be passed through it to generate high-dimensional "trial embedding" vectors.
    2.  **Feature Aggregation:** For each participant, their collection of trial embeddings will be aggregated into a single feature vector. This will include summary statistics like the **mean** (representing the average neural response) and the **standard deviation** (representing intra-individual variability).
    3.  **Classification:** A simple but robust classifier (e.g., SVM with a radial basis function kernel, Logistic Regression with regularization) will be trained on the final participant feature vectors.
    4.  **Evaluation:** Performance will be measured using Leave-One-Subject-Out Cross-Validation (LOSO-CV) on the 122 participant vectors.
*   **Expected Outcome:** A solid, defensible classification accuracy score. This result is a significant finding in its own right and provides a clear benchmark that the final end-to-end model must outperform.

##### **Phase 3: Fine-tuning the End-to-End Hierarchical Model**

*   **Objective:** To achieve peak performance by optimizing the entire architecture directly for the patient classification task.
*   **Methodology:**
    1.  **Architecture Assembly:** A hierarchical model will be constructed. The pre-trained network from Phase 1 will serve as the trial-feature extractor (Level 1). A participant-level aggregation layer (e.g., attention or mean pooling) and a final MLP classifier will be added on top (Level 2).
    2.  **Fine-Tuning:** The entire model will be trained on the 122 participant labels. The key is to use a **very low learning rate**. This allows the model to gently "nudge" the powerful, pre-trained weights to specialize them for the patient diagnosis task, preventing the catastrophic forgetting or overfitting that would occur when training from scratch.
    3.  **Evaluation:** The model will be evaluated using the same LOSO-CV protocol as in Phase 2 for direct comparability.
*   **Expected Outcome:** The project's final, optimized model. The performance will be compared against the Phase 2 baseline to quantify the benefit of end-to-end optimization. The learned attention maps from the GAT can be analyzed for neuroscientific interpretation.

#### **4. Conclusion**

This phased strategy represents a robust, low-risk, and high-potential path to achieving our research goals. It directly addresses the primary constraint of our dataset while leveraging its key asset. Each phase produces a valuable outcome, ensuring a productive research progression.

---
### **Appendix A: Older Planned Strategy**

*   **Strategy Description:** This approach involves constructing a single, hierarchical deep learning model. This model would ingest all trials from a participant, process each trial through an EEG-GAT feature extractor, aggregate the resulting trial representations, and output a single prediction (ADHD/Control). The entire network would be trained in one step, from a random weight initialization, using only the 122 participant-level labels.

*   **Theoretical Appeal:** In a "big data" scenario, this is the ideal. The model has the maximum theoretical capacity to learn the optimal features at every level, as the learning process is constrained only by the final objective.

*   **Critical Flaws in Our Context (N=122):**
    1.  **Extreme Data Sparsity:** The core learning problem is one of extreme sparsity. The model must learn hundreds of thousands of parameters (in the CNN and GAT layers) based on feedback from only 122 examples. The gradient signal that propagates back from the final loss is averaged over all trials of a participant, providing a very weak and noisy signal for updating the trial-level feature extractor.
    2.  **High-Variance Gradients:** Because the learning signal is so sparse, the updates to the network weights (gradients) will have extremely high variance. Small changes in the training set (e.g., swapping one participant for another) could lead to drastically different learned models, a classic symptom of poor generalization.
    3.  **Intractability of Hyperparameter Tuning:** This model would have a vast number of hyperparameters (learning rate, layer sizes, dropout rates, optimizer choices). Finding a stable combination that works without overfitting on only 122 data points would be exceptionally difficult and computationally expensive. Any result would be highly sensitive to these choices.
    4.  **Lack of Diagnostic Checkpoints:** If this single, monolithic model fails to train or yields poor performance (e.g., 55% accuracy), it is nearly impossible to diagnose the point of failure. Is the CNN backbone flawed? Is the GAT not learning connectivity? Is the aggregator failing? The lack of intermediate validation makes the project a high-risk "all-or-nothing" endeavor.
    5.  **Scientific Defensibility:** Given the well-established challenges of deep learning with small datasets, results obtained from this approach would face significant scrutiny during peer review. It would be difficult to convincingly argue that the model has not simply overfit to the specific 122 individuals in the dataset.


---
### **Appendix B: Competitive Analysis and Rationale for Model Selection**

EEG-GAT represents the "sweet spot" for this specific problem, balancing model power with the constraints of our dataset. It is important to justify this choice against other state-of-the-art alternatives.

| Model Architecture                        | Description                                                                                                                                                    | Rationale for Not Choosing as Primary Model                                                                                                                                                                                                                                                                                                                                              |
| :---------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Graph Transformer (GT)**                | An evolution of GATs that uses the full transformer architecture to learn global, long-range dependencies between all nodes.                                   | **Higher Data Requirement & Overfitting Risk.** GTs have significantly more parameters than GATs. With only 122 participants for the final fine-tuning task, a GT is at a much higher risk of overfitting. It is likely too powerful and complex for the available data regime.                                                                                                          |
| **Spatio-Temporal GNN (ST-GNN)**          | A class of models that tightly integrate graph convolutions (over space) and temporal convolutions (over time) into a single unified layer.                    | **Redundancy with Proposed Architecture.** Our proposed `CNN Backbone -> GAT` architecture already effectively separates and handles the temporal and spatial dimensions. While an ST-GNN integrates these more tightly, it is not guaranteed to provide a significant performance boost and adds implementation complexity. Our separated approach is more modular and easier to debug. |
| **Pure Transformer (Vision/Time-Series)** | Models that treat the 60 EEG channels as a sequence of "tokens" and learn all relationships from scratch, ignoring the known spatial layout of the electrodes. | **Discards Critical Inductive Bias.** The spatial arrangement of EEG electrodes is not arbitrary; it reflects the underlying neuroanatomy. GNNs correctly leverage this crucial prior information (inductive bias). A pure Transformer would be forced to re-learn these spatial relationships from data alone, which is inefficient and requires a much larger dataset to be effective. |

### **Appendix C: Advanced Architectural and Interpretability Enhancements (Wang & Wang, 2025)**

#### **C.1 Rationale for Adopting a Multi-Branch Trial-Level Feature Extractor**

While the original plan specified an effective `EEGNet-style CNN -> GAT` pipeline for the Phase 1 feature extractor, the multi-branch architecture offers a more principled and powerful alternative. The core advantage lies in moving from *implicit* feature learning within a single pipeline to the *explicit* and *disentangled* modeling of the fundamental dimensions of the EEG signal.

This enhanced architecture will consist of three parallel branches, with their outputs fused to create a comprehensive trial-level embedding:

1.  **Spatial Branch (GAT):** This remains the core of our spatial modeling strategy, responsible for learning the complex, dynamic patterns of inter-channel functional connectivity indicative of ADHD neural signatures. Its function is preserved from the original plan but is strengthened by the other branches.

2.  **Temporal Branch (GRU + Transformer):** This branch is a significant upgrade for modeling the temporal evolution of neural activity. The hybrid design leverages the strengths of two architectures:
    *   **Gated Recurrent Unit (GRU):** Captures local, short-term temporal dynamics, which are critical for processing transient event-related potentials (ERPs) following the Go/NoGo stimuli.
    *   **Transformer:** Utilizes self-attention to model long-range dependencies across the entire trial epoch, identifying patterns that are too temporally distant for a standard RNN/GRU to capture effectively.

3.  **Frequency Branch (Multi-band 1D CNN):** This branch directly addresses the neurophysiological importance of distinct neural oscillations. The raw EEG signal for each channel will be decomposed into canonical frequency bands (e.g., Delta, Theta, Alpha, Beta, Gamma). A separate 1D CNN will be applied to each band to learn band-specific morphological features. This is particularly relevant for ADHD research, where biomarkers such as the theta/beta power ratio are well-established.

**Fusion and Output:** The feature vectors from all three branches will be concatenated and passed through a final fusion layer. The resulting vector will serve as the rich, multi-modal "trial embedding" for use in Phase 2 and as the foundation for the end-to-end model in Phase 3. This architecture is hypothesized to produce a more discriminative feature space, leading to higher classification accuracy.

#### **C.2 Enhancement: PLV-Informed Adjacency Matrix for the Spatial Branch**

A standard GAT must either be given a predefined graph structure (e.g., based on physical electrode distance, a poor proxy for functional connection) or learn the graph structure from scratch. To improve learning efficiency and embed crucial domain knowledge, we will adopt the technique of using a biologically-informed prior.

**Methodology:**
1.  **Pre-computation:** Using the full trial-level training dataset, we will compute the grand-average Phase Locking Value (PLV) between all pairs of EEG channels, creating a `C x C` matrix (where C is the number of channels) that represents the average functional connectivity during the task.
2.  **Initialization:** This PLV matrix will be used as the initial adjacency matrix for the GAT in the spatial branch.
3.  **Refinement via Attention:** The GAT's attention mechanism will then learn to *refine* this prior. It will learn to dynamically up-weight the connections that are most discriminative for the ADHD vs. Control classification and down-weight those that are less relevant.

**Advantage:** This approach injects neurophysiological reality directly into the model's architecture. Instead of starting from a naive or random state, the GAT begins with a strong, data-driven hypothesis about the brain's functional network, which it then learns to adapt for the specific classification task.

#### **C.3 Advanced Interpretability: A Joint SHAP-PLV Framework for Neuroscientific Validation**

To move beyond basic attention map visualization and achieve a higher standard of explainability, we will implement a dual-pronged interpretability framework upon completion of Phase 3. This framework is designed to bridge the gap between model-centric explanations and neurophysiological validation.

1.  **Model-Centric Analysis with SHAP:** We will use SHAP (SHapley Additive exPlanations) to precisely quantify the contribution of each input feature to the final patient-level classification. This will answer the question: **"What did the model learn to look for?"**
    *   **Outputs:** We will generate SHAP summary plots highlighting the most influential:
        *   **EEG Channels** (e.g., FCz, C3, P4)
        *   **Frequency Bands** (e.g., Beta, Theta)
        *   **Time Segments** (e.g., post-stimulus windows)

2.  **Neurophysiological Validation with PLV:** The findings from the SHAP analysis will guide a targeted investigation of the underlying neural data. This will answer the question: **"Does what the model found important correspond to a real, measurable difference in brain activity?"**
    *   **Methodology:** We will perform statistical comparisons of PLV-based functional connectivity between the ADHD and Neurotypical groups. This analysis will be focused *specifically* on the channels and frequency bands that SHAP identified as most important.

**The Power of Synergy:** The alignment (or lack thereof) between these two analyses constitutes the core of our interpretability findings. For example, a powerful result would be: "SHAP analysis revealed that our model's predictions rely heavily on Beta-band activity in fronto-central channels. Subsequent PLV analysis confirmed that these specific channels exhibit significantly altered long-range connectivity in the ADHD group, consistent with established theories of executive dysfunction." This synergy elevates the project's output from a simple classifier to a potential tool for biomarker discovery, providing strong evidence that the model has learned clinically relevant neural signatures of ADHD.
