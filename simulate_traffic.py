"""Traffic simulator to trigger the World Model pipeline via API."""

from __future__ import annotations
import time
import requests

def simulate_traffic(target_url="http://127.0.0.1:8000/simulate-packet"):
    print(f"Starting API-based traffic simulation targeting {target_url}...")
    print("Generating packets to fill the World Model history windows...")

    # The backend needs 5 completed windows.
    # A window is completed when flows expire (timeout_seconds=2.0)
    # and then a new packet arrives to trigger the expire() check.

    for window in range(1, 6):
        print(f"Filling window {window}/5...")
        # Send a burst of packets to create flows
        for i in range(20):
            dport = 80 if i < 10 else 445
            flags = "S" if i % 2 == 0 else "SA"
            try:
                requests.post(target_url, params={
                    "src": f"192.168.1.{10 + window}",
                    "dst": "127.0.0.1",
                    "dport": dport,
                    "flags": flags
                })
            except Exception as e:
                print(f"Error sending packet: {e}")
            time.sleep(0.01)

        # Wait for flows to expire
        print(f"  Waiting for window {window} to expire...")
        time.sleep(3)

        # Send a trigger packet to process the expired flows
        try:
            requests.post(target_url, params={
                "src": "1.1.1.1",
                "dst": "127.0.0.1",
                "dport": 80,
                "flags": "S"
            })
            print(f"  Trigger packet sent for window {window}.")
        except Exception as e:
            print(f"Error sending trigger: {e}")

    print("\nSimulation complete. Check the Dashboard for state updates!")

if __name__ == "__main__":
    simulate_traffic()
