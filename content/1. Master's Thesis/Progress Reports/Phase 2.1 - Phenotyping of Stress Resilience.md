---
publish: true
created: 2026-02-05T22:46:14.205+01:00
modified: 2026-02-13T01:57:00.503+01:00
tags:
  - x/tud/thesis
  - neuroscience
  - data-science
  - programming
cssclasses: ""
---

## **1. Project Scope & Objective**
The objective of this thesis is to develop an unsupervised computational framework to identify latent functional phenotypes in hippocampal brain slices. Specifically, we aim to distinguish **Resilient** networks (which maintain function despite stress) from **Susceptible** networks (which develop pathology) based on intrinsic spatiotemporal dynamics, rather than subjective behavioral labeling.

To achieve this, we analyze high-density microelectrode array (HD-MEA) data (3Brain CorePlate, 4,096 channels) using a pipeline that moves from raw signal processing to quantitative feature engineering.

---

## **2. Methodological Pipeline: Signal Processing**
Given the scale of the data and the signal complexity of 4-AP events (which precludes standard spike sorting), we have a specialized **Dual-Stream Preprocessing Pipeline**.

### **2.1 Stream 1: Local Field Potential (LFP) Processing**
*Objective: To characterize the synaptic input and global network state.*

**LFP Export Parameters on Brainwave**
- LowPass Butter Worth Filter, cut-off freq. `300 Hz, Order 5`
- Hard Threshold, `±150 uV`
- Energy Window, `75 ms`
- Refractory Period, `10 ms`
- Max Event Duration, `1000 ms`

This is also inclusive of using Xin's DENOISING code. 

1.  **Artifact Rejection (The "Blast Radius" Algorithm):**
    *   **Problem:** Mechanical shocks create instantaneous, chip-wide phantom artifacts that distort energy calculations.
    *   **Solution:** We implemented a vectorized density check. If $>1,800$ channels (approx. 40% of the chip) cross threshold within a **20ms window**, the event is flagged as an artifact. A **±200ms "Blast Radius"** is applied to remove ringing noise around these events.
2.  **Event Detection:**
    *   Events are detected using a hard amplitude threshold ($>80 \mu V$) and duration check ($>10ms$) on the raw voltage trace.
3.  **Burst Definition:**
    *   Discrete events are aggregated into "Network Bursts" if the inter-event interval is $<400ms$. This defines the temporal window of interest ($T_{start}$ to $T_{end}$) for subsequent analysis.

