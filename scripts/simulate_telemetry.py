"""Telemetry Simulator supporting REST (with HMAC) and MQTT (QoS 1) for Industrial & Semiconductor scenarios."""
import argparse
import random
import hashlib
import hmac
import json
import os
import sys
import time
import uuid
from datetime import datetime, timedelta, timezone
import requests

SCENARIOS = {
    "feeder_jam": {
        "machine_id": "EQ-1002",
        "metric": "feeder_cycle_time",
        "value": 3.4,
        "unit": "s",
        "fault_code": "E-501",
        "severity": "critical",
        "description": "Pneumatic Feeder Jam on CNC Lathe"
    },
    "thermal_spike": {
        "machine_id": "EQ-1001",
        "metric": "bearing_temp",
        "value": 89.2,
        "unit": "C",
        "fault_code": "E-101",
        "severity": "critical",
        "description": "Spindle Bearing Thermal Spike on 5-Axis Machining Center"
    },
    "vibration_alert": {
        "machine_id": "EQ-1003",
        "metric": "vibration_rms",
        "value": 8.4,
        "unit": "mm/s",
        "fault_code": "E-102",
        "severity": "critical",
        "description": "Excessive Vibration on Hydraulic Press Main Pump"
    },
    "rf_power_deviation": {
        "machine_id": "EQ-2001",
        "metric": "plasma_rf_forward_power",
        "value": 1290.0,
        "unit": "W",
        "fault_code": "S-101",
        "severity": "critical",
        "description": "Plasma Etcher RF Forward Power Deviation"
    },
    "vacuum_leak": {
        "machine_id": "EQ-2002",
        "metric": "chamber_pressure_torr",
        "value": 0.082,
        "unit": "Torr",
        "fault_code": "S-201",
        "severity": "critical",
        "description": "PECVD Chamber Vacuum Leak Breach"
    },
    "stage_drift": {
        "machine_id": "EQ-2003",
        "metric": "stage_position_error_um",
        "value": 0.068,
        "unit": "um",
        "fault_code": "S-301",
        "severity": "critical",
        "description": "Lithography Wafer Stage Laser Interferometer Drift"
    },
    "slurry_blockage": {
        "machine_id": "EQ-2004",
        "metric": "slurry_flow_rate_ml_min",
        "value": 120.0,
        "unit": "mL/min",
        "fault_code": "S-401",
        "severity": "critical",
        "description": "CMP Polisher Slurry Delivery Peristaltic Pump Restriction"
    },
    "normal_operation": {
        "machine_id": "EQ-1001",
        "metric": "bearing_temp",
        "value": 52.0,
        "unit": "C",
        "severity": "normal",
        "description": "Healthy Baseline Operation"
    }
}

def send_rest_event(url: str, secret: str, event_data: dict) -> dict:
    raw_body = json.dumps(event_data)
    timestamp_str = str(int(time.time()))
    canonical = f"{timestamp_str}.{raw_body}".encode("utf-8")
    signature = hmac.new(secret.encode("utf-8"), canonical, hashlib.sha256).hexdigest()
    headers = {
        "Content-Type": "application/json",
        "X-Signature-SHA256": f"sha256={signature}",
        "X-Timestamp": timestamp_str
    }
    response = requests.post(url, data=raw_body, headers=headers, timeout=10)
    return {
        "status_code": response.status_code,
        "body": response.json() if response.headers.get("content-type", "").startswith("application/json") else response.text
    }

def send_mqtt_event(broker_host: str, broker_port: int, topic: str, event_data: dict):
    import paho.mqtt.client as mqtt
    try:
        client = mqtt.Client(callback_api_version=mqtt.CallbackAPIVersion.VERSION2)
    except AttributeError:
        client = mqtt.Client()
    client.connect(broker_host, broker_port, keepalive=30)
    client.loop_start()
    msg_info = client.publish(topic, json.dumps(event_data), qos=1)
    msg_info.wait_for_publish(timeout=5)
    client.loop_stop()
    client.disconnect()
    return {"published": True, "topic": topic, "event_id": event_data.get("event_id")}

