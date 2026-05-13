"""
WebSocket Manager — çoklu client bağlantı yönetimi ve broadcast.
"""
import json
from typing import Set
from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)
        print(f"[ws] Yeni bağlantı. Toplam: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)
        print(f"[ws] Bağlantı kesildi. Toplam: {len(self.active_connections)}")

    async def send_personal(self, message: dict, websocket: WebSocket):
        try:
            await websocket.send_text(json.dumps(message, ensure_ascii=False, default=str))
        except Exception as e:
            print(f"[ws] Personal send hatası: {e}")
            self.disconnect(websocket)

    async def broadcast(self, message: dict):
        """Tüm bağlı client'lara mesaj gönder."""
        if not self.active_connections:
            return

        data = json.dumps(message, ensure_ascii=False, default=str)
        dead_connections = set()

        for connection in self.active_connections.copy():
            try:
                await connection.send_text(data)
            except Exception:
                dead_connections.add(connection)

        for dead in dead_connections:
            self.active_connections.discard(dead)

    @property
    def connection_count(self) -> int:
        return len(self.active_connections)


# Global manager instance
manager = ConnectionManager()
