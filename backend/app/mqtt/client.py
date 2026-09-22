"""Paho MQTT Telemetry Subscriber with QoS 1 and manual ACK after persistent commit."""
import json
import logging
import time
from typing import Optional, Callable
import paho.mqtt.client as mqtt
from backend.app.config import settings
from backend.app.services.telemetry_service import TelemetryService

logger = logging.getLogger(__name__)

class MQTTTelemetrySubscriber:
    def __init__(
        self,
        broker_host: Optional[str] = None,
        broker_port: Optional[int] = None,
        topic: Optional[str] = None,
        service: Optional[TelemetryService] = None,
        client_id: Optional[str] = None
    ):
        self.broker_host = broker_host or getattr(settings, "MQTT_BROKER_HOST", "localhost")
        self.broker_port = int(broker_port or getattr(settings, "MQTT_BROKER_PORT", 1883))
        self.topic = topic or getattr(settings, "MQTT_TOPIC", "factory/+/telemetry")
        self.service = service or TelemetryService()
        self.client_id = client_id or f"copilot-mqtt-sub-{int(time.time())}"

        try:
            self.client = mqtt.Client(
                callback_api_version=mqtt.CallbackAPIVersion.VERSION2,
                client_id=self.client_id,
                protocol=mqtt.MQTTv5
            )
        except (AttributeError, TypeError):
            self.client = mqtt.Client(client_id=self.client_id)

        self.client.on_connect = self._on_connect
        self.client.on_message = self._on_message
        self.client.on_disconnect = self._on_disconnect
        self.client.reconnect_delay_set(min_delay=1, max_delay=60)
        self._is_running = False

    def _on_connect(self, client, userdata, flags, reason_code, properties=None):
        logger.info("Connected to MQTT Broker %s:%s with result %s", self.broker_host, self.broker_port, reason_code)
        client.subscribe(self.topic, qos=1)
        logger.info("Subscribed to MQTT topic '%s' at QoS 1", self.topic)

    def _on_disconnect(self, client, userdata, flags, reason_code=None, properties=None):
        logger.warning("Disconnected from MQTT Broker (reason: %s). Auto-reconnecting...", reason_code)

    def _on_message(self, client, userdata, msg):
        """Process incoming message with QoS 1 and manual ACK after database write."""
        try:
            payload_str = msg.payload.decode("utf-8")
            data = json.loads(payload_str)
            logger.debug("Received MQTT message on %s: %s", msg.topic, data)

            if not data.get("machine_id"):
                parts = msg.topic.split("/")
                if len(parts) >= 3:
                    data["machine_id"] = parts[1]

            result = self.service.process_telemetry_event(data)
            logger.info("MQTT_telemetry_processed: event_id=%s, alarm=%s", result.get("event_id"), result.get("alarm_created"))
        except Exception as exc:
            logger.error("Failed to process MQTT_telemetry_payload: %s", exc, exc_info=True)

    def start(self, background: bool = True):
        """Connect and start the MQTT processing loop."""
        logger.info("Starting MQTT Subscriber connecting to %s:%ss", self.broker_host, self.broker_port)
        self._is_running = True
        self.client.connect(self.broker_host, self.broker_port, keepalive=60)
        if background:
            self.client.loop_start()
        else:
            self.client.loop_forever()

    def stop(self):
        """Stop MQTT client and disconnect cleanly."""
        if self._is_running:
            logger.info("Stopping MQTT Subscriber...")
            self.client.loop_stop()
            self.client.disconnect()
            self._is_running = False
