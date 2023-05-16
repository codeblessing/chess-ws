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
}

/** Color of the player. */
const Color = {
    Whites: 0,
    Blacks: 1,
}

/** 
 * @typedef {Object} Field
 * @property {number} row - row index (in range [0-7])
 * @property {number} col - column index (in range [0-7])
 */

/**
 * @typedef {Object} Move
 * @property {Field} src - source field.
 * @property {Field} dst - destination field.
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
    Init(game_id) {
        let msg = new Message();
        msg.#type = MsgType.Init // INIT
        msg.#content = new TextEncoder().encode(game_id);

        return msg;
    }

    /**
     * @param {Move} move
     * @returns {Message}
     */
    Move(move) {
        let msg = new Message();
        msg.#type = MsgType.Move;
        msg.#content = new Uint8Array([move.src.row, move.src.col, move.dst.row, move.dst.col])

        return msg;
    }

    /**
     * @param {WebSocket} socket - socket which should be used to send message.
     */
    send(socket) {
        if (socket.readyState === socket.OPEN) {
            socket.send(new Uint8Array([this.#type, ...this.#content]))
        }
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
}

class Board {
    /** @type {Array<Piece | null>} */
    #board;
    /** @type {HTMLImageElement} */
    #atlas;
    /** @type {number} */
    #size;

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

        this.#board = [
            new Black(25, 0, w, h, Sprites.black_rook),
            new Black(125, 0, w, h, Sprites.black_knight),
            new Black(225, 0, w, h, Sprites.black_bishop),
            new Black(325, 0, w, h, Sprites.black_queen),
            new Black(425, 0, w, h, Sprites.black_king),
            new Black(525, 0, w, h, Sprites.black_bishop),
            new Black(625, 0, w, h, Sprites.black_knight),
            new Black(725, 0, w, h, Sprites.black_rook),
            new Black(25, 100, w, h, Sprites.black_pawn),
            new Black(125, 100, w, h, Sprites.black_pawn),
            new Black(225, 100, w, h, Sprites.black_pawn),
            new Black(325, 100, w, h, Sprites.black_pawn),
            new Black(425, 100, w, h, Sprites.black_pawn),
            new Black(525, 100, w, h, Sprites.black_pawn),
            new Black(625, 100, w, h, Sprites.black_pawn),
            new Black(725, 100, w, h, Sprites.black_pawn),

            null, null, null, null, null, null, null, null,
            null, null, null, null, null, null, null, null,
            null, null, null, null, null, null, null, null,
            null, null, null, null, null, null, null, null,

            new White(25, 600, w, h, Sprites.white_pawn),
            new White(125, 600, w, h, Sprites.white_pawn),
            new White(225, 600, w, h, Sprites.white_pawn),
            new White(325, 600, w, h, Sprites.white_pawn),
            new White(425, 600, w, h, Sprites.white_pawn),
            new White(525, 600, w, h, Sprites.white_pawn),
            new White(625, 600, w, h, Sprites.white_pawn),
            new White(725, 600, w, h, Sprites.white_pawn),
            new White(25, 700, w, h, Sprites.white_rook),
            new White(125, 700, w, h, Sprites.white_knight),
            new White(225, 700, w, h, Sprites.white_bishop),
            new White(325, 700, w, h, Sprites.white_queen),
            new White(425, 700, w, h, Sprites.white_king),
            new White(525, 700, w, h, Sprites.white_bishop),
            new White(625, 700, w, h, Sprites.white_knight),
            new White(725, 700, w, h, Sprites.white_rook),
        ]
    }

    /** Initializes sprite atlas loading. Should be called right after creating a board */
    async init() {
        await this.#load_image("assets/chess_set.avif")
            .then((image) => this.#atlas = image)
            .catch((_) => alert("Asset loading failed. Please reload page."));
    }

    /**
     * Moves piece on the board
     * @param {Field} from 
     * @param {Field} to 
     */
    move(from, to) {
        let src_index = from.row * 8 + from.col;
        let dst_index = to.row * 8 + to.col;
        this.#board[src_index]?.move_to(to.col * this.#size + (this.#size / 4), to.row * this.#size)
        this.#board[dst_index] = this.#board[src_index];
        this.#board[src_index] = null;
    }

    /**
     * 
     * @param {CanvasRenderingContext2D} context 
     */
    draw(context) {
        let light = "#f4d2a5";
        let dark = "#ad4e18";

        // Draw board
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                let x = row * 100;
                let y = col * 100;

                context.fillStyle = (row % 2) === (col % 2) ? light : dark;
                context.fillRect(x, y, 100, 100);
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
}

async function main() {
    const board = new Board();
    await board.init();

    /** @type {HTMLCanvasElement} */
    const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById("board"));
    canvas.width = 800;
    canvas.height = 800;

    const context = /** @type {CanvasRenderingContext2D} */ (canvas.getContext("2d"));

    board.draw(context);
}

window.onload = async () => await main();