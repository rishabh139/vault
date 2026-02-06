---
publish: true
created: 2025-12-02T10:25:56.901+01:00
modified: 2026-02-06T10:31:00.900+01:00
cssclasses: ""
---

---
## **1. Dataset Engineering (`dataset.py`)**

This module transforms raw EEG files on disk into Graph-Structured Tensors.

### **1.1 Function: `load_eeg_data`**
**Purpose:** Ingests BrainVision files and creates a clean, consistent tensor array.

*   **Input:** Directory path containing `.vhdr` (header) and `.eeg` (data) files.
*   **Process Flow:**
    1.  **File Parsing:** Uses `mne.io.read_raw_brainvision`.
    2.  **Marker Filtering:** Scans the Event Stream for marker `'12'` (NoGo Stimulus).
    3.  **Epoching Logic:**
        *   Extracts time window $[t_{onset}, t_{onset} + 998ms]$.
        *   Sampling Rate $f_s = 256 \text{ Hz}$.
        *   Resulting Timepoints $T = \lfloor 0.998 \times 256 \rfloor = 256$.
    4.  **Channel Consistency Check (Safety Critical):**
        *   The script automatically detects the channel order of the first subject.
        *   For every subsequent subject, it enforces this specific permutation.
        *   *Math:* If Subject A is $[Fz, Cz, Pz]$ and Subject B is $[Cz, Fz, Pz]$, Subject B is re-indexed to match A. This guarantees that Channel $i$ always corresponds to the same physical electrode.

*   **Output:**
    *   `all_data`: Tensor $\in \mathbb{R}^{N_{total} \times 60 \times 256}$
    *   `all_groups`: Vector $\in \mathbb{Z}^{N_{total}}$ (Patient IDs for cross-validation).

### **1.2 Function: `compute_plv_adjacency`**
**Purpose:** Constructs the Graph Topology $A$ (Adjacency Matrix) using Phase Locking Value.

*   **Mathematical Operation:**
    1.  **Hilbert Transform:**
        For every channel signal $x(t)$, we compute the analytic signal $z(t) = x(t) + i\mathcal{H}(x(t))$.
    2.  **Phase Extraction:**
        $\phi(t) = \text{arctan2}(\text{Im}(z(t)), \text{Re}(z(t)))$.
    3.  **Complex Unit Vector:**
        $u(t) = e^{i\phi(t)}$.
    4.  **Sync Calculation (Vectorized):**
        To get connectivity between Channel $a$ and Channel $b$:
        $$ PLV_{a,b} = \left| \frac{1}{N_{samples}} \sum_{t} u_a(t) \cdot \overline{u_b(t)} \right| $$
        *Note: $\overline{u}$ is the complex conjugate. Multiplication in complex space subtracts the angles.*
    5.  **Adjacency Thresholding:**
        We compute the scalar matrix $M_{60 \times 60}$. We define threshold $\tau = P_{90}(M)$ (90th percentile).
        $$ A_{a,b} = 1 \iff M_{a,b} > \tau $$

*   **Output:**
    *   `edge_index`: A $2 \times E$ integer tensor representing connections.
    *   `edge_attr`: A $E \times 1$ float tensor containing the actual PLV weights (strength).

### **1.3 Class: `EEGGraphDataset`**
**Purpose:** Wraps tensors into PyTorch Geometric Data objects.

*   **Mechanism:**
    It treats each trial as a discrete graph instance.
    *   **Node Features ($x$):** The raw voltage values at that trial. Shape: $[60, 256]$.
    *   **Graph Structure ($edge\_index$):** The static PLV connections computed above.
    *   **Label ($y$):** 0 or 1.

---

## **2. Neural Network Architecture (`model.py`)**

The `ADHD_GAT` class defines the mathematical operations performed on the input graphs.

### **2.1 Module: `Temporal Block` (1D-CNN)**
**Goal:** Extract waveform morphology (temporal features) from raw voltages.

*   **Input Transformation:**
    The input graph has features $X \in \mathbb{R}^{60 \times 256}$.
    We unroll this to treat every node as an independent sample: $X' \in \mathbb{R}^{Batch \cdot 60, 1, 256}$.

