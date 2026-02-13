---
publish: true
created: 2026-02-05T22:49:07.632+01:00
modified: 2026-02-13T01:58:10.825+01:00
tags:
  - x/tud/thesis
  - neuroscience
  - data-science
  - programming
cssclasses: ""
---

## LFP Feature Engineering


```python

import os
import numpy as np
import pandas as pd
import scipy.signal as signal
import scipy.ndimage as ndimage
from scipy.stats import skew, kurtosis, entropy, variation
import networkx as nx
import warnings

# Import community detection specifically for Modularity
from networkx.algorithms import community 

warnings.filterwarnings('ignore')

# ==========================================
# 1. CONFIGURATION & CONSTANTS
# ==========================================
FREQ_BANDS = {
    'Delta': (1, 4), 
    'Theta': (4, 12), 
    'Beta': (13, 30), 
    'Gamma': (30, 100)
}

class LFPFeatureExtractor:
    def __init__(self, src_path, fs_lfp=1000.0, efficiency_mode=True):
        """
        efficiency_mode (bool): 
            If True: Downsamples Graph Theory to top 150 channels and Spatial Entropy to 8x8 grid.
            If False: Runs on full active channel set and full 64x64 spatial grid.
        """
        self.src_path = src_path
        self.fs_lfp = fs_lfp
        self.grid_dim = (64, 64) 
        self.efficiency_mode = efficiency_mode

    # ==========================================
    # 2. DATA LOADING & HANDLING
    # ==========================================
    def _load_artifacts(self, filename):
        base = filename.split('.')[0]
        base = base.replace('_LFP', '').replace('_clean', '')
        data_dir = os.path.join(self.src_path, 'data')
        
        files = {
            'ids': os.path.join(data_dir, f"{base}_clean_ChIDs.npy"),
            'times': os.path.join(data_dir, f"{base}_clean_Times.npy"),
            'forms': os.path.join(data_dir, f"{base}_clean_Forms.npy"),
            'bursts': os.path.join(data_dir, f"{base}_burst_graphs.npy")
        }

        for k, v in files.items():
            if not os.path.exists(v):
                print(f"  [!] Missing {k} file for {base}")
                return None, None

        try:
            data = {
                'ids': np.load(files['ids']),
                'times': np.load(files['times']),
                'forms': np.load(files['forms']),
                'bursts': np.load(files['bursts'], allow_pickle=True)
            }
            return data, base
        except Exception as e:
            print(f"  [!] Error loading npy files: {e}")
            return None, None

    # ==========================================
    # 3. FEATURE FAMILY: PHYSICS & TEMPORAL
    # ==========================================
    def _extract_physics_temporal(self, forms, duration, ibi):
        slopes = np.diff(forms, axis=1) * self.fs_lfp
        max_slope = np.max(np.abs(slopes))
        p2p = np.ptp(forms, axis=1)
        energy_per_channel = np.sum(np.abs(forms), axis=1)
        
        skew_val = np.mean(skew(forms, axis=1, nan_policy='omit'))
        kurt_val = np.mean(kurtosis(forms, axis=1, nan_policy='omit'))

        # Counts peaks > 1 std dev above mean
        n_peaks = 0
        for trace in forms:
            std_thresh = np.std(trace)
            pks, _ = signal.find_peaks(trace, height=std_thresh) # Positive
            n_peaks += len(pks)
            neg_pks, _ = signal.find_peaks(-trace, height=std_thresh) # Negative
            n_peaks += len(neg_pks)
        avg_peaks = n_peaks / forms.shape[0]

        return {
            'Phys_Duration': duration,
            'Phys_IBI': ibi,
            'Phys_Global_Energy': np.mean(energy_per_channel),
            'Phys_Mean_P2P': np.mean(p2p),
            'Phys_Max_Slope': max_slope,
            'Phys_Waveform_Skew': skew_val,
            'Phys_Waveform_Kurtosis': kurt_val,
            'Phys_Temporal_CV': variation(np.abs(forms).flatten()),
            'Phys_Peak_Count_Mean': avg_peaks 
        }

    # ==========================================
    # 4. FEATURE FAMILY: SPECTRAL & OSCILLATORY
    # ==========================================
    def _extract_spectral(self, forms):
        # Hjorth Parameters
        activity = np.var(forms, axis=1)
        # Add small epsilon to avoid div by zero if flatline
        activity = np.where(activity == 0, 1e-12, activity)
        
        deriv1 = np.diff(forms, axis=1)
        deriv2 = np.diff(deriv1, axis=1)
        var_d1 = np.var(deriv1, axis=1)
        var_d2 = np.var(deriv2, axis=1)
        
        mobility = np.sqrt(var_d1 / activity)
        complexity = np.sqrt(var_d2 / (var_d1 + 1e-12)) / (mobility + 1e-12)

        # Spectral Power
        f, psd = signal.periodogram(forms, fs=self.fs_lfp, axis=1)
        mean_psd = np.mean(psd, axis=0)
        
        total_mask = (f >= 1) & (f <= 100)
        total_power = np.sum(mean_psd[total_mask]) + 1e-12
        
        feat = {
            'Spec_Hjorth_Mobility': np.mean(mobility),
            'Spec_Hjorth_Complexity': np.mean(complexity)
        }

        band_powers = {}
        for band, (l, h) in FREQ_BANDS.items():
            mask = (f >= l) & (f <= h)
            abs_p = np.sum(mean_psd[mask])
            band_powers[band] = abs_p
            feat[f'Spec_RelPower_{band}'] = abs_p / total_power

        # Ratios
        feat['Spec_Ratio_ThetaDelta'] = band_powers['Theta'] / (band_powers['Delta'] + 1e-9)
        feat['Spec_Ratio_ThetaGamma'] = band_powers['Theta'] / (band_powers['Gamma'] + 1e-9)
        feat['Spec_Ratio_DeltaGamma'] = band_powers['Delta'] / (band_powers['Gamma'] + 1e-9)
        
        return feat

    # ==========================================
    # 5. FEATURE FAMILY: SPATIAL & ANATOMICAL
    # ==========================================
    def _compute_kcsd_proxy(self, rows, cols, forms):
        """
        Estimates CSD using the Laplacian of the potential.
        """
        # 1. Reconstruct Grid (64x64)
        grid_pot = np.zeros(self.grid_dim)
        counts = np.zeros(self.grid_dim)
        mean_voltage = np.mean(forms, axis=1) # Average over time window
        
        # Populate grid
        grid_pot[rows, cols] = mean_voltage
        
        # 2. Laplacian (CSD Proxy)
        csd_map = ndimage.laplace(grid_pot)
        
        # Sinks (Inward current, Depolarization) -> usually negative in CSD convention, 
        # but Laplacian sign depends on kernel. Here, high positive Laplacian = Sink.
        sinks = csd_map[csd_map > 0]
        sources = csd_map[csd_map < 0]
        
        return {
            'Spat_kCSD_MeanSink': np.mean(sinks) if len(sinks)>0 else 0,
            'Spat_kCSD_MeanSource': np.mean(np.abs(sources)) if len(sources)>0 else 0,
            'Spat_kCSD_Complexity': variation(csd_map.flatten()) # How complex is the sink/source landscape
        }

    # ==========================================
    # 5. FEATURE FAMILY: SPATIAL & ANATOMICAL
    # ==========================================
    def _extract_spatial(self, rows, cols, forms):
        n_active = len(rows)
        participation = n_active / (self.grid_dim[0] * self.grid_dim[1])

        n_timepoints = forms.shape[1]
        delta_expansion = 0
        
        if n_timepoints > 10:
            split_idx = int(n_timepoints * 0.25) # First/Last 25%
            if split_idx < 1: split_idx = 1
            
            # Sum of Absolute Voltage (Energy proxy)
            early_energy = np.sum(np.abs(forms[:, :split_idx]))
            late_energy = np.sum(np.abs(forms[:, -split_idx:]))
            
            # Normalized Difference
            if early_energy > 0:
                delta_expansion = (late_energy - early_energy) / early_energy
            else:
                delta_expansion = 0

        # --- Spatial Entropy ---
        weights = np.mean(np.abs(forms), axis=1)
        if self.efficiency_mode:
            bins_def = [8, 8]
        else:
            bins_def = [64, 64]
            
        H, _, _ = np.histogram2d(rows, cols, bins=bins_def, range=[[0,64],[0,64]], weights=weights)
        norm_H = H.flatten() / (np.sum(H) + 1e-9)
        spatial_entropy = entropy(norm_H + 1e-12)

        # --- CAT Trajectory ---
        mid = len(rows) // 2
        if mid > 1:
            def get_com(r, c, w):
                t = np.sum(w) + 1e-9
                return np.sum(r*w)/t, np.sum(c*w)/t
            
            x1, y1 = get_com(rows[:mid], cols[:mid], weights[:mid])
            x2, y2 = get_com(rows[mid:], cols[mid:], weights[mid:])
            trajectory = np.sqrt((x2-x1)**2 + (y2-y1)**2)
        else:
            trajectory = 0
            
        # --- kCSD Proxy ---
        kcsd_feats = self._compute_kcsd_proxy(rows, cols, forms)

        res = {
            'Spat_Active_Count': n_active,
            'Spat_Participation_Rate': participation,
            'Spat_Entropy': spatial_entropy,
            'Spat_Trajectory_CAT': trajectory,
            'Spat_Expansion_Delta': delta_expansion 
        }
        res.update(kcsd_feats)
        return res

    # ==========================================
    # 6. FEATURE FAMILY: NETWORK & GRAPH
    # ==========================================
    def _extract_network(self, forms):
        n_ch = forms.shape[0]
        
        # Default Empty Response
        res = {
            'Net_Mean_Correlation': 0, 'Net_Clustering_Coeff': 0, 
            'Net_Transitivity': 0, 'Net_Global_Efficiency': 0,
            'Net_Avg_Path_Length': 0, 'Net_Rich_Club': 0,
            'Net_Modularity': 0, 'Net_Mean_Degree': 0,
            'Net_Pos_Link_Density': 0, 'Net_Neg_Link_Density': 0, 
            'Net_Interaction_Balance': 0
        }
        
        if n_ch < 5: return res

        # 1. Subsampling (Efficiency Mode)
        if self.efficiency_mode and n_ch > 150:
            energy = np.sum(np.abs(forms), axis=1)
            idx = np.argsort(energy)[-150:]
            sub_forms = forms[idx, :]
        else:
            sub_forms = forms

        # 2. Correlation Matrix
        corr_matrix = np.corrcoef(sub_forms)
        corr_matrix = np.nan_to_num(corr_matrix) 
        np.fill_diagonal(corr_matrix, 0) 

        # 3. Thresholding Logic
        upper_tri_indices = np.triu_indices_from(corr_matrix, k=1)
        upper_tri = corr_matrix[upper_tri_indices]
        
        if len(upper_tri) == 0: return res
        
        global_mean = np.mean(upper_tri)
        global_sd = np.std(upper_tri)
        res['Net_Mean_Correlation'] = global_mean

        # Strict Rule: Mean + 2SD
        pos_thresh = global_mean + (2 * global_sd)
        neg_thresh = global_mean - (2 * global_sd)

        # Safety Fallback: Ensure we keep top 5% of edges if data is too tight
        # This prevents "Empty Graph" issues
        percentile_95 = np.percentile(upper_tri, 95)
        if pos_thresh > percentile_95:
            pos_thresh = percentile_95
            
        # Hard clamp to prevent floating point errors (e.g. 1.00000002)
        if pos_thresh >= 0.99: pos_thresh = 0.99

        # 4. Link Density & Balance
        n_pos_links = np.sum(upper_tri > pos_thresh)
        n_neg_links = np.sum(upper_tri < neg_thresh)
        total_possible = len(upper_tri)
        
        res['Net_Pos_Link_Density'] = n_pos_links / (total_possible + 1e-9)
        res['Net_Neg_Link_Density'] = n_neg_links / (total_possible + 1e-9)
        res['Net_Interaction_Balance'] = n_pos_links / (n_neg_links + 1)

        # 5. Graph Topology (Individual Try/Except Blocks)
        if n_pos_links > 0:
            # Binarize
            adj_matrix = (np.abs(corr_matrix) > pos_thresh).astype(int)
            G = nx.from_numpy_array(adj_matrix)
            
            # A. Clustering & Transitivity
            try:
                res['Net_Clustering_Coeff'] = nx.average_clustering(G)
                res['Net_Transitivity'] = nx.transitivity(G)
            except: pass

            # B. Efficiency (Heavy Compute)
            try:
                if len(G) < 300: # Optimization
                    res['Net_Global_Efficiency'] = nx.global_efficiency(G)
            except: pass
            
            # C. Path Length & Degree
            try:
                degrees = [d for n, d in G.degree()]
                res['Net_Mean_Degree'] = np.mean(degrees)
                
                if nx.is_connected(G):
                    res['Net_Avg_Path_Length'] = nx.average_shortest_path_length(G)
                else:
                    # Handle disconnected graphs (common in thresholded data)
                    largest_cc = max(nx.connected_components(G), key=len)
                    subG = G.subgraph(largest_cc)
                    if len(subG) > 1:
                        res['Net_Avg_Path_Length'] = nx.average_shortest_path_length(subG)
            except: pass

            # D. Modularity (Often fails on small/disconnected graphs)
            try:
                communities = community.greedy_modularity_communities(G)
                res['Net_Modularity'] = community.modularity(G, communities)
            except: pass

            # E. Rich Club (Often fails if degree distribution is weird)
            try:
                if len(G) < 200:
                    rc = nx.rich_club_coefficient(G, normalized=False)
                    if rc:
                        res['Net_Rich_Club'] = np.mean(list(rc.values()))
            except: pass

        return res
    # ==========================================
    # 7. MAIN PROCESS PIPELINE
    # ==========================================
    def process_file(self, filename, compute_connectivity=False):
        print(f"Processing LFP: {filename} (Efficiency: {self.efficiency_mode}) ...")
        
        data, base_name = self._load_artifacts(filename)
        if data is None: return

        rows_all, cols_all = data['ids'] // 64, data['ids'] % 64
        
        results = []
        prev_end_time = 0

        for i, burst in enumerate(data['bursts']):
            mask = (data['times'] >= burst['t_start']) & (data['times'] <= burst['t_end'])
            if np.sum(mask) < 5: continue 

            b_forms = data['forms'][mask]
            b_rows = rows_all[mask]
            b_cols = cols_all[mask]
            
            row_feat = {'Burst_ID': i}
            
            # 1. Physics & Temporal
            ibi = burst['t_start'] - prev_end_time if i > 0 else 0
            row_feat.update(self._extract_physics_temporal(b_forms, burst['duration'], ibi))
            
            # 2. Spectral
            row_feat.update(self._extract_spectral(b_forms))
            
            # 3. Spatial (Now with kCSD)
            row_feat.update(self._extract_spatial(b_rows, b_cols, b_forms))
            
            # 4. Network (Now with Modularity)
            if compute_connectivity:
                row_feat.update(self._extract_network(b_forms))
            
            results.append(row_feat)
            prev_end_time = burst['t_end']

        if results:
            df = pd.DataFrame(results)
            save_dir = os.path.join(self.src_path, 'results-unified')
            os.makedirs(save_dir, exist_ok=True)
            
            mode_tag = "Fast" if self.efficiency_mode else "Full"
            out_name = f"FFF_{base_name}_LFP_{mode_tag}.csv"
            
            df.to_csv(os.path.join(save_dir, out_name), index=False)
            print(f"  -> Saved {len(df)} events to {out_name}")

if __name__ == "__main__":
    COMPUTE_CONNECTIVITY = True 
    EFFICIENCY_MODE = True
    
    ROOT = os.getcwd()
    
    for group in ['Control', 'Res', 'Vul']:
        g_path = os.path.join(ROOT, group)
        if not os.path.isdir(g_path): continue
        
        for slice_dir in os.listdir(g_path):
            full_path = os.path.join(g_path, slice_dir)
            files = [f for f in os.listdir(full_path) if f.endswith('.bxr') and f.startswith("FLFP")]
            
            if files:
                extractor = LFPFeatureExtractor(full_path, efficiency_mode=EFFICIENCY_MODE)
                extractor.process_file(files[0], compute_connectivity=COMPUTE_CONNECTIVITY)

```