# Continuous sensor baselines for --samples mode: (mean, random-walk step, floor, ceiling).
SAMPLE_BASELINES = {
    "spindle_speed": (1250.0, 25.0, 0.0, 12000.0),
    "temperature": (32.0, 0.4, 15.0, 95.0),
    "vibration_rms": (2.2, 0.08, 0.1, 12.0),
    "motor_current": (18.0, 0.5, 0.0, 60.0),
}


def simulate_samples(url: str, secret: str, machine_ids: list, hours: int, step_minutes: int, seed: int) -> None:
    """Backfill a simulated random-walk series per metric over the last `hours` and POST it in batches."""
    rng = random.Random(seed)
    end = datetime.now(timezone.utc)
    steps = int(hours * 60 / step_minutes)
    for machine_id in machine_ids:
        samples = []
        for metric, (mean, step, lo, hi) in SAMPLE_BASELINES.items():
            value = mean
            for i in range(steps + 1):
                value = min(max(value + rng.uniform(-step, step) + (mean - value) * 0.05, lo), hi)
                observed = end - timedelta(minutes=(steps - i) * step_minutes)
                samples.append({"metric": metric, "value": round(value, 2), "observed_at": observed.isoformat()})
        for start in range(0, len(samples), 500):
            res = send_rest_event(url, secret, {"machine_id": machine_id, "samples": samples[start:start + 500]})
            print(f"[SAMPLES] {machine_id} batch {start // 500 + 1} -> Status {res['status_code']}: {res['body']}")


def main():
    parser = argparse.ArgumentParser(description="Simulate Industrial & Semiconductor Telemetry Events")
    parser.add_argument("--scenario", choices=list(SCENARIOS.keys()) + ["all"], default="all")
    parser.add_argument("--mode", choices=["rest", "mqtt"], default="rest")
    parser.add_argument("--url", default="http://localhost:8000/api/v1/telemetry/events")
    parser.add_argument("--secret", default="default_telemetry_secret_key_change_in_prod")
    parser.add_argument("--broker-host", default="localhost")
    parser.add_argument("--broker-port", type=int, default=1883)
    parser.add_argument("--repeat", type=int, default=1)
    parser.add_argument("--interval", type=float, default=1.0)
    parser.add_argument("--samples", action="store_true",
                        help="Backfill simulated continuous sensor samples instead of sending fault events")
    parser.add_argument("--samples-url", default="http://localhost:8000/api/v1/telemetry/samples")
    parser.add_argument("--machines", default="EQ-1000,EQ-1001,EQ-1002,EQ-1003,EQ-1004")
    parser.add_argument("--hours", type=int, default=24)
    parser.add_argument("--step-minutes", type=int, default=10)
    parser.add_argument("--seed", type=int, default=7)
    args = parser.parse_args()

    if args.samples:
        machine_ids = [m.strip().upper() for m in args.machines.split(",") if m.strip()]
        print(f"[*] Backfilling simulated samples: machines={machine_ids}, hours={args.hours}, step={args.step_minutes}m")
        simulate_samples(args.samples_url, args.secret, machine_ids, args.hours, args.step_minutes, args.seed)
        return

    target_scenarios = list(SCENARIOS.keys()) if args.scenario == "all" else [args.scenario]
    print(f"[*] Starting telemetry simulation: mode={args.mode}, scenarios={target_scenarios}")
    for i in range(args.repeat):
        for key in target_scenarios:
            item = SCENARIOS[key].copy()
            item["machine_id"] = item["machine_id"].upper()
            item["event_id"] = str(uuid.uuid4())
            item["timestamp"] = datetime.utcnow().isoformat()
            if args.mode == "rest":
                res = send_rest_event(args.url, args.secret, item)
                print(f"[REST] Scenario '{key}' -> Status {res['status_code']}: {res['body']}")
            else:
                topic = f"factory/{item['machine_id']}/telemetry"
                res = send_mqtt_event(args.broker_host, args.broker_port, topic, item)
                print(f"[MQTT] Scenario '{key}' -> Published to {topic}: event_id={item['event_id']}")
            time.sleep(args.interval)

if __name__ == "__main__":
    main()
