---
publish: true
created: 2025-12-02T10:23:49.525+01:00
modified: 2026-02-13T02:04:00.301+01:00
tags:
  - x/tud/ukd-internship
  - neuroscience
  - data-science
  - programming
cssclasses: ""
---

---

## **1. Data Engineering: The PLV Graph Construction**

Before any neural network training begins, we construct a "Static Graph Prior" to define how EEG electrodes are connected. We do not use physical distance; we use **Phase Locking Value (PLV)**, a measure of functional connectivity.

### **1.1. Mathematical Definition**
For two EEG signals $x_i(t)$ and $x_j(t)$ (channels $i$ and $j$):

1.  **Analytic Signal:** We compute the analytic signal using the Hilbert Transform $\mathcal{H}$:
    $$ z_i(t) = x_i(t) + j\mathcal{H}[x_i(t)] = A_i(t)e^{j\phi_i(t)} $$
    Where $\phi_i(t)$ is the instantaneous phase.

2.  **Phase Difference:** We calculate the phase difference between channels at time $t$:
    $$ \Delta\phi_{ij}(t) = \phi_i(t) - \phi_j(t) $$

3.  **PLV Computation:** We average the complex exponential of the phase difference across all timepoints ($T$) and all trials ($N$) in the training set:
    $$ PLV_{ij} = \left| \frac{1}{N \cdot T} \sum_{n=1}^{N} \sum_{t=1}^{T} e^{j(\Delta\phi_{ij}(n, t))} \right| $$
    *   **Output:** A scalar between 0 (random phase) and 1 (perfect synchronization).

### **1.2. Implementation & Thresholding**
*   **Code Reference:** `dataset.py -> compute_plv_adjacency`
*   **Operation:** We compute a $60 \times 60$ matrix where entry $(i, j)$ is $PLV_{ij}$.
*   **Sparsification:** To create a graph $G=(V, E)$, we apply a hard threshold $\tau$ (90th percentile):
    $$ A_{ij} = \begin{cases} 1 & \text{if } PLV_{ij} > \tau \\ 0 & \text{otherwise} \end{cases} $$
*   **Safety Check:** This is calculated **only on the training set**. The resulting adjacency matrix $A$ is fixed and applied to validation/test sets. **No data leakage occurs.**

---

## **2. The Neural Architecture: Forward Pass Logic**

The model transforms a raw tensor into a diagnostic probability.

**Input:** Batch of Trials $X \in \mathbb{R}^{B \times C \times T}$
*   $B$: Batch Size (e.g., 64)
*   $C$: Channels (60)
*   $T$: Timepoints (256)

### **2.1. Stage 1: Temporal 1D-CNN (Feature Extraction)**
We treat every channel as an independent time-series. We reshape input to $[B \cdot C, 1, T]$.

**Operation:**
$$ h_{i}^{(1)} = \text{MaxPool}(\sigma(\text{BN}(W_1 * x_i + b_1))) $$

*   **Convolution ($*$):** A kernel of size 25 slides over the 256 timepoints.
    *   *Why 25?* At 256Hz, 25 samples $\approx$ 100ms. This captures **Alpha/Theta oscillations** and P300 ERP widths.
*   **Batch Norm (BN):** Normalizes activations to mean 0, variance 1. Prevents vanishing gradients.
*   **Activation ($\sigma$):** LeakyReLU (allows small negative gradients to flow).
*   **Output:** Each channel is now a vector $h_i \in \mathbb{R}^{16}$.

### **2.2. Stage 2: Spatial GATv2 (Graph Attention)**
We restore the graph structure. Input is node features $H = \{h_1, ..., h_{60}\}$ and the PLV adjacency matrix $A$.

**Mathematical Operation (Per Layer):**
For every connected pair of nodes $(i, j)$ defined by $A_{ij}=1$:

1.  **Linear Transformation:**
    $$ z_i = W \cdot h_i, \quad z_j = W \cdot h_j $$
2.  **Attention Coefficient ($e_{ij}$):** The model learns how important neighbor $j$ is to node $i$:
    $$ e_{ij} = \text{LeakyReLU}\left( \vec{a}^T \cdot [z_i || z_j] \right) $$
    *(Note: $||$ denotes concatenation. The attention mechanism looks at both nodes jointly).*
3.  **Softmax Normalization:**
    $$ \alpha_{ij} = \frac{\exp(e_{ij})}{\sum_{k \in \mathcal{N}(i)} \exp(e_{ik})} $$
4.  **Weighted Aggregation:**
    $$ h_i' = \sigma \left( \sum_{j \in \mathcal{N}(i)} \alpha_{ij} \cdot z_j \right) $$

