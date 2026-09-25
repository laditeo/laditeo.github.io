#!/usr/bin/env python3
"""IP-gated master save for feya/globe debug JSON."""
from __future__ import annotations

import json
import os
import re
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(os.environ.get("FEYA_DEBUG_ROOT", "/var/www/laditeo.art"))
MASTERS = Path(os.environ.get("FEYA_DEBUG_MASTERS", "/root/feya-debug/masters.json"))
SEEN = Path(os.environ.get("FEYA_DEBUG_SEEN", "/root/feya-debug/seen-ips.log"))
HOST = os.environ.get("FEYA_DEBUG_HOST", "127.0.0.1")
PORT = int(os.environ.get("FEYA_DEBUG_PORT", "8795"))

FILES = {
    "feya": ROOT / "feya-debug.json",
    "globe": ROOT / "globe-debug.json",
}

_lock = threading.Lock()


def _load_masters() -> set[str]:
    try:
        data = json.loads(MASTERS.read_text(encoding="utf-8"))
        ips = data.get("ips") if isinstance(data, dict) else data
        return {str(x).strip() for x in (ips or []) if str(x).strip()}
    except Exception:
        return set()


def _save_masters(ips: set[str]) -> None:
    MASTERS.parent.mkdir(parents=True, exist_ok=True)
    MASTERS.write_text(json.dumps({"ips": sorted(ips)}, indent=2) + "\n", encoding="utf-8")


def _is_master(ip: str) -> bool:
    masters = _load_masters()
    if ip in masters:
        return True
    # bootstrap: first real client IP becomes master when list is empty
    if not masters and ip and ip not in ("127.0.0.1", "::1", "0.0.0.0"):
        masters.add(ip)
        try:
            _save_masters(masters)
        except Exception:
            return False
        return True
    return False


def _client_ip(handler: BaseHTTPRequestHandler) -> str:
    xff = handler.headers.get("X-Forwarded-For") or handler.headers.get("X-Real-IP") or ""
    if xff:
        return xff.split(",")[0].strip()
    return handler.client_address[0]


def _note_ip(ip: str) -> None:
    try:
        SEEN.parent.mkdir(parents=True, exist_ok=True)
        with SEEN.open("a", encoding="utf-8") as f:
            f.write(ip + "\n")
    except Exception:
        pass


def _read_json(path: Path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None


def _write_json(path: Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    tmp.replace(path)


class Handler(BaseHTTPRequestHandler):
    server_version = "feya-debug/1"

    def log_message(self, fmt, *args):
        pass

    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Cache-Control", "no-store")

    def _json(self, code: int, obj):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self._cors()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_GET(self):
        path = urlparse(self.path).path.rstrip("/") or "/"
        ip = _client_ip(self)
        _note_ip(ip)
        is_master = _is_master(ip)
        if path.endswith("/status") or path == "/status":
            return self._json(200, {"ok": True, "ip": ip, "master": is_master})
        if path.endswith("/feya") or path == "/feya":
            data = _read_json(FILES["feya"])
            return self._json(200, {"ok": True, "master": is_master, "data": data})
        if path.endswith("/globe") or path == "/globe":
            data = _read_json(FILES["globe"])
            return self._json(200, {"ok": True, "master": is_master, "data": data})
        return self._json(404, {"ok": False, "error": "not found"})

    def do_POST(self):
        path = urlparse(self.path).path.rstrip("/") or "/"
        ip = _client_ip(self)
        _note_ip(ip)
        if not _is_master(ip):
            return self._json(403, {"ok": False, "error": "not master", "ip": ip, "master": False})
        length = int(self.headers.get("Content-Length") or 0)
        raw = self.rfile.read(length) if length else b"{}"
        try:
            payload = json.loads(raw.decode("utf-8") or "{}")
        except Exception:
            return self._json(400, {"ok": False, "error": "bad json"})
        if not isinstance(payload, dict):
            return self._json(400, {"ok": False, "error": "object required"})
        # strip huge / weird keys
        clean = {}
        for k, v in payload.items():
            if not re.match(r"^[A-Za-z0-9_]{1,32}$", str(k)):
                continue
            if isinstance(v, (int, float, str, bool)) or v is None:
                clean[str(k)] = v
        which = None
        if path.endswith("/feya") or path == "/feya":
            which = "feya"
        elif path.endswith("/globe") or path == "/globe":
            which = "globe"
        if not which:
            return self._json(404, {"ok": False, "error": "not found"})
        with _lock:
            _write_json(FILES[which], clean)
        return self._json(200, {"ok": True, "master": True, "ip": ip, "saved": which})


def main():
    MASTERS.parent.mkdir(parents=True, exist_ok=True)
    if not MASTERS.exists():
        MASTERS.write_text(json.dumps({"ips": []}, indent=2) + "\n", encoding="utf-8")
    httpd = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"feya-debug-api on {HOST}:{PORT} root={ROOT}", flush=True)
    httpd.serve_forever()


if __name__ == "__main__":
    main()
