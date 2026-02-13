---
publish: true
created: 2026-02-05T22:45:54.710+01:00
modified: 2026-02-13T01:57:47.168+01:00
tags:
  - x/tud/thesis
  - neuroscience
  - ai-ml
  - data-science
cssclasses: ""
---

### **1. Introduction: From Raw Signals to Predictive Biomarkers**

The central mission of my project is to build a machine learning classifier that can predict an animal's resilience or susceptibility to prenatal stress based on the intrinsic dynamics of its hippocampal microcircuits. This requires a pipeline capable of transforming massive, raw voltage streams from HD-MEA recordings into a structured set of quantitative, biologically meaningful features. The tools I have worked on would allow discovery and systematic extraction of the static and temporal neural features needed to train and validate our predictive models.

---

### **2. Core Components & Capabilities**

There are three primary analytical methods I have tried, each designed to provide a unique and complementary view of the neural data.

#### **2.1. Raster Plot**

![[1. Master's Thesis/assets/image (3).png]]

**Functionality:** This provides a high-level overview of network activity by plotting every detected neural event across all 4096 channels across time.

**Underlying Computation:**
*   **Input:** Pre-processed event data containing two corresponding lists: event timestamps and the channel IDs on which they occurred.
*   **Process:** A direct 2D mapping is done where each event is plotted as a point. The x-coordinate represents the event's timestamp, and the y-coordinate represents its channel ID.
*   **Output:** A scatter plot that visually reveals the temporal structure of network-wide activity, highlighting key phenomena like synchronized network bursts.

**Relevance to Project:**
This plot serves as the primary instrument for data quality control and initial hypothesis generation. It validates the existence of synchronous network bursts—the core unit of our statistical analysis—and allows for a first-pass visual comparison of the firing rhythms between Susceptible, Resilient, and Control groups, directly informing the "Event Rate" and "Burst Rate" features.
#### **2.2. Spatiotemporal Maps**

![[1. Master's Thesis/assets/image (2).png]]

**Functionality:** This transforms abstract metrics into intuitive 64x64 heatmaps, assigning a specific calculated value to each electrode. This reveals the spatial organization of functional properties across the hippocampal slice.

**Underlying Computations:**
*   **LFP Rate & Amplitude:** Involves counting events per channel (for Rate) or averaging the peak voltage of detected events (for Amplitude) to measure the intensity and strength of local activity.
*   **Event Propagation Delay:** Identifies a network burst, sets a `T=0` reference at the first detected event, and calculates the relative firing time for all other channels, mapping the flow of information.
*   **Node Degree (Connectivity):** Computes a 4096x4096 Pearson correlation matrix from the LFP signals to quantify functional connectivity. The "degree" for each node is the sum of its strong connections, identifying it as a potential network hub.

**Relevance to Project:**
This is the core engine for our **Feature Engineering**. It provides the direct calculations for Tier 1 features like `Mean Firing Rate` and `Event "Size"` (percentage of co-active electrodes). These maps will likely also be in useful for Interpretation, allowing us to visualize what a predictive feature (e.g., "high connectivity in CA3") physically looks like in the circuit.
#### **2.3. Single-Electrode Waveform Inspection**

![[1. Master's Thesis/assets/image (1).png]]

**Functionality:** This allows for the detailed inspection of the raw voltage signal from any single electrode. Its key capability is the decomposition of this complex signal into its constituent and relevant frequency bands (e.g., Gamma, Alpha, etc.).

**Underlying Computation:**
*   **Process:** The tool isolates the continuous time-series signal for a selected channel. It then applies a series of digital **band-pass filters**. These mathematical operations are performed using a zero-phase `filtfilt` algorithm, which is critically important as it removes all frequencies outside a desired range without introducing artificial time delays, thus preserving the signal's temporal integrity.
*   **Output:** A stacked plot showing the original composite signal alongside its isolated rhythmic components.

**Relevance to Project:**
This can be an enabling function for calculating some of our other features in the project plan. It is essential for quantifying **Power in canonical bands**, detecting **Sharp-Wave Ripples (SWRs)**, etc.

---

### **3. Data Interpretation Challenges**

**Challenge 1: Navigating Complex HDF5 Data Structures**
The primary obstacle was working with the HDF5 (`.brw`, `.bxr`) data format. Unlike regular files, HDF5 uses a complex, hierarchical structure of nested groups and datasets. A significant portion of the initial development involved programmatically exploring these structures to identify the correct paths to data—such as raw voltage streams, event timestamps, and other recording metadata.

**Challenge 2: Correctly Converting Raw Integer Signals to Scientific Units**
The second challenge was correctly converting the raw data from its stored format, "offset binary", into `uV`. The process involved retrieving metadata like **bit depth** and amplifier voltage range, then applying a specific formula to shift and scale the integer values. This ensures that the data we analyze is a true representation of the underlying biological activity.

---

### **4. Conclusion**

**This has allowed me to proceed with the core of the project:**

1.  **Systematically calculate most features** across all slice recordings.
2.  **Eventually assemble the final feature matrix** that will serve as the input for the machine learning models.
3.  **Advance to a the Model Training**, where I will build the classifier and potentially implement a Leave-One-Animal-Out cross-validation strategy.

This ensures that the subsequent feature engineering and machine learning stages will be built upon a reliable and well-understood data processing pipeline, maximizing the potential for discovering a robust and interpretable neural biomarker of resilience.