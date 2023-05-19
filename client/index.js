// @ts-check

/**
 * Message type.
 * `Init` message is sent only by client. 
 * `Assign` and `Finish` messages are sent only by server.
 * `Move` message can be sent either by client or server.
 */
const MsgType = {
    Init: 0,
    Assign: 1,
    Move: 2,
    Finish: 3,
    HintRequest: 4,
    Hint: 5,
};

/** Color of the player. */
const Color = {
    Whites: 1,
    Blacks: 0,
};

/** Mouse buttons with their assigned numbers */
const Button = {
    Left: 0,
    Middle: 1,
    Right: 2,
};

/** Game finish reason. Either one of winners or draw. */
const Reason = {
    Blacks: 0,
    Whites: 1,
    Draw: 2,
};

/** Action that should be executed during piece move. */
const Action = {
    Replace: 0,
    Swap: 1,
};

/**
 * @typedef {function} ColorInstance
 */

/** 
 * @typedef {Object} Field
 * @property {number} row - row index (in range [0-7])
 * @property {number} col - column index (in range [0-7])
*/

/**
 * @typedef {Object} Sprite
 * @property {number} x_offset - horizontal offset of top-left corner in sprite atlas.
 * @property {number} y_offset - vertical offset of top-left corner in sprite atlas.
 * @property {number} width - sprite width in sprite atlas.
 * @property {number} height - sprite height in sprite atlas.
 */

/** Available player figures with respective sprite atlas coordinates. */
const Sprites = {
    /** @type {Sprite} */
    black_knight: { x_offset: 0, y_offset: 0, width: 264, height: 528 },
    /** @type {Sprite} */
    black_rook: { x_offset: 264, y_offset: 0, width: 264, height: 528 },
    /** @type {Sprite} */
    black_bishop: { x_offset: 528, y_offset: 0, width: 264, height: 528 },
    /** @type {Sprite} */
    black_queen: { x_offset: 792, y_offset: 0, width: 264, height: 528 },
    /** @type {Sprite} */
    black_king: { x_offset: 1056, y_offset: 0, width: 264, height: 528 },
    /** @type {Sprite} */
    black_pawn: { x_offset: 1320, y_offset: 0, width: 264, height: 528 },
    /** @type {Sprite} */
    white_knight: { x_offset: 0, y_offset: 528, width: 264, height: 528 },
    /** @type {Sprite} */
    white_rook: { x_offset: 264, y_offset: 528, width: 264, height: 528 },
    /** @type {Sprite} */
    white_bishop: { x_offset: 528, y_offset: 528, width: 264, height: 528 },
    /** @type {Sprite} */
    white_queen: { x_offset: 792, y_offset: 528, width: 264, height: 528 },
    /** @type {Sprite} */
    white_king: { x_offset: 1056, y_offset: 528, width: 264, height: 528 },
    /** @type {Sprite} */
    white_pawn: { x_offset: 1320, y_offset: 528, width: 264, height: 528 },
}

class Assign {
    /** @type {ColorInstance} */
    color;

    /**
     * @param {ColorInstance} color 
     */
    constructor(color) {
        this.color = color;
    }
}

class Finish {
    /** @type {number} */
    reason;

    /**
     * @param {number} reason 
     */
    constructor(reason) {
        this.reason = reason;
    }
}

class Move {
    /** @type {Field} - source field */
    src;
    /** @type {Field} - destination field. */
    dst;
    /** @type {number} - action which should be executed. */
    action;

    /**
     * @param {Field} src 
     * @param {Field} dst 
     * @param {number} action 
     */
    constructor(src, dst, action) {
        this.src = src;
        this.dst = dst;
        this.action = action;
    }
}

class HintRequest {
    /** @type {Field} */
    src;

    /**
     * @param {Field} src 
     */
    constructor(src) {
        this.src = src;
    }
}

class Hint {
    /** @type {Array<Field>} */
    moves;

