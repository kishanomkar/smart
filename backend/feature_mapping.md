# CIC-IDS2017 to Scapy Feature Mapping

Only rows marked `selected` are used by both training and live inference.

| CIC feature | How it is calculated | Available? | Source type | Status |
|---|---|---:|---|---|
| `Destination Port` | destination port of the first packet defining the forward direction | yes | direct packet metadata | selected |
| `Flow Duration` | last packet timestamp minus first packet timestamp, in microseconds | yes | aggregated from packets | selected |
| `Total Fwd Packets` | count packets in the flow direction; subflow counts equal flow counts | yes | aggregated from packets | selected |
| `Total Backward Packets` | count packets in the flow direction; subflow counts equal flow counts | yes | aggregated from packets | selected |
| `Total Length of Fwd Packets` | sum captured IP/IPv6 packet lengths by direction | yes | aggregated from packets | selected |
| `Total Length of Bwd Packets` | sum captured IP/IPv6 packet lengths by direction | yes | aggregated from packets | selected |
| `Fwd Packet Length Max` | min/max/mean/std/variance of captured IP/IPv6 lengths by named scope | yes | aggregated from packets | selected |
| `Fwd Packet Length Min` | min/max/mean/std/variance of captured IP/IPv6 lengths by named scope | yes | aggregated from packets | selected |
| `Fwd Packet Length Mean` | min/max/mean/std/variance of captured IP/IPv6 lengths by named scope | yes | aggregated from packets | selected |
| `Fwd Packet Length Std` | min/max/mean/std/variance of captured IP/IPv6 lengths by named scope | yes | aggregated from packets | selected |
| `Bwd Packet Length Max` | min/max/mean/std/variance of captured IP/IPv6 lengths by named scope | yes | aggregated from packets | selected |
| `Bwd Packet Length Min` | min/max/mean/std/variance of captured IP/IPv6 lengths by named scope | yes | aggregated from packets | selected |
| `Bwd Packet Length Mean` | min/max/mean/std/variance of captured IP/IPv6 lengths by named scope | yes | aggregated from packets | selected |
| `Bwd Packet Length Std` | min/max/mean/std/variance of captured IP/IPv6 lengths by named scope | yes | aggregated from packets | selected |
| `Flow Bytes/s` | corresponding byte or packet count divided by duration in seconds | yes | aggregated from packets | selected |
| `Flow Packets/s` | corresponding byte or packet count divided by duration in seconds | yes | aggregated from packets | selected |
| `Flow IAT Mean` | statistics of timestamp differences, in microseconds, for the named direction | yes | aggregated from packets | selected |
| `Flow IAT Std` | statistics of timestamp differences, in microseconds, for the named direction | yes | aggregated from packets | selected |
| `Flow IAT Max` | statistics of timestamp differences, in microseconds, for the named direction | yes | aggregated from packets | selected |
| `Flow IAT Min` | statistics of timestamp differences, in microseconds, for the named direction | yes | aggregated from packets | selected |
| `Fwd IAT Total` | statistics of timestamp differences, in microseconds, for the named direction | yes | aggregated from packets | selected |
| `Fwd IAT Mean` | statistics of timestamp differences, in microseconds, for the named direction | yes | aggregated from packets | selected |
| `Fwd IAT Std` | statistics of timestamp differences, in microseconds, for the named direction | yes | aggregated from packets | selected |
| `Fwd IAT Max` | statistics of timestamp differences, in microseconds, for the named direction | yes | aggregated from packets | selected |
| `Fwd IAT Min` | statistics of timestamp differences, in microseconds, for the named direction | yes | aggregated from packets | selected |
| `Bwd IAT Total` | statistics of timestamp differences, in microseconds, for the named direction | yes | aggregated from packets | selected |
| `Bwd IAT Mean` | statistics of timestamp differences, in microseconds, for the named direction | yes | aggregated from packets | selected |
| `Bwd IAT Std` | statistics of timestamp differences, in microseconds, for the named direction | yes | aggregated from packets | selected |
| `Bwd IAT Max` | statistics of timestamp differences, in microseconds, for the named direction | yes | aggregated from packets | selected |
| `Bwd IAT Min` | statistics of timestamp differences, in microseconds, for the named direction | yes | aggregated from packets | selected |
| `Fwd PSH Flags` | count TCP packets carrying the named flag, by direction where named | yes | aggregated from packets | selected |
| `Bwd PSH Flags` | count TCP packets carrying the named flag, by direction where named | yes | aggregated from packets | selected |
| `Fwd URG Flags` | count TCP packets carrying the named flag, by direction where named | yes | aggregated from packets | selected |
| `Bwd URG Flags` | count TCP packets carrying the named flag, by direction where named | yes | aggregated from packets | selected |
| `Fwd Header Length` | sum IP/IPv6 and TCP/UDP header bytes by direction | yes | aggregated from packets | selected |
| `Bwd Header Length` | sum IP/IPv6 and TCP/UDP header bytes by direction | yes | aggregated from packets | selected |
| `Fwd Packets/s` | corresponding byte or packet count divided by duration in seconds | yes | aggregated from packets | selected |
| `Bwd Packets/s` | corresponding byte or packet count divided by duration in seconds | yes | aggregated from packets | selected |
| `Min Packet Length` | min/max/mean/std/variance of captured IP/IPv6 lengths by named scope | yes | aggregated from packets | selected |
| `Max Packet Length` | min/max/mean/std/variance of captured IP/IPv6 lengths by named scope | yes | aggregated from packets | selected |
| `Packet Length Mean` | min/max/mean/std/variance of captured IP/IPv6 lengths by named scope | yes | aggregated from packets | selected |
| `Packet Length Std` | min/max/mean/std/variance of captured IP/IPv6 lengths by named scope | yes | aggregated from packets | selected |
| `Packet Length Variance` | min/max/mean/std/variance of captured IP/IPv6 lengths by named scope | yes | aggregated from packets | selected |
| `FIN Flag Count` | count TCP packets carrying the named flag, by direction where named | yes | aggregated from packets | selected |
| `SYN Flag Count` | count TCP packets carrying the named flag, by direction where named | yes | aggregated from packets | selected |
| `RST Flag Count` | count TCP packets carrying the named flag, by direction where named | yes | aggregated from packets | selected |
| `PSH Flag Count` | count TCP packets carrying the named flag, by direction where named | yes | aggregated from packets | selected |
| `ACK Flag Count` | count TCP packets carrying the named flag, by direction where named | yes | aggregated from packets | selected |
| `URG Flag Count` | count TCP packets carrying the named flag, by direction where named | yes | aggregated from packets | selected |
| `CWE Flag Count` | not selected: Scapy flag semantics differ across exporters | no | unavailable | excluded from both pipelines |
| `ECE Flag Count` | not selected: not consistently present in the live metadata path | no | unavailable | excluded from both pipelines |
| `Down/Up Ratio` | not selected: exporter-specific definition; can be added after calibration | no | unavailable | excluded from both pipelines |
| `Average Packet Size` | min/max/mean/std/variance of captured IP/IPv6 lengths by named scope | yes | aggregated from packets | selected |
| `Avg Fwd Segment Size` | min/max/mean/std/variance of captured IP/IPv6 lengths by named scope | yes | aggregated from packets | selected |
| `Avg Bwd Segment Size` | min/max/mean/std/variance of captured IP/IPv6 lengths by named scope | yes | aggregated from packets | selected |
| `Fwd Header Length.1` | sum IP/IPv6 and TCP/UDP header bytes by direction | yes | aggregated from packets | selected |
| `Fwd Avg Bytes/Bulk` | bulk periods require CIC exporter semantics | no | unavailable | excluded from both pipelines |
| `Fwd Avg Packets/Bulk` | bulk periods require CIC exporter semantics | no | unavailable | excluded from both pipelines |
| `Fwd Avg Bulk Rate` | bulk periods require CIC exporter semantics | no | unavailable | excluded from both pipelines |
| `Bwd Avg Bytes/Bulk` | bulk periods require CIC exporter semantics | no | unavailable | excluded from both pipelines |
| `Bwd Avg Packets/Bulk` | bulk periods require CIC exporter semantics | no | unavailable | excluded from both pipelines |
| `Bwd Avg Bulk Rate` | bulk periods require CIC exporter semantics | no | unavailable | excluded from both pipelines |
| `Subflow Fwd Packets` | count packets in the flow direction; subflow counts equal flow counts | yes | aggregated from packets | selected |
| `Subflow Fwd Bytes` | sum captured IP/IPv6 packet lengths by direction | yes | aggregated from packets | selected |
| `Subflow Bwd Packets` | count packets in the flow direction; subflow counts equal flow counts | yes | aggregated from packets | selected |
| `Subflow Bwd Bytes` | sum captured IP/IPv6 packet lengths by direction | yes | aggregated from packets | selected |
| `Init_Win_bytes_forward` | TCP window from the first TCP packet in the named direction; zero for UDP | yes | direct packet metadata | selected |
| `Init_Win_bytes_backward` | TCP window from the first TCP packet in the named direction; zero for UDP | yes | direct packet metadata | selected |
| `act_data_pkt_fwd` | forward TCP/UDP packets with a non-empty transport payload | yes | aggregated from packets | selected |
| `min_seg_size_forward` | minimum forward TCP/UDP header length; zero when no forward packet exists | yes | aggregated from packets | selected |
| `Active Mean` | statistics of active periods and gaps using a 1-second inactivity boundary | yes | aggregated from packets | selected |
| `Active Std` | statistics of active periods and gaps using a 1-second inactivity boundary | yes | aggregated from packets | selected |
| `Active Max` | statistics of active periods and gaps using a 1-second inactivity boundary | yes | aggregated from packets | selected |
| `Active Min` | statistics of active periods and gaps using a 1-second inactivity boundary | yes | aggregated from packets | selected |
| `Idle Mean` | statistics of active periods and gaps using a 1-second inactivity boundary | yes | aggregated from packets | selected |
| `Idle Std` | statistics of active periods and gaps using a 1-second inactivity boundary | yes | aggregated from packets | selected |
| `Idle Max` | statistics of active periods and gaps using a 1-second inactivity boundary | yes | aggregated from packets | selected |
| `Idle Min` | statistics of active periods and gaps using a 1-second inactivity boundary | yes | aggregated from packets | selected |
| `Label` | training target; unavailable for live traffic | no | label | label |
