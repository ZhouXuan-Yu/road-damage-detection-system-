import httpx
import asyncio

async def test():
    async with httpx.AsyncClient(timeout=60.0) as client:
        async with client.stream(
            "POST", "http://localhost:8000/api/v1/agent/chat/stream",
            json={"message": "你好", "session_id": "raw_bytes"},
            headers={"Content-Type": "application/json"},
        ) as resp:
            raw = b""
            async for chunk in resp.aiter_bytes():
                raw += chunk
            s = raw.decode("utf-8", errors="replace")
            print(f"First 300 chars: {repr(s[:300])}")
            print(f"Last 100 chars: {repr(s[-100:])}")
            print(f"len(raw)={len(raw)} b'\\n'={raw.count(b'\\n')} b'\\\\n'={raw.count(b'\\\\n')}")
            s_latin = raw.decode("latin-1")
            print(f"Latin-1 first 300: {repr(s_latin[:300])}")

asyncio.run(test())