**Output:** A spatial embedding per node $h_i' \in \mathbb{R}^{32}$.

### **2.3. Stage 3: Trial Readout**
We collapse the 60 nodes into one vector representing the trial.
$$ \mathbf{v}_{trial} = \frac{1}{60} \sum_{i=1}^{60} h_i' $$
**Output:** $\mathbf{v}_{trial} \in \mathbb{R}^{32}$.

---

## **3. Phase 1: Pre-training (Optimization Detail)**

*   **Goal:** Learn weights $W_{CNN}$ and $W_{GAT}$.
*   **Input:** Single Trial $X_{trial}$.
*   **Target:** Binary Label $y \in \{0, 1\}$ (0=Control, 1=ADHD).

**Output Head:** A linear projection $\hat{y} = W_{head} \cdot \mathbf{v}_{trial} + b$.

**Loss Function (Binary Cross Entropy with Logits):**
$$ \mathcal{L} = - [w_{pos} \cdot y \cdot \log(\sigma(\hat{y})) + (1-y) \cdot \log(1 - \sigma(\hat{y}))] $$
*   **Sigmoid ($\sigma$):** Converts raw logits to probability $P(y=1)$.
*   **Class Weight ($w_{pos}$):** Calculated as $\frac{Count_{neg}}{Count_{pos}}$. This mathematically forces the gradient updates to be larger for the minority class, neutralizing dataset imbalance.

---

## **4. Phase 2: The Baseline (Statistical Aggregation)**

Here, we freeze the neural network. It becomes a deterministic function $f(X)$.

**Input:** A patient $P$ consisting of $K$ trials $\{X_1, X_2, ..., X_K\}$.

**Step 1: Embedding Extraction**
For each trial $k$, we get $\mathbf{v}_k = f(X_k)$.

**Step 2: Patient Aggregation (Mathematical Moments)**
We compute two statistical moments across the $K$ trials:
1.  **Mean Vector (The "ERP"):** $\mu_P = \frac{1}{K} \sum_{k=1}^{K} \mathbf{v}_k$
2.  **Std Dev Vector (The "IIV"):** $\sigma_P = \sqrt{\frac{1}{K} \sum_{k=1}^{K} (\mathbf{v}_k - \mu_P)^2}$

**Step 3: Feature Concatenation**
$$ \mathbf{V}_{patient} = [\mu_P || \sigma_P] \in \mathbb{R}^{64} $$

**Step 4: SVM Classification**
We optimize a hyperplane using the Radial Basis Function (RBF) kernel:
$$ K(\mathbf{V}_i, \mathbf{V}_j) = \exp(-\gamma ||\mathbf{V}_i - \mathbf{V}_j||^2) $$
*   *Why this works:* It projects the 64D data into infinite dimensions to find a separation boundary that isn't linear.

---

## **5. Phase 3: End-to-End Fine-Tuning**

This is the most complex phase. We treat a **Patient** (a bag of trials) as a single training sample.

**Input:** Set of trials $\{X_1, ..., X_K\}$ and one label $Y$.

**Forward Pass:**
1.  Pass all $K$ trials through CNN+GAT $\rightarrow$ get $\{\mathbf{v}_1, ..., \mathbf{v}_K\}$.
2.  **Differentiable Pooling:**
    $$ \mathbf{V}_{patient} = [\text{Mean}(\{\mathbf{v}\}) || \text{Std}(\{\mathbf{v}\})] $$
    *Note: Standard Deviation is differentiable. Gradients can flow through it back to the CNN.*
3.  **Classification:**
    $$ \hat{Y} = \text{MLP}(\mathbf{V}_{patient}) $$

**Backward Pass (Gradient Flow):**
$$ \frac{\partial \mathcal{L}}{\partial W} = \frac{\partial \mathcal{L}}{\partial \hat{Y}} \cdot \frac{\partial \hat{Y}}{\partial \mathbf{V}_{pt}} \cdot \left( \frac{\partial \mathbf{V}_{pt}}{\partial \mu} \frac{\partial \mu}{\partial \mathbf{v}} + \frac{\partial \mathbf{V}_{pt}}{\partial \sigma} \frac{\partial \sigma}{\partial \mathbf{v}} \right) \cdot \frac{\partial \mathbf{v}}{\partial W} $$
*   **Crucial Detail:** The gradient signal is averaged over all trials of a patient. This provides a very stable, low-noise update compared to single-trial training.