### Log:

```bash

Scanning e:\Rishabh2025 ...
Total Loaded Events: 421
Group
Control        160
Resilient      136
Susceptible    125
Name: count, dtype: int64
[Warning] Dropped 7 events containing NaN/Infinity values.

========================================
  STRATEGY 1: SHAP (Supervised Importance)
========================================

[TABLE] Top Features by SHAP Importance
                Feature  SHAP_Importance
           Spat_Entropy         2.013955
               Phys_IBI         1.574173
     Phys_Waveform_Skew         1.277660
  Spec_Ratio_ThetaGamma         1.189991
    Spat_Trajectory_CAT         1.119227
      Spat_Active_Count         1.065736
     Phys_Global_Energy         0.825518
  Spec_Ratio_DeltaGamma         0.768717
     Spat_kCSD_MeanSink         0.704957
          Phys_Mean_P2P         0.684954
         Phys_Max_Slope         0.668917
    Spec_RelPower_Theta         0.613999
   Spec_Hjorth_Mobility         0.536703
          Phys_Duration         0.515647
         Net_Modularity         0.515148
   Spat_kCSD_MeanSource         0.425318
 Phys_Waveform_Kurtosis         0.410361
       Net_Transitivity         0.377555
          Net_Rich_Club         0.365658
   Spat_kCSD_Complexity         0.357426
   Net_Neg_Link_Density         0.338258
  Spec_Ratio_ThetaDelta         0.330314
  Net_Global_Efficiency         0.326922
     Spec_RelPower_Beta         0.298585
   Spat_Expansion_Delta         0.298294
   Net_Mean_Correlation         0.277988
   Net_Clustering_Coeff         0.270127
   Net_Pos_Link_Density         0.116259
    Net_Avg_Path_Length         0.113991
    Spec_RelPower_Gamma         0.094022
 Spec_Hjorth_Complexity         0.088154
Net_Interaction_Balance         0.085417
       Phys_Temporal_CV         0.074538
   Phys_Peak_Count_Mean         0.039157
    Spec_RelPower_Delta         0.008438
        Net_Mean_Degree         0.005625
Spat_Participation_Rate         0.000000

========================================
  STRATEGY 2: MUTUAL INFORMATION
========================================

[TABLE] Top Features by Mutual Information
                Feature  MI_Score
           Spat_Entropy  0.313999
   Spat_Expansion_Delta  0.278114
Spat_Participation_Rate  0.265892
      Spat_Active_Count  0.263152
   Phys_Peak_Count_Mean  0.227854
     Phys_Global_Energy  0.220925
       Phys_Temporal_CV  0.199625
               Phys_IBI  0.183388
     Spat_kCSD_MeanSink  0.176975
     Phys_Waveform_Skew  0.172233
 Spec_Hjorth_Complexity  0.169396
   Spec_Hjorth_Mobility  0.158756
  Spec_Ratio_ThetaGamma  0.140086
          Phys_Mean_P2P  0.131530
   Spat_kCSD_MeanSource  0.119834
   Net_Neg_Link_Density  0.110122
    Net_Avg_Path_Length  0.104895
 Phys_Waveform_Kurtosis  0.104636
   Net_Mean_Correlation  0.094751
Net_Interaction_Balance  0.085813
    Spec_RelPower_Gamma  0.080331
  Spec_Ratio_ThetaDelta  0.075140
         Net_Modularity  0.070283
  Spec_Ratio_DeltaGamma  0.070062
   Net_Clustering_Coeff  0.068461
          Phys_Duration  0.059242
   Spat_kCSD_Complexity  0.057294
    Spat_Trajectory_CAT  0.055851
        Net_Mean_Degree  0.049326
   Net_Pos_Link_Density  0.046152
    Spec_RelPower_Theta  0.038751
         Phys_Max_Slope  0.036897
  Net_Global_Efficiency  0.029728
          Net_Rich_Club  0.024109
       Net_Transitivity  0.018076
    Spec_RelPower_Delta  0.007437
     Spec_RelPower_Beta  0.004826

========================================
  STRATEGY 3: REDUNDANCY CHECK (Threshold > 0.9)
========================================

[TABLE] Highly Correlated Pairs
             Feature_A               Feature_B  Correlation
     Spat_Active_Count Spat_Participation_Rate       1.0000
    Phys_Global_Energy    Phys_Peak_Count_Mean       0.9997
   Spec_RelPower_Theta   Spec_Ratio_ThetaDelta       0.9974
         Phys_Mean_P2P  Spec_Hjorth_Complexity       0.9794
  Spec_Hjorth_Mobility    Spat_Expansion_Delta       0.9611
  Phys_Peak_Count_Mean    Spat_Expansion_Delta       0.9454
    Phys_Global_Energy    Spat_Expansion_Delta       0.9454
       Net_Mean_Degree    Net_Pos_Link_Density       0.9211
  Phys_Peak_Count_Mean  Spec_Hjorth_Complexity      -0.9165
    Phys_Global_Energy  Spec_Hjorth_Complexity      -0.9170
      Phys_Temporal_CV    Spat_Expansion_Delta      -0.9174
   Spec_RelPower_Delta      Spec_RelPower_Beta      -0.9222
   Spec_RelPower_Delta     Spec_RelPower_Theta      -0.9574
  Spec_Hjorth_Mobility  Spec_Hjorth_Complexity      -0.9714
         Phys_Mean_P2P    Spat_Expansion_Delta      -0.9728
         Phys_Mean_P2P    Spec_Hjorth_Mobility      -0.9741
   Spec_RelPower_Delta   Spec_Ratio_ThetaDelta      -0.9756
   Spec_RelPower_Gamma   Spec_Ratio_DeltaGamma      -0.9908
Spec_Hjorth_Complexity    Spat_Expansion_Delta      -0.9918
      Phys_Temporal_CV    Phys_Peak_Count_Mean      -0.9938
    Phys_Global_Energy        Phys_Temporal_CV      -0.9941

========================================
  STRATEGY 4: UNSUPERVISED DRIVERS (PCA)
========================================

[TABLE] Top Features Driving Variance (Unsupervised)
                            PC1     PC2     PC3  Global_Magnitude
Spat_Active_Count        0.1369  0.0635  0.4180            0.4444
Spat_Participation_Rate  0.1369  0.0635  0.4180            0.4444
Spec_RelPower_Delta     -0.0812 -0.4066  0.1348            0.4360
Spec_Ratio_ThetaDelta    0.0391  0.4127 -0.1029            0.4272
Spec_RelPower_Theta      0.0250  0.4106 -0.0907            0.4212
Spec_RelPower_Beta       0.1057  0.3599 -0.1756            0.4142
Spat_Entropy             0.1196  0.0782  0.3631            0.3902
Spec_Ratio_DeltaGamma   -0.2046 -0.2412  0.1650            0.3567
Spec_RelPower_Gamma      0.2140  0.1957 -0.1641            0.3333
Net_Mean_Correlation    -0.0727  0.2546  0.1391            0.2991
Net_Global_Efficiency    0.0019  0.1585  0.2393            0.2870
Net_Interaction_Balance  0.0618 -0.1391 -0.2391            0.2834
Net_Neg_Link_Density    -0.0429  0.1980  0.1945            0.2808
Phys_Global_Energy       0.2632 -0.0614  0.0007            0.2702
Phys_Peak_Count_Mean     0.2633 -0.0585  0.0027            0.2697
Net_Transitivity        -0.0774 -0.1374 -0.2183            0.2693
Phys_Temporal_CV        -0.2590  0.0707 -0.0046            0.2685
Spec_Hjorth_Mobility     0.2510 -0.0329 -0.0770            0.2646
Spat_Expansion_Delta     0.2600 -0.0342 -0.0099            0.2624
Spec_Hjorth_Complexity  -0.2548  0.0337  0.0247            0.2582
Spat_kCSD_MeanSink       0.2242 -0.1132 -0.0426            0.2548
Phys_Mean_P2P           -0.2519 -0.0019  0.0291            0.2535
Spec_Ratio_ThetaGamma   -0.2193  0.0234  0.1232            0.2526
Net_Clustering_Coeff    -0.2013  0.0823 -0.0826            0.2327
Phys_Waveform_Skew      -0.1937  0.1209  0.0225            0.2294
Phys_Duration            0.1537  0.0096  0.1517            0.2161
Net_Modularity          -0.1838  0.0686 -0.0881            0.2151
Phys_Max_Slope          -0.0194 -0.0412  0.2088            0.2137
Phys_IBI                 0.1581  0.0253  0.1282            0.2051
Net_Avg_Path_Length     -0.1676  0.1085  0.0305            0.2020
Phys_Waveform_Kurtosis   0.1453 -0.0392 -0.1334            0.2011
Net_Rich_Club            0.1568 -0.0957  0.0275            0.1858
Spat_kCSD_MeanSource     0.0714 -0.0332 -0.1565            0.1752
Spat_Trajectory_CAT      0.1437  0.0092 -0.0335            0.1478
Net_Mean_Degree          0.0126  0.0481  0.0902            0.1030
Net_Pos_Link_Density     0.0045  0.0668  0.0259            0.0718
Spat_kCSD_Complexity    -0.0105 -0.0176  0.0311            0.0372

Explained Variance Ratio: [0.36393654 0.12785602 0.09071363]

```
## Spikes Feature Engineering

