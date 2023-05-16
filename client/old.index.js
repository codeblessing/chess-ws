// class PieceSprite {
//     x_offset;
//     y_offset;
//     width;
//     height;

//     constructor(x_offset, y_offset, width, height) {
//         this.x_offset = x_offset;
//         this.y_offset = y_offset;
//         this.width = width;
//         this.height = height;
//     }
// }

// class Piece {
//     x;
//     y;
//     width;
//     height;
//     sprite;

//     constructor(x, y, width, height, sprite) {
//         this.x = x;
//         this.y = y;
//         this.width = width;
//         this.height = height;
//         this.sprite = sprite;
//     }

//     move_to(x, y) {
//         this.x = x;
//         this.y = y;
//     }
// }

// class BlackPiece extends Piece {
//     constructor(x, y, width, height, sprite) {
//         super(x, y, width, height, sprite)
//     }
// }

// class WhitePiece extends Piece {
//     constructor(x, y, width, height, sprite) {
//         super(x, y, width, height, sprite)
//     }
// }

// We have following message types (type number is contained in first byte of message):
//
// [0] - Init - Contains game id and is sent to server as first message after connection establishing.
// [1] - Assignment - Contains type of figures client is modifying (blacks or whites). Sent in response to Init.
// [2] - Move - Contains move player is willing to execute. Message contains 4 single-byte numbers: src column, src row, dst column, dst row.
// [3] - Finish - Contains info about game finish.

// const MSG_INIT = 0;
// const MSG_ASSIGN = 1;
// const MSG_MOVE = 2;
// const MSG_FINISH = 3;

// To minimize message sizes we assign numbers to colors.
// 0 - blacks
// 1 - whites
// const COLOR_BLACKS = 0;
// const COLOR_WHITES = 1;

