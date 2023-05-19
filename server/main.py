from fastapi import FastAPI, Response, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from chess import Board, Move
from uuid import uuid4
from itertools import chain
import chess

# import uvicorn

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Game:
    def __init__(self):
        self.sockets: list[WebSocket] = []
        self.board: Board = Board()
        self.move: int = 0
        self.colors: list[int] = [1, 0]

    async def connect(self, socket: WebSocket):
        if (socket not in self.sockets) and len(self.sockets) < 2:
            self.sockets.append(socket)
            if len(self.colors) != 0:
                await socket.send_bytes(bytes([1, self.colors.pop()]))

    async def broadcast(self, message):
        for socket in self.sockets:
            await socket.send_bytes(message)


registry: dict[Game] = {}
last_id = None


@app.get("/game")
async def get_id():
    global last_id

    if last_id is None:
        last_id = uuid4().hex
        print(f"New registry key: `{last_id}`")
        registry[last_id] = Game()
        return Response(last_id, media_type="text/plain")
    else:
        temp = last_id
        last_id = None
        return Response(temp, media_type="text/plain")


@app.websocket("/ws")
async def play(websocket: WebSocket):
    await websocket.accept()

    game = None

    while True:
        message = await websocket.receive_bytes()
        if message is None or message[0] != 0:
            continue
        key = message[1:].decode()
        print(f"Received key: `{key}`")
        game = registry.get(key, None)
        if game is None:
            await websocket.close()
            return
        else:
            await game.connect(websocket)
            break

    board: Board = game.board

    while True:
        try:
            message = await websocket.receive_bytes()
            print(f"Received message: {message}")
            msg = list(message)
            print(f"Casted message: {msg}")
            if msg[0] == 4 and message[-1] == game.move:
                fields = "abcdefgh"
                src = f"{fields[message[2]]}{message[1] + 1}"
                for move in board.legal_moves:
                    if move.uci().startswith(src):
                        print(move)

                replacements = {
                    "a": "1",
                    "b": "2",
                    "c": "3",
                    "d": "4",
                    "e": "5",
                    "f": "6",
                    "g": "7",
                    "h": "8",
                }

                moves = list(board.legal_moves)
                # mv = Move.from_uci("a4b7");
                # mv.to_square()
                print(moves)
                moves = list(filter(lambda move: move.uci().startswith(src), moves))
                print(moves)
                moves = list(map(lambda move: str(move)[2:], moves))
                print(moves)
                moves = list(map(lambda move: move.replace(move[0], replacements[move[0]]), moves))
                print(moves)
                moves = list(map(lambda move: [int(move[1]) - 1, int(move[0]) - 1], moves))
                print(moves)
                message = bytes([5, *chain(*moves)])
                await game.broadcast(message)

            elif msg[0] == 2 and message[-1] == game.move:
                fields = "abcdefgh"
                msg = f"{fields[message[2]]}{message[1] + 1}{fields[message[4]]}{message[3] + 1}"
                print(f"Parsed message: {msg}")
                try:
                    board.push_uci(msg)
                    game.move = 1 - game.move
                    await game.broadcast(message)
                except ValueError as e:
                    print(e)
                    # Invalid or illegal move.
                    pass

            outcome = board.outcome()
            if outcome is not None:
                if outcome.winner is None:
                    await game.broadcast(bytes([3, 2]))
                elif outcome.winner == chess.WHITE:
                    await game.broadcast(bytes([3, 1]))
                else:
                    await game.broadcast(bytes([3, 0]))

                await websocket.close()
                break

        except WebSocketDisconnect:
            game.sockets.remove(websocket)
            break


# if __name__ == "__main__":
#     uvicorn.run(app, host="0.0.0.0", port=8000)