```python

import h5py
import numpy as np
import pandas as pd
import os
import glob
from scipy.stats import entropy, variation, skew, kurtosis

# ==========================================
# 1. ROBUST SPIKE LOADER
# ==========================================
class RobustSpikeLoader:
    def __init__(self, filepath):
        self.filepath = filepath
        self.filename = os.path.basename(filepath)
        
    def load_data(self):
        try:
            with h5py.File(self.filepath, 'r') as f:
                try:
                    fs = f['3BRecInfo/3BRecVars/SamplingRate'][0]
                except:
                    fs = 14392.6
                
                try:
                    events = f['3BResults/3BChEvents']
                    times = events['SpikeTimes'][:] / fs
                    ids = events['SpikeChIDs'][:]
                except:
                    return None

                rows = (ids // 64).astype(int)
                cols = (ids % 64).astype(int)
                
                return {'times': times, 'ids': ids, 'rows': rows, 'cols': cols, 'fs': fs}
        except Exception as e:
            print(f"Error loading {self.filename}: {e}")
            return None

# ==========================================
# 2. FEATURE EXTRACTOR
# ==========================================
class DetailedSpikeFeatures:
    def compute(times, ids, rows, cols, duration):
        n_spikes = len(times)
        
        # --- A. BASIC STATS ---
        feat = {
            'Spike_Count': n_spikes,
            'Spike_Mean_Rate_Hz': n_spikes / duration if duration > 0 else 0
        }
        
        if n_spikes < 3:
            defaults = [
                'Spike_Recruitment_Pct', 'Spike_Spatial_Entropy', 'Spike_Spatial_Radius',
                'Spike_Peak_Rate_Hz', 'Spike_Rate_Skew', 'Spike_Rate_Kurtosis', 
                'Spike_Rise_Time_s', 'Spike_Decay_Time_s',
                'Spike_Temporal_CV', 'Spike_Fano_Factor', 'Spike_Burst_Compactness'
            ]
            for d in defaults: feat[d] = 0
            return feat

        # --- B. SPATIAL TOPOLOGY (Entropy & Spread) ---
        # 1. Recruitment
        unique_ids = np.unique(ids)
        feat['Spike_Recruitment_Pct'] = (len(unique_ids) / 4096) * 100
        
        # 2. Entropy (8x8 Grid)
        H, _, _ = np.histogram2d(rows, cols, bins=[8,8], range=[[0,64],[0,64]])
        prob = H.flatten() / np.sum(H)
        feat['Spike_Spatial_Entropy'] = entropy(prob + 1e-9)
        
        # 3. Spatial Radius (Gyration)
        row_std = np.std(rows)
        col_std = np.std(cols)
        feat['Spike_Spatial_Radius'] = np.sqrt(row_std**2 + col_std**2)

        # --- C. TEMPORAL DYNAMICS (Shape of the Burst) ---
        # We need to bin the spikes to create a "Rate Curve" over the window
        # Use 20ms bins (standard for population dynamics)
        bin_size = 0.02 
        n_bins = max(5, int(duration / bin_size))
        counts, bin_edges = np.histogram(times, bins=n_bins)
        
        # Rate Curve in Hz
        pop_rate = counts / bin_size
        
        feat['Spike_Peak_Rate_Hz'] = np.max(pop_rate)
        feat['Spike_Rate_Skew'] = skew(pop_rate)
        feat['Spike_Rate_Kurtosis'] = kurtosis(pop_rate)
        
        # Rise/Decay Approximation
        peak_idx = np.argmax(pop_rate)
        feat['Spike_Rise_Time_s'] = peak_idx * bin_size
        feat['Spike_Decay_Time_s'] = duration - (peak_idx * bin_size)

        # --- D. SYNCHRONY & VARIABILITY ---
        # 1. CV (Coefficient of Variation of the rate curve)
        feat['Spike_Temporal_CV'] = variation(pop_rate) if np.mean(pop_rate) > 0 else 0

        return feat

# ==========================================
# 3. LFP-GUIDED ANALYZER
# ==========================================
class LFPGuidedSpikeAnalyzer:
    def __init__(self, spike_data, spike_filename, root_dir):
        self.data = spike_data
        self.filename = spike_filename
        self.root_dir = root_dir
        self.results = []

    def _find_lfp_timestamps(self):
        # Locate corresponding _burst_graphs.npy based on naming convention
        core_name = self.filename.replace('Spikes_', '').replace('.bxr', '')
        target_path = os.path.join(self.root_dir, 'data', f"FLFP_{core_name}_burst_graphs.npy")
        
        if os.path.exists(target_path):
            try:
                return np.load(target_path, allow_pickle=True)
            except:
                return None
        return None

    def analyze_windows(self):
        lfp_bursts = self._find_lfp_timestamps()
        if lfp_bursts is None or len(lfp_bursts) == 0: return []

        for i, burst in enumerate(lfp_bursts):
            t_start = burst['t_start']
            t_end = burst['t_end']
            duration = t_end - t_start
            
            if duration <= 0: continue

            # Filter Spike Data to Window
            mask = (self.data['times'] >= t_start) & (self.data['times'] <= t_end)
            
            b_times = self.data['times'][mask]
            # Normalize times so they start at 0 for shape analysis
            b_times_rel = b_times - t_start 
            
            b_ids = self.data['ids'][mask]
            b_rows = self.data['rows'][mask]
            b_cols = self.data['cols'][mask]
            
            # --- CALCULATE RICH FEATURES ---
            # Using the comprehensive extractor
            feats = DetailedSpikeFeatures.compute(b_times_rel, b_ids, b_rows, b_cols, duration)
            
            # Add Meta Data
            feats['Filename'] = self.filename
            feats['LFP_Burst_ID'] = i
            feats['Window_Start'] = t_start
            feats['Window_Duration_s'] = duration
            
            self.results.append(feats)

        return self.results

# ==========================================
# 4. MAIN RUNNER
# ==========================================
if __name__ == "__main__":
    ROOT_DIR = os.getcwd()
    all_features = []
    
    print("--- LFP-Guided Spike Analysis (Comprehensive Features) ---")
    
    for root, dirs, files in os.walk(ROOT_DIR):
        for file in files:
            if file.startswith("Spikes_") and file.endswith(".bxr"):
                
                # Load
                loader = RobustSpikeLoader(os.path.join(root, file))
                spike_data = loader.load_data()
                
                if spike_data:
                    # Analyze
                    analyzer = LFPGuidedSpikeAnalyzer(spike_data, file, root)
                    window_feats = analyzer.analyze_windows()
                    
                    if window_feats:
                        all_features.extend(window_feats)
                        print(f"Processed {file}: {len(window_feats)} events.")

    if all_features:
        df = pd.DataFrame(all_features)
        
        # Group Assignment
        def get_group(name):
            if 'CTR' in name or 'Control' in name: return 'Control'
            if 'Res' in name or 'RES' in name: return 'Resilient'
            if 'Vul' in name or 'Sus' in name: return 'Susceptible'
            return 'Unknown'
            
        df['Group'] = df['Filename'].apply(get_group)
        
        # Save
        out_name = "LFP_Guided_RichSpikeFeatures.csv"
        df.to_csv(out_name, index=False)
        print(f"\nSaved rich features to {out_name}")
        
        # Columns Check
        print("\nFeatures Calculated:")
        print(df.columns.tolist())

```