**Safety Mechanism: Frozen Batch Norm**
*   **The Risk:** Batch Normalization usually calculates mean/variance of the current batch. In Phase 3, our "batch" is effectively 1 patient. The statistics of 1 patient are not representative of the population.
*   **The Fix:** We set `bn_layer.eval()`.
*   **Math:** The layer uses the global moving average $\mu_{pop}$ and $\sigma^2_{pop}$ learned during Phase 1 (Pre-training), rather than the current patient's statistics. This prevents the model from crashing due to statistical instability.

---

## **6. Safety Audit**

| Concern            | Verification                                                                                                                                                                                                  |
| :----------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Data Leakage**   | **Guaranteed Subject Isolation.** The split is done on `Subject ID`. A subject's trials are never split between Train and Test. The intersection of Train/Test Subject IDs is explicitly asserted to be Null. |
| **P-Hacking**      | **Holdout Set Locked.** All hyperparameters (kernel size, LR) were tuned on the Dev set. The N=22 Holdout set was touched only **once** for the final table generation.                                       |
| **Graph Validity** | **Biological Prior.** We do not learn edges from scratch (which requires millions of samples). We start with PLV, ensuring the graph represents real synchronization, not noise correlation.                  |
| **Overfitting**    | **Dropout & Weight Decay.** We use Dropout (0.5) in the GAT layers and L2 Regularization (`weight_decay=1e-4`) in the optimizer to penalize large weights.                                                    |

## Output

