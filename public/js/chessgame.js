const socket = io('http://localhost:3000'); // Explicit URL for clarity
socket.on('connect', () => {
    console.log('Connected to Socket.IO server');
});

// Join game with gameId if spectating, otherwise matchmaking
const joinPayload = { userId: window.USER_ID };
if (window.IS_SPECTATOR && window.GAME_ID) {
    joinPayload.gameId = window.GAME_ID;
}
socket.emit('joinGame', joinPayload);

const chess = new Chess();
const boardElement = document.querySelector('.chessboard');

let draggedPiece = null;
let sourceSquare = null;
let playerRole = null;
let isSpectator = window.IS_SPECTATOR || false;

const renderBoard = () => {
    const board = chess.board();
    boardElement.innerHTML = '';
    board.forEach((row, rowIndex) => {
        row.forEach((square, squareIndex) => {
            const squareElement = document.createElement('div');
            squareElement.classList.add('square', (rowIndex + squareIndex) % 2 === 0 ? 'light' : 'dark');
            squareElement.dataset.row = rowIndex;
            squareElement.dataset.col = squareIndex;

            if (square) {
                const pieceElement = document.createElement('div');
                pieceElement.classList.add('piece', square.color === 'w' ? 'white' : 'black');
                pieceElement.innerText = getPieceUnicode(square);
                pieceElement.draggable = playerRole === square.color;
                console.log(`Piece at ${rowIndex},${squareIndex}: draggable=${pieceElement.draggable}, playerRole=${playerRole}, pieceColor=${square.color}`); // Debug

                pieceElement.addEventListener('dragstart', (e) => {
                    if (pieceElement.draggable) {
                        console.log('Drag started:', pieceElement, { row: rowIndex, col: squareIndex }); // Debug
                        draggedPiece = pieceElement;
                        sourceSquare = { row: rowIndex, col: squareIndex };
                        e.dataTransfer.setData('text/plain', '');
                        pieceElement.classList.add('dragging');
                    }
                });
                pieceElement.addEventListener('dragend', () => {
                    console.log('Drag ended'); // Debug
                    draggedPiece = null;
                    sourceSquare = null;
                    pieceElement.classList.remove('dragging');
                });
                squareElement.appendChild(pieceElement);
            }

            squareElement.addEventListener('dragover', (e) => {
                e.preventDefault();
            });
            squareElement.addEventListener('drop', (e) => {
                e.preventDefault();
                console.log('Drop event:', draggedPiece, sourceSquare); // Debug
                if (draggedPiece) {
                    const targetSource = {
                        row: parseInt(squareElement.dataset.row),
                        col: parseInt(squareElement.dataset.col)
                    };
                    handleMove(sourceSquare, targetSource);
                }
            });
            boardElement.appendChild(squareElement);
        });
    });

    if (playerRole === 'b') {
        boardElement.classList.add('flipped');
    } else {
        boardElement.classList.remove('flipped');
    }
};

const handleMove = (source, target) => {
    const move = {
        from: `${String.fromCharCode(97 + source.col)}${8 - source.row}`,
        to: `${String.fromCharCode(97 + target.col)}${8 - target.row}`,
        promotion: 'q'
    };
    console.log('Sending move:', move); // Debug
    socket.emit('move', move);
};

const getPieceUnicode = (piece) => {
    const pieces = {
        'w': { 'p': '♙', 'r': '♖', 'n': '♘', 'b': '♗', 'q': '♕', 'k': '♔' },
        'b': { 'p': '♟', 'r': '♜', 'n': '♞', 'b': '♝', 'q': '♛', 'k': '♚' }
    };
    return pieces[piece.color][piece.type];
};

socket.on('playerRole', (role) => {
    playerRole = role;
    isSpectator = false;
    console.log('Player role assigned:', playerRole); // Debug
    renderBoard();
});

socket.on('spectatorRole', () => {
    playerRole = null;
    isSpectator = true;
    console.log('Assigned as spectator'); // Debug
    renderBoard();
});

socket.on('boardState', (fen) => {
    console.log('Received FEN:', fen); // Debug
    chess.load(fen);
    renderBoard();
});

socket.on('move', (move) => {
    chess.move(move);
    renderBoard();
});

socket.on('gameStatus', (status) => {
    console.log('Game status:', status); // Debug
    document.getElementById('gameStatus').innerText = status;
});

socket.on('error', (message) => {
    console.log('Error:', message); // Debug
    alert(message);
});

socket.on('invalidMove', (data) => {
    console.log('Invalid move:', data.message); // Debug
    alert(data.message || 'Invalid move. Please try again.');
});

socket.on('gameOver', (message) => {
    console.log('Game over:', message); // Debug
    alert(message);
});

socket.on('gameReset', () => {
    console.log('Game has been reset by the server.');
    chess.reset();
    playerRole = null; // Reset player role
    renderBoard();
    document.getElementById('gameStatus').innerText = 'Waiting for players...';
});

renderBoard();