### Log:

```bash

Loading e:\Rishabh2025\LFP_Guided_RichSpikeFeatures.csv...
Total Events: 421
Group
Control        160
Resilient      136
Susceptible    125
Name: count, dtype: int64
Features ready for analysis: 13

========================================
  STRATEGY 1: SHAP (What drives the Classifier?)
========================================

[TABLE] Top Spike Features by SHAP
                Feature  SHAP_Importance
  Spike_Spatial_Entropy         3.544018
   Spike_Spatial_Radius         3.186159
     Spike_Mean_Rate_Hz         1.567196
     Spike_Decay_Time_s         1.494707
  Spike_Recruitment_Pct         1.347857
     Spike_Peak_Rate_Hz         1.219504
            Spike_Count         0.953305
      Spike_Temporal_CV         0.794579
    Spike_Rate_Kurtosis         0.654187
        Spike_Rate_Skew         0.643526
      Spike_Rise_Time_s         0.197916

========================================
  STRATEGY 2: MUTUAL INFORMATION
========================================

[TABLE] Top Features by Mutual Information
                Feature  MI_Score
     Spike_Peak_Rate_Hz  0.222499
    Spike_Rate_Kurtosis  0.115316
            Spike_Count  0.087334
  Spike_Spatial_Entropy  0.087011
     Spike_Mean_Rate_Hz  0.083793
      Spike_Rise_Time_s  0.053626
     Spike_Decay_Time_s  0.052821
      Spike_Temporal_CV  0.050669
  Spike_Recruitment_Pct  0.050224
   Spike_Spatial_Radius  0.035906
        Spike_Rate_Skew  0.015490

========================================
  STRATEGY 3: REDUNDANCY CHECK (Threshold > 0.9)
========================================

[TABLE] Highly Correlated Pairs
         Feature_A           Feature_B  Correlation
Spike_Peak_Rate_Hz   Spike_Fano_Factor       0.9607
   Spike_Rate_Skew Spike_Rate_Kurtosis       0.9449

========================================
  STRATEGY 4: UNSUPERVISED DRIVERS (PCA)
========================================

[TABLE] Top Features Driving Variance (Unsupervised)
                            PC1     PC2     PC3  Global_Magnitude
Spike_Rate_Skew          0.1092  0.4253 -0.3394            0.5550
Spike_Rate_Kurtosis      0.0369  0.4427 -0.3249            0.5503
Spike_Count              0.2609  0.2715  0.3839            0.5377
Spike_Recruitment_Pct    0.1583  0.4034  0.2826            0.5174
Spike_Rise_Time_s        0.0475  0.2918  0.4214            0.5147
Spike_Temporal_CV        0.3534  0.1645 -0.2580            0.4674
Spike_Mean_Rate_Hz       0.3399 -0.1527  0.2602            0.4545
Spike_Decay_Time_s      -0.1287  0.3531 -0.2343            0.4428
Spike_Spatial_Radius    -0.3552  0.1957  0.1476            0.4316
Spike_Peak_Rate_Hz       0.4029  0.0570  0.1079            0.4210
Spike_Spatial_Entropy   -0.2985  0.2628  0.1215            0.4158

Explained Variance Ratio: [0.42672637 0.31867722 0.09745993]

```