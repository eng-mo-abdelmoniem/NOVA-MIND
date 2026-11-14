from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from .schemas import AstronautProfile, TestResult
from .engine import MedicalEngine

app=FastAPI(title="AstraMed Multimodal Medical Assistant",version="1.0.0")
engine=MedicalEngine(); clients=set()
app.mount("/static",StaticFiles(directory="static"),name="static")

@app.get("/")
def dashboard(): return FileResponse("static/index.html")
@app.get("/health")
def health(): return {"status":"ok","mode":"prototype","clinical_validation":False}
@app.post("/profiles")
def save_profile(p:AstronautProfile): return engine.set_profile(p)
@app.get("/profiles/{astronaut_id}")
def get_profile(astronaut_id:str):
    p=engine.profiles.get(astronaut_id)
    if not p: raise HTTPException(404,"Astronaut profile not found")
    return {"profile":p,"recent_results":list(engine.history[astronaut_id])[-30:]}
@app.post("/results")
async def ingest(r:TestResult):
    a=engine.ingest(r); payload={"result":r.model_dump(mode="json"),"alert":a.model_dump(mode="json")}
    dead=[]
    for ws in clients:
        try: await ws.send_json(payload)
        except Exception: dead.append(ws)
    for ws in dead: clients.discard(ws)
    return payload
@app.websocket("/ws")
async def websocket(ws:WebSocket):
    await ws.accept(); clients.add(ws)
    try:
        while True: await ws.receive_text()
    except WebSocketDisconnect: clients.discard(ws)