    /**
     * @param {Array<Field>} moves 
     */
    constructor(moves) {
        this.moves = moves;
    }
}

/**
 * @typedef {Object} PartialMove
 * @property {Field} src - source field.
 * @property {Field | null} dst - destination field.
 * @property {number | null} action - action which should be executed.
 */

/** Client-side message interface. Allows to easily create and send client-side messages. */
class Message {
    /** @type {number} */
    #type;
    /** @type {Uint8Array} */
    #content;
    /** 
     * @param {string} game_id
     * @returns {Message}
    */
    static Init(game_id) {
        let msg = new Message();
        msg.#type = MsgType.Init // INIT
        msg.#content = new TextEncoder().encode(game_id);

        return msg;
    }

    /**
     * @param {Move} move
     * @param {number} player - player color id. 
     * @returns {Message}
     */
    static Move(move, player) {
        let msg = new Message();
        msg.#type = MsgType.Move;
        msg.#content = new Uint8Array([move.src.row, move.src.col, move.dst.row, move.dst.col, move.action, player]);

        return msg;
    }

    /**
     * @param {HintRequest} hint 
     * @param {number} player 
     * @returns {Message}
     */
    static HintRequest(hint, player) {
        let msg = new Message();
        msg.#type = MsgType.HintRequest;
        msg.#content = new Uint8Array([hint.src.row, hint.src.col, player]);

        return msg;
    }

    /**
     * @param {Uint8Array} buffer 
     * @returns {Assign | Move | Finish | Hint | null}
     */
    static from(buffer) {
        if (buffer[0] === MsgType.Assign) {
            if (buffer[1] === Color.Blacks) {
                return new Assign(Black);
            } else {
                return new Assign(White);
            }
        } else if (buffer[0] === MsgType.Move) {
            return new Move({ row: buffer[1], col: buffer[2] }, { row: buffer[3], col: buffer[4] }, buffer[4]);
        } else if (buffer[0] === MsgType.Finish) {
            return new Finish(buffer[1]);
        } else if (buffer[0] === MsgType.Hint) {
            let moves = new Array();
            for (let index = 1; index < buffer.length; index += 2) {
                moves.push({ row: buffer[index], col: buffer[index + 1] });
            }
            return new Hint(moves);
        }

        return null;
    }