async function main() {
    let figures = new Image();
    figures.src = "assets/chess_set.avif";
    while (!figures.complete) {
        console.log("Waiting for image to load...");
        await new Promise(r => setTimeout(r, 2000));
    }

    let black_knight = new PieceSprite(0, 0, 264, 528);
    let black_rook = new PieceSprite(264, 0, 264, 528);
    let black_bishop = new PieceSprite(528, 0, 264, 528);
    let black_queen = new PieceSprite(792, 0, 264, 528);
    let black_king = new PieceSprite(1056, 0, 264, 528);
    let black_pawn = new PieceSprite(1320, 0, 264, 528);

    let white_knight = new PieceSprite(0, 528, 264, 528);
    let white_rook = new PieceSprite(264, 528, 264, 528);
    let white_bishop = new PieceSprite(528, 528, 264, 528);
    let white_queen = new PieceSprite(792, 528, 264, 528);
    let white_king = new PieceSprite(1056, 528, 264, 528);
    let white_pawn = new PieceSprite(1320, 528, 264, 528);

    let board = [
        // Blacks
        new Black(25, 0, 50, 100, black_rook),
        new Black(125, 0, 50, 100, black_knight),
        new Black(225, 0, 50, 100, black_bishop),
        new Black(325, 0, 50, 100, black_queen),
        new Black(425, 0, 50, 100, black_king),
        new Black(525, 0, 50, 100, black_bishop),
        new Black(625, 0, 50, 100, black_knight),
        new Black(725, 0, 50, 100, black_rook),

        new Black(25, 100, 50, 100, black_pawn),
        new Black(125, 100, 50, 100, black_pawn),
        new Black(225, 100, 50, 100, black_pawn),
        new Black(325, 100, 50, 100, black_pawn),
        new Black(425, 100, 50, 100, black_pawn),
        new Black(525, 100, 50, 100, black_pawn),
        new Black(625, 100, 50, 100, black_pawn),
        new Black(725, 100, 50, 100, black_pawn),

        // Empty rows
        null, null, null, null, null, null, null, null,
        null, null, null, null, null, null, null, null,
        null, null, null, null, null, null, null, null,
        null, null, null, null, null, null, null, null,

        // Whites
        new White(25, 700, 50, 100, white_rook),
        new White(125, 700, 50, 100, white_knight),
        new White(225, 700, 50, 100, white_bishop),
        new White(325, 700, 50, 100, white_queen),
        new White(425, 700, 50, 100, white_king),
        new White(525, 700, 50, 100, white_bishop),
        new White(625, 700, 50, 100, white_knight),
        new White(725, 700, 50, 100, white_rook),

        new White(25, 600, 50, 100, white_pawn),
        new White(125, 600, 50, 100, white_pawn),
        new White(225, 600, 50, 100, white_pawn),
        new White(325, 600, 50, 100, white_pawn),
        new White(425, 600, 50, 100, white_pawn),
        new White(525, 600, 50, 100, white_pawn),
        new White(625, 600, 50, 100, white_pawn),
        new White(725, 600, 50, 100, white_pawn),
    ]

    let id = await get_id();
    console.log("Game ID: ", id);
    let history = [];
    // TODO: Connect to WebSockets
    let socket = new WebSocket("ws://localhost:8000/ws");
    socket.binaryType = "arraybuffer";

    let color = null;

    socket.addEventListener("open", (event) => {
        console.log("Socket opened.");
        socket.send(id);
    })

    socket.addEventListener("message", (event) => {
        if (event.data instanceof ArrayBuffer) {
            let buffer = new Uint8Array(event.data);
            let message = null;

            if (buffer[0] === MSG_MOVE) {
                message = buffer.subarray(1);
                let src = message[0] * 8 + message[1];
                let dst = message[2] * 8 + message[3];
                board[dst] = board[src];
                board[src] = null;
                draw_board();
                draw_pieces();
                history.push(message);
                window.sessionStorage.setItem("MOVE_HISTORY", JSON.stringify(history));
            } else if (buffer[0] === MSG_ASSIGN) {
                message = buffer.subarray(1);
                color = message[0] === COLOR_BLACKS ? Black : White;
            } else if (buffer[0] === MSG_FINISH) {
                message = buffer.subarray(1);
                let winner = message[0] === COLOR_WHITES ? "Whites have won" : "Blacks have won";
                window.sessionStorage.clear();
                alert(winner);
            } else {
                console.error("Invalid server message.");
            }
        }
    })

    let src = null;
    let dst = null;

    console.log("Setting up canvas");
    /**
     * @type {HTMLCanvasElement}
     */
    let canvas = document.getElementById("board");
    canvas.width = 800;
    canvas.height = 800;

    canvas.addEventListener('mousedown', (event) => {
        click_handler(event)
    })

    let context = canvas.getContext("2d");



    draw_board();
    draw_pieces();

    console.log("Exiting main()");

    async function get_id() {
        let id = window.sessionStorage.getItem("GAME_ID");
        if (id === null) {
            let response = await fetch("http://localhost:8000/game");
            if (response.ok) {
                id = await response.text();
            }
            window.sessionStorage.setItem("GAME_ID", id);
        }
        return id;
    }

    function get_cursor_position(canvas, event) {
        const rect = canvas.getBoundingClientRect()
        const x = event.clientX - rect.left
        const y = event.clientY - rect.top
        return { x, y }
    }

    function click_handler(event) {
        const LEFT_BUTTON = 0;
        const RIGHT_BUTTON = 2;

        let { x, y } = get_cursor_position(canvas, event);
        let row = Math.floor(y % 100);
        let col = Math.floor(x % 100);

        // If click was somehow outside of canvas just return.
        if (row < 0 || row > 8 || col < 0 || col > 8) {
            return;
        }
        // Left button selects, right - unselects.
        if (event.button === LEFT_BUTTON) {
            if (src === null) {
                if (board[row * 8 + col] instanceof color) {
                    src = Uint8Array([col, row])
                }
            } else {
                if (!(board[row * 8 + col] instanceof color)) {
                    dst = Uint8Array([col, row]);
                    let msg = new Uint8Array([MSG_MOVE, ...src, ...dst])
                    socket.send(msg)
                }
            }
        } else if (event.button === RIGHT_BUTTON) {
            src = null;
        }
    }

    function draw_pieces() {
        for (let index = 0; index < board.length; index++) {
            console.log("Drawing piece");
            let piece = board[index];

            if (piece === null) {
                continue;
            }

            context.drawImage(
                figures,
                piece.sprite.x_offset, piece.sprite.y_offset, piece.sprite.width, piece.sprite.height,
                piece.x, piece.y, piece.width, piece.height
            );
        }
    }

    function draw_board() {
        let light = "#f4d2a5";
        let dark = "#ad4e18";

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                let x = row * 100;
                let y = col * 100;

                context.fillStyle = (row % 2) === (col % 2) ? light : dark;
                context.fillRect(x, y, 100, 100);
            }
        }
    }
}

window.onload = async () => {
    await main()
}