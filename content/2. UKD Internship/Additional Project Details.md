---
publish: true
created: 2025-11-21T13:18:28.773+01:00
modified: 2026-02-13T02:04:48.790+01:00
tags:
  - x/tud/ukd-internship
  - neuroscience
  - ai-ml
  - data-science
  - programming
cssclasses: ""
---


## Project: [EEG-GAT for ADHD Classification](https://share.note.sx/40flqwwr#s6/oDodtBNeETwZuTFPyU2n5bZP5BOqFc4mXefvrNGY)

---
## **1. Project Scope & Strategy**
*   **Objective:** Classify ADHD vs. Neurotypical participants using EEG Go/NoGo data.
*   **Core Challenge:** Small patient sample size (N=122) vs. High-dimensional data.
*   **Solution:** A **Three-Phase Transfer Learning** approach.
    *   **Phase 1:** Train a Trial-Level Feature Extractor on ~8,000 individual trials.
    *   **Phase 2:** Establish a baseline using extracted features + Classical ML (SVM).
    *   **Phase 3:** Fine-tune a Hierarchical End-to-End Deep Learning model.
*   **Key Asset:** Access to NVIDIA H100 (80GB VRAM), allowing for memory-intensive preprocessing (Parallel PLV).

---

## **2. Data Pipeline & Preprocessing**

### **A. Data Dimensions**
*   **Input Tensor:** `[Batch_Size, 60, 256]`
    *   **60 Channels:** The Graph Nodes.
    *   **256 Timepoints:** The Temporal Sequence (1 second @ 256Hz).
    *   **Units:** Data must be normalized (StandardScaler) or scaled to Microvolts (uV) to avoid vanishing gradients.

### **B. Graph Construction (The "Skeleton")**
*   **Method:** **Static PLV (Phase Locking Value) Prior.**
*   **Execution:** Pre-computed once on the **Training Set Only** using the H100.
*   **Process:**
    1.  Load all ~6,000 training trials.
    2.  Compute pairwise PLV for all $60 \times 60$ channel pairs.
    3.  Average across trials to get a single `[60, 60]` Grand Average Matrix.
    4.  Threshold (e.g., keep top 20%) to create a sparse `edge_index`.
    5.  **Why:** Provides a stable neuroanatomical prior, reducing the risk of overfitting to noise in single trials.

---

## **3. Model Architecture (The Pipeline)**

### **Stage 1: Temporal Feature Extraction (1D-CNN)**
*   **Input:** `[Batch * 60, 1, 256]` (Treating every electrode as an independent sample).
*   **Layer 1:** `Conv1d`
    *   **Kernel Size:** **25** (Approx. 100ms). Crucial for capturing the Alpha/Theta waves identified in Negin’s paper.
    *   **Filters:** 1 $\to$ 8.
*   **Layer 2:** `Conv1d` + `MaxPool`
    *   Further compresses time.
*   **Output:** `[Batch * 60, 16]` (A 16-dimensional feature vector for each node).

### **Stage 2: Spatial Feature Extraction (GATv2)**
*   **Input:**
    *   **Features:** The output from Stage 1.
    *   **Graph:** The Static `edge_index` (PLV Prior).
*   **Mechanism:** `GATv2Conv`
    *   The graph structure is **fixed** (from Preprocessing).
    *   The attention weights are **dynamic** (learned per trial).
    *   *Negin’s Insight:* Attention weights should naturally highlight Posterior/Occipital connections.
*   **Output:** `[Batch * 60, 32]` (Node embeddings enriched by spatial context).

### **Stage 3: Trial Readout**
*   **Mechanism:** `Global Mean Pooling`.
*   **Function:** Collapses the 60 nodes into a single vector.
*   **Output:** `[Batch, 32]` (The "Trial Embedding").

### **Stage 4: Patient Aggregation (The "IIV" Layer)**
*   **Input:** A set of Trial Embeddings for one patient (e.g., `[40, 32]`).
*   **Mechanism:** **Hybrid Pooling**.
    1.  **Mean Pooling:** Captures the "Typical" brain response (ERP-like).
    2.  **Std Dev Pooling:** Captures **Intra-Individual Variability (IIV)** (The "Stability" metric).
    3.  **(Optional) Attention Pooling:** A learned layer to weigh specific "ADHD-like" trials higher.
*   **Fusion:** Concatenate vectors. `[Mean_Vec, Std_Vec]`.
*   **Output:** `[Batch, 64]` (The Patient Fingerprint).

---

## **4. Implementation Strategy**

### **Phase 1: The Trial-Level Pre-trainer**
*   **Task:** Predict `ADHD vs Control` on **single trials**.
*   **Goal:** Force the CNN+GAT backbone to learn meaningful features.
*   **Target Accuracy:** 60-70% (Expect noise; single trials are hard to classify).
*   **Loss Function:** Binary Cross Entropy.

### **Phase 2: The Baseline Checkpoint (Critical)**
*   **Action:** Freeze the Phase 1 model.
*   **Workflow:**
    1.  Extract embeddings for all 122 participants.
    2.  Aggregated manually (Mean + Std).
    3.  Train an **SVM (RBF Kernel)** or **Logistic Regression**.
*   **Validation:** Leave-One-Subject-Out (LOSO) CV.
*   **Success Criteria:** If this hits >70%, the project is a success regardless of Phase 3.

### **Phase 3: End-to-End Hierarchical Fine-Tuning**
*   **Action:** Unfreeze the backbone. Attach the differentiable Aggregation Layer (Stage 4).
*   **Training:**
    *   **Batching:** Custom Batch Sampler (batches of *Patients*, not trials).
    *   **Learning Rate:** **Very Low** (e.g., `1e-5`). We want to *nudge* the weights, not destroy the Phase 1 learning.
*   **Validation:** LOSO CV.

---

## **5. Scientific Validation

To ensure comparability with the benchmark paper (Gholamipourbarogh et al., 2025), we will perform specific interpretability checks:

1.  **Artifact Check:** Inspect the GAT Attention weights. If the model focuses intensely on frontal electrodes (Fp1, Fp2), it may be learning eye-blink artifacts (similar to Negin’s Component 13).
2.  **Posterior Validation:** Confirm that high attention weights appear in **Parietal/Occipital regions** (Pz, O1, O2) in the Alpha/Theta bands, validating the paper’s finding using a non-linear method.
3.  **IIV Analysis:** Plot the `Std_Vec` values for ADHD vs Control. If the model works, ADHD patients should have significantly higher values in the Std dimension.

---