    /**
     * @param {WebSocket} socket - socket which should be used to send message.
     */
    send(socket) {
        if (socket.readyState === socket.OPEN) {
            socket.send(new Uint8Array([this.#type, ...this.#content]))
        }
    }

    /** DEBUG 
     * @returns {Uint8Array}
     */
    get_content() {
        return this.#content;
    }
}

/** Represents single piece on board. */
class Piece {
    x;
    y;
    width;
    height;
    sprite;

    /**
     * @param {number} x - horizontal position of top-left corner of sprite on board
     * @param {number} y - vertical position of top-left corner of sprite on board
     * @param {number} width - piece's display width
     * @param {number} height - piece's display height
     * @param {Sprite} sprite - piece's sprite configuration
     */
    constructor(x, y, width, height, sprite) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.sprite = sprite;
    }

    /**
     * @param {number} x - horizontal position of top-left corner of sprite on board
     * @param {number} y - vertical position of top-left corner of sprite on board
     */
    move_to(x, y) {
        this.x = x;
        this.y = y;
    }
}

class Black extends Piece {
    /**
     * @param {number} x - horizontal position of top-left corner of sprite on board
     * @param {number} y - vertical position of top-left corner of sprite on board
     * @param {number} width - piece's display width
     * @param {number} height - piece's display height
     * @param {Sprite} sprite - piece's sprite configuration
     */
    constructor(x, y, width, height, sprite) {
        super(x, y, width, height, sprite)
    }

    static empty() {
        return new Black(0, 0, 0, 0, { x_offset: 0, y_offset: 0, width: 0, height: 0 })
    }
}

class White extends Piece {
    /**
     * @param {number} x - horizontal position of top-left corner of sprite on board
     * @param {number} y - vertical position of top-left corner of sprite on board
     * @param {number} width - piece's display width
     * @param {number} height - piece's display height
     * @param {Sprite} sprite - piece's sprite configuration
     */
    constructor(x, y, width, height, sprite) {
        super(x, y, width, height, sprite)
    }

    static empty() {
        return new White(0, 0, 0, 0, { x_offset: 0, y_offset: 0, width: 0, height: 0 })
    }
}

class Board {
    /** @type {Array<Piece | null>} */
    #board;
    /** @type {HTMLImageElement} */
    #atlas;
    /** @type {number} */
    #size;
    /** @type {PartialMove | null} */
    #move;
    /** @type {ColorInstance} */
    color;

    /**
     * @param {string} src
     * @returns {Promise<HTMLImageElement>}
     */
    #load_image(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();

            img.addEventListener('load', () => {
                resolve(img);
            });

            img.addEventListener('error', () => {
                reject(new Error('Error loading image'));
            });

            img.src = src;
        });
    }

    /**
     * @param {number} [width] - single field width(height) (cannot be less than 50) [default: 100]
     */
    constructor(width) {
        this.#size = !width || width < 50 ? 100 : width;

        let w = (this.#size / 2);
        let h = this.#size;
        let offset = this.#size / 4;

        this.#board = [
            new Black(offset, 0, w, h, Sprites.black_rook),
            new Black(this.#size + offset, 0, w, h, Sprites.black_knight),
            new Black(2 * this.#size + offset, 0, w, h, Sprites.black_bishop),
            new Black(3 * this.#size + offset, 0, w, h, Sprites.black_queen),
            new Black(4 * this.#size + offset, 0, w, h, Sprites.black_king),
            new Black(5 * this.#size + offset, 0, w, h, Sprites.black_bishop),
            new Black(6 * this.#size + offset, 0, w, h, Sprites.black_knight),
            new Black(7 * this.#size + offset, 0, w, h, Sprites.black_rook),
            new Black(offset, this.#size, w, h, Sprites.black_pawn),
            new Black(this.#size + offset, this.#size, w, h, Sprites.black_pawn),
            new Black(2 * this.#size + offset, this.#size, w, h, Sprites.black_pawn),
            new Black(3 * this.#size + offset, this.#size, w, h, Sprites.black_pawn),
            new Black(4 * this.#size + offset, this.#size, w, h, Sprites.black_pawn),
            new Black(5 * this.#size + offset, this.#size, w, h, Sprites.black_pawn),
            new Black(6 * this.#size + offset, this.#size, w, h, Sprites.black_pawn),
            new Black(7 * this.#size + offset, this.#size, w, h, Sprites.black_pawn),

            null, null, null, null, null, null, null, null,
            null, null, null, null, null, null, null, null,
            null, null, null, null, null, null, null, null,
            null, null, null, null, null, null, null, null,

            new White(offset, 6 * this.#size, w, h, Sprites.white_pawn),
            new White(1 * this.#size + offset, 6 * this.#size, w, h, Sprites.white_pawn),
            new White(2 * this.#size + offset, 6 * this.#size, w, h, Sprites.white_pawn),
            new White(3 * this.#size + offset, 6 * this.#size, w, h, Sprites.white_pawn),
            new White(4 * this.#size + offset, 6 * this.#size, w, h, Sprites.white_pawn),
            new White(5 * this.#size + offset, 6 * this.#size, w, h, Sprites.white_pawn),
            new White(6 * this.#size + offset, 6 * this.#size, w, h, Sprites.white_pawn),
            new White(7 * this.#size + offset, 6 * this.#size, w, h, Sprites.white_pawn),
            new White(offset, 7 * this.#size, w, h, Sprites.white_rook),
            new White(1 * this.#size + offset, 7 * this.#size, w, h, Sprites.white_knight),
            new White(2 * this.#size + offset, 7 * this.#size, w, h, Sprites.white_bishop),
            new White(3 * this.#size + offset, 7 * this.#size, w, h, Sprites.white_queen),
            new White(4 * this.#size + offset, 7 * this.#size, w, h, Sprites.white_king),
            new White(5 * this.#size + offset, 7 * this.#size, w, h, Sprites.white_bishop),
            new White(6 * this.#size + offset, 7 * this.#size, w, h, Sprites.white_knight),
            new White(7 * this.#size + offset, 7 * this.#size, w, h, Sprites.white_rook),
        ]
    }

    /**
     * Initializes sprite atlas loading and history retrieval. Should be called right after creating a board
     * @param {Array<Move>} history 
     */
    async init(history) {
        await this.#load_image("assets/chess_set.avif")
            .then((image) => this.#atlas = image)
            .catch((_) => alert("Asset loading failed. Please reload page."));

        for (let index = 0; index < history.length; index++) {
            const move = history[index];
            this.move(move);
        }
    }

    /**
     * Moves piece on the board
     * @param {Move} move 
     */
    move(move) {
        let src_index = move.src.row * 8 + move.src.col;
        let dst_index = move.dst.row * 8 + move.dst.col;
        this.#board[src_index]?.move_to(move.dst.col * this.#size + (this.#size / 4), move.dst.row * this.#size)
        if (move.action === Action.Swap) {
            const temp = this.#board[dst_index];
            temp?.move_to(move.src.col * this.#size + (this.#size / 4), move.src.row * this.#size)
            this.#board[dst_index] = this.#board[src_index];
            this.#board[src_index] = temp;
        } else {
            this.#board[dst_index] = this.#board[src_index];
            this.#board[src_index] = null;
        }
    }

    /**
     * Draws board with pieces using given rendering context.
     * @param {CanvasRenderingContext2D} context
     * @param {Array<Field>} highlights  
     */
    draw(context, highlights) {
        let light = "#f4d2a5";
        let dark = "#ad4e18";
        let highlight = "#93fa93"

        // Draw board
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                let x = col * this.#size;
                let y = row * this.#size;

                if (highlights.some((value) => value.row == row && value.col == col)) {
                    context.fillStyle = highlight;
                } else {
                    context.fillStyle = (row % 2) === (col % 2) ? light : dark;
                }
                context.fillRect(x, y, this.#size, this.#size);
            }
        }

        for (let index = 0; index < this.#board.length; index++) {
            let piece = this.#board[index];

            if (piece === null) {
                continue;
            }

            context.drawImage(
                this.#atlas,
                piece.sprite.x_offset, piece.sprite.y_offset, piece.sprite.width, piece.sprite.height,
                piece.x, piece.y, piece.width, piece.height
            );
        }
    }

    /**
     * Handles mouse click on board (represented by canvas).
     * @param {HTMLCanvasElement} canvas 
     * @param {MouseEvent} event 
     * @returns {Message | null} - move message if full move was performed, otherwise null.
     */
    on_click(canvas, event) {
        const rect = canvas.getBoundingClientRect()
        const x = event.clientX - rect.left
        const y = event.clientY - rect.top

        let row = Math.floor(y / this.#size);
        let col = Math.floor(x / this.#size);

        console.log("on_click handle: { row:", row, ", col:", col, "}");

        // Right click cancels move.
        if (event.button === Button.Right) {
            this.#move = null;
            return null;
        } else if (event.button === Button.Left) {
            const piece = this.#board[row * 8 + col];
            if (!this.#move) {
                if (piece instanceof this.color) {
                    console.info("Piece chosen");
                    this.#move = { src: { col, row }, dst: null, action: null };
                    const msg = Message.HintRequest(new HintRequest(this.#move.src), this.color === Black ? 0 : 1);
                    return msg;
                }
            } else {
                this.#move.dst = { col, row };
                this.#move.action = piece instanceof this.color ? Action.Swap : Action.Replace;
                // At this moment PartialMove is full Move so we can perform cast safely.
                const msg = Message.Move(/** @type {Move} */(this.#move), this.color === Black ? 0 : 1);
                console.debug(msg);
                this.#move = null;
                return msg;
            }
        }

        return null;
    }
}

async function main() {
    const game_id = await get_id() ?? "1234";
    const history = get_history();
    const board = new Board(50);
    await board.init(history);

    const socket = new WebSocket("ws://localhost:8000/ws");
    socket.binaryType = "arraybuffer";

    socket.addEventListener("open", (_) => {
        const msg = Message.Init(game_id);
        msg.send(socket);
    });

    socket.addEventListener("message", (event) => {
        const msg = Message.from(new Uint8Array(event.data));
        if (!msg) {
            console.warn("Received unknown message:", new Uint8Array(event.data));
            return;
        }
        if (msg instanceof Assign) {
            console.debug("Received Assign message:", msg);
            board.color = msg.color
            window.sessionStorage.setItem("PLAYER_COLOR", new Uint8Array(event.data)[1].toString());
            document.body.style.background = msg.color === Black ? "#222" : "#eee";
        }
        else if (msg instanceof Finish) {
            console.debug("Received Finish message:", msg);
            /** @type {HTMLHeadingElement} */
            const result = /** @type {HTMLHeadingElement} */(document.getElementById("result"));
            switch (msg.reason) {
                case Reason.Blacks:
                    result.textContent = "blacks won";
                    break;
                case Reason.Whites:
                    result.textContent = "whites won";
                    break;
                case Reason.Draw:
                    result.textContent = "draw";
                    break;
            }
            result.classList.add("enabled");
            // context.clearRect(0, 0, canvas.width, canvas.height);
            socket.close();
            window.sessionStorage.clear();
        }
        else if (msg instanceof Hint) {
            console.debug("Received Hint message:", msg);
            board.draw(context, msg.moves);
        }
        else if (msg instanceof Move) {
            console.debug("Received Move message:", msg);
            const move = /** @type {Move} */(msg);
            history.push(move);
            window.sessionStorage.setItem("MOVE_HISTORY", JSON.stringify(history));
            canvas.style.boxShadow = history.length % 2 === 0 ? "0 0 20px 10px #222" : "0 0 20px 10px #eee";
            board.move(move);
            board.draw(context, new Array());
        }
    });

    /** @type {HTMLCanvasElement} */
    const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById("board"));
    const context = /** @type {CanvasRenderingContext2D} */ (canvas.getContext("2d"));
    canvas.width = 400;
    canvas.height = 400;

    canvas.addEventListener("mousedown", (event) => {
        let msg = board.on_click(canvas, event);
        board.draw(context, new Array());
        msg?.send(socket);
    })

    const _color = window.sessionStorage.getItem("PLAYER_COLOR")
    if (_color) {
        board.color = _color === "0" ? White : Black;
        document.body.style.background = board.color === Black ? "#222" : "#eee";
    }

    board.draw(context, new Array());

    /**
     * Retrieves Game ID from local cache (if available) or server.
     * @returns {Promise<string | null>} - Game ID if can be retrieved, otherwise null.
     */
    async function get_id() {
        /** @type {string | null | undefined} */
        let id = window.sessionStorage.getItem("GAME_ID");
        if (!id) {
            let response = await fetch("http://localhost:8000/game")
                .catch((reason) => console.error("Cannot get game id. Reason:", reason));
            id = await response?.text().then((value) => { window.sessionStorage.setItem("GAME_ID", value); return value; });
        }
        return id === undefined ? null : id;
    }

    /**
     * Retrieves move history from local cache if available.
     * @returns {Array<Move>} - Move history (empty if not history available).
     */
    function get_history() {
        let history = window.sessionStorage.getItem("MOVE_HISTORY");
        if (history) {
            return JSON.parse(history);
        }
        return [];
    }
}

window.onload = async () => await main();