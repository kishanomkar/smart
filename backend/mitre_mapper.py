from __future__ import annotations
from typing import Any

# Mapping CIC-IDS 2017/2018 labels to MITRE ATT&CK stages
LABEL_TO_MITRE = {
    'BENIGN': 'None',
    'PortScan': 'Reconnaissance',
    'DoS Hulk': 'Initial Access',
    'DoS GoldenEye': 'Initial Access',
    'DoS Slowloris': 'Initial Access',
    'DDoS': 'Initial Access',
    'Bot': 'Command and Control',
    'Web Attack': 'Initial Access',
    'Infiltration': 'Initial Access',
    'Lateral Movement': 'Lateral Movement',
    'Exfiltration': 'Exfiltration',
}

def map_label_to_mitre(label: str) -> str:
    return LABEL_TO_MITRE.get(label, 'Undetermined')

def get_stage_details(stage: str) -> dict[str, Any]:
    details = {
        'Reconnaissance': {
            'description': 'Attacker is gathering information about the target network.',
            'techniques': ['Active Scanning', 'Port Probing', 'OS Fingerprinting'],
            'risk_level': 'Low'
        },
        'Initial Access': {
            'description': 'Attacker is attempting to gain a foothold in the network.',
            'techniques': ['Exploiting Public-Facing Applications', 'Phishing', 'Brute Force'],
            'risk_level': 'Medium'
        },
        'Lateral Movement': {
            'description': 'Attacker is moving through the network to find high-value targets.',
            'techniques': ['Pass-the-Hash', 'SMB/WMI Execution', 'Remote Services'],
            'risk_level': 'High'
        },
        'Command and Control': {
            'description': 'Attacker has established a communication channel for remote control.',
            'techniques': ['Application Layer Protocol', 'Non-Standard Port', 'Beaconing'],
            'risk_level': 'High'
        },
        'Exfiltration': {
            'description': 'Attacker is stealing sensitive data from the network.',
            'techniques': ['Exfiltration Over C2 Channel', 'Archive Collected Data'],
            'risk_level': 'Critical'
        },
        'None': {
            'description': 'Normal network behavior detected.',
            'techniques': [],
            'risk_level': 'None'
        },
        'Undetermined': {
            'description': 'Behavior does not clearly map to a known ATT&CK stage.',
            'techniques': [],
            'risk_level': 'Unknown'
        }
    }
    return details.get(stage, details['Undetermined'])