![[1. Master's Thesis/assets/Generated Image January 12, 2026 - 11_07AM.png]]

### **2.2 Stream 2: Multi-Unit Activity (MUA) Extraction**
*Objective: To characterize the population spiking output.*

1.  **Continuous Energy Envelope:**
    *   **Rationale:** Due to waveform overlap during hypersynchronous events, single-unit sorting doesn't work as well.
    *   **Derivation:**
        *   The Raw Voltage ($V_{raw}$) is **Bandpass Filtered (300–3,000 Hz)** using a 4th-order Butterworth filter.
        *   The signal is **Rectified ($|V|$)** and integrated into non-overlapping **20ms time bins** (50 Hz).
    *   **Result:** This transforms discrete spikes into a continuous analog signal representing "Local Firing Power."

2.  **The "Union Strategy" for Channel Selection:**
    *   To solve the "Signal vs. Silence" paradox (distinguishing biological inhibition from broken sensors), we defined a valid active channel as the logical union of two masks:
        *   **Global Trust Mask:** Channels that have historically fired during the recording.
        *   **Local Recruitment Mask:** Channels exceeding a dynamic SNR threshold ($>5 \times$ median baseline) during the specific burst window.
    *   *Result:* This preserves "silent" channels in Resilient networks (biological inhibition) while removing hardware failures.

### **2.3 Spatial Dimensionality Reduction: Supernode Strategy**
While the CorePlate provides 4,096 native recording sites, events is spatially sparse and physically contiguous. To standardize input geometry for topological metrics, we implemented a Supernode abstraction.

*   **Timing:** This step is applied **Post-Cleaning** but **Pre-Tensor Construction**.
    *   *Note:* Physics-based metrics (Energy, Rate) use full 4,096-channel resolution. Supernodes are used strictly for topological features (Entropy) and ML tensors.
*   **The Algorithm:**
    1.  **Grid Mapping:** The 4,096 active channels are mapped to a $64 \times 64$ Cartesian grid.
    2.  **Downsampling:** The grid is strided into non-overlapping $8 \times 8$ blocks.
    3.  **Aggregation:** Values within each block are summed, resulting in an $8 \times 8$ grid of "Supernodes"

![[1. Master's Thesis/assets/Generated Image January 12, 2026 - 11_11AM.png]]

eg. Burst after Supernode aggregation. 

---

## **3. Feature Engineering: Mathematical Definitions**

We extracted 8 quantitative biomarkers per burst, rigorously divided into **Input Features (LFP)** and **Output Features (MUA/Spiking)** to test the hypothesis of Input-Output decoupling.

### **A. Input Features (LFP)**
*Calculated on Low-Pass Filtered Data (< 300Hz).*

**1. LFP Mean Energy**
*   **Resolution:** Full 4,096 channels.
*   **Definition:** Represents the total magnitude of the 4-AP insult received by the network.
*   **Calculation:** We sum the rectified voltage across all channels $i$ and time steps $t$:
    $$ E_{total} = \sum_{i=1}^{4096} \sum_{t=T_{start}}^{T_{end}} |V_i(t)| $$
*   **Normalization:** Reported as Mean Energy per Burst.

**2. Spatial Entropy (H)**
*   **Resolution:** $8 \times 8$ Supernode Density.
*   **Definition:** Quantifies structural organization. Low entropy implies focal patterns; high entropy implies chaos.
*   **Calculation:**
    1.  We collapse the burst time-dimension to create a static 2D density map on the Supernode grid.
    2.  We normalize the grid values to a probability distribution $P_{xy}$.
    3.  We compute Shannon Entropy:
    $$ H = - \sum_{x=1}^8 \sum_{y=1}^8 P_{xy} \log_2(P_{xy}) $$

**3. Trajectory Displacement (CoA)**
*   **Resolution:** Full 4,096 channels.
*   **Definition:** Measures traveling waves. High displacement indicates runaway propagation.
*   **Calculation:**
    1.  We calculate the energy-weighted geometric centroid ($CoA$) at each time step $t$.
    2.  We compute the Euclidean distance between the Mean $CoA$ of the first 10% of the burst and the Mean $CoA$ of the last 10%.

**4. Ripple Ratio**
*   **Resolution:** Full 4,096 channels.
*   **Definition:** A marker of pathological high-frequency oscillations (pHFOs).
*   **Calculation:** The ratio of Power Spectral Density (PSD) in the **Ripple Band (140–250 Hz)** to the **Gamma Band (30–100 Hz)**, calculated via Welch’s method.

---

### **B. Output Features (MUA)**
*Calculated on the Continuous Energy Envelope (> 300Hz).*

**1. MUA Peak Rate**
*   **Resolution:** Global Mean Field.
*   **Definition:** Measures the intensity of the discharge.
*   **Calculation:** We average the MUA envelope across all 4,096 channels to create a global time-series $G(t)$, then find the maximum value: $R_{peak} = \max(G(t))$.

**2. Recruitment Percentage**
*   **Resolution:** Channel-wise Thresholding.
*   **Definition:** Measures the failure of surround inhibition (spatial containment).
*   **Calculation:**
    1.  Calculate median noise floor $\sigma_i$ for each channel.
    2.  Count channels $N_{rec}$ that exceed $2 \times \sigma_i$ at any point in the burst.
    $$ Recruitment = \frac{N_{rec}}{4096} \times 100 $$

**3. Synchrony Index**
*   **Resolution:** Population Statistics.
*   **Definition:** Quantifies lockstep firing (hypersynchrony).
*   **Calculation:** We use Golomb’s Measure, defined as the ratio of the Variance of the Mean Field to the Mean of Individual Variances:
    $$ S = \frac{\text{Var}(\frac{1}{N}\sum V_i(t))}{\frac{1}{N}\sum \text{Var}(V_i(t))} $$


**4. MUA Total Activity (The "Metabolic Cost")**
*   **Resolution:** Global Mean Field.
*   **Definition:** Represents the cumulative spiking output over the entire burst duration, serving as a proxy for the total metabolic demand of the event.
*   **Calculation:** We integrate the Global Mean Field signal $G(t)$ over the temporal window of the burst:
    $$ Activity_{total} = \sum_{t=T_{start}}^{T_{end}} G(t) $$


---

## **4. Exploratory Data Analysis (EDA) Methodology**
To validate these features, we applied a standardized visualization protocol:

1.  **Distribution Analysis (Violin Plots):**
    *   We generated kernel density estimates grouped by biological condition.
    *   **Preprocessing:** Features spanning orders of magnitude (Energy, Peak Rate) were Log-10 transformed to visualize variance in lower quartiles.
2.  **Multivariate Analysis (PCA):**
    *   We constructed a feature matrix $X$ ($N_{bursts} \times 12_{features}$) and Z-scored each column ($z = \frac{x-\mu}{\sigma}$) to standardize units.
    *   We projected this matrix into 2D space using Principal Component Analysis to visualize latent separability.

---

## **5. Preliminary Results ($N=6$)**
We processed a pilot subset (2 Control, 2 Susceptible, 2 Resilient) to validate the pipeline. The analysis revealed a distinct **"Resilient Phenotype"** characterized by an active uncoupling of Input and Output.

### **Finding 1: The "Firewall" Mechanism (Input-Output Decoupling)**
*   **Observation:** Both Resilient and Susceptible networks exhibit high **LFP Energy** (Synaptic Input), significantly higher than Controls.
*   **Contrast:** However, Resilient networks maintain **Low MUA Peak Rates** and **Low Recruitment** (<20% of chip), whereas Susceptible networks exhibit explosive MUA Rates and High Recruitment.
*   **Conclusion:** Resilience is not a lack of sensitivity to 4-AP. Rather, Resilient networks actively "clamp" the synaptic drive, preventing it from converting into runaway spiking.

### **Finding 2: Order vs. Chaos (Spatial Entropy)**
*   **Observation:** Susceptible networks display **High Spatial Entropy** and **High Trajectory Displacement**.
*   **Contrast:** Resilient networks display **Low Spatial Entropy**, comparable to Controls.
*   **Conclusion:** Resilient bursts are spatially confined and structured (standing waves), whereas Susceptible bursts are chaotic and propagating (traveling waves).

### **Finding 3: Principal Component Analysis (PCA)**
*   Projecting these features into 2D space reveals three distinct clusters. The **Resilient** cluster is orthogonal to both Control and Susceptible groups, driven primarily by *High Gamma Power* and *Low Entropy*. This suggests Resilience is a distinct functional state, not merely "mild susceptibility."

### LFP Plots:

![[1. Master's Thesis/assets/image (7).png|680]]

![[1. Master's Thesis/assets/image (6).png|680]]

### MUA Plots:

![[1. Master's Thesis/assets/image (5).png|680]]

---

## **6. Next Steps**
1.  **Scale-Up:** The pipeline is now optimized. We will batch-process the full dataset ($N=54$ slices) to generate the complete feature matrix.
2.  **Unsupervised Learning:** With the full dataset, we will train using some unsupervised approach on the raw burst tensors. This will allow us to validate the "Resilient Cluster" without relying on manual feature engineering.
3.  **Statistical Validation:** We will perform Leave-One-Animal-Out cross-validation to ensure biomarkers generalize across biological replicates.