```bash

💠 riti891f  …/EEG-data/Data for Rishabh/dev-cleaned  v3.13.5  14:27
 python phase1_pretrain.py && python phase2_baseline.py && python phase3_finetune.py && python phase4_evaluate.py
Using Device: cuda
Channel Order: ['FCz', 'CP1', 'Fz', 'F1', 'FC3', 'C3', 'CP3', 'P1', 'AFz', 'AF3', 'F5', 'FC5', 'C5', 'CP5', 'P3', 'PO1', 'AF7', 'FT7', 'T7', 'TP7', 'P7', 'O1', 'FT9', 'TP9', 'P9', 'O9', 'P11', 'FC2', 'CP2', 'CPz', 'F2', 'FC4', 'C4', 'CP4', 'P2', 'Pz', 'AF4', 'F6', 'FC6', 'C6', 'CP6', 'P4', 'PO2', 'Fp2', 'AF8', 'FT8', 'T8', 'TP8', 'P8', 'O2', 'Oz', 'FT10', 'TP10', 'P10', 'O10', 'Iz', 'P12', 'Cz', 'FC1', 'Fp1']
Holdout set saved. Dev Set: 6165 trials.

--- Starting 5-Fold GroupCV for Pre-training (Fixed Eval) ---

>>> FOLD 1/5
Computing PLV Adjacency Matrix...
    [Graph Audit] Min: 0.0000, Max: 0.8351, Mean: 0.2538
Canonical graph structure saved to processed_data.pt
  Ep 01 | Loss: 0.6073 | Val Pat Acc: 0.8333
  Ep 02 | Loss: 0.5722 | Val Pat Acc: 0.8333
  Ep 03 | Loss: 0.5471 | Val Pat Acc: 0.7778
  Ep 04 | Loss: 0.5278 | Val Pat Acc: 0.7778
  Ep 05 | Loss: 0.5202 | Val Pat Acc: 0.8333
  Ep 06 | Loss: 0.4932 | Val Pat Acc: 0.8333
  Ep 07 | Loss: 0.4744 | Val Pat Acc: 0.7778
  Ep 08 | Loss: 0.4600 | Val Pat Acc: 0.8889
  Ep 09 | Loss: 0.4510 | Val Pat Acc: 0.8333
  Ep 10 | Loss: 0.4434 | Val Pat Acc: 0.8333
  Ep 11 | Loss: 0.4197 | Val Pat Acc: 0.8333
  Ep 12 | Loss: 0.4207 | Val Pat Acc: 0.8333
  Ep 13 | Loss: 0.4001 | Val Pat Acc: 0.7778
  Ep 14 | Loss: 0.4042 | Val Pat Acc: 0.8333
  Ep 15 | Loss: 0.3906 | Val Pat Acc: 0.8333

>>> FOLD 2/5
Computing PLV Adjacency Matrix...
    [Graph Audit] Min: 0.0000, Max: 0.8314, Mean: 0.2542
  Ep 01 | Loss: 0.6001 | Val Pat Acc: 0.8333
  Ep 02 | Loss: 0.5552 | Val Pat Acc: 0.8889
  Ep 03 | Loss: 0.5331 | Val Pat Acc: 0.7778
  Ep 04 | Loss: 0.5244 | Val Pat Acc: 0.8889
  Ep 05 | Loss: 0.4907 | Val Pat Acc: 0.7222
  Ep 06 | Loss: 0.4815 | Val Pat Acc: 0.7222
  Ep 07 | Loss: 0.4566 | Val Pat Acc: 0.7222
  Ep 08 | Loss: 0.4371 | Val Pat Acc: 0.7222
  Ep 09 | Loss: 0.4286 | Val Pat Acc: 0.7222
  Ep 10 | Loss: 0.4110 | Val Pat Acc: 0.7222
  Ep 11 | Loss: 0.4031 | Val Pat Acc: 0.7222
  Ep 12 | Loss: 0.4059 | Val Pat Acc: 0.7222
  Ep 13 | Loss: 0.3703 | Val Pat Acc: 0.7222
  Ep 14 | Loss: 0.3779 | Val Pat Acc: 0.8333
  Ep 15 | Loss: 0.3584 | Val Pat Acc: 0.7778

>>> FOLD 3/5
Computing PLV Adjacency Matrix...
    [Graph Audit] Min: 0.0000, Max: 0.8410, Mean: 0.2589
  Ep 01 | Loss: 0.6520 | Val Pat Acc: 0.7222
  Ep 02 | Loss: 0.6162 | Val Pat Acc: 0.7778
  Ep 03 | Loss: 0.5895 | Val Pat Acc: 0.7778
  Ep 04 | Loss: 0.5831 | Val Pat Acc: 0.7222
  Ep 05 | Loss: 0.5551 | Val Pat Acc: 0.7778
  Ep 06 | Loss: 0.5286 | Val Pat Acc: 0.7778
  Ep 07 | Loss: 0.4978 | Val Pat Acc: 0.7778
  Ep 08 | Loss: 0.4872 | Val Pat Acc: 0.6667
  Ep 09 | Loss: 0.4816 | Val Pat Acc: 0.8333
  Ep 10 | Loss: 0.4610 | Val Pat Acc: 0.7222
  Ep 11 | Loss: 0.4427 | Val Pat Acc: 0.8333
  Ep 12 | Loss: 0.4446 | Val Pat Acc: 0.6667
  Ep 13 | Loss: 0.4243 | Val Pat Acc: 0.6667
  Ep 14 | Loss: 0.4189 | Val Pat Acc: 0.6667
  Ep 15 | Loss: 0.4081 | Val Pat Acc: 0.6667

>>> FOLD 4/5
Computing PLV Adjacency Matrix...
    [Graph Audit] Min: 0.0000, Max: 0.8375, Mean: 0.2523
  Ep 01 | Loss: 0.5637 | Val Pat Acc: 0.7647
  Ep 02 | Loss: 0.5056 | Val Pat Acc: 0.7059
  Ep 03 | Loss: 0.4897 | Val Pat Acc: 0.6471
  Ep 04 | Loss: 0.4847 | Val Pat Acc: 0.6471
  Ep 05 | Loss: 0.4503 | Val Pat Acc: 0.6471
  Ep 06 | Loss: 0.4390 | Val Pat Acc: 0.6471
  Ep 07 | Loss: 0.4241 | Val Pat Acc: 0.6471
  Ep 08 | Loss: 0.4135 | Val Pat Acc: 0.7059
  Ep 09 | Loss: 0.4013 | Val Pat Acc: 0.7059
  Ep 10 | Loss: 0.3941 | Val Pat Acc: 0.5294
  Ep 11 | Loss: 0.3787 | Val Pat Acc: 0.5882
  Ep 12 | Loss: 0.3724 | Val Pat Acc: 0.7059
  Ep 13 | Loss: 0.3648 | Val Pat Acc: 0.7059
  Ep 14 | Loss: 0.3593 | Val Pat Acc: 0.6471
  Ep 15 | Loss: 0.3523 | Val Pat Acc: 0.5882

>>> FOLD 5/5
Computing PLV Adjacency Matrix...
    [Graph Audit] Min: 0.0000, Max: 0.8429, Mean: 0.2576
  Ep 01 | Loss: 0.6508 | Val Pat Acc: 0.7059
  Ep 02 | Loss: 0.5944 | Val Pat Acc: 0.6471
  Ep 03 | Loss: 0.5706 | Val Pat Acc: 0.6471
  Ep 04 | Loss: 0.5528 | Val Pat Acc: 0.6471
  Ep 05 | Loss: 0.5336 | Val Pat Acc: 0.6471
  Ep 06 | Loss: 0.5162 | Val Pat Acc: 0.7059
  Ep 07 | Loss: 0.4972 | Val Pat Acc: 0.6471
  Ep 08 | Loss: 0.4841 | Val Pat Acc: 0.7059
  Ep 09 | Loss: 0.4696 | Val Pat Acc: 0.7059
  Ep 10 | Loss: 0.4534 | Val Pat Acc: 0.7647
  Ep 11 | Loss: 0.4321 | Val Pat Acc: 0.7059
  Ep 12 | Loss: 0.4263 | Val Pat Acc: 0.7059
  Ep 13 | Loss: 0.4119 | Val Pat Acc: 0.7059
  Ep 14 | Loss: 0.4208 | Val Pat Acc: 0.7059
  Ep 15 | Loss: 0.4060 | Val Pat Acc: 0.7647

--- Pre-training Complete ---
Best Patient-Level Accuracy: 0.8889 (Found in Fold 1)
Weights saved.
Using Device: cuda
Loading Phase 1 processed data...
Data Loaded: torch.Size([6165, 60, 256]) Trials
Loading Model with Phase 1 Weights...
Loading weights from models/phase1_pretrained_weights.pth...
Loaded 32 layers.
Backbone weights loaded successfully.
Extracting GNN embeddings via forward_backbone()...
Aggregating: Trial (32d) -> Patient (64d: Mean+Std)...
Patient Matrix: (88, 64)

--- Phase 2 Results (Baseline) ---
Fold Accuracies: [0.94444444 0.66666667 0.77777778 1.         0.76470588]
MEAN ACCURACY: 83.07%
MEDIAN ACCURACY: 77.78%
STD DEV: 12.30%

--- Ablation Study ---
Mean Only: 87.58%
Std Only:  77.25%
Using Device: cuda
Organizing data by patient...
Total Patients: 88

--- Starting Phase 3: End-to-End Fine-Tuning ---

>>> FOLD 1/5
Loading weights from models/phase1_pretrained_weights.pth...
Loaded 32 layers.
  Best Val Acc for Fold 1: 1.00

>>> FOLD 2/5
Loading weights from models/phase1_pretrained_weights.pth...
Loaded 32 layers.
  Best Val Acc for Fold 2: 0.89

>>> FOLD 3/5
Loading weights from models/phase1_pretrained_weights.pth...
Loaded 32 layers.
  Best Val Acc for Fold 3: 0.83

>>> FOLD 4/5
Loading weights from models/phase1_pretrained_weights.pth...
Loaded 32 layers.
  Best Val Acc for Fold 4: 1.00

>>> FOLD 5/5
Loading weights from models/phase1_pretrained_weights.pth...
Loaded 32 layers.
  Best Val Acc for Fold 5: 0.82

--- Phase 3 Results ---
Fold Accuracies: [1.0, 0.8888888888888888, 0.8333333333333334, 1.0, 0.8235294117647058]
MEAN ACCURACY: 90.92% (+/- 7.75%)
Best fine-tuned model saved to 'models/phase3_finetuned_model.pth'
Using Device: cuda
Loading Data Resources...
Audit: Overlap between Dev and Test patients: 0
Audit: Clean separation confirmed.
Organizing data by patient...
Organizing data by patient...
Dev Set: 88 patients
Test Set: 22 patients

=== Method 1: Ensemble Hybrid SVM ===
Processing Fold 1/5: models/checkpoints/phase3_fold_1.pth
Processing Fold 2/5: models/checkpoints/phase3_fold_2.pth
Processing Fold 3/5: models/checkpoints/phase3_fold_3.pth
Processing Fold 4/5: models/checkpoints/phase3_fold_4.pth
Processing Fold 5/5: models/checkpoints/phase3_fold_5.pth

>> Ensemble SVM Test Accuracy: 86.36%
              precision    recall  f1-score   support

     Control       1.00      0.70      0.82        10
        ADHD       0.80      1.00      0.89        12

    accuracy                           0.86        22
   macro avg       0.90      0.85      0.86        22
weighted avg       0.89      0.86      0.86        22


=== Method 2: Ensemble End-to-End Model ===
Loading models/checkpoints/phase3_fold_1.pth...
Loading models/checkpoints/phase3_fold_2.pth...
Loading models/checkpoints/phase3_fold_3.pth...
Loading models/checkpoints/phase3_fold_4.pth...
Loading models/checkpoints/phase3_fold_5.pth...

>> Ensemble Test Accuracy: 86.36%
              precision    recall  f1-score   support

     Control       0.82      0.90      0.86        10
        ADHD       0.91      0.83      0.87        12

    accuracy                           0.86        22
   macro avg       0.86      0.87      0.86        22
weighted avg       0.87      0.86      0.86        22


--- Final Verdict ---
Winner: End-to-End (+0.00%)
Final confusion matrix saved to results/phase4_final_result.png

```