*   **Layer 1 (The "Filter Bank"):**
    *   **Operation:** $Y_1 = \text{Conv1d}(X')$
    *   **Kernel Size:** 25.
    *   **Math:** The convolution acts as a Finite Impulse Response (FIR) filter. A kernel size of 25 at 256Hz covers ~100ms.
    *   **Interpretation:** This learns to detect spectral power (like Alpha/Theta waves) and ERP slopes (like the rise of the P300).
    *   **Pooling:** MaxPool(4) reduces time dimension $256 \to 64$.

*   **Layer 2 (Feature Refinement):**
    *   **Operation:** $Y_2 = \text{Conv1d}(Y_1)$
    *   **Kernel Size:** 15.
    *   **Pooling:** MaxPool(4) reduces time dimension $64 \to 16$.
    *   **Output Channels:** 16 filters.

*   **Result:**
    Final temporal embedding per node is a flattened vector of size $16 \text{ (time)} \times 16 \text{ (filters)} = 256$? **Correction:** In the code, we flatten the output of the CNN. The output is $[Batch \cdot 60, 16 \text{ filters}, 16 \text{ timepoints}]$.
    We flatten this to a single vector: $h_{temporal} \in \mathbb{R}^{256}$.
    *(Note: The code implementation projects this via a Linear layer or feeds directly to GAT input dim. In our specific code, `self.temporal_flat = 16 * 16`. This vector represents "What happened at this electrode over time".)*

### **2.2 Module: `Spatial Block` (GATv2)**
**Goal:** Allow nodes to communicate and refine features based on neighbors.

*   **Mechanism (GATv2Conv):**
    Standard GCNs use a static weight sum. GATv2 computes a **Dynamic Attention Score**.
    For a target node $i$ and neighbor $j$:

    1.  **Concatenation:** We take the feature vector of node $i$ and node $j$ and stack them.
    2.  **Scoring Function:**
        $$ e_{ij} = \mathbf{a}^T \text{LeakyReLU}\left( \mathbf{W} \cdot [ h_i || h_j ] \right) $$
        *   $\mathbf{W}$: A learnable weight matrix transforming the features.
        *   $\mathbf{a}$: A learnable "attention vector" that decides importance.
    3.  **Normalization (Softmax):**
        $$ \alpha_{ij} = \frac{\exp(e_{ij})}{\sum_{k \in \mathcal{N}(i)} \exp(e_{ik})} $$
        *   This ensures all incoming attention weights sum to 1.
    4.  **Aggregation:**
        $$ h_i' = \sum_{j \in \mathcal{N}(i)} \alpha_{ij} \cdot (\mathbf{W} h_j) $$

*   **Interpretation:** The model asks: "Given that Electrode Pz detected an Alpha wave ($h_i$), how relevant is the Beta wave detected at Electrode Fz ($h_j$)?"

### **2.3 Module: `Patient Aggregation` (Phase 3 Only)**
**Goal:** Combine many trials into one diagnosis.

*   **Input:** A set of trial vectors $\{v_1, v_2, ..., v_k\}$, where $v_i \in \mathbb{R}^{32}$.
*   **Mathematical Operations:**
    1.  **Mean (First Moment):**
        $$ \mu = \frac{1}{k} \sum v_i $$
        *Biomarker Proxy:* Represents the stable ERP amplitude.
    2.  **Standard Deviation (Second Moment):**
        $$ \sigma = \sqrt{ \frac{1}{k-1} \sum (v_i - \mu)^2 + \epsilon } $$
        *Biomarker Proxy:* Represents Intra-Individual Variability (Neural Noise).
    3.  **Fusion:**
        $$ V_{patient} = \text{Concat}(\mu, \sigma) \in \mathbb{R}^{64} $$

### **2.4 Forward Pass Execution (`forward` function)**

The `forward` function contains logic to switch behavior based on the training phase.

*   **Mode `'trial'` (Phase 1):**
    *   Takes a batch of graphs.
    *   Returns `trial_head(embedding)`.
    *   Used to pre-train weights on the dense trial-level data.

*   **Mode `'patient'` (Phase 3):**
    *   Takes a **List** of graph batches (one list per patient).
    *   Runs the backbone on all trials.
    *   Performs the Mean+Std aggregation.
    *   Returns `patient_head(aggregated_vector)`.
    *   **Gradient Flow:** Crucially, PyTorch tracks the gradients through the Mean and Std operations. This allows the final classification error to update the CNN weights to *specifically* produce features that have diagnostic variability.